import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Phone, AlertCircle, CheckCircle, Clock, User, Activity, TrendingUp, Bell, Check, CheckCheck, Loader2, Database, BookOpen, PhoneCall, X, Mic, ThumbsUp, ThumbsDown, Zap, FileText, Users, CircleDot, Sun, Moon, ChevronRight } from 'lucide-react';

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

const QUICK_ACTIONS = [
  { label: 'Check Status', icon: FileText, query: "What's the status of my patient's imaging?" },
  { label: 'ACR Criteria', icon: BookOpen, query: 'Show me ACR appropriateness criteria' },
  { label: 'Contacts', icon: Users, query: 'Who covers radiology today?' },
  { label: 'Escalate', icon: Zap, query: 'URGENT: Need immediate radiology consultation' }
];

const RECENT_EXAMS = [
  { mrn: '847291', name: 'Johnson, M.', exam: 'CT Chest w/Contrast', status: 'In Review', priority: 'STAT' },
  { mrn: '629104', name: 'Williams, R.', exam: 'MRI Brain w/o', status: 'Completed', priority: 'Routine' },
  { mrn: '103847', name: 'Garcia, L.', exam: 'CT Abdomen/Pelvis', status: 'Scheduled', priority: 'Urgent' },
  { mrn: '592016', name: 'Thompson, K.', exam: 'X-Ray Chest', status: 'Completed', priority: 'Routine' },
  { mrn: '738492', name: 'Chen, W.', exam: 'US Abdomen', status: 'In Progress', priority: 'Routine' }
];

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

function getCurrentShift() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 19) {
    return { name: 'Day Shift', icon: Sun, onCall: 'Dr. Martinez (Body), Dr. Chen (Neuro)' };
  }
  return { name: 'Night Shift', icon: Moon, onCall: 'Dr. Williams (General), Page 2400' };
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

function PriorityBadge({ priority }) {
  const styles = {
    STAT: 'bg-red-100 text-red-700 border-red-200',
    Urgent: 'bg-orange-100 text-orange-700 border-orange-200',
    Routine: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${styles[priority] || styles.Routine}`}>
      {priority}
    </span>
  );
}

function SystemStatus() {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5">
        <CircleDot size={10} className="text-green-500" />
        <span className="text-slate-600">PACS</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CircleDot size={10} className="text-green-500" />
        <span className="text-slate-600">RIS</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CircleDot size={10} className="text-green-500" />
        <span className="text-slate-600">HL7</span>
      </div>
    </div>
  );
}

function ShiftIndicator() {
  const shift = getCurrentShift();
  const Icon = shift.icon;

  return (
    <div className="flex items-center gap-2 text-xs bg-slate-100 rounded-lg px-2 py-1">
      <Icon size={12} className="text-slate-600" />
      <span className="font-medium text-slate-700">{shift.name}</span>
      <span className="text-slate-400">|</span>
      <span className="text-slate-500 truncate max-w-32">{shift.onCall}</span>
    </div>
  );
}

function PatientContextBar({ patient, onClear }) {
  if (!patient) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 font-medium">MRN:</span>
          <span className="font-mono text-slate-800">{patient.mrn}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-600 font-medium">Patient:</span>
          <span className="text-slate-800">{patient.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-600 font-medium">Exam:</span>
          <span className="text-slate-800">{patient.exam}</span>
        </div>
        <PriorityBadge priority={patient.priority} />
      </div>
      <button onClick={onClear} className="text-blue-400 hover:text-blue-600 transition">
        <X size={16} />
      </button>
    </div>
  );
}

function RecentExamsSidebar({ exams, onSelect, selectedMrn }) {
  return (
    <div className="w-48 bg-slate-50 border-r border-slate-200 flex-shrink-0 hidden xl:flex flex-col">
      <div className="p-3 border-b border-slate-200">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Recent Exams</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {exams.map((exam) => (
          <button
            key={exam.mrn}
            onClick={() => onSelect(exam)}
            className={`w-full text-left p-3 border-b border-slate-100 hover:bg-blue-50 transition ${selectedMrn === exam.mrn ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs text-slate-500">{exam.mrn}</span>
              <PriorityBadge priority={exam.priority} />
            </div>
            <p className="text-sm font-medium text-slate-800 truncate">{exam.name}</p>
            <p className="text-xs text-slate-500 truncate">{exam.exam}</p>
            <p className={`text-xs mt-1 ${exam.status === 'Completed' ? 'text-green-600' : exam.status === 'In Review' ? 'text-orange-600' : 'text-slate-500'}`}>
              {exam.status}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickActions({ onAction, disabled }) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={() => onAction(action.query)}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 text-xs font-medium rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon size={12} />
            {action.label}
          </button>
        );
      })}
    </div>
  );
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

