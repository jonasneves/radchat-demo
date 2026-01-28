import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Phone, AlertCircle, CheckCircle, Clock, Activity, Bell, Check, CheckCheck, Database, BookOpen, X, ThumbsUp, ThumbsDown, Zap, FileText, Users, Sun, Moon, Server, ClipboardList, ArrowUp } from 'lucide-react';

// Duke Brand Colors
const DUKE = {
  navy: '#012169',
  royal: '#00539B',
  copper: '#C84E00',
  persimmon: '#E89923',
  piedmont: '#A1B70D',
  shale: '#0577B1',
  hatteras: '#E2E6ED',
  whisper: '#F3F2F1',
};

// Phase definitions
const PHASES = {
  1: {
    name: 'Phase I',
    title: 'Information Retrieval',
    description: 'Contact routing & call schedules',
    icon: Phone,
    color: DUKE.royal,
  },
  2: {
    name: 'Phase II',
    title: 'ACR Criteria',
    description: 'Evidence-based imaging guidance',
    icon: ClipboardList,
    color: DUKE.copper,
  },
  3: {
    name: 'Phase III',
    title: 'EMR Integration',
    description: 'Patient-specific Epic data',
    icon: Server,
    color: DUKE.piedmont,
  }
};

const PHASE_DEMO_SEQUENCES = {
  1: [
    { input: "Who covers body imaging today?", delay: 800 },
    { input: "What's the pager for neuroradiology?", delay: 1500 },
  ],
  2: [
    { input: "Who covers body imaging today?", delay: 800 },
    { input: "What are the ACR appropriateness criteria for suspected PE?", delay: 1500 },
  ],
  3: [
    { input: "What's the status of the chest CT for the patient in ICU bed 4?", delay: 800 },
    { input: "What are the ACR appropriateness criteria for suspected PE?", delay: 1500 },
    { input: "URGENT: Suspected aortic dissection in ER bay 2", delay: 1500 },
  ]
};

const PHASE_QUICK_ACTIONS = {
  1: [
    { label: 'Contacts', icon: Users, query: 'Who covers radiology today?' },
    { label: 'After Hours', icon: Moon, query: 'How do I reach radiology after hours?' },
    { label: 'Protocol', icon: FileText, query: 'What is the brain MRI protocol?' }
  ],
  2: [
    { label: 'Contacts', icon: Users, query: 'Who covers radiology today?' },
    { label: 'ACR Criteria', icon: BookOpen, query: 'Show me ACR appropriateness criteria for PE' },
    { label: 'Protocol', icon: FileText, query: 'What is the brain MRI protocol?' }
  ],
  3: [
    { label: 'Check Status', icon: FileText, query: "What's the status of my patient's imaging?" },
    { label: 'ACR Criteria', icon: BookOpen, query: 'Show me ACR appropriateness criteria' },
    { label: 'Contacts', icon: Users, query: 'Who covers radiology today?' },
    { label: 'Escalate', icon: Zap, query: 'URGENT: Need immediate radiology consultation' }
  ]
};

const CONTACT_DIRECTORY = {
  'General Radiology': 'Ext. 5100',
  'Neuroradiology (Dr. Chen)': 'Ext. 5105',
  'Body Imaging (Dr. Martinez)': 'Ext. 5110',
  'Musculoskeletal (Dr. Kim)': 'Ext. 5115',
  'After Hours/Urgent': 'Page 2400'
};

const THINKING_MESSAGES = {
  pacs: { icon: Database, text: 'Querying PACS...' },
  acr: { icon: BookOpen, text: 'Searching ACR...' },
  contacts: { icon: Phone, text: 'Loading contacts...' },
  escalate: { icon: Bell, text: 'Escalating...' },
  protocol: { icon: Activity, text: 'Loading protocol...' }
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 10000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getCurrentShift() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 19) {
    return { name: 'Day', icon: Sun, onCall: 'Dr. Martinez, Dr. Chen' };
  }
  return { name: 'Night', icon: Moon, onCall: 'Dr. Williams' };
}

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showBrowserNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/vite.svg' });
  }
}

