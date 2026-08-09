import React, { useState, useEffect, useRef } from 'react';
import { User, MessageCircle, Check, X, ArrowLeft, Send } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { connectionService } from '../services/connectionService';

export function Connections() {
  const [connections, setConnections] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    const data = await connectionService.getConnections();
    setConnections(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="p-10 text-center bg-brand-50/50 border-brand-100 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-2xl font-bold text-brand-800">Loading your connections...</p>
        </Card>
      </div>
    );
  }

  const handleAccept = async (id: string) => {
    const updated = connections.map(c => c.id === id ? { ...c, status: 'connected' } : c);
    setConnections(updated);
    await connectionService.updateConnections(updated);
  };

  const handleDecline = async (id: string) => {
    const updated = connections.filter(c => c.id !== id);
    setConnections(updated);
    await connectionService.removeConnection(id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChatId) return;

    const updated = connections.map(c => {
      if (c.id === activeChatId) return { ...c, messages: [...(c.messages||[]), { sender: 'me', text: messageInput }] };
      return c;
    });

    setConnections(updated);
    await connectionService.updateConnections(updated);
    setMessageInput('');

    setTimeout(async () => {
      const current = await connectionService.getConnections();
      const afterResponse = current.map((c: any) => {
        if (c.id === activeChatId) return { ...c, messages: [...(c.messages||[]), { sender: 'them', text: 'That sounds wonderful!' }] };
        return c;
      });
      setConnections(afterResponse);
      await connectionService.updateConnections(afterResponse);
    }, 1500);
  };

  useEffect(() => {
    if (activeChatId) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [connections, activeChatId]);

  if (activeChatId) {
    const activeConnection = connections.find((c: any) => c.id === activeChatId);
    if (!activeConnection) return null;

    return (
      <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-200px)] bg-slate-50 border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="bg-brand-600 text-white p-4 shrink-0 flex items-center gap-4 relative z-10">
          <button onClick={() => setActiveChatId(null)} className="p-3 hover:bg-brand-700 rounded-2xl transition-colors">
            <ArrowLeft className="w-8 h-8" />
          </button>
          <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">{activeConnection.name}</h2>
            <p className="text-brand-100 text-lg font-medium">Age {activeConnection.age}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 bg-slate-50/50">
          {(!activeConnection.messages || activeConnection.messages.length === 0) && (
             <div className="text-center text-gray-500 mt-10 text-xl font-medium">Say hello to {activeConnection.name}!</div>
          )}
          {(activeConnection.messages || []).map((msg:any, i:number) => (
            <div key={i} className={`flex w-full ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-5 rounded-3xl text-xl max-w-[85%] leading-relaxed ${
                msg.sender === 'me' ? 'bg-brand-600 text-white rounded-tr-none shadow-md' : 'bg-white border border-gray-200 text-gray-900 rounded-tl-none shadow-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="bg-white p-4 md:p-6 border-t border-gray-200 shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input value={messageInput} onChange={e => setMessageInput(e.target.value)} placeholder="Type your message..." className="flex-1 h-16 rounded-2xl border-2 border-gray-300 bg-gray-50 px-5 text-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500 transition-all" />
            <Button type="submit" className="h-16 w-16 px-0 flex items-center justify-center rounded-2xl shadow-md" disabled={!messageInput.trim()}>
              <Send className="w-8 h-8" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const pending = connections.filter(c => c.status === 'pending');
  const connected = connections.filter(c => c.status === 'connected');

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-3">My Connections</h1>
        <p className="text-xl md:text-2xl text-gray-600 font-medium">Manage your friends and chats.</p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6 px-2 flex items-center gap-3">
            <span className="bg-yellow-100 text-yellow-700 w-10 h-10 rounded-xl flex items-center justify-center">{pending.length}</span>
            Pending Requests
          </h2>
          <div className="flex flex-col gap-4">
            {pending.map(conn => (
              <Card key={conn.id} className="flex flex-col md:flex-row gap-6 p-6 items-center hover:border-brand-300 transition-colors">
                <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center border-4 border-brand-100 shrink-0"><User className="w-10 h-10" /></div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-1">{conn.name}</h3>
                  <p className="text-xl text-gray-500 font-medium">Age {conn.age}</p>
                  <p className="text-brand-700 font-bold mt-2 bg-brand-50 inline-block px-4 py-1.5 rounded-xl border border-brand-200">Shared: {conn.interests?.join(', ')}</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto mt-2 md:mt-0">
                  <Button variant="outline" size="lg" className="flex-1 md:w-36 h-14 border-2 border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100" onClick={() => handleDecline(conn.id)}><X className="w-6 h-6 mr-2" /> Decline</Button>
                  <Button size="lg" className="flex-1 md:w-36 h-14 shadow-sm" onClick={() => handleAccept(conn.id)}><Check className="w-6 h-6 mr-2" /> Accept</Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-3xl font-bold text-gray-900 mb-6 px-2 flex items-center gap-3">
           <span className="bg-green-100 text-green-700 w-10 h-10 rounded-xl flex items-center justify-center">{connected.length}</span>
            My Friends
        </h2>
        <div className="flex flex-col gap-4">
          {connected.map(conn => (
            <Card key={conn.id} className="flex flex-col md:flex-row gap-6 p-6 items-center hover:border-brand-300 transition-colors">
              <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center border-4 border-brand-50 shrink-0"><User className="w-10 h-10" /></div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-extrabold text-gray-900 mb-1">{conn.name}</h3>
                <p className="text-xl text-gray-500 font-medium">Age {conn.age}</p>
                <p className="text-brand-700 font-bold mt-2 bg-brand-50 inline-block px-4 py-1.5 rounded-xl border border-brand-200">Shared: {conn.interests?.join(', ')}</p>
              </div>
              <div className="flex w-full md:w-auto mt-2 md:mt-0">
                <Button size="lg" className="w-full md:w-48 h-16 shadow-md text-xl" onClick={() => setActiveChatId(conn.id)}><MessageCircle className="w-6 h-6 mr-3" /> Message</Button>
              </div>
            </Card>
          ))}
          {connected.length === 0 && (
            <Card className="p-10 text-center bg-gray-50 border-gray-300 border-dashed">
              <p className="text-2xl text-gray-600 font-bold mb-4">You don't have any friends yet.</p>
              <Button size="lg" className="h-16 text-xl px-8" onClick={() => window.location.href='/people'}>Find People Near You</Button>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
