import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User as UserIcon, Bot } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { aiService } from '../services/aiService';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-200px)] bg-slate-50 border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-brand-700 text-white p-6 shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-inner text-brand-600 shrink-0">
            <Sparkles className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold mb-1">{t('aiCompanion.saathiAi')}</h1>
            <p className="text-brand-100 text-lg font-medium leading-tight">{t('aiCompanion.companionDesc')}</p>
          </div>
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
          <Button type="submit" size="lg" className="h-16 w-16 px-0 shrink-0 rounded-2xl flex items-center justify-center shadow-md" disabled={!input.trim()}>
            <Send className="w-8 h-8" />
          </Button>
        </form>
      </div>
    </div>
  );
}
