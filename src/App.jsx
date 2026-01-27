import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, AlertCircle, CheckCircle, Clock, User, Activity, TrendingUp, Bell } from 'lucide-react';

const App = () => {
  const [userMessages, setUserMessages] = useState([]);
  const [radiologistNotifications, setRadiologistNotifications] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const userMessagesEndRef = useRef(null);
  const radiologistMessagesEndRef = useRef(null);

  useEffect(() => {
    userMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [userMessages]);

  useEffect(() => {
    radiologistMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [radiologistNotifications]);

  const typeMessage = async (text) => {
    setIsTyping(true);
    const words = text.split(' ');
    let displayText = '';
    
    for (let i = 0; i < words.length; i++) {
      displayText += (i > 0 ? ' ' : '') + words[i];
      await new Promise(resolve => setTimeout(resolve, 40));
      setUserMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          text: displayText
        };
        return newMessages;
      });
    }
    
    setIsTyping(false);
  };

  const processMessage = async (input) => {
    const lowerInput = input.toLowerCase();

    setUserMessages(prev => [...prev, { sender: 'ai', text: '', time: new Date().toLocaleTimeString(), hasData: false }]);

    if (lowerInput.includes('status') || lowerInput.includes('chest ct') || lowerInput.includes('report')) {
      setUserMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          hasData: true,
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
        };
        return newMessages;
      });
      
      await typeMessage(
        "I found the exam status in our system. The chest CT for patient in ICU bed 4 was completed at 2:45 PM today. The preliminary read shows no acute findings. Final report is currently being reviewed by Dr. Martinez and should be available within the next 30 minutes. You'll receive an automatic notification once it's signed."
      );
    } else if (lowerInput.includes('acr') || lowerInput.includes('criteria') || lowerInput.includes('appropriateness')) {
      setUserMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          hasData: true,
          dataSource: 'ACR Appropriateness Criteria',
          dataContent: {
            indication: 'Suspected Pulmonary Embolism',
            procedure: 'CT Pulmonary Angiography (CTPA)',
            rating: '9/9 (Usually Appropriate)',
            comment: 'Intermediate to high clinical probability',
            alternative: 'D-dimer for low probability patients'
          }
        };
        return newMessages;
      });
      
      await typeMessage(
        "I've retrieved the ACR guidelines for this indication. CT Pulmonary Angiography (CTPA) is usually appropriate (rating 9/9) for patients with intermediate to high clinical probability. For low-probability patients, D-dimer testing is recommended first. Would you like me to provide the full protocol or connect you with a radiologist for case-specific guidance?"
      );
    } else if (lowerInput.includes('urgent') || lowerInput.includes('stroke') || lowerInput.includes('critical') || lowerInput.includes('dissection')) {
      await typeMessage(
        "This sounds like a critical situation. I'm escalating your query to the on-call radiologist immediately. Dr. Chen (Neuroradiology) is available and will call you within 2 minutes."
      );
      
      setTimeout(() => {
        setRadiologistNotifications(prev => [...prev, {
          type: 'urgent',
          message: `URGENT: ${lowerInput.includes('dissection') ? 'Suspected aortic dissection' : 'Stroke alert'} - immediate consultation needed`,
          from: 'Dr. Sarah Park - Emergency Department',
          time: new Date().toLocaleTimeString(),
          contact: 'Ext. 4521'
        }]);
      }, 500);
    } else if (lowerInput.includes('who') || lowerInput.includes('call') || lowerInput.includes('contact') || lowerInput.includes('covers')) {
      setUserMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          hasData: true,
          dataSource: 'Contact Directory',
          dataContent: {
            'General Radiology': 'Ext. 5100',
            'Neuroradiology (Dr. Chen)': 'Ext. 5105',
            'Body Imaging (Dr. Martinez)': 'Ext. 5110',
            'Musculoskeletal (Dr. Kim)': 'Ext. 5115',
            'After Hours/Urgent': 'Page 2400'
          }
        };
        return newMessages;
      });
      
      await typeMessage(
        "I've retrieved the radiology contact list for you. These extensions connect you directly to the appropriate subspecialty. For urgent after-hours cases, use the pager system. Would you like me to connect you with a specific radiologist?"
      );
    } else if (lowerInput.includes('protocol') || lowerInput.includes('how')) {
      await typeMessage(
        "I can help with protocol questions. For MRI brain protocols: Standard brain MRI includes T1, T2, FLAIR, and DWI sequences. For contrast studies, add T1 post-contrast. Specific protocols vary by indication. Would you like details for a specific clinical scenario, or should I escalate this to a radiologist for personalized guidance?"
      );
    } else {
      await typeMessage(
        "This is a prototype demo - not fully implemented yet. Please try running the Interactive Demo button above to see the full capabilities, or ask about:\n\n• Exam status/reports\n• ACR appropriateness criteria\n• Radiologist contacts\n• Urgent consultations\n• Imaging protocols"
      );
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isTyping) return;

    const userMsg = { sender: 'user', text: userInput, time: new Date().toLocaleTimeString() };
    setUserMessages(prev => [...prev, userMsg]);
    
    const input = userInput;
    setUserInput('');

    await processMessage(input);
  };

  const typeIntoInput = async (text) => {
    setUserInput('');
    for (let i = 0; i <= text.length; i++) {
      setUserInput(text.slice(0, i));
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  };

  const runDemo = async () => {
    setIsRunningDemo(true);
    setUserMessages([]);
    setRadiologistNotifications([]);

    const demoSequence = [
      { input: "What's the status of the chest CT for the patient in ICU bed 4?", delay: 1000 },
      { input: "What are the ACR appropriateness criteria for suspected PE?", delay: 3000 },
      { input: "URGENT: Suspected aortic dissection in ER bay 2", delay: 3000 },
      { input: "Who covers body imaging today?", delay: 3000 }
    ];

    for (const step of demoSequence) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      await typeIntoInput(step.input);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const userMsg = { sender: 'user', text: step.input, time: new Date().toLocaleTimeString() };
      setUserMessages(prev => [...prev, userMsg]);
      setUserInput('');
      
      await processMessage(step.input);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setIsRunningDemo(false);
  };

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
            disabled={isRunningDemo || isTyping}
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
              {userMessages.length === 0 && (
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

              {userMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className={`max-w-[75%] ${msg.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                    {msg.sender === 'user' ? (
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl px-5 py-3.5 shadow-md">
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className="text-xs text-blue-200 mt-2 text-right">{msg.time}</p>
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
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white rounded-3xl px-5 py-3.5 shadow-sm border border-slate-200">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={userMessagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-200 rounded-bl-3xl">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-5 py-3.5 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isTyping || isRunningDemo}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isTyping || !userInput.trim() || isRunningDemo}
                  className="px-6 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition shadow-sm"
                >
                  <Send size={20} />
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
                        <p className="text-4xl font-bold text-blue-400">47</p>
                      </div>
                      <div className="text-center p-4 bg-slate-600 rounded-2xl border border-slate-500">
                        <p className="text-slate-300 text-xs mb-2">Escalated</p>
                        <p className="text-4xl font-bold text-orange-400">3</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {radiologistNotifications.map((notif, idx) => (
                <div
                  key={idx}
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
                          <p><strong>Time:</strong> {notif.time}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-sm font-semibold">
                            <Phone size={14} /> Call Back
                          </button>
                          <button className="px-4 py-2 bg-slate-600 text-white text-sm rounded-xl hover:bg-slate-700 transition shadow-sm font-semibold flex items-center gap-2">
                            <Send size={14} /> Chat
                          </button>
                          <button className="px-4 py-2 bg-slate-500 text-white text-sm rounded-xl hover:bg-slate-600 transition shadow-sm font-semibold">
                            Acknowledge
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={radiologistMessagesEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;