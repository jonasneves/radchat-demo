import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Phone, AlertCircle, CheckCircle, Clock, Activity, Bell, Check, CheckCheck, Loader2, Database, BookOpen, PhoneCall, X, Mic, ThumbsUp, ThumbsDown, Zap, FileText, Users, Sun, Moon, ChevronLeft, ChevronRight, Server, ClipboardList } from 'lucide-react';

// Phase definitions matching DIHI proposal
const PHASES = {
  1: {
    name: 'Phase I',
    title: 'Information Retrieval',
    description: 'Contact routing & call schedules',
    features: ['Contact directory', 'Time-based routing', 'Basic triage', 'Protocol info'],
    icon: Phone,
    color: 'bg-duke-royal',
    lightColor: 'bg-duke-royal/10',
    textColor: 'text-duke-royal',
    borderColor: 'border-duke-royal',
    ringColor: 'ring-duke-royal'
  },
  2: {
    name: 'Phase II',
    title: 'ACR Criteria',
    description: 'Evidence-based imaging guidance',
    features: ['ACR Appropriateness', 'Clinical decision support', 'Imaging recommendations'],
    icon: ClipboardList,
    color: 'bg-amber-600',
    lightColor: 'bg-amber-600/10',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-600',
    ringColor: 'ring-amber-600'
  },
  3: {
    name: 'Phase III',
    title: 'EMR Integration',
    description: 'Patient-specific Epic data',
    features: ['PACS/RIS integration', 'Patient context', 'Real-time status', 'Escalation'],
    icon: Server,
    color: 'bg-emerald-600',
    lightColor: 'bg-emerald-600/10',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-600',
    ringColor: 'ring-emerald-600'
  }
};

// Phase-specific demo sequences
const PHASE_DEMO_SEQUENCES = {
  1: [
    { input: "Who covers body imaging today?", delay: 800 },
    { input: "What's the pager for neuroradiology?", delay: 1500 },
    { input: "How do I reach MRI after hours?", delay: 1500 }
  ],
  2: [
    { input: "Who covers body imaging today?", delay: 800 },
    { input: "What are the ACR appropriateness criteria for suspected PE?", delay: 1500 },
    { input: "Is CT or MRI better for knee ligament injury?", delay: 1500 }
  ],
  3: [
    { input: "What's the status of the chest CT for the patient in ICU bed 4?", delay: 800 },
    { input: "What are the ACR appropriateness criteria for suspected PE?", delay: 1500 },
    { input: "URGENT: Suspected aortic dissection in ER bay 2", delay: 1500 },
    { input: "Who covers body imaging today?", delay: 1500 }
  ]
};

// Phase-specific quick actions
const PHASE_QUICK_ACTIONS = {
  1: [
    { label: 'Contacts', icon: Users, query: 'Who covers radiology today?' },
    { label: 'After Hours', icon: Moon, query: 'How do I reach radiology after hours?' },
    { label: 'Protocol', icon: FileText, query: 'What is the brain MRI protocol?' }
  ],
  2: [
    { label: 'Contacts', icon: Users, query: 'Who covers radiology today?' },
    { label: 'ACR Criteria', icon: BookOpen, query: 'Show me ACR appropriateness criteria' },
    { label: 'Protocol', icon: FileText, query: 'What is the brain MRI protocol?' }
  ],
  3: [
    { label: 'Check Status', icon: FileText, query: "What's the status of my patient's imaging?" },
    { label: 'ACR Criteria', icon: BookOpen, query: 'Show me ACR appropriateness criteria' },
    { label: 'Contacts', icon: Users, query: 'Who covers radiology today?' },
    { label: 'Escalate', icon: Zap, query: 'URGENT: Need immediate radiology consultation' }
  ]
};

// Default demo sequence (used as fallback)
const DEMO_SEQUENCE = PHASE_DEMO_SEQUENCES[3];

