import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, AlertCircle, CheckCircle, Clock, Activity, Bell, Check, CheckCheck, Database, BookOpen, X, ThumbsUp, ThumbsDown, Zap, FileText, Users, Sun, Moon, Server, ClipboardList, ArrowUp, ArrowDown, Send } from 'lucide-react';

// Duke Brand Colors
const DUKE = {
  navy: '#012169',
  royal: '#00539B',
  copper: '#C84E00',
  copperLight: '#FEF3E8',
  copperMuted: '#B34500',
  persimmon: '#E89923',
  piedmont: '#A1B70D',
  shale: '#0577B1',
  hatteras: '#E2E6ED',
};

// Phase definitions
const PHASES = {
  1: { name: 'Phase I', title: 'Information Retrieval', description: 'Contact routing & call schedules', icon: Phone, color: DUKE.royal },
  2: { name: 'Phase II', title: 'ACR Criteria', description: 'Evidence-based imaging guidance', icon: ClipboardList, color: DUKE.copper },
  3: { name: 'Phase III', title: 'EMR Integration', description: 'Patient-specific Epic data', icon: Server, color: DUKE.piedmont }
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
    { input: "Who covers body imaging today?", delay: 1500 },
    { input: "What are the ACR appropriateness criteria for suspected PE?", delay: 1500 },
    { input: "URGENT: Suspected aortic dissection in ER bay 2", delay: 1500 },
  ]
};

