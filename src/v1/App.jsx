import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Phone, AlertCircle, CheckCircle, Clock, User, Activity, TrendingUp, Bell, Check, CheckCheck, Database, BookOpen, ThumbsUp, ThumbsDown, ArrowUp } from 'lucide-react';

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

const THINKING_MESSAGES = {
  pacs: { icon: Database, text: 'Querying PACS...' },
  acr: { icon: BookOpen, text: 'Searching ACR...' },
  contacts: { icon: Phone, text: 'Loading contacts...' },
  escalate: { icon: Bell, text: 'Escalating...' },
  protocol: { icon: Activity, text: 'Loading protocol...' }
};

function ThinkingIndicator({ type }) {
  const config = THINKING_MESSAGES[type] || { icon: Activity, text: 'Processing...' };
  const Icon = config.icon;

  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white rounded-3xl px-5 py-3.5 shadow-sm border border-slate-200 flex items-center gap-3">
        <Icon size={18} className="text-blue-600 animate-pulse" />
        <span className="text-sm text-slate-500">{config.text}</span>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    </div>
  );
}

function MessageStatus({ status, time }) {
  return (
    <div className="flex items-center gap-1 mt-2 justify-end">
      <span className="text-xs text-blue-200">{time}</span>
      {status === 'sent' && <Check size={12} className="text-blue-300/60" />}
      {status === 'delivered' && <CheckCheck size={12} className="text-blue-300/60" />}
      {status === 'read' && <CheckCheck size={12} className="text-blue-100" />}
    </div>
  );
}