const CONTACT_DIRECTORY = {
  'General Radiology': 'Ext. 5100',
  'Neuroradiology (Dr. Chen)': 'Ext. 5105',
  'Body Imaging (Dr. Martinez)': 'Ext. 5110',
  'Musculoskeletal (Dr. Kim)': 'Ext. 5115',
  'After Hours/Urgent': 'Page 2400'
};

// Default quick actions (used as fallback)
const QUICK_ACTIONS = PHASE_QUICK_ACTIONS[3];

const RECENT_EXAMS = [
  {
    mrn: '847291',
    name: 'Johnson, M.',
    exam: 'CT Chest w/Contrast',
    status: 'In Review',
    priority: 'STAT',
    location: 'ICU Bed 4',
    time: '2:45 PM',
    radiologist: 'Dr. Martinez',
    findings: 'No acute findings (prelim)',
    eta: '~30 minutes'
  },
  {
    mrn: '629104',
    name: 'Williams, R.',
    exam: 'MRI Brain w/o',
    status: 'Completed',
    priority: 'Routine',
    location: 'Neuro Floor 3B',
    time: '11:20 AM',
    radiologist: 'Dr. Chen',
    findings: 'No acute intracranial abnormality. Mild chronic microvascular changes.',
    eta: 'Final report available'
  },
  {
    mrn: '103847',
    name: 'Garcia, L.',
    exam: 'CT Abdomen/Pelvis',
    status: 'Scheduled',
    priority: 'Urgent',
    location: 'ED Bay 7',
    time: '4:15 PM',
    radiologist: 'Pending',
    findings: 'Not yet performed',
    eta: 'Scheduled for 4:15 PM'
  },
  {
    mrn: '592016',
    name: 'Thompson, K.',
    exam: 'X-Ray Chest',
    status: 'Completed',
    priority: 'Routine',
    location: 'Med-Surg 5A',
    time: '9:30 AM',
    radiologist: 'Dr. Kim',
    findings: 'Clear lungs. No cardiomegaly. No pleural effusion.',
    eta: 'Final report available'
  },
  {
    mrn: '738492',
    name: 'Chen, W.',
    exam: 'US Abdomen',
    status: 'In Progress',
    priority: 'Routine',
    location: 'Outpatient',
    time: '3:30 PM',
    radiologist: 'Dr. Martinez',
    findings: 'Scan in progress',
    eta: '~45 minutes'
  }
];

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

const PRIORITY_STYLES = {
  STAT: 'bg-red-600 text-white',
  Urgent: 'bg-amber-600 text-white',
  Routine: 'bg-duke-hatteras text-duke-graphite'
};

const EXAM_STATUS_STYLES = {
  Completed: 'text-duke-piedmont',
  'In Review': 'text-duke-copper',
  'In Progress': 'text-duke-shale',
  Scheduled: 'text-duke-graphite'
};

function PriorityBadge({ priority, size = 'sm' }) {
  const sizeStyles = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  return (
    <span className={`font-bold rounded-md ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.Routine} ${sizeStyles}`}>
      {priority}
    </span>
  );
}

function ExamStatus({ status }) {
  return (
    <p className={`text-sm font-medium ${EXAM_STATUS_STYLES[status] || 'text-slate-400'}`}>
      {status}
    </p>
  );
}

function ShiftIndicator() {
  const shift = getCurrentShift();
  const Icon = shift.icon;

  return (
    <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-xl">
      <span className="text-slate-400">On Call:</span>
      <Icon size={16} />
      <span>{shift.name} Shift</span>
      <span className="text-slate-300">•</span>
      <span className="text-slate-700 font-medium">{shift.onCall}</span>
    </div>
  );
}

