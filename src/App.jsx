import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Phone, AlertCircle, CheckCircle, Clock, User, Activity, TrendingUp, Bell, Check, CheckCheck, Loader2, Database, BookOpen, PhoneCall, X } from 'lucide-react';

const DEMO_SEQUENCE = [
  { input: "What's the status of the chest CT for the patient in ICU bed 4?", delay: 800 },
  { input: "What are the ACR appropriateness criteria for suspected PE?", delay: 1500 },
  { input: "URGENT: Suspected aortic dissection in ER bay 2", delay: 1500 },
  { input: "Who covers body imaging today?", delay: 1500 }
];

const CONTACT_DIRECTORY = {
  'General Radiology': 'Ext. 5100',
  'Neuroradiology (Dr. Chen)': 'Ext. 5105',
  'Body Imaging (Dr. Martinez)': 'Ext. 5110',
  'Musculoskeletal (Dr. Kim)': 'Ext. 5115',
  'After Hours/Urgent': 'Page 2400'
};

const THINKING_MESSAGES = {
  pacs: { icon: Database, text: 'Querying PACS/RIS...' },
  acr: { icon: BookOpen, text: 'Searching ACR guidelines...' },
  contacts: { icon: Phone, text: 'Loading directory...' },
  escalate: { icon: Bell, text: 'Escalating to radiologist...' },
  protocol: { icon: Activity, text: 'Retrieving protocols...' }
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

function DataCard({ source, content }) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-md border border-slate-200 overflow-hidden">
      <div className="bg-slate-700 text-white px-4 py-2 flex items-center gap-2">
        <Activity size={14} />
        <span className="text-xs font-bold uppercase tracking-wide">{source}</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        {Object.entries(content).map(([key, value]) => (
          <div key={key} className="flex text-sm">
            <span className="text-slate-500 font-medium min-w-28 capitalize text-xs">
              {key.replace(/([A-Z])/g, ' $1').trim()}:
            </span>
            <span className="text-slate-900 font-semibold ml-2 text-xs">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator({ type }) {
  const config = THINKING_MESSAGES[type] || { icon: Loader2, text: 'Processing...' };
  const Icon = config.icon;

  return (
    <div className="flex justify-start mb-3">
      <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200 flex items-center gap-3">
        <Icon size={16} className="text-blue-600 animate-pulse" />
        <span className="text-sm text-slate-600">{config.text}</span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}

function MessageStatus({ status, time }) {
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className="text-xs text-blue-200">{time}</span>
      {status === 'sent' && <Check size={12} className="text-blue-300" />}
      {status === 'delivered' && <CheckCheck size={12} className="text-blue-300" />}
      {status === 'read' && <CheckCheck size={12} className="text-blue-100" />}
    </div>
  );
}

function UserMessage({ text, time, status }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl px-4 py-3 shadow-md max-w-full">
      <p className="text-sm leading-relaxed break-words">{text}</p>
      <div className="flex justify-end">
        <MessageStatus status={status} time={time} />
      </div>
    </div>
  );
}

function AIMessage({ text, hasData, dataSource, dataContent, time }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {hasData && <DataCard source={dataSource} content={dataContent} />}
      {text && (
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200">
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{text}</p>
          <p className="text-xs text-slate-400 mt-2">{time}</p>
        </div>
      )}
    </div>
  );
}

function Message({ message }) {
  const isUser = message.sender === 'user';
  const [relativeTime, setRelativeTime] = useState(formatRelativeTime(message.timestamp));

  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(message.timestamp));
    }, 10000);
    return () => clearInterval(interval);
  }, [message.timestamp]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {isUser ? (
          <UserMessage text={message.text} time={relativeTime} status={message.status} />
        ) : (
          <AIMessage
            text={message.text}
            hasData={message.hasData}
            dataSource={message.dataSource}
            dataContent={message.dataContent}
            time={relativeTime}
          />
        )}
      </div>
    </div>
  );
}