function MessageReactions({ messageId, reactions, onReact }) {
  return (
    <div className="flex items-center gap-1 mt-2">
      <button
        onClick={() => onReact(messageId, 'up')}
        className={`p-1 rounded hover:bg-slate-100 transition ${reactions?.up ? 'text-green-600 bg-green-50' : 'text-slate-400'}`}
      >
        <ThumbsUp size={12} />
      </button>
      <button
        onClick={() => onReact(messageId, 'down')}
        className={`p-1 rounded hover:bg-slate-100 transition ${reactions?.down ? 'text-red-600 bg-red-50' : 'text-slate-400'}`}
      >
        <ThumbsDown size={12} />
      </button>
    </div>
  );
}

function UserMessage({ text, time, status, priority }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl px-4 py-3 shadow-md max-w-full">
      {priority && priority !== 'Routine' && (
        <div className="mb-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${priority === 'STAT' ? 'bg-red-500' : 'bg-orange-500'}`}>
            {priority}
          </span>
        </div>
      )}
      <p className="text-sm leading-relaxed break-words">{text}</p>
      <div className="flex justify-end">
        <MessageStatus status={status} time={time} />
      </div>
    </div>
  );
}

function AIMessage({ messageId, text, hasData, dataSource, dataContent, time, reactions, onReact }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {hasData && <DataCard source={dataSource} content={dataContent} />}
      {text && (
        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200">
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{text}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-slate-400">{time}</p>
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
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(message.timestamp));
    }, 10000);
    return () => clearInterval(interval);
  }, [message.timestamp]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {isUser ? (
          <UserMessage text={message.text} time={relativeTime} status={message.status} priority={message.priority} />
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

function EmptyClinicianState() {
  return (
    <div className="text-center py-8 sm:py-12">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
        <Activity size={32} className="text-blue-600" />
      </div>
      <p className="text-base font-bold text-slate-800">Welcome to Radiology AI</p>
      <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto px-4">
        Select a patient from Recent Exams or use Quick Actions below
      </p>
    </div>
  );
}

function StatsPanel({ resolved, escalated }) {
  return (
    <div className="mt-6 bg-slate-700 rounded-2xl p-4 max-w-xs mx-auto shadow-sm border border-slate-600">
      <div className="flex items-center gap-2 text-white font-bold mb-3">
        <TrendingUp size={14} className="text-blue-400" />
        <span className="text-xs">Today's Stats</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center p-2 bg-slate-600 rounded-xl border border-slate-500">
          <p className="text-slate-300 text-xs mb-0.5">AI Resolved</p>
          <p className="text-2xl font-bold text-blue-400">{resolved}</p>
        </div>
        <div className="text-center p-2 bg-slate-600 rounded-xl border border-slate-500">
          <p className="text-slate-300 text-xs mb-0.5">Escalated</p>
          <p className="text-2xl font-bold text-orange-400">{escalated}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyRadiologistState({ resolved, escalated }) {
  return (
    <div className="text-center py-8 sm:py-12">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
        <CheckCircle size={32} className="text-blue-400" />
      </div>
      <p className="text-base font-bold text-white">All Clear</p>
      <p className="text-xs text-slate-400 mt-1">No pending urgent consultations</p>
      <p className="text-xs text-slate-500 mt-1">AI is handling routine queries</p>
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
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const notificationsEndRef = useRef(null);
  const notificationIdRef = useRef(0);
  const messageIdRef = useRef(0);

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

  function handleReaction(messageId, type) {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = { ...msg.reactions };
        if (type === 'up') {
          reactions.up = !reactions.up;
          reactions.down = false;
        } else {
          reactions.down = !reactions.down;
          reactions.up = false;
        }
        return { ...msg, reactions };
      }
      return msg;
    }));
  }

  function handleVoiceInput() {
    setIsListening(true);
    // Simulate voice input
    setTimeout(() => {
      setIsListening(false);
      setUserInput("What's the status of my patient's CT scan?");
    }, 2000);
  }

  function handleSelectPatient(patient) {
    setSelectedPatient(patient);
  }

  function detectPriority(input) {
    const lower = input.toLowerCase();
    if (lower.includes('urgent') || lower.includes('stat') || lower.includes('critical') || lower.includes('emergency')) {
      return 'STAT';
    }
    if (lower.includes('soon') || lower.includes('priority')) {
      return 'Urgent';
    }
    return 'Routine';
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

      const msgId = ++messageIdRef.current;
      setMessages(prev => [...prev, {
        id: msgId,
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
        },
        reactions: {}
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

      const msgId = ++messageIdRef.current;
      setMessages(prev => [...prev, {
        id: msgId,
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
        },
        reactions: {}
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

      const msgId = ++messageIdRef.current;
      setMessages(prev => [...prev, { id: msgId, sender: 'ai', text: '', timestamp: Date.now(), hasData: false, reactions: {} }]);

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

      const msgId = ++messageIdRef.current;
      setMessages(prev => [...prev, {
        id: msgId,
        sender: 'ai',
        text: '',
        timestamp: Date.now(),
        hasData: true,
        dataSource: 'Contact Directory',
        dataContent: CONTACT_DIRECTORY,
        reactions: {}
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

      const msgId = ++messageIdRef.current;
      setMessages(prev => [...prev, { id: msgId, sender: 'ai', text: '', timestamp: Date.now(), hasData: false, reactions: {} }]);
      await typeMessage(
        "Standard brain MRI includes T1, T2, FLAIR, and DWI. Add T1 post-contrast for enhancement evaluation. Protocols vary by indication—what's the clinical scenario? I can pull the specific protocol or connect you with a radiologist."
      );
      setStats(prev => ({ ...prev, resolved: prev.resolved + 1 }));
      return;
    }

    setThinkingType('pacs');
    await delay(400);
    setThinkingType(null);

    const msgId = ++messageIdRef.current;
    setMessages(prev => [...prev, { id: msgId, sender: 'ai', text: '', timestamp: Date.now(), hasData: false, reactions: {} }]);
    await typeMessage(
      "I can help with exam status, ACR criteria, radiologist contacts, urgent escalations, and imaging protocols. Try the demo above to see examples, or ask about a specific case."
    );
  }

  async function handleSendMessage(inputOverride) {
    const input = inputOverride || userInput;
    if (!input.trim() || isTyping || thinkingType) return;

    const messageIndex = messages.length;
    const priority = detectPriority(input);
    setMessages(prev => [...prev, { sender: 'user', text: input, timestamp: Date.now(), status: 'sent', priority }]);
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
    setSelectedPatient(RECENT_EXAMS[0]);

    for (let i = 0; i < DEMO_SEQUENCE.length; i++) {
      const step = DEMO_SEQUENCE[i];
      await delay(step.delay);
      await typeIntoInput(step.input);
      await delay(300);

      const messageIndex = messages.length + (i * 2);
      const priority = detectPriority(step.input);
      setMessages(prev => [...prev, { sender: 'user', text: step.input, timestamp: Date.now(), status: 'sent', priority }]);
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
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">RadChat AI</h1>
          <SystemStatus />
        </div>
        <div className="flex items-center gap-3">
          <ShiftIndicator />
          <button
            onClick={runDemo}
            disabled={isInputDisabled}
            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold rounded-full hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition shadow-md"
          >
            {isRunningDemo ? 'Running...' : 'Run Demo'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Recent Exams Sidebar */}
        <RecentExamsSidebar
          exams={RECENT_EXAMS}
          onSelect={handleSelectPatient}
          selectedMrn={selectedPatient?.mrn}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Clinician Interface */}
          <div className="flex-1 flex flex-col bg-white lg:border-r border-slate-200">
            {/* Patient Context Bar */}
            <PatientContextBar patient={selectedPatient} onClear={() => setSelectedPatient(null)} />

            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 border-b border-blue-800">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <User size={16} />
                Clinician Chat
              </h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 && !thinkingType && <EmptyClinicianState />}
              {messages.map((msg, idx) => (
                <Message key={idx} message={msg} onReact={handleReaction} />
              ))}
              {thinkingType && <ThinkingIndicator type={thinkingType} />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <QuickActions onAction={(q) => handleSendMessage(q)} disabled={isInputDisabled} />
              <div className="flex gap-2">
                <button
                  onClick={handleVoiceInput}
                  disabled={isInputDisabled}
                  className={`p-3 rounded-xl transition shadow-sm ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'} disabled:opacity-50`}
                >
                  <Mic size={18} />
                </button>
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? 'Listening...' : 'Type your message...'}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isInputDisabled}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isSendDisabled}
                  className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition shadow-sm"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Radiologist Dashboard */}
          <div className="flex-1 flex flex-col bg-slate-800 max-h-[50vh] lg:max-h-full">
            <div className="bg-slate-900 text-white p-3 border-b border-slate-700">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                Radiologist Dashboard
                {notifications.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
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