function PhaseToggle({ currentPhase, onPhaseChange, disabled }) {
  const currentConfig = PHASES[currentPhase];

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        {[1, 2, 3].map((phase) => {
          const phaseConfig = PHASES[phase];
          const Icon = phaseConfig.icon;
          const isActive = currentPhase === phase;

          return (
            <button
              key={phase}
              onClick={() => onPhaseChange(phase)}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]
                ${isActive
                  ? `${phaseConfig.color} text-white shadow-sm`
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{phaseConfig.name}</span>
              <span className="sm:hidden">{phase}</span>
            </button>
          );
        })}
      </div>

      {/* Phase info */}
      <div className="hidden md:flex items-center gap-4">
        <div className="h-8 w-px bg-slate-200" />
        <div className="flex flex-col">
          <span className={`text-sm font-semibold ${currentConfig.textColor}`}>
            {currentConfig.title}
          </span>
          <span className="text-xs text-slate-500">
            {currentConfig.description}
          </span>
        </div>
        <div className="hidden xl:flex items-center gap-2">
          {currentConfig.features.map((feature, idx) => (
            <span
              key={idx}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${currentConfig.lightColor} ${currentConfig.textColor}`}
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PatientContextBar({ patient, onClear }) {
  if (!patient) return null;

  return (
    <div className="bg-duke-royal-light border-b border-duke-royal/10 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs uppercase tracking-wide">MRN</span>
          <span className="font-mono font-semibold text-slate-800">{patient.mrn}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{patient.name}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-slate-500">{patient.exam}</span>
        </div>
        <PriorityBadge priority={patient.priority} />
      </div>
      <button onClick={onClear} className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-white/50 rounded">
        <X size={16} />
      </button>
    </div>
  );
}

function RecentExamsSidebar({ exams, onSelect, selectedMrn }) {
  return (
    <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 hidden xl:flex flex-col">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Recent Exams</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {exams.map((exam) => (
          <button
            key={exam.mrn}
            onClick={() => onSelect(exam)}
            className={`w-full text-left px-5 py-4 border-b border-slate-50 hover:bg-duke-hatteras/50 transition ${
              selectedMrn === exam.mrn ? 'bg-duke-royal-light border-l-3 border-l-duke-royal' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm text-slate-400">{exam.mrn}</span>
              <PriorityBadge priority={exam.priority} />
            </div>
            <p className="text-base font-medium text-slate-800 mb-1">{exam.name}</p>
            <p className="text-sm text-slate-500 mb-1.5">{exam.exam}</p>
            <ExamStatus status={exam.status} />
          </button>
        ))}
      </div>
    </div>
  );
}

function QuickActions({ onAction, disabled, currentPhase = 3 }) {
  const actions = PHASE_QUICK_ACTIONS[currentPhase] || QUICK_ACTIONS;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={() => onAction(action.query)}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-duke-royal/40 hover:bg-duke-royal-light text-slate-600 hover:text-duke-royal text-sm font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Icon size={18} />
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
      <div className="bg-duke-navy text-white px-4 py-2.5 flex items-center gap-2">
        <Database size={16} />
        <span className="text-sm font-semibold uppercase tracking-wide">{source}</span>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        {Object.entries(content).map(([key, value]) => (
          <div key={key}>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </p>
            <p className="text-base text-slate-800 font-medium">{value}</p>
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
    <div className="flex justify-start mb-4">
      <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-200 flex items-center gap-3">
        <Icon size={18} className="text-duke-royal animate-pulse" />
        <span className="text-sm text-slate-500">{config.text}</span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-duke-royal rounded-full animate-bounce" />
          <div className="w-1.5 h-1.5 bg-duke-royal rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <div className="w-1.5 h-1.5 bg-duke-royal rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
}

function MessageStatus({ status, time }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[10px] text-blue-200/80">{time}</span>
      {status === 'sent' && <Check size={10} className="text-blue-300/60" />}
      {status === 'delivered' && <CheckCheck size={10} className="text-blue-300/60" />}
      {status === 'read' && <CheckCheck size={10} className="text-blue-100" />}
    </div>
  );
}

function MessageReactions({ messageId, reactions, onReact }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onReact(messageId, 'up')}
        className={`p-1.5 rounded-lg transition ${reactions?.up ? 'text-green-500 bg-green-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'}`}
      >
        <ThumbsUp size={16} />
      </button>
      <button
        onClick={() => onReact(messageId, 'down')}
        className={`p-1.5 rounded-lg transition ${reactions?.down ? 'text-red-500 bg-red-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'}`}
      >
        <ThumbsDown size={16} />
      </button>
    </div>
  );
}