function EmptyClinicianState() {
  return (
    <div className="text-center py-12 sm:py-20">
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm">
        <Activity size={40} className="text-blue-600" />
      </div>
      <p className="text-base sm:text-lg font-bold text-slate-800">Welcome to Radiology AI</p>
      <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto px-4">
        Ask about imaging orders, exam status, protocols, or contacts
      </p>
      <div className="mt-6 sm:mt-8 space-y-2 text-xs text-slate-500 max-w-md mx-auto px-4">
        <p className="text-left font-medium">Try asking:</p>
        <ul className="text-left space-y-1 ml-4 list-disc">
          <li>"What's the status of my chest CT?"</li>
          <li>"Show me ACR criteria for PE"</li>
          <li>"Who covers neuroradiology today?"</li>
          <li>"URGENT: Suspected stroke"</li>
        </ul>
      </div>
    </div>
  );
}

function StatsPanel({ resolved, escalated }) {
  return (
    <div className="mt-8 bg-slate-700 rounded-2xl p-4 sm:p-6 max-w-sm mx-auto shadow-sm border border-slate-600">
      <div className="flex items-center gap-2 text-white font-bold mb-4">
        <TrendingUp size={16} className="text-blue-400" />
        <span className="text-sm">Today's Stats</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-slate-600 rounded-xl border border-slate-500">
          <p className="text-slate-300 text-xs mb-1">AI Resolved</p>
          <p className="text-3xl font-bold text-blue-400">{resolved}</p>
        </div>
        <div className="text-center p-3 bg-slate-600 rounded-xl border border-slate-500">
          <p className="text-slate-300 text-xs mb-1">Escalated</p>
          <p className="text-3xl font-bold text-orange-400">{escalated}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyRadiologistState({ resolved, escalated }) {
  return (
    <div className="text-center py-12 sm:py-20">
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm">
        <CheckCircle size={40} className="text-blue-400" />
      </div>
      <p className="text-base sm:text-lg font-bold text-white">All Clear</p>
      <p className="text-xs sm:text-sm text-slate-400 mt-2">No pending urgent consultations</p>
      <p className="text-xs text-slate-500 mt-2">AI is handling routine queries</p>
      <StatsPanel resolved={resolved} escalated={escalated} />
    </div>
  );
}

function CallbackModal({ notification, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-slate-900">Calling Back</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <PhoneCall size={24} className="text-green-600 animate-pulse" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{notification.from}</p>
            <p className="text-sm text-slate-500">{notification.contact}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium"
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationCard({ notification, onAcknowledge, onCallBack }) {
  const isUrgent = notification.type === 'urgent';
  const [relativeTime, setRelativeTime] = useState(formatRelativeTime(notification.timestamp));

  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(notification.timestamp));
    }, 10000);
    return () => clearInterval(interval);
  }, [notification.timestamp]);

  return (
    <div
      className={`mb-4 border-l-4 ${isUrgent ? 'border-red-500 bg-red-50 animate-pulse' : 'border-amber-500 bg-amber-50'} rounded-r-2xl shadow-sm`}
      style={isUrgent ? { animationDuration: '1s', animationIterationCount: '5' } : undefined}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 ${isUrgent ? 'bg-red-500' : 'bg-amber-500'} rounded-xl flex items-center justify-center flex-shrink-0`}>
            {isUrgent ? <AlertCircle className="text-white" size={20} /> : <Clock className="text-white" size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm mb-1 ${isUrgent ? 'text-red-900' : 'text-amber-900'}`}>
              <span className="flex items-center gap-2">
                {isUrgent ? <Bell size={14} className="text-red-600" /> : <AlertCircle size={14} className="text-amber-600" />}
                {isUrgent ? 'URGENT ESCALATION' : 'AI Needs Help'}
              </span>
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mb-2">{notification.message}</p>
            <div className="text-xs text-slate-600 space-y-0.5 bg-white/60 rounded-lg p-2 mb-3">
              <p><strong>From:</strong> {notification.from}</p>
              <p><strong>Contact:</strong> {notification.contact}</p>
              <p><strong>Time:</strong> {relativeTime}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onCallBack(notification)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm font-medium"
              >
                <Phone size={12} /> Call Back
              </button>
              <button
                onClick={() => onAcknowledge(notification.id)}
                className="px-3 py-1.5 bg-slate-600 text-white text-xs rounded-lg hover:bg-slate-700 transition shadow-sm font-medium"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      </div>
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
  const [callbackNotification, setCallbackNotification] = useState(null);
  const [stats, setStats] = useState({ resolved: 47, escalated: 3 });
  const messagesEndRef = useRef(null);
  const notificationsEndRef = useRef(null);
  const notificationIdRef = useRef(0);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingType]);

  useEffect(() => {
    notificationsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notifications]);

  const updateLastMessage = useCallback((updates) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[newMessages.length - 1] = {
        ...newMessages[newMessages.length - 1],
        ...updates
      };
      return newMessages;
    });
  }, []);

  const updateMessageStatus = useCallback((index, status) => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages[index]) {
        newMessages[index] = { ...newMessages[index], status };
      }
      return newMessages;
    });
  }, []);

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

  async function processMessage(input, messageIndex) {
    const lowerInput = input.toLowerCase();

    await delay(300);
    updateMessageStatus(messageIndex, 'delivered');
    await delay(200);
    updateMessageStatus(messageIndex, 'read');

    if (lowerInput.includes('status') || lowerInput.includes('chest ct') || lowerInput.includes('report')) {
      setThinkingType('pacs');
      await delay(800);
      setThinkingType(null);

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: '',
        timestamp: Date.now(),
        hasData: true,
        dataSource: 'PACS/RIS Database',
        dataContent: {
          examType: 'Chest CT with Contrast',
          patientLocation: 'ICU Bed 4',
          examTime: '2:45 PM',
          status: 'In Review',
          radiologist: 'Dr. Martinez',
          findings: 'No acute findings (preliminary)',
          eta: '~30 minutes'
        }
      }]);

      await typeMessage(
        "Found it. The chest CT was completed at 2:45 PM and is currently being finalized by Dr. Martinez. Preliminary read shows no acute findings. You'll get a notification when the final report is signed."
      );
      setStats(prev => ({ ...prev, resolved: prev.resolved + 1 }));
      return;
    }

    if (lowerInput.includes('acr') || lowerInput.includes('criteria') || lowerInput.includes('appropriateness') || /\bpe\b/.test(lowerInput)) {
      setThinkingType('acr');
      await delay(600);
      setThinkingType(null);

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: '',
        timestamp: Date.now(),
        hasData: true,
        dataSource: 'ACR Appropriateness Criteria',
        dataContent: {
          indication: 'Suspected Pulmonary Embolism',
          procedure: 'CT Pulmonary Angiography',
          rating: '9/9 (Usually Appropriate)',
          notes: 'Intermediate-high clinical probability',
          alternative: 'D-dimer if low probability'
        }
      }]);

      await typeMessage(
        "CTPA is the recommended study for suspected PE with intermediate to high clinical probability (9/9 rating). For low-probability cases, consider D-dimer first. Need the full protocol or want me to connect you with a radiologist?"
      );
      setStats(prev => ({ ...prev, resolved: prev.resolved + 1 }));
      return;
    }

    if (lowerInput.includes('urgent') || lowerInput.includes('stroke') || lowerInput.includes('critical') || lowerInput.includes('dissection')) {
      setThinkingType('escalate');
      await delay(400);
      setThinkingType(null);

      setMessages(prev => [...prev, { sender: 'ai', text: '', timestamp: Date.now(), hasData: false }]);

      const isDissection = lowerInput.includes('dissection');
      await typeMessage(
        isDissection
          ? "Escalating immediately. Dr. Chen from Cardiothoracic is being paged now and will call you within 2 minutes. Stay on the line if possible."
          : "Code stroke activated. Neuroradiology (Dr. Chen) is being paged and will contact you within 2 minutes. CT scanner 2 is being held."
      );

      setTimeout(() => {
        const id = ++notificationIdRef.current;
        setNotifications(prev => [...prev, {
          id,
          type: 'urgent',
          message: `URGENT: ${isDissection ? 'Suspected aortic dissection' : 'Stroke alert'} - immediate consultation needed`,
          from: 'Dr. Sarah Park - Emergency Department',
          timestamp: Date.now(),
          contact: 'Ext. 4521'
        }]);
        setStats(prev => ({ ...prev, escalated: prev.escalated + 1 }));
        playNotificationSound();
        showBrowserNotification('Urgent Escalation', isDissection ? 'Suspected aortic dissection' : 'Stroke alert - immediate response needed');
      }, 300);
      return;
    }

    if (lowerInput.includes('who') || lowerInput.includes('call') || lowerInput.includes('contact') || lowerInput.includes('covers')) {
      setThinkingType('contacts');
      await delay(500);
      setThinkingType(null);

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: '',
        timestamp: Date.now(),
        hasData: true,
        dataSource: 'Contact Directory',
        dataContent: CONTACT_DIRECTORY
      }]);

      await typeMessage(
        "Here are today's contacts. For urgent after-hours cases, use Page 2400. Want me to connect you directly to any of these?"
      );
      setStats(prev => ({ ...prev, resolved: prev.resolved + 1 }));
      return;
    }

    if (lowerInput.includes('protocol') || lowerInput.includes('how')) {
      setThinkingType('protocol');
      await delay(600);
      setThinkingType(null);

      setMessages(prev => [...prev, { sender: 'ai', text: '', timestamp: Date.now(), hasData: false }]);
      await typeMessage(
        "Standard brain MRI includes T1, T2, FLAIR, and DWI. Add T1 post-contrast for enhancement evaluation. Protocols vary by indication—what's the clinical scenario? I can pull the specific protocol or connect you with a radiologist."
      );
      setStats(prev => ({ ...prev, resolved: prev.resolved + 1 }));
      return;
    }

    setThinkingType('pacs');
    await delay(400);
    setThinkingType(null);

    setMessages(prev => [...prev, { sender: 'ai', text: '', timestamp: Date.now(), hasData: false }]);
    await typeMessage(
      "I can help with exam status, ACR criteria, radiologist contacts, urgent escalations, and imaging protocols. Try the demo above to see examples, or ask about a specific case."
    );
  }

  async function handleSendMessage() {
    if (!userInput.trim() || isTyping || thinkingType) return;

    const input = userInput;
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

    for (let i = 0; i < DEMO_SEQUENCE.length; i++) {
      const step = DEMO_SEQUENCE[i];
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

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function handleAcknowledge(id) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  function handleCallBack(notification) {
    setCallbackNotification(notification);
  }

  const isInputDisabled = isTyping || isRunningDemo || thinkingType;
  const isSendDisabled = isTyping || !userInput.trim() || isRunningDemo || thinkingType;

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <div className="text-center mb-2 sm:mb-3">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-1 tracking-tight">
            AI Radiology Assistant
          </h1>
          <button
            onClick={runDemo}
            disabled={isInputDisabled}
            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold rounded-full hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition shadow-md"
          >
            {isRunningDemo ? `Demo ${DEMO_SEQUENCE.findIndex((_, i) => i === DEMO_SEQUENCE.length) + 1}/${DEMO_SEQUENCE.length}...` : 'Run Demo'}
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-0 overflow-hidden shadow-2xl rounded-2xl sm:rounded-3xl">
          <div className="flex-1 flex flex-col bg-slate-50 lg:rounded-l-3xl rounded-t-2xl lg:rounded-tr-none">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-2xl lg:rounded-tl-3xl lg:rounded-tr-none border-b border-blue-800">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <User size={20} />
                Clinician Interface
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">Chat with AI Assistant</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
              {messages.length === 0 && !thinkingType && <EmptyClinicianState />}
              {messages.map((msg, idx) => (
                <Message key={idx} message={msg} />
              ))}
              {thinkingType && <ThinkingIndicator type={thinkingType} />}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 sm:p-6 bg-white border-t border-slate-200 lg:rounded-bl-3xl">
              <div className="flex gap-2 sm:gap-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isInputDisabled}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSendDisabled}
                  className="px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition shadow-sm"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-slate-800 lg:rounded-r-3xl rounded-b-2xl lg:rounded-bl-none lg:border-l border-t lg:border-t-0 border-slate-700">
            <div className="bg-slate-900 text-white p-4 sm:p-6 lg:rounded-tr-3xl border-b border-slate-700">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <AlertCircle size={20} />
                Radiologist Dashboard
                {notifications.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Escalations only</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {notifications.length === 0 && <EmptyRadiologistState resolved={stats.resolved} escalated={stats.escalated} />}
              {notifications.map((notif) => (
                <NotificationCard
                  key={notif.id}
                  notification={notif}
                  onAcknowledge={handleAcknowledge}
                  onCallBack={handleCallBack}
                />
              ))}
              <div ref={notificationsEndRef} />
            </div>
          </div>
        </div>
      </div>

      {callbackNotification && (
        <CallbackModal
          notification={callbackNotification}
          onClose={() => setCallbackNotification(null)}
        />
      )}
    </div>
  );
}

export default App;