function MessageReactions({ messageId, reactions, onReact }) {
  return (
    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-100">
      <button
        onClick={() => onReact(messageId, 'up')}
        className={`p-1.5 rounded-lg transition ${reactions?.up ? 'text-green-500 bg-green-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'}`}
      >
        <ThumbsUp size={14} />
      </button>
      <button
        onClick={() => onReact(messageId, 'down')}
        className={`p-1.5 rounded-lg transition ${reactions?.down ? 'text-red-500 bg-red-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'}`}
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}

const RadiologyAssistantPOC = () => {
  const [messages, setMessages] = useState([]);
  const [radiologistNotifications, setRadiologistNotifications] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [thinkingType, setThinkingType] = useState(null);
  const [stats, setStats] = useState({ resolved: 47, escalated: 3 });
  const messagesEndRef = useRef(null);
  const radiologistMessagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messageIdRef = useRef(0);
  const notificationIdRef = useRef(0);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingType]);

  useEffect(() => {
    radiologistMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [radiologistNotifications]);

  // Auto-focus input when typing anywhere
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

  function incrementResolved() {
    setStats(prev => ({ ...prev, resolved: prev.resolved + 1 }));
  }

  async function showThinking(type, delayMs) {
    setThinkingType(type);
    await delay(delayMs);
    setThinkingType(null);
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

  const typeMessage = async (text) => {
    setIsTyping(true);
    const words = text.split(' ');
    let displayText = '';

    for (let i = 0; i < words.length; i++) {
      displayText += (i > 0 ? ' ' : '') + words[i];
      await delay(18);
      updateLastMessage({ text: displayText });
    }

    setIsTyping(false);
  };

  const processMessage = async (input, messageIndex) => {
    const lowerInput = input.toLowerCase();

    await delay(300);
    updateMessageStatus(messageIndex, 'delivered');
    await delay(200);
    updateMessageStatus(messageIndex, 'read');

    if (lowerInput.includes('status') || lowerInput.includes('chest ct') || lowerInput.includes('report')) {
      await showThinking('pacs', 800);
      addAIMessage({
        dataSource: 'PACS/RIS Database',
        dataContent: {
          examType: 'Chest CT with Contrast',
          patientLocation: 'ICU Bed 4',
          examTime: '2:45 PM',
          status: 'In Review',
          radiologist: 'Dr. Martinez',
          findings: 'No acute findings (preliminary)',
          eta: '30 minutes'
        }
      });

      await typeMessage(
        "I found the exam status in our system. The chest CT for patient in ICU bed 4 was completed at 2:45 PM today. The preliminary read shows no acute findings. Final report is currently being reviewed by Dr. Martinez and should be available within the next 30 minutes. You'll receive an automatic notification once it's signed."
      );
      incrementResolved();
    } else if (lowerInput.includes('acr') || lowerInput.includes('criteria') || lowerInput.includes('appropriateness') || /\bpe\b/.test(lowerInput)) {
      await showThinking('acr', 600);
      addAIMessage({
        dataSource: 'ACR Appropriateness Criteria',
        dataContent: {
          indication: 'Suspected Pulmonary Embolism',
          procedure: 'CT Pulmonary Angiography (CTPA)',
          rating: '9/9 (Usually Appropriate)',
          comment: 'Intermediate to high clinical probability',
          alternative: 'D-dimer for low probability patients'
        }
      });

      await typeMessage(
        "I've retrieved the ACR guidelines for this indication. CT Pulmonary Angiography (CTPA) is usually appropriate (rating 9/9) for patients with intermediate to high clinical probability. For low-probability patients, D-dimer testing is recommended first. Would you like me to provide the full protocol or connect you with a radiologist for case-specific guidance?"
      );
      incrementResolved();
    } else if (lowerInput.includes('urgent') || lowerInput.includes('stroke') || lowerInput.includes('critical') || lowerInput.includes('dissection')) {
      await showThinking('escalate', 400);
      addAIMessage();

      const isDissection = lowerInput.includes('dissection');
      await typeMessage(
        isDissection
          ? "This sounds like a critical situation. I'm escalating your query to the on-call radiologist immediately. Dr. Chen (Cardiothoracic) is available and will call you within 2 minutes."
          : "Code stroke activated. Neuroradiology is being paged. Dr. Chen will call within 2 minutes. CT scanner 2 is held for you."
      );

      setTimeout(() => {
        const id = ++notificationIdRef.current;
        setRadiologistNotifications(prev => [...prev, {
          id,
          type: 'urgent',
          message: `URGENT: ${isDissection ? 'Suspected aortic dissection' : 'Stroke alert'} - immediate consultation needed`,
          from: 'Dr. Sarah Park - Emergency Department',
          timestamp: Date.now(),
          contact: 'Ext. 4521'
        }]);
        setStats(prev => ({ ...prev, escalated: prev.escalated + 1 }));
        playNotificationSound();
        showBrowserNotification('Urgent Escalation', isDissection ? 'Suspected aortic dissection' : 'Stroke alert');
      }, 300);
    } else if (lowerInput.includes('who') || lowerInput.includes('call') || lowerInput.includes('contact') || lowerInput.includes('covers')) {
      await showThinking('contacts', 500);
      addAIMessage({
        dataSource: 'Contact Directory',
        dataContent: {
          'General Radiology': 'Ext. 5100',
          'Neuroradiology (Dr. Chen)': 'Ext. 5105',
          'Body Imaging (Dr. Martinez)': 'Ext. 5110',
          'Musculoskeletal (Dr. Kim)': 'Ext. 5115',
          'After Hours/Urgent': 'Page 2400'
        }
      });

      await typeMessage(
        "I've retrieved the radiology contact list for you. These extensions connect you directly to the appropriate subspecialty. For urgent after-hours cases, use the pager system. Would you like me to connect you with a specific radiologist?"
      );
      incrementResolved();
    } else if (lowerInput.includes('protocol') || lowerInput.includes('how')) {
      await showThinking('protocol', 600);
      addAIMessage();
      await typeMessage(
        "I can help with protocol questions. For MRI brain protocols: Standard brain MRI includes T1, T2, FLAIR, and DWI sequences. For contrast studies, add T1 post-contrast. Specific protocols vary by indication. Would you like details for a specific clinical scenario, or should I escalate this to a radiologist for personalized guidance?"
      );
      incrementResolved();
    } else {
      await showThinking('pacs', 400);
      addAIMessage();
      await typeMessage(
        "This is a prototype demo - not fully implemented yet. Please try running the Interactive Demo button above to see the full capabilities, or ask about:\n\n• Exam status/reports\n• ACR appropriateness criteria\n• Radiologist contacts\n• Urgent consultations\n• Imaging protocols"
      );
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isTyping || thinkingType) return;

    const messageIndex = messages.length;
    setMessages(prev => [...prev, { sender: 'user', text: userInput, timestamp: Date.now(), status: 'sent' }]);

    const input = userInput;
    setUserInput('');

    await processMessage(input, messageIndex);
  };

  const typeIntoInput = async (text) => {
    setUserInput('');
    for (let i = 0; i <= text.length; i++) {
      setUserInput(text.slice(0, i));
      await delay(10);
    }
  };

  const runDemo = async () => {
    setIsRunningDemo(true);
    setMessages([]);
    setRadiologistNotifications([]);
    setStats({ resolved: 47, escalated: 3 });

    const demoSequence = [
      { input: "What's the status of the chest CT for the patient in ICU bed 4?", delay: 800 },
      { input: "What are the ACR appropriateness criteria for suspected PE?", delay: 1500 },
      { input: "URGENT: Suspected aortic dissection in ER bay 2", delay: 1500 },
      { input: "Who covers body imaging today?", delay: 1500 }
    ];

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
  };

  function handleAcknowledge(id) {
    setRadiologistNotifications(prev => prev.filter(n => n.id !== id));
  }

  const isInputDisabled = isTyping || isRunningDemo || thinkingType;

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">
            AI Radiology Assistant
          </h1>
          <button
            onClick={runDemo}
            disabled={isInputDisabled}
            className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-bold rounded-full hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition shadow-md"
          >
            {isRunningDemo ? 'Running Demo...' : 'Run Interactive Demo'}
          </button>
        </div>

        {/* Main Split View */}
        <div className="flex-1 flex gap-0 overflow-hidden shadow-2xl rounded-3xl">
          {/* LEFT SIDE - Clinician Chat */}
          <div className="flex-1 flex flex-col bg-slate-50 rounded-l-3xl">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-tl-3xl border-b border-blue-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <User size={22} />
                Clinician Interface
              </h2>
              <p className="text-xs text-blue-100 mt-1">Chat with AI Assistant</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && !thinkingType && (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Activity size={48} className="text-blue-600" />
                  </div>
                  <p className="text-lg font-bold text-slate-800">Welcome to Radiology AI</p>
                  <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                    Ask me questions about imaging orders, exam status, protocols, or contact information
                  </p>
                  <div className="mt-8 space-y-2 text-xs text-slate-500 max-w-md mx-auto">
                    <p className="text-left">Try asking:</p>
                    <ul className="text-left space-y-1 ml-4 list-disc">
                      <li>"What's the status of my chest CT?"</li>
                      <li>"Show me ACR criteria for PE"</li>
                      <li>"Who covers neuroradiology today?"</li>
                      <li>"URGENT: Suspected stroke"</li>
                    </ul>
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const relativeTime = formatRelativeTime(msg.timestamp);
                return (
                  <div key={msg.id || msg.timestamp} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                    <div className={`max-w-[75%] ${msg.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                      {msg.sender === 'user' ? (
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl px-5 py-3.5 shadow-md">
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                          <MessageStatus status={msg.status} time={relativeTime} />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 w-full">
                          {msg.hasData && (
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl shadow-md border border-slate-200 overflow-hidden">
                              <div className="bg-slate-700 text-white px-5 py-2.5 flex items-center gap-2">
                                <Activity size={16} />
                                <span className="text-xs font-bold uppercase tracking-wide">{msg.dataSource}</span>
                              </div>
                              <div className="px-5 py-4 space-y-2.5">
                                {Object.entries(msg.dataContent).map(([key, value]) => (
                                  <div key={key} className="flex text-sm">
                                    <span className="text-slate-500 font-medium min-w-32 capitalize">
                                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                                    </span>
                                    <span className="text-slate-900 font-semibold ml-2">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {msg.text && (
                            <div className="bg-white rounded-3xl px-5 py-3.5 shadow-sm border border-slate-200">
                              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{msg.text}</p>
                              <MessageReactions messageId={msg.id} reactions={msg.reactions} onReact={handleReaction} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {thinkingType && <ThinkingIndicator type={thinkingType} />}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-200 rounded-bl-3xl">
              <div className="flex-1 flex items-center gap-2 pl-5 pr-1.5 py-1.5 bg-white border border-slate-300 rounded-full focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 py-2.5 bg-transparent border-none focus:outline-none text-sm"
                  disabled={isInputDisabled}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isInputDisabled || !userInput.trim()}
                  className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                >
                  <ArrowUp size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Radiologist Dashboard */}
          <div className="flex-1 flex flex-col bg-slate-800 rounded-r-3xl border-l border-slate-700">
            <div className="bg-slate-900 text-white p-6 rounded-tr-3xl border-b border-slate-700">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <AlertCircle size={22} />
                Radiologist Dashboard
                {radiologistNotifications.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    {radiologistNotifications.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-1">Only escalations appear here</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {radiologistNotifications.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-24 h-24 bg-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <CheckCircle size={48} className="text-blue-400" />
                  </div>
                  <p className="text-lg font-bold text-white">All Clear</p>
                  <p className="text-sm text-slate-400 mt-2">No pending urgent consultations</p>
                  <p className="text-xs text-slate-500 mt-3">AI is handling routine queries</p>
                  <div className="mt-10 bg-slate-700 rounded-3xl p-6 max-w-sm mx-auto shadow-sm border border-slate-600">
                    <div className="flex items-center gap-2 text-white font-bold mb-5">
                      <TrendingUp size={18} className="text-blue-400" />
                      <span className="text-sm">Today's Stats</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-slate-600 rounded-2xl border border-slate-500">
                        <p className="text-slate-300 text-xs mb-2">AI Resolved</p>
                        <p className="text-4xl font-bold text-blue-400">{stats.resolved}</p>
                      </div>
                      <div className="text-center p-4 bg-slate-600 rounded-2xl border border-slate-500">
                        <p className="text-slate-300 text-xs mb-2">Escalated</p>
                        <p className="text-4xl font-bold text-orange-400">{stats.escalated}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {radiologistNotifications.map((notif) => {
                const relativeTime = formatRelativeTime(notif.timestamp);
                return (
                  <div
                    key={notif.id}
                    className={`mb-4 border-l-4 ${
                      notif.type === 'urgent' ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50'
                    } rounded-r-3xl shadow-sm animate-pulse`}
                    style={{animationDuration: '1s', animationIterationCount: '3'}}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {notif.type === 'urgent' ? (
                          <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="text-white" size={22} />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <Clock className="text-white" size={22} />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className={`font-bold text-sm mb-2 ${notif.type === 'urgent' ? 'text-red-900' : 'text-amber-900'}`}>
                            {notif.type === 'urgent' ? (
                              <span className="flex items-center gap-2">
                                <Bell size={16} className="text-red-600" />
                                URGENT ESCALATION
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <AlertCircle size={16} className="text-amber-600" />
                                AI Needs Help
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed mb-3">{notif.message}</p>
                          <div className="text-xs text-slate-600 space-y-1 bg-white/60 rounded-xl p-3 mb-3">
                            <p><strong>From:</strong> {notif.from}</p>
                            <p><strong>Contact:</strong> {notif.contact}</p>
                            <p><strong>Time:</strong> {relativeTime}</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-sm font-semibold">
                              <Phone size={14} /> Call Back
                            </button>
                            <button className="px-4 py-2 bg-slate-600 text-white text-sm rounded-xl hover:bg-slate-700 transition shadow-sm font-semibold flex items-center gap-2">
                              <Send size={14} /> Chat
                            </button>
                            <button
                              onClick={() => handleAcknowledge(notif.id)}
                              className="px-4 py-2 bg-slate-500 text-white text-sm rounded-xl hover:bg-slate-600 transition shadow-sm font-semibold"
                            >
                              Acknowledge
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={radiologistMessagesEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadiologyAssistantPOC;
