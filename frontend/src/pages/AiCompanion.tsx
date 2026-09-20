import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Sparkles, User as UserIcon, Bot, Mic, Volume2, Square } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { aiService } from '../services/aiService';
import { voiceService } from '../services/voiceService';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendations?: Recommendation[];
}

interface Recommendation {
  title: string;
  subtitle: string;
  stat: string;
}

// INITIAL_MESSAGES is moved inside the component to access the translation function `t`

export function AiCompanion() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const SUGGESTIONS = [
    t('dashboard.findPeopleNearMe'),
    t('dashboard.findActivities'),
    t('dashboard.lonely'),
    t('dashboard.whatCanIDoToday')
  ];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: t('aiCompanion.initialLonely')
    },
    {
      id: '2',
      role: 'assistant',
      content: t('aiCompanion.initialResponse'),
      recommendations: [
        { title: 'Morning Walk', subtitle: 'Community Park', stat: '3 people nearby' },
        { title: 'Suresh (Age 65)', subtitle: '0.8 km away', stat: '2 shared interests' }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-open voice assistant if ?voice=true in URL
  useEffect(() => {
    if (searchParams.get('voice') === 'true') {
      setShowVoiceModal(true);
    }
  }, [searchParams]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      voiceService.stopSpeaking();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiService.sendMessage(text);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        recommendations: response.recommendations?.length > 0 ? response.recommendations : undefined
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('aiCompanion.errorResponse')
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSpeakMessage = (id: string, text: string) => {
    if (speakingMsgId === id) {
      voiceService.stopSpeaking();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(id);
      voiceService.speak(text, {
        onStart: () => setSpeakingMsgId(id),
        onEnd: () => setSpeakingMsgId(null),
        onError: () => setSpeakingMsgId(null)
      });
    }
  };

  const handleVoiceExchangeComplete = (userText: string, aiResponse: { content: string; recommendations?: any[] }) => {
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText };
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: aiResponse.content,
      recommendations: aiResponse.recommendations && aiResponse.recommendations.length > 0 ? aiResponse.recommendations : undefined
    };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-200px)] bg-slate-50 border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Voice Assistant Modal */}
      <VoiceAssistant
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onVoiceExchangeComplete={handleVoiceExchangeComplete}
      />

      {/* Header */}
      <div className="bg-brand-700 text-white p-6 shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-inner text-brand-600 shrink-0">
              <Sparkles className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold mb-1">{t('aiCompanion.saathiAi')}</h1>
              <p className="text-brand-100 text-lg font-medium leading-tight">{t('aiCompanion.companionDesc')}</p>
            </div>
          </div>

          {/* Talk to Saathi Header Button */}
          <button
            onClick={() => setShowVoiceModal(true)}
            className="bg-white text-brand-700 hover:bg-brand-50 border-2 border-white/60 px-5 py-3 rounded-2xl font-extrabold text-xl flex items-center gap-3 shadow-md transition-transform active:scale-95"
            aria-label={t('aiCompanion.talkToSaathi')}
          >
            <Mic className="w-7 h-7 text-brand-600" />
            <span>{t('aiCompanion.talkToSaathi')}</span>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-8 bg-slate-50/50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-4 w-full md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

              <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center shadow-sm ${
                msg.role === 'user' ? 'bg-gray-300 text-gray-700' : 'bg-brand-200 text-brand-700'
              }`}>
                {msg.role === 'user' ? <UserIcon className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
              </div>

              <div className={`flex flex-col gap-4 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-5 rounded-3xl text-xl leading-relaxed break-words ${
                  msg.role === 'user'
                    ? 'bg-gray-900 text-white rounded-tr-none shadow-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-md'
                }`}>
                  {msg.content}
                </div>

                {/* Assistant Message Audio Speaker Button */}
                {msg.role === 'assistant' && (
                  <button
                    type="button"
                    onClick={() => handleToggleSpeakMessage(msg.id, msg.content)}
                    className="self-start -mt-2 flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-gray-200 hover:bg-brand-50 hover:border-brand-300 text-gray-700 hover:text-brand-700 font-bold text-base shadow-sm transition-colors cursor-pointer"
                    title={speakingMsgId === msg.id ? t('aiCompanion.stopSpeaking') : t('aiCompanion.listenAgain')}
                  >
                    {speakingMsgId === msg.id ? (
                      <>
                        <Square className="w-5 h-5 fill-current text-red-600" />
                        <span className="text-red-700">{t('aiCompanion.stopSpeaking')}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-5 h-5 text-brand-600" />
                        <span>{t('aiCompanion.listenAgain')}</span>
                      </>
                    )}
                  </button>
                )}

                {/* Recommendation Cards */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full">
                    {msg.recommendations.map((rec, i) => (
                      <Card key={i} className="bg-white border-brand-200 p-5 w-full sm:w-64 shadow-sm hover:border-brand-400 transition-colors cursor-pointer">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">{rec.title}</h4>
                        <p className="text-gray-600 text-lg font-medium mb-3">{rec.subtitle}</p>
                        <p className="text-brand-800 font-bold bg-brand-100 inline-block px-4 py-1.5 rounded-xl text-base">
                          {rec.stat}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full justify-start animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-4 w-full md:max-w-[85%] flex-row">
              <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center shadow-sm bg-brand-200 text-brand-700">
                <Bot className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-4 max-w-[85%] items-start">
                <div className="p-5 rounded-3xl text-xl leading-relaxed bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-md flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                  <span className="text-gray-500 text-lg font-medium ml-2">{t('aiCompanion.saathiTyping')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 md:p-6 border-t border-gray-200 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {/* Scrollable Suggestion Pills */}
        <div className="flex flex-wrap gap-2 pb-4">
          {SUGGESTIONS.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => handleSend(suggestion)}
              className="bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 px-4 py-2 rounded-full text-sm sm:text-lg font-bold transition-colors shadow-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="flex gap-3 mt-2"
        >
          <div className="flex-1">
            {/* Direct input usage to avoid extra div wrappings inside the Input component, allowing it to stretch properly */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('connections.typeYourMessage')}
              className="flex w-full h-16 rounded-2xl border-2 border-gray-300 bg-gray-50 px-5 text-xl transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent"
            />
          </div>
          {/* Microphone Voice Button */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setShowVoiceModal(true)}
            className="h-16 w-16 px-0 shrink-0 rounded-2xl flex items-center justify-center shadow-md border-2 border-brand-500 text-brand-700 bg-brand-50 hover:bg-brand-100 cursor-pointer"
            title={t('aiCompanion.talkToSaathi')}
            aria-label={t('aiCompanion.talkToSaathi')}
          >
            <Mic className="w-8 h-8" />
          </Button>
          <Button type="submit" size="lg" className="h-16 w-16 px-0 shrink-0 rounded-2xl flex items-center justify-center shadow-md cursor-pointer" disabled={!input.trim()}>
            <Send className="w-8 h-8" />
          </Button>
        </form>
      </div>
    </div>
  );
}