function UserMessage({ text, time, status, priority }) {
  return (
    <div className="bg-gradient-to-r from-duke-royal to-duke-navy text-white rounded-2xl rounded-br-md px-5 py-3 shadow-sm max-w-full">
      {priority && priority !== 'Routine' && (
        <div className="mb-2">
          <span className={`text-xs font-bold px-2 py-1 rounded ${priority === 'STAT' ? 'bg-red-600' : 'bg-amber-600'}`}>
            {priority}
          </span>
        </div>
      )}
      <p className="text-base leading-relaxed">{text}</p>
      <div className="flex justify-end">
        <MessageStatus status={status} time={time} />
      </div>
    </div>
  );
}

function AIMessage({ messageId, text, hasData, dataSource, dataContent, time, reactions, onReact }) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {hasData && <DataCard source={dataSource} content={dataContent} />}
      {text && (
        <div className="bg-white rounded-2xl rounded-bl-md px-5 py-3 shadow-sm border border-slate-100">
          <p className="text-base leading-relaxed text-slate-700">{text}</p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
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
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(message.timestamp));
    }, 10000);
    return () => clearInterval(interval);
  }, [message.timestamp]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] sm:max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
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
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-24 h-24 bg-duke-royal/10 rounded-3xl flex items-center justify-center mb-6">
        <Activity size={44} className="text-duke-royal" />
      </div>
      <p className="text-2xl font-semibold text-slate-800 mb-2">
        How can I help?
      </p>
      <p className="text-lg text-slate-500">
        Use the quick actions below or type a message
      </p>
    </div>
  );
}

function StatsPanel({ resolved, escalated }) {
  return (
    <div className="mt-8 grid grid-cols-2 gap-4 max-w-xs mx-auto">
      <div className="text-center p-4 bg-white/10 rounded-xl">
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">AI Resolved</p>
        <p className="text-3xl font-bold text-duke-shale">{resolved}</p>
      </div>
      <div className="text-center p-4 bg-white/10 rounded-xl">
        <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Escalated</p>
        <p className="text-3xl font-bold text-duke-persimmon">{escalated}</p>
      </div>
    </div>
  );
}

function EmptyRadiologistState({ resolved, escalated }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mb-4">
        <CheckCircle size={32} className="text-green-400" />
      </div>
      <p className="text-xl font-semibold text-white mb-1">All Clear</p>
      <p className="text-sm text-slate-400">No pending escalations</p>
      <p className="text-sm text-slate-500 mt-1">AI is handling routine queries</p>
      <StatsPanel resolved={resolved} escalated={escalated} />
    </div>
  );
}

function CallbackModal({ notification, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Calling Back</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center">
            <PhoneCall size={20} className="text-green-600 animate-pulse" />
          </div>
          <div>
            <p className="font-medium text-slate-900 text-sm">{notification.from}</p>
            <p className="text-xs text-slate-500">{notification.contact}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600 transition font-medium"
        >
          End Call
        </button>
      </div>
    </div>
  );
}

