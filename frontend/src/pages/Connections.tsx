import React, { useState, useEffect, useRef } from 'react';
import { User, MessageCircle, Check, X, ArrowLeft, Send } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { connectionService } from '../services/connectionService';
import { safetyService } from '../services/safetyService';
import { notificationService } from '../services/notificationService';

export function Connections() {

  const [connected, setConnected] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchConnections = async () => {
    try {
      setError(false);
      const [connectedData] = await Promise.all([
        connectionService.getConnections()
      ]);
      const accepted = connectedData.filter((c: any) => c.status === 'ACCEPTED');
      
      const unreadMessages = (await notificationService.getNotifications())
        .filter((n: any) => n.type === 'NEW_MESSAGE' && !n.isRead);
        
      const unreadCountByUserId: Record<string, number> = {};
      unreadMessages.forEach((n: any) => {
        unreadCountByUserId[n.relatedUserId] = (unreadCountByUserId[n.relatedUserId] || 0) + 1;
      });

      const withMessages = await Promise.all(accepted.map(async (conn: any) => {
        const messages = await connectionService.getConversation(conn.userId);
        return { ...conn, messages, unreadCount: unreadCountByUserId[conn.userId] || 0 };
      }));

      setConnected(withMessages);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportUserId, setReportUserId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('Harassment');
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const handleReportUser = (userId: string) => {
    setReportUserId(userId);
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportUserId) return;
    setIsReporting(true);
    try {
      await safetyService.reportUser(reportUserId, reportReason, reportDescription);
      alert('Report submitted successfully.');
      setShowReportModal(false);
      setReportDescription('');
    } catch (err) {
      alert('Failed to submit report.');
    } finally {
      setIsReporting(false);
    }
  };

  const handleBlockUser = async (userId: string, name: string) => {
    if (window.confirm(`Are you sure you want to block ${name}?`)) {
      try {
        await safetyService.blockUser(userId);
        alert(`${name} has been blocked.`);
        fetchConnections();
      } catch (err) {
        alert('Failed to block user.');
      }
    }
  };

  const handleRemoveConnection = async (connId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from your connections?`)) {
      try {
        await connectionService.removeConnection(connId);
        fetchConnections();
      } catch (err) {
        alert('Failed to remove connection.');
      }
    }
  };

  const [fetchedChats, setFetchedChats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let pollInterval: any;

    if (activeChatId) {
      const conn = connected.find((c: any) => c.id === activeChatId);
      const targetUserId = conn?.userId;
      
      if (!targetUserId) return;

      const fetchChat = async () => {
        try {
          const newMessages = await connectionService.getConversation(targetUserId);
          
          setConnected(prev => {
            const currentConn = prev.find(c => c.id === activeChatId);
            if (!currentConn) return prev;
            
            const oldLen = currentConn.messages?.length || 0;
            const newLen = newMessages.length;
            
            if (newLen === oldLen) return prev;

            let isNearBottom = true;
            if (scrollContainerRef.current) {
              const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
              isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
            }

            if (isNearBottom) {
              setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }

            return prev.map(c => c.id === activeChatId ? { ...c, messages: newMessages } : c);
          });
        } catch (err) {
          console.warn('Chat polling error:', err);
        }
      };

      fetchChat();
      
      if (!fetchedChats[activeChatId]) {
        setFetchedChats(prev => ({ ...prev, [activeChatId]: true }));
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
      }

      pollInterval = setInterval(fetchChat, 2500);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeChatId]);

  useEffect(() => {
    fetchConnections();
    
    const handleUpdate = () => fetchConnections();
    window.addEventListener('connections_updated', handleUpdate);
    return () => window.removeEventListener('connections_updated', handleUpdate);
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

  if (error) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="p-10 text-center bg-red-50/50 border-red-100 flex flex-col items-center gap-4">
          <p className="text-2xl font-bold text-red-800">Unable to load your connections.</p>
          <Button onClick={() => { setLoading(true); fetchConnections(); }}>Try Again</Button>
        </Card>
      </div>
    );
  }



  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeChatId) return;

    const activeConn = connected.find((c: any) => c.id === activeChatId);
    if (!activeConn) return;

    const sentMessage = await connectionService.sendChatMessage(activeConn.userId, messageInput);
    if (sentMessage) {
      const updated = connected.map(c => {
        if (c.id === activeChatId) return { ...c, messages: [...(c.messages||[]), sentMessage] };
        return c;
      });
      setConnected(updated);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setMessageInput('');
  };


  if (activeChatId) {
    const activeConnection = connected.find((c: any) => c.id === activeChatId);
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

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 bg-slate-50/50">
          {(!activeConnection.messages || activeConnection.messages.length === 0) && (
             <div className="text-center mt-10">
               <div className="text-6xl mb-4">👋</div>
               <h3 className="text-2xl font-bold text-gray-900 mb-2">Start a conversation with {activeConnection.name}</h3>
               <p className="text-lg text-gray-500">Send a message and start getting to know your connection.</p>
             </div>
          )}
          {(activeConnection.messages || []).map((msg:any, i:number) => (
            <div key={i} className={`flex w-full ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-3xl text-xl max-w-[85%] leading-relaxed break-words ${
                msg.sender === 'me' ? 'bg-brand-600 text-white rounded-tr-none shadow-md' : 'bg-white border border-gray-200 text-gray-900 rounded-tl-none shadow-sm'
              }`}>
                <div>{msg.text}</div>
                <div className={`text-xs mt-2 text-right ${msg.sender === 'me' ? 'text-brand-200' : 'text-gray-400'}`}>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </div>
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



  return (
    <div className="flex flex-col gap-8 pb-8">
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-3">My Connections</h1>
        <p className="text-xl md:text-2xl text-gray-600 font-medium">Manage your friends and chats.</p>
      </div>



      <section>
        <h2 className="text-3xl font-bold text-gray-900 mb-6 px-2 flex items-center gap-3">
           <span className="bg-green-100 text-green-700 w-10 h-10 rounded-xl flex items-center justify-center">{connected.length}</span>
            My Connections
        </h2>
        <div className="flex flex-col gap-4">
          {connected.map(conn => (
            <Card key={conn.id} className="flex flex-col md:flex-row gap-6 p-6 items-center hover:border-brand-300 transition-colors">
              <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center border-4 border-brand-50 shrink-0"><User className="w-10 h-10" /></div>
              <div className="flex-1 text-center md:text-left min-w-0">
                <h3 className="text-2xl font-extrabold text-gray-900 mb-1 flex items-center justify-center md:justify-start">
                  <span className="truncate">{conn.name}</span>
                  {conn.unreadCount > 0 && (
                    <span className="ml-3 inline-flex items-center justify-center w-6 h-6 text-sm font-bold text-white bg-blue-600 rounded-full shadow-sm shrink-0">
                      {conn.unreadCount}
                    </span>
                  )}
                </h3>
                <p className="text-xl text-gray-500 font-medium">Age {conn.age}</p>
                {conn.interests && conn.interests.length > 0 && (
                  <p className="text-brand-700 font-bold mt-2 bg-brand-50 inline-block px-4 py-1.5 rounded-xl border border-brand-200">Shared: {conn.interests.join(', ')}</p>
                )}
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  {conn.messages && conn.messages.length > 0 ? (
                    <div className="min-w-0">
                      <p className="text-gray-800 font-medium truncate">"{conn.messages[conn.messages.length - 1].text}"</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(conn.messages[conn.messages.length - 1].createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Start a conversation</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 w-full md:w-auto mt-4 md:mt-0 items-center md:items-end">
                <div className="flex gap-2 w-full">
                  <Button variant="outline" size="lg" className="flex-1 h-12 text-lg" onClick={() => window.location.href=`/users/${conn.userId}`}>View Profile</Button>
                  <Button size="lg" className="flex-1 h-12 shadow-md text-lg" onClick={() => setActiveChatId(conn.id)}><MessageCircle className="w-5 h-5 mr-2" /> Chat</Button>
                </div>
                <div className="flex gap-3 text-sm mt-1 justify-center md:justify-end">
                  <button onClick={() => handleRemoveConnection(conn.id, conn.name)} className="text-gray-500 hover:text-gray-800 underline">Remove</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => handleReportUser(conn.userId)} className="text-gray-500 hover:text-gray-800 underline">Report</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => handleBlockUser(conn.userId, conn.name)} className="text-red-500 hover:text-red-700 underline">Block</button>
                </div>
              </div>
            </Card>
          ))}
          {connected.length === 0 && (
            <Card className="p-10 text-center bg-gray-50 border-gray-300 border-dashed">
              <p className="text-2xl text-gray-600 font-bold mb-4">No connections yet.</p>
              <Button size="lg" className="h-16 text-xl px-8" onClick={() => window.location.href='/people'}>Find People Near You</Button>
            </Card>
          )}
        </div>
      </section>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-white w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Report User</h2>
            <p className="text-gray-600">Please let us know why you are reporting this user.</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <select 
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <option value="Harassment">Harassment or Bullying</option>
                <option value="Spam">Spam</option>
                <option value="Fake Profile">Fake Profile</option>
                <option value="Inappropriate Content">Inappropriate Content</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Details (Optional)</label>
              <textarea 
                value={reportDescription} 
                onChange={e => setReportDescription(e.target.value)}
                placeholder="Provide additional details..."
                className="flex w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowReportModal(false)}>Cancel</Button>
              <Button onClick={submitReport} disabled={isReporting} className="bg-red-600 hover:bg-red-700 text-white border-red-600">
                {isReporting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