function PhaseToggle({ currentPhase, onPhaseChange, disabled }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: DUKE.hatteras }}>
      {[1, 2, 3].map((phase) => {
        const config = PHASES[phase];
        const Icon = config.icon;
        const isActive = currentPhase === phase;
        return (
          <button
            key={phase}
            onClick={() => onPhaseChange(phase)}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white'
            } disabled:opacity-50`}
            style={isActive ? { backgroundColor: config.color } : undefined}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{config.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function QuickActions({ onAction, disabled, currentPhase }) {
  const actions = PHASE_QUICK_ACTIONS[currentPhase] || PHASE_QUICK_ACTIONS[3];
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={() => onAction(action.query)}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-full transition disabled:opacity-50"
          >
            <Icon size={16} />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

function DataCard({ source, content }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="text-white px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: DUKE.navy }}>
        <Database size={16} />
        <span className="text-sm font-semibold uppercase tracking-wide">{source}</span>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {Object.entries(content).map(([key, value]) => (
          <div key={key}>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </p>
            <p className="text-sm text-slate-800 font-medium">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator({ type }) {
  const config = THINKING_MESSAGES[type] || { icon: Activity, text: 'Processing...' };
  const Icon = config.icon;
  return (
    <div className="flex justify-start">
      <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200 flex items-center gap-3">
        <Icon size={18} style={{ color: DUKE.royal }} className="animate-pulse" />
        <span className="text-sm text-slate-500">{config.text}</span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: DUKE.royal }} />
          <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: DUKE.royal, animationDelay: '0.1s' }} />
          <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: DUKE.royal, animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}

function MessageReactions({ messageId, reactions, onReact }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onReact(messageId, 'up')}
        className={`p-1 rounded transition ${reactions?.up ? 'text-green-500' : 'text-slate-300 hover:text-slate-400'}`}
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={() => onReact(messageId, 'down')}
        className={`p-1 rounded transition ${reactions?.down ? 'text-red-500' : 'text-slate-300 hover:text-slate-400'}`}
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}

function UserMessage({ text, time, status }) {
  return (
    <div className="text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-sm max-w-full" style={{ backgroundColor: DUKE.royal }}>
      <p className="text-sm leading-relaxed">{text}</p>
      <div className="flex items-center justify-end gap-1 mt-1.5 opacity-70">
        <span className="text-xs">{time}</span>
        {status === 'read' && <CheckCheck size={12} />}
        {status === 'delivered' && <CheckCheck size={12} className="opacity-60" />}
        {status === 'sent' && <Check size={12} className="opacity-60" />}
      </div>
    </div>
  );
}

function AIMessage({ messageId, text, hasData, dataSource, dataContent, time, reactions, onReact }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {hasData && <DataCard source={dataSource} content={dataContent} />}
      {text && (
        <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-slate-100">
          <p className="text-sm leading-relaxed text-slate-700">{text}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">{time}</span>
            <MessageReactions messageId={messageId} reactions={reactions} onReact={onReact} />
          </div>
        </div>
      )}
    </div>
  );
}

function Message({ message, onReact }) {
  const isUser = message.sender === 'user';
  const [relativeTime, setRelativeTime] = useState(formatRelativeTime(message.timestamp));

  useEffect(() => {
    const interval = setInterval(() => setRelativeTime(formatRelativeTime(message.timestamp)), 10000);
    return () => clearInterval(interval);
  }, [message.timestamp]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {isUser ? (
          <UserMessage text={message.text} time={relativeTime} status={message.status} />
        ) : (
          <AIMessage
            messageId={message.id}
            text={message.text}
            hasData={message.hasData}
            dataSource={message.dataSource}
            dataContent={message.dataContent}
            time={relativeTime}
            reactions={message.reactions}
            onReact={onReact}
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({ currentPhase }) {
  const config = PHASES[currentPhase];
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: `${DUKE.royal}15` }}>
        <Activity size={40} style={{ color: DUKE.royal }} />
      </div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-2">DukeRad Chat</h2>
      <p className="text-slate-500 mb-1">{config.title}</p>
      <p className="text-sm text-slate-400 max-w-md">{config.description}</p>
    </div>
  );
}

function EscalationPanel({ notifications, stats, onAcknowledge, onClose }) {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle size={48} className="mx-auto mb-4 text-green-400" />
        <p className="text-lg font-medium text-white mb-1">All Clear</p>
        <p className="text-sm text-slate-400 mb-6">No pending escalations</p>
        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
          <div className="text-center p-3 bg-white/10 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">AI Resolved</p>
            <p className="text-2xl font-bold" style={{ color: DUKE.shale }}>{stats.resolved}</p>
          </div>
          <div className="text-center p-3 bg-white/10 rounded-xl">
            <p className="text-xs text-slate-400 mb-1">Escalated</p>
            <p className="text-2xl font-bold" style={{ color: DUKE.persimmon }}>{stats.escalated}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notif) => (
        <div key={notif.id} className="bg-red-50 rounded-xl p-4 border border-red-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Bell className="text-white" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-900 mb-1">URGENT ESCALATION</p>
              <p className="text-sm text-slate-700 mb-2">{notif.message}</p>
              <p className="text-xs text-slate-500">{notif.from} • {notif.contact}</p>
              <button
                onClick={() => onAcknowledge(notif.id)}
                className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg transition"
                style={{ backgroundColor: DUKE.royal, color: 'white' }}
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [thinkingType, setThinkingType] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [showEscalations, setShowEscalations] = useState(false);
  const [stats, setStats] = useState({ resolved: 47, escalated: 3 });
  const [currentPhase, setCurrentPhase] = useState(3);
  const messagesEndRef = useRef(null);
  const messageIdRef = useRef(0);
  const notificationIdRef = useRef(0);
  const inputRef = useRef(null);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingType]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName)) return;
      if (['Control', 'Alt', 'Meta', 'Shift', 'Tab', 'Escape'].includes(e.key)) return;
      if (isTyping || isRunningDemo || thinkingType) return;
      inputRef.current?.focus();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTyping, isRunningDemo, thinkingType]);

  function handlePhaseChange(newPhase) {
    setCurrentPhase(newPhase);
    setMessages([]);
    setNotifications([]);
    setStats({ resolved: 47, escalated: 3 });
  }

  const updateLastMessage = useCallback((updates) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], ...updates };
      return newMessages;
    });
  }, []);

  const updateMessageStatus = useCallback((index, status) => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages[index]) newMessages[index] = { ...newMessages[index], status };
      return newMessages;
    });
  }, []);

  function handleReaction(messageId, type) {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      return { ...msg, reactions: { up: type === 'up' ? !msg.reactions?.up : false, down: type === 'down' ? !msg.reactions?.down : false } };
    }));
  }

  async function typeMessage(text) {
    setIsTyping(true);
    const words = text.split(' ');
    let displayText = '';
    for (let i = 0; i < words.length; i++) {
      displayText += (i > 0 ? ' ' : '') + words[i];
      await delay(18);
      updateLastMessage({ text: displayText });
    }
    setIsTyping(false);
  }

  function addAIMessage(options = {}) {
    const msgId = ++messageIdRef.current;
    setMessages(prev => [...prev, {
      id: msgId, sender: 'ai', text: '', timestamp: Date.now(),
      hasData: Boolean(options.dataSource), dataSource: options.dataSource, dataContent: options.dataContent, reactions: {}
    }]);
    return msgId;
  }

  async function showThinking(type, delayMs) {
    setThinkingType(type);
    await delay(delayMs);
    setThinkingType(null);
  }

  function incrementResolved() {
    setStats(prev => ({ ...prev, resolved: prev.resolved + 1 }));
  }

  async function processMessage(input, messageIndex) {
    const lowerInput = input.toLowerCase();
    await delay(300);
    updateMessageStatus(messageIndex, 'delivered');
    await delay(200);
    updateMessageStatus(messageIndex, 'read');

    if (lowerInput.includes('status') || lowerInput.includes('chest ct') || lowerInput.includes('report')) {
      if (currentPhase < 3) {
        await showThinking('pacs', 500);
        addAIMessage();
        await typeMessage("Patient-specific status queries require EMR integration (Phase III). I can help with contacts or imaging criteria.");
        incrementResolved();
        return;
      }
      await showThinking('pacs', 800);
      addAIMessage({
        dataSource: 'PACS/RIS',
        dataContent: { Exam: 'Chest CT with Contrast', Location: 'ICU Bed 4', Time: '2:45 PM', Status: 'In Review', Radiologist: 'Dr. Martinez', ETA: '~30 min' }
      });
      await typeMessage("Found it. Chest CT completed at 2:45 PM, being finalized by Dr. Martinez. Preliminary: no acute findings.");
      incrementResolved();
      return;
    }

    if (lowerInput.includes('acr') || lowerInput.includes('criteria') || lowerInput.includes('appropriateness') || /\bpe\b/.test(lowerInput)) {
      if (currentPhase < 2) {
        await showThinking('acr', 400);
        addAIMessage();
        await typeMessage("ACR Criteria integration available in Phase II. I can help with contacts and call schedules now.");
        incrementResolved();
        return;
      }
      await showThinking('acr', 600);
      addAIMessage({
        dataSource: 'ACR Criteria',
        dataContent: { Indication: 'Suspected PE', Procedure: 'CT Pulmonary Angiography', Rating: '9/9 (Usually Appropriate)', Alternative: 'D-dimer if low probability' }
      });
      await typeMessage("CTPA is recommended for suspected PE with intermediate-high probability (9/9). Consider D-dimer first for low-probability cases.");
      incrementResolved();
      return;
    }

    if (lowerInput.includes('urgent') || lowerInput.includes('stroke') || lowerInput.includes('critical') || lowerInput.includes('dissection')) {
      if (currentPhase < 3) {
        await showThinking('escalate', 400);
        addAIMessage();
        await typeMessage("Automated escalation requires EMR integration (Phase III). For urgent cases, call Page 2400 directly.");
        incrementResolved();
        return;
      }
      await showThinking('escalate', 400);
      addAIMessage();
      const isDissection = lowerInput.includes('dissection');
      await typeMessage(isDissection ? "Escalating now. Dr. Chen (Cardiothoracic) paged, will call within 2 minutes." : "Code stroke activated. Neuroradiology paged. CT scanner 2 held.");
      setTimeout(() => {
        const id = ++notificationIdRef.current;
        setNotifications(prev => [...prev, {
          id, type: 'urgent',
          message: `${isDissection ? 'Suspected aortic dissection' : 'Stroke alert'} - immediate consultation needed`,
          from: 'Dr. Sarah Park - ED', timestamp: Date.now(), contact: 'Ext. 4521'
        }]);
        setStats(prev => ({ ...prev, escalated: prev.escalated + 1 }));
        setShowEscalations(true);
        playNotificationSound();
        showBrowserNotification('Urgent Escalation', isDissection ? 'Suspected aortic dissection' : 'Stroke alert');
      }, 300);
      return;
    }

    if (lowerInput.includes('who') || lowerInput.includes('call') || lowerInput.includes('contact') || lowerInput.includes('covers') || lowerInput.includes('pager') || lowerInput.includes('reach') || lowerInput.includes('after hours')) {
      await showThinking('contacts', 500);
      addAIMessage({ dataSource: 'Directory', dataContent: CONTACT_DIRECTORY });
      await typeMessage("Here are today's contacts. For urgent after-hours cases, use Page 2400.");
      incrementResolved();
      return;
    }

    if (lowerInput.includes('protocol') || lowerInput.includes('how')) {
      await showThinking('protocol', 600);
      addAIMessage();
      await typeMessage("Standard brain MRI: T1, T2, FLAIR, DWI. Add T1 post-contrast for enhancement. What's the clinical scenario?");
      incrementResolved();
      return;
    }

    await showThinking('pacs', 400);
    addAIMessage();
    const help = currentPhase === 1 ? "I can help with contacts, schedules, and protocols."
      : currentPhase === 2 ? "I can help with contacts, ACR criteria, and protocols."
      : "I can help with exam status, ACR criteria, contacts, and escalations.";
    await typeMessage(help + " Try the suggestions below or run the demo.");
  }

  async function handleSendMessage(inputOverride) {
    const input = inputOverride || userInput;
    if (!input.trim() || isTyping || thinkingType) return;
    const messageIndex = messages.length;
    setMessages(prev => [...prev, { sender: 'user', text: input, timestamp: Date.now(), status: 'sent' }]);
    setUserInput('');
    await processMessage(input, messageIndex);
  }

  async function typeIntoInput(text) {
    setUserInput('');
    for (let i = 0; i <= text.length; i++) {
      setUserInput(text.slice(0, i));
      await delay(10);
    }
  }

  async function runDemo() {
    setIsRunningDemo(true);
    setMessages([]);
    setNotifications([]);
    const demoSequence = PHASE_DEMO_SEQUENCES[currentPhase];
    for (let i = 0; i < demoSequence.length; i++) {
      const step = demoSequence[i];
      await delay(step.delay);
      await typeIntoInput(step.input);
      await delay(300);
      const messageIndex = messages.length + (i * 2);
      setMessages(prev => [...prev, { sender: 'user', text: step.input, timestamp: Date.now(), status: 'sent' }]);
      setUserInput('');
      await processMessage(step.input, messageIndex);
      await delay(600);
    }
    setIsRunningDemo(false);
  }

  function handleAcknowledge(id) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  const isInputDisabled = isTyping || isRunningDemo || thinkingType;
  const shift = getCurrentShift();
  const ShiftIcon = shift.icon;

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold" style={{ color: DUKE.navy }}>DukeRad Chat</h1>
          <PhaseToggle currentPhase={currentPhase} onPhaseChange={handlePhaseChange} disabled={isRunningDemo || isTyping} />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
            <ShiftIcon size={14} />
            <span>{shift.name} Shift</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-700">{shift.onCall}</span>
          </div>
          {currentPhase === 3 && (
            <button
              onClick={() => setShowEscalations(!showEscalations)}
              className="relative p-2 rounded-lg transition hover:bg-slate-100"
            >
              <Bell size={20} className="text-slate-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={runDemo}
            disabled={isInputDisabled}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
            style={{ backgroundColor: isInputDisabled ? undefined : DUKE.royal }}
          >
            {isRunningDemo ? 'Running...' : 'Demo'}
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden p-4">
        {/* Chat Card */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-3xl flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-6">
                {messages.length === 0 && !thinkingType ? (
                  <EmptyState currentPhase={currentPhase} />
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <Message key={idx} message={msg} onReact={handleReaction} />
                    ))}
                    {thinkingType && <ThinkingIndicator type={thinkingType} />}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
              {messages.length === 0 && !thinkingType && (
                <div className="mb-4">
                  <QuickActions onAction={(q) => handleSendMessage(q)} disabled={isInputDisabled} currentPhase={currentPhase} />
                </div>
              )}
              <div className="flex items-center gap-2 pl-4 pr-1.5 py-1.5 bg-white border border-slate-200 rounded-full focus-within:ring-2 focus-within:border-transparent transition shadow-sm" style={{ '--tw-ring-color': DUKE.royal }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about imaging, contacts, or criteria..."
                  className="flex-1 py-2 bg-transparent border-none focus:outline-none text-sm"
                  disabled={isInputDisabled}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isInputDisabled || !userInput.trim()}
                  className="p-2.5 text-white rounded-full hover:opacity-90 disabled:bg-slate-200 disabled:cursor-not-allowed transition"
                  style={{ backgroundColor: isInputDisabled || !userInput.trim() ? undefined : DUKE.royal }}
                >
                  <ArrowUp size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Escalations Panel */}
        {showEscalations && currentPhase === 3 && (
          <div className="w-80 flex-shrink-0 border-l border-slate-700 flex flex-col" style={{ backgroundColor: '#1e293b' }}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between" style={{ backgroundColor: DUKE.navy }}>
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <AlertCircle size={16} />
                  Escalations
                </h2>
                <p className="text-xs text-slate-400">Radiologist view</p>
              </div>
              <button onClick={() => setShowEscalations(false)} className="p-1 text-slate-400 hover:text-white rounded transition">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <EscalationPanel notifications={notifications} stats={stats} onAcknowledge={handleAcknowledge} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