function ChatModal({ notification, onClose, onSend }) {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'system', text: `Chat started with ${notification.from}` }
  ]);

  function handleSend() {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { sender: 'radiologist', text: chatInput }]);
    setChatInput('');
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'clinician', text: 'Thank you, on my way to review the images now.' }]);
    }, 1000);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">Chat</h3>
            <p className="text-xs text-slate-500">{notification.from}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-slate-700">
            <p className="font-medium text-amber-800 text-xs mb-1">Escalation</p>
            {notification.message}
          </div>
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'radiologist' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'system' ? (
                <p className="text-xs text-slate-400 text-center w-full">{msg.text}</p>
              ) : (
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                  msg.sender === 'radiologist'
                    ? 'bg-duke-royal text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {msg.text}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-duke-royal"
            />
            <button
              onClick={handleSend}
              disabled={!chatInput.trim()}
              className="px-4 py-2 bg-duke-royal text-white rounded-lg hover:bg-duke-navy disabled:bg-slate-200 transition"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationCard({ notification, onAcknowledge, onCallBack, onChat }) {
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
      className={`mb-3 rounded-xl overflow-hidden shadow-sm ${isUrgent ? 'bg-red-50 ring-1 ring-red-200 animate-pulse' : 'bg-amber-50 ring-1 ring-amber-200'}`}
      style={isUrgent ? { animationDuration: '1.5s', animationIterationCount: '4' } : undefined}
    >
      <div className={`px-3 py-2 ${isUrgent ? 'bg-red-500' : 'bg-amber-500'} text-white flex items-center gap-2`}>
        {isUrgent ? <Bell size={14} /> : <Clock size={14} />}
        <span className="text-xs font-semibold uppercase tracking-wide">
          {isUrgent ? 'Urgent Escalation' : 'Needs Review'}
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm text-slate-700 mb-2">{notification.message}</p>
        <div className="text-xs text-slate-500 space-y-0.5 mb-3">
          <p><span className="text-slate-400">From:</span> {notification.from}</p>
          <p><span className="text-slate-400">Contact:</span> {notification.contact}</p>
          <p><span className="text-slate-400">Time:</span> {relativeTime}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onCallBack(notification)}
            className="flex-1 px-3 py-1.5 bg-duke-royal text-white text-xs rounded-lg hover:bg-duke-navy transition flex items-center justify-center gap-1.5 font-medium"
          >
            <Phone size={12} /> Call
          </button>
          <button
            onClick={() => onChat(notification)}
            className="flex-1 px-3 py-1.5 bg-duke-shale text-white text-xs rounded-lg hover:bg-duke-royal transition flex items-center justify-center gap-1.5 font-medium"
          >
            <Send size={12} /> Chat
          </button>
          <button
            onClick={() => onAcknowledge(notification.id)}
            className="flex-1 px-3 py-1.5 bg-slate-600 text-white text-xs rounded-lg hover:bg-slate-700 transition font-medium"
          >
            Acknowledge
          </button>
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
  const [showRadiologistView, setShowRadiologistView] = useState(true);
  const [callbackNotification, setCallbackNotification] = useState(null);
  const [chatNotification, setChatNotification] = useState(null);
  const [stats, setStats] = useState({ resolved: 47, escalated: 3 });
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(3);
  const messagesEndRef = useRef(null);
  const notificationsEndRef = useRef(null);
  const notificationIdRef = useRef(0);
  const messageIdRef = useRef(0);

  // Handle phase change - reset conversation
  function handlePhaseChange(newPhase) {
    setCurrentPhase(newPhase);
    setMessages([]);
    setNotifications([]);
    setSelectedPatient(null);
    setStats({ resolved: 47, escalated: 3 });
  }

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
      if (msg.id !== messageId) return msg;
      const isUp = type === 'up';
      return {
        ...msg,
        reactions: {
          up: isUp ? !msg.reactions?.up : false,
          down: isUp ? false : !msg.reactions?.down
        }
      };
    }));
  }

  function handleVoiceInput() {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      setUserInput("What's the status of my patient's CT scan?");
    }, 2000);
  }

  function handleSelectPatient(patient) {
    setSelectedPatient(patient);
    setMessages([]);

    const msgId = ++messageIdRef.current;
    setMessages([{
      id: msgId,
      sender: 'ai',
      text: patient.status === 'Completed'
        ? `${patient.exam} completed at ${patient.time}. Final report is available.`
        : patient.status === 'Scheduled'
        ? `${patient.exam} scheduled for ${patient.time}. Patient in ${patient.location}.`
        : `${patient.exam} is ${patient.status.toLowerCase()}. ${patient.radiologist} is reviewing. ETA: ${patient.eta}`,
      timestamp: Date.now(),
      hasData: true,
      dataSource: 'PACS/RIS',
      dataContent: {
        Patient: patient.name,
        MRN: patient.mrn,
        Exam: patient.exam,
        Location: patient.location,
        Time: patient.time,
        Status: patient.status,
        Radiologist: patient.radiologist,
        Findings: patient.findings
      },
      reactions: {}
    }]);
  }

  function detectPriority(input) {
    const lower = input.toLowerCase();
    const statKeywords = ['urgent', 'stat', 'critical', 'emergency'];
    const urgentKeywords = ['soon', 'priority'];

    if (statKeywords.some(kw => lower.includes(kw))) return 'STAT';
    if (urgentKeywords.some(kw => lower.includes(kw))) return 'Urgent';
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

  function addAIMessage(options = {}) {
    const msgId = ++messageIdRef.current;
    setMessages(prev => [...prev, {
      id: msgId,
      sender: 'ai',
      text: '',
      timestamp: Date.now(),
      hasData: Boolean(options.dataSource),
      dataSource: options.dataSource,
      dataContent: options.dataContent,
      reactions: {}
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

    // Phase 1 & 2: Patient status queries require EMR integration (Phase III)
    if (lowerInput.includes('status') || lowerInput.includes('chest ct') || lowerInput.includes('report')) {
      if (currentPhase < 3) {
        await showThinking('pacs', 500);
        addAIMessage();
        await typeMessage(
          "Patient-specific status queries require EMR integration, which will be available in Phase III. I can help you with contact information or imaging criteria instead."
        );
        incrementResolved();
        return;
      }

      await showThinking('pacs', 800);
      addAIMessage({
        dataSource: 'PACS/RIS',
        dataContent: {
          Exam: 'Chest CT with Contrast',
          Location: 'ICU Bed 4',
          Time: '2:45 PM',
          Status: 'In Review',
          Radiologist: 'Dr. Martinez',
          Findings: 'No acute findings (prelim)',
          ETA: '~30 minutes'
        }
      });
      await typeMessage(
        "Found it. The chest CT was completed at 2:45 PM and is being finalized by Dr. Martinez. Preliminary read shows no acute findings. You'll get a notification when signed."
      );
      incrementResolved();
      return;
    }

    // Phase 1: ACR criteria not yet available
    if (lowerInput.includes('acr') || lowerInput.includes('criteria') || lowerInput.includes('appropriateness') || /\bpe\b/.test(lowerInput)) {
      if (currentPhase < 2) {
        await showThinking('acr', 400);
        addAIMessage();
        await typeMessage(
          "ACR Appropriateness Criteria integration will be available in Phase II. For now, I can help you with contact information and call schedules."
        );
        incrementResolved();
        return;
      }

      await showThinking('acr', 600);
      addAIMessage({
        dataSource: 'ACR Criteria',
        dataContent: {
          Indication: 'Suspected PE',
          Procedure: 'CT Pulmonary Angiography',
          Rating: '9/9 (Usually Appropriate)',
          Notes: 'Intermediate-high probability',
          Alternative: 'D-dimer if low probability'
        }
      });
      await typeMessage(
        "CTPA is recommended for suspected PE with intermediate to high clinical probability (9/9). For low-probability cases, consider D-dimer first."
      );
      incrementResolved();
      return;
    }

    // Phase 1 & 2: Escalation requires EMR integration (Phase III)
    if (lowerInput.includes('urgent') || lowerInput.includes('stroke') || lowerInput.includes('critical') || lowerInput.includes('dissection')) {
      if (currentPhase < 3) {
        await showThinking('escalate', 400);
        addAIMessage();
        await typeMessage(
          "Automated escalation workflows require EMR integration, available in Phase III. For urgent cases now, please call the on-call radiologist directly at Page 2400."
        );
        incrementResolved();
        return;
      }

      await showThinking('escalate', 400);
      addAIMessage();

      const isDissection = lowerInput.includes('dissection');
      const alertType = isDissection ? 'Suspected aortic dissection' : 'Stroke alert';

      await typeMessage(
        isDissection
          ? "Escalating now. Dr. Chen (Cardiothoracic) is being paged and will call within 2 minutes."
          : "Code stroke activated. Neuroradiology is being paged. CT scanner 2 is held for you."
      );

      setTimeout(() => {
        const id = ++notificationIdRef.current;
        setNotifications(prev => [...prev, {
          id,
          type: 'urgent',
          message: `${alertType} - immediate consultation needed`,
          from: 'Dr. Sarah Park - ED',
          timestamp: Date.now(),
          contact: 'Ext. 4521'
        }]);
        setStats(prev => ({ ...prev, escalated: prev.escalated + 1 }));
        playNotificationSound();
        showBrowserNotification('Urgent Escalation', alertType);
      }, 300);
      return;
    }

    // All phases: Contact information is always available
    if (lowerInput.includes('who') || lowerInput.includes('call') || lowerInput.includes('contact') || lowerInput.includes('covers') || lowerInput.includes('pager') || lowerInput.includes('reach') || lowerInput.includes('after hours')) {
      await showThinking('contacts', 500);
      addAIMessage({
        dataSource: 'Directory',
        dataContent: CONTACT_DIRECTORY
      });
      await typeMessage(
        "Here are today's contacts. For urgent after-hours cases, use Page 2400."
      );
      incrementResolved();
      return;
    }

    // All phases: Protocol information is available
    if (lowerInput.includes('protocol') || lowerInput.includes('how')) {
      await showThinking('protocol', 600);
      addAIMessage();
      await typeMessage(
        "Standard brain MRI: T1, T2, FLAIR, DWI. Add T1 post-contrast for enhancement. What's the clinical scenario?"
      );
      incrementResolved();
      return;
    }

    // Default response based on phase
    await showThinking('pacs', 400);
    addAIMessage();

    const phaseHelpText = currentPhase === 1
      ? "I can help with contact information, call schedules, and protocols. Try the quick actions or run the demo."
      : currentPhase === 2
      ? "I can help with contact information, ACR criteria, and protocols. Try the quick actions or run the demo."
      : "I can help with exam status, ACR criteria, contacts, escalations, and protocols. Try the quick actions or run the demo.";

    await typeMessage(phaseHelpText);
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

    // Only set patient context in Phase III
    if (currentPhase === 3) {
      setSelectedPatient(RECENT_EXAMS[0]);
    } else {
      setSelectedPatient(null);
    }

    const demoSequence = PHASE_DEMO_SEQUENCES[currentPhase] || DEMO_SEQUENCE;

    for (let i = 0; i < demoSequence.length; i++) {
      const step = demoSequence[i];
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

  function handleChat(notification) {
    setChatNotification(notification);
  }

  const isInputDisabled = isTyping || isRunningDemo || thinkingType;
  const isSendDisabled = isTyping || !userInput.trim() || isRunningDemo || thinkingType;

  return (
    <div className="w-full h-screen bg-duke-whisper flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-slate-900">RadChat</h1>
          <PhaseToggle
            currentPhase={currentPhase}
            onPhaseChange={handlePhaseChange}
            disabled={isRunningDemo || isTyping}
          />
        </div>
        <div className="flex items-center gap-4">
          <ShiftIndicator />
          <button
            onClick={runDemo}
            disabled={isInputDisabled}
            className="px-5 py-2.5 bg-duke-royal text-white text-sm font-medium rounded-xl hover:bg-duke-navy disabled:bg-slate-300 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            {isRunningDemo ? 'Running...' : 'Run Demo'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Patient sidebar only in Phase III */}
        {currentPhase === 3 && (
          <RecentExamsSidebar
            exams={RECENT_EXAMS}
            onSelect={handleSelectPatient}
            selectedMrn={selectedPatient?.mrn}
          />
        )}

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Clinician Chat */}
          <div className="flex-1 flex flex-col bg-slate-50 lg:border-r border-slate-200">
            {currentPhase === 3 && (
              <PatientContextBar patient={selectedPatient} onClear={() => setSelectedPatient(null)} />
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 && !thinkingType ? (
                  <EmptyClinicianState />
                ) : (
                  <>
                    {messages.map((msg, idx) => (
                      <Message key={idx} message={msg} onReact={handleReaction} />
                    ))}
                    {thinkingType && <ThinkingIndicator type={thinkingType} />}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-5 bg-white border-t border-slate-200">
                <QuickActions onAction={(q) => handleSendMessage(q)} disabled={isInputDisabled} currentPhase={currentPhase} />
                <div className="flex gap-3">
                  <button
                    onClick={handleVoiceInput}
                    disabled={isInputDisabled}
                    className={`p-3 rounded-xl transition min-h-[48px] min-w-[48px] flex items-center justify-center ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    } disabled:opacity-50`}
                  >
                    <Mic size={22} />
                  </button>
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isListening ? 'Listening...' : 'Type a message...'}
                    className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-duke-royal focus:border-transparent text-base min-h-[48px]"
                    disabled={isInputDisabled}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isSendDisabled}
                    className="px-5 py-3 bg-duke-royal text-white rounded-xl hover:bg-duke-navy disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition min-h-[48px] min-w-[48px] flex items-center justify-center"
                  >
                    <Send size={22} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Radiologist Dashboard - Phase III only */}
          {currentPhase === 3 && (
            <div className={`flex-shrink-0 flex flex-col bg-slate-800 max-h-[40vh] lg:max-h-full relative ${showRadiologistView ? 'w-96' : 'w-0'}`}>
              {/* Toggle button on left edge */}
              <button
                onClick={() => setShowRadiologistView(!showRadiologistView)}
                className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-l-lg flex items-center justify-center transition shadow-md"
                title={showRadiologistView ? 'Hide Radiologist View' : 'Show Radiologist View'}
              >
                {showRadiologistView ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>

              {showRadiologistView && (
                <>
                  <div className="px-5 py-4 border-b border-slate-700 bg-slate-900">
                    <h2 className="text-base font-semibold text-white flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <AlertCircle size={18} />
                        Radiologist View
                      </span>
                      {notifications.length > 0 && (
                        <span className="px-2.5 py-1 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse">
                          {notifications.length}
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Only escalations appear here</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {notifications.length === 0 ? (
                      <EmptyRadiologistState resolved={stats.resolved} escalated={stats.escalated} />
                    ) : (
                      notifications.map((notif) => (
                        <NotificationCard
                          key={notif.id}
                          notification={notif}
                          onAcknowledge={handleAcknowledge}
                          onCallBack={handleCallBack}
                          onChat={handleChat}
                        />
                      ))
                    )}
                    <div ref={notificationsEndRef} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {callbackNotification && (
        <CallbackModal
          notification={callbackNotification}
          onClose={() => setCallbackNotification(null)}
        />
      )}

      {chatNotification && (
        <ChatModal
          notification={chatNotification}
          onClose={() => setChatNotification(null)}
        />
      )}
    </div>
  );
}

export default App;