const EXAMPLE_PROMPTS = {
  1: [
    { text: "Who covers body imaging today?", icon: Users },
    { text: "What's the pager for neuroradiology?", icon: Phone },
    { text: "How do I reach radiology after hours?", icon: Clock },
  ],
  2: [
    { text: "Who covers radiology today?", icon: Users },
    { text: "ACR criteria for suspected PE?", icon: BookOpen },
    { text: "Is CT or MRI better for knee injury?", icon: ClipboardList },
    { text: "Who's on call for neuroradiology?", icon: Phone },
  ],
  3: [
    { text: "Status of my patient's chest CT?", icon: FileText },
    { text: "ACR criteria for suspected PE?", icon: BookOpen },
    { text: "Who's on call for neuroradiology?", icon: Phone },
    { text: "URGENT: Need immediate consult", icon: AlertCircle },
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

function formatTimeGroup(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  if (now.toDateString() === date.toDateString()) {
    return 'Today';
  }
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function getCurrentShift() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 19) return { name: 'Day', icon: Sun, onCall: 'Dr. Martinez, Dr. Chen' };
  return { name: 'Night', icon: Moon, onCall: 'Dr. Williams' };
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showBrowserNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

// CSS for animations (injected once)
const styleId = 'radchat-animations';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes slideInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
    .animate-slide-up { animation: slideInUp 0.2s ease-out; }
    .animate-slide-right { animation: slideInRight 0.2s ease-out; }
  `;
  document.head.appendChild(style);
}

function PhaseToggle({ currentPhase, onPhaseChange, disabled, dark }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: dark ? 'rgba(255,255,255,0.1)' : DUKE.hatteras }}>
      {[1, 2, 3].map((phase) => {
        const config = PHASES[phase];
        const Icon = config.icon;
        const isActive = currentPhase === phase;
        return (
          <button
            key={phase}
            onClick={() => onPhaseChange(phase)}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'text-white shadow-sm' : dark ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-700 hover:bg-white'} disabled:opacity-50`}
            style={isActive ? { backgroundColor: config.color } : undefined}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{config.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function DataCard({ source, content }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="text-white px-4 py-2 flex items-center gap-2" style={{ backgroundColor: DUKE.navy }}>
        <Database size={14} />
        <span className="text-xs font-semibold uppercase tracking-wide">{source}</span>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {Object.entries(content).map(([key, value]) => (
          <div key={key}>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
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
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${DUKE.royal}15` }}>
        <Activity size={16} style={{ color: DUKE.royal }} />
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-3" style={{ backgroundColor: DUKE.hatteras }}>
        <Icon size={16} style={{ color: DUKE.royal }} className="animate-pulse" />
        <span className="text-sm text-slate-500">{config.text}</span>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: DUKE.royal, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageReactions({ messageId, reactions, onReact }) {
  return (
    <div className="flex items-center gap-0.5">
      <button onClick={() => onReact(messageId, 'up')} className={`p-1 rounded transition ${reactions?.up ? 'text-green-500' : 'text-slate-300 hover:text-slate-400'}`}>
        <ThumbsUp size={12} />
      </button>
      <button onClick={() => onReact(messageId, 'down')} className={`p-1 rounded transition ${reactions?.down ? 'text-red-500' : 'text-slate-300 hover:text-slate-400'}`}>
        <ThumbsDown size={12} />
      </button>
    </div>
  );
}

function UserMessage({ text, time, status }) {
  return (
    <div className="flex justify-end animate-slide-right">
      <div className="text-white rounded-2xl rounded-br-sm px-4 py-2.5 shadow-sm max-w-[85%]" style={{ backgroundColor: DUKE.royal }}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
          <span className="text-[10px]">{time}</span>
          {status === 'read' && <CheckCheck size={10} />}
          {status === 'delivered' && <CheckCheck size={10} className="opacity-60" />}
          {status === 'sent' && <Check size={10} className="opacity-60" />}
        </div>
      </div>
    </div>
  );
}

function AIMessage({ messageId, text, hasData, dataSource, dataContent, time, reactions, onReact }) {
  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${DUKE.royal}15` }}>
        <Activity size={16} style={{ color: DUKE.royal }} />
      </div>
      <div className="flex flex-col gap-2 max-w-[85%]">
        {hasData && <DataCard source={dataSource} content={dataContent} />}
        {text && (
          <div className="rounded-2xl rounded-tl-sm px-4 py-2.5" style={{ backgroundColor: DUKE.hatteras }}>
            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{text}</p>
            <div className="flex items-center justify-between mt-2 pt-1.5" style={{ borderTop: `1px solid ${DUKE.royal}20` }}>
              <span className="text-[10px] text-slate-400">{time}</span>
              <MessageReactions messageId={messageId} reactions={reactions} onReact={onReact} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimeGroupHeader({ label }) {
  return (
    <div className="flex items-center justify-center my-4">
      <span className="text-xs text-slate-400 px-3 py-1 rounded-full" style={{ backgroundColor: DUKE.hatteras }}>{label}</span>
    </div>
  );
}

function Message({ message, onReact, showTimeGroup }) {
  const isUser = message.sender === 'user';
  const [relativeTime, setRelativeTime] = useState(formatRelativeTime(message.timestamp));

  useEffect(() => {
    const interval = setInterval(() => setRelativeTime(formatRelativeTime(message.timestamp)), 10000);
    return () => clearInterval(interval);
  }, [message.timestamp]);

  return (
    <>
      {showTimeGroup && <TimeGroupHeader label={formatTimeGroup(message.timestamp)} />}
      {isUser ? (
        <UserMessage text={message.text} time={relativeTime} status={message.status} />
      ) : (
        <AIMessage messageId={message.id} text={message.text} hasData={message.hasData} dataSource={message.dataSource} dataContent={message.dataContent} time={relativeTime} reactions={message.reactions} onReact={onReact} />
      )}
    </>
  );
}

function EmptyState({ currentPhase, onPromptClick, disabled }) {
  const prompts = EXAMPLE_PROMPTS[currentPhase];
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6" style={{ backgroundColor: `${DUKE.royal}15` }}>
        <Activity size={40} style={{ color: DUKE.royal }} />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome to DukeRad Chat</h2>
      <p className="text-slate-500 text-sm mb-8 max-w-sm">
        Ask questions about imaging orders, exam status, protocols, or contact information
      </p>

      <div className="w-full max-w-lg">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-3 text-center">Try asking</p>
        <div className="grid grid-cols-2 gap-2">
          {prompts.map((prompt, i) => {
            const Icon = prompt.icon;
            return (
              <button
                key={i}
                onClick={() => onPromptClick(prompt.text)}
                disabled={disabled}
                className="flex items-center gap-3 px-4 py-3 text-sm text-left rounded-xl border transition disabled:opacity-50 hover:bg-slate-50"
                style={{ borderColor: `${DUKE.royal}15`, color: DUKE.navy }}
              >
                <Icon size={16} className="flex-shrink-0 text-slate-400" />
                <span className="line-clamp-2">{prompt.text}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScrollToBottomButton({ onClick, show }) {
  if (!show) return null;
  return (
    <button
      onClick={onClick}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-lg text-sm text-slate-600 hover:bg-slate-50 transition animate-slide-up"
    >
      <ArrowDown size={14} />
      New messages
    </button>
  );
}

function EscalationPanel({ notifications, stats, onAcknowledge, onReply }) {
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [chatHistory, setChatHistory] = useState({});

  function handleSendReply(notifId) {
    if (!replyText.trim()) return;
    setChatHistory(prev => ({
      ...prev,
      [notifId]: [...(prev[notifId] || []), { sender: 'radiologist', text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
    }));
    setReplyText('');
    // Simulate clinician response
    setTimeout(() => {
      setChatHistory(prev => ({
        ...prev,
        [notifId]: [...(prev[notifId] || []), { sender: 'clinician', text: 'Thank you, heading to review images now.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]
      }));
    }, 1500);
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
        <p className="text-base font-medium text-white mb-1">All Clear</p>
        <p className="text-xs text-slate-400 mb-4">No pending escalations</p>
        <div className="grid grid-cols-2 gap-3 max-w-[200px] mx-auto">
          <div className="text-center p-2 bg-white/10 rounded-lg">
            <p className="text-[10px] text-slate-400">AI Resolved</p>
            <p className="text-lg font-bold" style={{ color: DUKE.shale }}>{stats.resolved}</p>
          </div>
          <div className="text-center p-2 bg-white/10 rounded-lg">
            <p className="text-[10px] text-slate-400">Escalated</p>
            <p className="text-lg font-bold" style={{ color: DUKE.persimmon }}>{stats.escalated}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notif) => (
        <div key={notif.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: DUKE.copperLight, border: `1px solid ${DUKE.copper}40` }}>
          <div className="p-3">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: DUKE.copper }}>
                <Bell className="text-white" size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-0.5" style={{ color: DUKE.copperMuted }}>URGENT</p>
                <p className="text-sm text-slate-700 mb-1">{notif.message}</p>
                <p className="text-[10px] text-slate-500">{notif.from} • {notif.contact}</p>
              </div>
            </div>

            {/* Chat history */}
            {chatHistory[notif.id]?.length > 0 && (
              <div className="mt-3 pt-3 space-y-2" style={{ borderTop: `1px solid ${DUKE.copper}30` }}>
                {chatHistory[notif.id].map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'radiologist' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-2.5 py-1.5 rounded-lg text-xs max-w-[80%] ${msg.sender === 'radiologist' ? 'text-white' : 'bg-white text-slate-700'}`} style={msg.sender === 'radiologist' ? { backgroundColor: DUKE.royal } : undefined}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input */}
            {replyTo === notif.id ? (
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${DUKE.copper}30` }}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendReply(notif.id)}
                    placeholder="Type a response..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1"
                    style={{ '--tw-ring-color': DUKE.royal }}
                    autoFocus
                  />
                  <button onClick={() => handleSendReply(notif.id)} className="p-1.5 text-white rounded-lg" style={{ backgroundColor: DUKE.royal }}>
                    <Send size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-3">
                <button onClick={() => setReplyTo(notif.id)} className="flex-1 px-2 py-1.5 text-white text-xs rounded-lg transition flex items-center justify-center gap-1" style={{ backgroundColor: DUKE.royal }}>
                  <Send size={10} /> Reply
                </button>
                <button onClick={() => onAcknowledge(notif.id)} className="flex-1 px-2 py-1.5 bg-slate-600 text-white text-xs rounded-lg hover:bg-slate-700 transition">
                  Acknowledge
                </button>
              </div>
            )}
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const messageIdRef = useRef(0);
  const notificationIdRef = useRef(0);
  const inputRef = useRef(null);

  useEffect(() => { requestNotificationPermission(); }, []);

  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, thinkingType, showScrollButton]);

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

  function handleScroll(e) {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 0);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  }

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
      addAIMessage({ dataSource: 'PACS/RIS', dataContent: { Exam: 'Chest CT with Contrast', Location: 'ICU Bed 4', Time: '2:45 PM', Status: 'In Review', Radiologist: 'Dr. Martinez', ETA: '~30 min' } });
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
      addAIMessage({ dataSource: 'ACR Criteria', dataContent: { Indication: 'Suspected PE', Procedure: 'CT Pulmonary Angiography', Rating: '9/9 (Usually Appropriate)', Alternative: 'D-dimer if low probability' } });
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
    await typeMessage(help + " Try asking one of the suggestions.");
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

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  const isInputDisabled = isTyping || isRunningDemo || thinkingType;
  const shift = getCurrentShift();
  const ShiftIcon = shift.icon;

  // Determine if we should show time group header
  function shouldShowTimeGroup(index) {
    if (index === 0) return true;
    const prev = messages[index - 1];
    const curr = messages[index];
    return formatTimeGroup(prev.timestamp) !== formatTimeGroup(curr.timestamp);
  }

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: DUKE.hatteras }}>
      {/* Control Bar */}
      <header className="border-b border-slate-200 px-6 py-3 flex-shrink-0" style={{ backgroundColor: DUKE.navy }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white">DukeRad Chat</h1>
            <PhaseToggle currentPhase={currentPhase} onPhaseChange={handlePhaseChange} disabled={isRunningDemo || isTyping} dark />
          </div>
          <div className="flex items-center gap-4">
            {currentPhase === 3 && notifications.length > 0 && (
              <button onClick={() => setShowEscalations(!showEscalations)} className="relative p-2 rounded-lg transition hover:bg-white/10">
                <Bell size={20} className="text-white" />
                <span className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: DUKE.copper }}>
                  {notifications.length}
                </span>
              </button>
            )}
            <button onClick={runDemo} disabled={isInputDisabled} className="px-4 py-1.5 text-sm font-medium rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'white', color: DUKE.navy }}>
              {isRunningDemo ? 'Running...' : 'Run Demo'}
            </button>
            <a href="https://radchat.neevs.io/" target="_blank" rel="noopener noreferrer" className="text-sm text-white/80 hover:text-white transition">
              Live version →
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden p-6">
        {/* Chat Card */}
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-3xl flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden relative">
            <div className="flex-1 overflow-y-auto px-6 py-6" ref={scrollContainerRef} onScroll={handleScroll}>
              {messages.length === 0 && !thinkingType ? (
                <EmptyState currentPhase={currentPhase} onPromptClick={handleSendMessage} disabled={isInputDisabled} />
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <Message key={msg.id || idx} message={msg} onReact={handleReaction} showTimeGroup={shouldShowTimeGroup(idx)} />
                  ))}
                  {thinkingType && <ThinkingIndicator type={thinkingType} />}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <ScrollToBottomButton show={showScrollButton} onClick={scrollToBottom} />

            {/* Input */}
            <div className="border-t border-slate-100 bg-white px-6 py-5">
              <div className="flex items-end gap-3 pl-5 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-full focus-within:ring-2 focus-within:border-transparent transition" style={{ '--tw-ring-color': DUKE.royal }}>
                <textarea
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 py-2 bg-transparent border-none focus:outline-none text-sm resize-none max-h-32"
                  disabled={isInputDisabled}
                  rows={1}
                  style={{ minHeight: '24px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                  }}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isInputDisabled || !userInput.trim()}
                  className="p-2.5 text-white rounded-full hover:opacity-90 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                  style={{ backgroundColor: isInputDisabled || !userInput.trim() ? undefined : DUKE.royal }}
                >
                  <ArrowUp size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Escalations Panel */}
        {showEscalations && currentPhase === 3 && (
          <div className="w-72 flex-shrink-0 ml-4 flex flex-col rounded-2xl overflow-hidden border border-slate-700" style={{ backgroundColor: '#1e293b' }}>
            <div className="p-3 border-b border-slate-700 flex items-center justify-between" style={{ backgroundColor: DUKE.navy }}>
              <div>
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <AlertCircle size={14} />
                  Radiologist View
                </h2>
              </div>
              <button onClick={() => setShowEscalations(false)} className="p-1 text-slate-400 hover:text-white rounded transition">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <EscalationPanel notifications={notifications} stats={stats} onAcknowledge={handleAcknowledge} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
