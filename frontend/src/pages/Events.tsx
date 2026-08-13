import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock, Search, Plus, X, ArrowLeft, Filter, Bookmark, BookmarkCheck, Trash2, MessageCircle, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { eventService } from '../services/eventService';
import type { EventData } from '../services/eventService';
import { userService } from '../services/userService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

const CATEGORIES = ['All', 'Morning Walk', 'Yoga', 'Gardening', 'Music', 'Cooking', 'Storytelling', 'Spiritual', 'Sports', 'Learning', 'Other'];

export function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const navigate = useNavigate();
  
  // Filters
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('All');
  const [radiusFilter, setRadiusFilter] = useState('All');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [activeDiscussion, setActiveDiscussion] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState<EventData>({
    title: '',
    description: '',
    category: 'Morning Walk',
    location: '',
    date: '',
    startTime: '',
    endTime: '',
    maxParticipants: 10
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchUser();
  }, [category, dateFilter, radiusFilter, activeTab]);

  const fetchUser = async () => {
    const user = await userService.getUser();
    setCurrentUser(user);
  };

  useEffect(() => {
    if (activeDiscussion) {
      fetchMessages(activeDiscussion.id);
    }
  }, [activeDiscussion]);

  const fetchMessages = async (eventId: string) => {
    setMessagesLoading(true);
    try {
      const data = await eventService.getEventMessages(eventId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeDiscussion) return;
    
    try {
      const data = await eventService.sendEventMessage(activeDiscussion.id, newMessage);
      setMessages([...messages, data.message]);
      setNewMessage('');
    } catch (err) {
      alert('Failed to send message');
    }
  };

  const fetchEvents = async (searchQuery: string = search) => {
    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (category !== 'All') filters.category = category;
      if (searchQuery) filters.search = searchQuery;
      if (dateFilter !== 'All') filters.date = dateFilter.toLowerCase();
      if (radiusFilter !== 'All') filters.radius = parseInt(radiusFilter);
      
      if (activeTab === 'recommended') filters.filter = 'recommended';
      else if (activeTab === 'saved') filters.filter = 'saved';
      else if (activeTab === 'mine') filters.filter = 'mine';
      
      const data = await eventService.getEvents(filters);
      setEvents(data);
    } catch (err) {
      setError('Unable to load events.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (!formData.title || !formData.description || !formData.location || !formData.date || !formData.startTime || !formData.endTime) {
        throw new Error('All fields are required');
      }
      
      if (formData.maxParticipants <= 0) {
        throw new Error('Maximum participants must be greater than zero');
      }

      await eventService.createEvent(formData);
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        category: 'Morning Walk',
        location: '',
        date: '',
        startTime: '',
        endTime: '',
        maxParticipants: 10
      });
      fetchEvents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create event');
    } finally {
      setFormLoading(false);
    }
  };

  const handleJoin = async (id: string) => {
    try {
      await eventService.joinEvent(id);
      
      // Update local state if modal is open
      if (selectedEvent && selectedEvent.id === id) {
        setSelectedEvent({
          ...selectedEvent,
          hasJoined: true,
          participantCount: selectedEvent.participantCount + 1,
          participants: [...(selectedEvent.participants || []), { userId: currentUser?.id }]
        });
      }
      
      // Update list state
      setEvents(events.map(e => {
        if (e.id === id) {
          return { ...e, hasJoined: true, participantCount: e.participantCount + 1 };
        }
        return e;
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to join event');
    }
  };

  const handleLeave = async (id: string) => {
    try {
      await eventService.leaveEvent(id);
      
      // Update local state if modal is open
      if (selectedEvent && selectedEvent.id === id) {
        setSelectedEvent({
          ...selectedEvent,
          hasJoined: false,
          participantCount: selectedEvent.participantCount - 1,
          participants: selectedEvent.participants.filter((p: any) => p.userId !== currentUser?.id)
        });
      }
      
      // Update list state
      setEvents(events.map(e => {
        if (e.id === id) {
          return { ...e, hasJoined: false, participantCount: e.participantCount - 1 };
        }
        return e;
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to leave event');
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      const details = await eventService.getEventById(id);
      if (details) {
        setSelectedEvent(details);
      }
    } catch (err) {
      alert('Failed to load event details');
    }
  };

  const handleSave = async (id: string, isSaved: boolean) => {
    try {
      if (isSaved) {
        await eventService.unsaveEvent(id);
      } else {
        await eventService.saveEvent(id);
      }
      if (selectedEvent && selectedEvent.id === id) {
        setSelectedEvent({ ...selectedEvent, isSaved: !isSaved });
      }
      setEvents(events.map(e => e.id === id ? { ...e, isSaved: !isSaved } : e));
    } catch (err: any) {
      alert(err.message || 'Failed to update saved status');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    try {
      await eventService.cancelEvent(id);
      if (selectedEvent && selectedEvent.id === id) {
        setSelectedEvent({ ...selectedEvent, dynamicStatus: 'CANCELLED' });
      }
      setEvents(events.map(e => e.id === id ? { ...e, dynamicStatus: 'CANCELLED' } : e));
    } catch (err: any) {
      alert(err.message || 'Failed to cancel event');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING': return 'bg-green-100 text-green-700';
      case 'ONGOING': return 'bg-yellow-100 text-yellow-700';
      case 'COMPLETED': return 'bg-gray-200 text-gray-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1">Discover and join activities near you</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Event
        </Button>
      </div>

      <Card className="bg-white border-b border-gray-100 rounded-none shadow-sm -mx-4 px-4 sm:mx-0 sm:px-0 sm:rounded-xl mb-6">
        <div className="flex overflow-x-auto hide-scrollbar">
          {['upcoming', 'recommended', 'saved', 'mine'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-6 py-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'upcoming' && '📅 Upcoming Events'}
              {tab === 'recommended' && '✨ Recommended For You'}
              {tab === 'saved' && '🔖 Saved Events'}
              {tab === 'mine' && '👤 My Events'}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4 bg-white border-brand-100 flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2 relative">
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..." 
            className="w-full pl-10"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Button type="submit" variant="outline">Search</Button>
        </form>
        
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border-gray-200 rounded-xl bg-white px-3 py-2 text-sm focus:ring-brand-500 min-w-[120px]"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border-gray-200 rounded-xl bg-white px-3 py-2 text-sm focus:ring-brand-500 min-w-[120px]"
          >
            <option value="All">All Dates</option>
            <option value="Upcoming">Upcoming</option>
          </select>

          <select 
            value={radiusFilter}
            onChange={(e) => setRadiusFilter(e.target.value)}
            className="border-gray-200 rounded-xl bg-white px-3 py-2 text-sm focus:ring-brand-500 min-w-[120px]"
          >
            <option value="All">Any Distance</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
            <option value="20">Within 20 km</option>
          </select>
        </div>
      </Card>

      {error ? (
        <Card className="p-8 text-center bg-red-50 border-red-100">
          <p className="text-red-600 mb-4 font-medium">{error}</p>
          <Button variant="outline" onClick={() => fetchEvents()}>Try Again</Button>
        </Card>
      ) : loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      ) : events.length === 0 ? (
        <Card className="p-12 text-center bg-gray-50 border-dashed">
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">There are no events matching your filters right now. Why not create one yourself?</p>
          <Button onClick={() => setShowCreateModal(true)}>Create an Event</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className={`overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer ${event.recommended ? 'ring-2 ring-brand-300' : ''}`} onClick={() => handleViewDetails(event.id)}>
              <div className="p-5 flex-1">
                {event.recommended && (
                  <div className="inline-block bg-brand-100 text-brand-700 text-xs font-bold px-2 py-1 rounded-full mb-3">
                    ✨ Recommended
                  </div>
                )}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-gray-900 line-clamp-2 pr-2">{event.title}</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSave(event.id, event.isSaved); }}
                    className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${event.isSaved ? 'text-brand-500' : 'text-gray-400'}`}
                  >
                    {event.isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 shrink-0 text-brand-500" />
                    <span className="text-sm truncate">{event.location} {event.distance !== null && <span className="text-gray-400">({event.distance} km)</span>}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 shrink-0 text-brand-500" />
                    <span className="text-sm">{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="w-4 h-4 mr-2 shrink-0 text-brand-500" />
                    <span className="text-sm">{event.startTime}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Users className="w-4 h-4 mr-2 shrink-0 text-brand-500" />
                    <span className="text-sm">{event.participantCount} / {event.maxParticipants} participants</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <div className="inline-block bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-lg">
                    {event.category}
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(event.dynamicStatus)}`}>
                    {event.dynamicStatus === 'UPCOMING' && '🟢 '}
                    {event.dynamicStatus === 'ONGOING' && '🟡 '}
                    {event.dynamicStatus === 'COMPLETED' && '⚪ '}
                    {event.dynamicStatus === 'CANCELLED' && '🔴 '}
                    {event.dynamicStatus}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={(e) => { e.stopPropagation(); handleViewDetails(event.id); }}>View</Button>
                
                {event.createdById === currentUser?.id ? (
                  <Button variant="primary" className="flex-1 opacity-50 cursor-not-allowed" disabled>Owner</Button>
                ) : event.hasJoined ? (
                  <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" onClick={(e) => { e.stopPropagation(); handleLeave(event.id); }}>Leave</Button>
                ) : event.participantCount >= event.maxParticipants ? (
                  <Button variant="outline" className="flex-1 opacity-50 cursor-not-allowed" disabled>Full</Button>
                ) : (
                  <Button variant="primary" className="flex-1" onClick={(e) => { e.stopPropagation(); handleJoin(event.id); }}>Join</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Event Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <Card className="w-full max-w-lg bg-white relative max-h-[90vh] overflow-y-auto my-8">
            <button 
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <div className="inline-block bg-brand-50 text-brand-700 font-bold px-3 py-1 rounded-full text-sm">
                    {selectedEvent.category}
                  </div>
                  <div className={`text-sm font-bold px-3 py-1 rounded-full ${getStatusColor(selectedEvent.dynamicStatus)}`}>
                    {selectedEvent.dynamicStatus}
                  </div>
                </div>
                <button 
                  onClick={() => handleSave(selectedEvent.id, selectedEvent.isSaved)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${selectedEvent.isSaved ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {selectedEvent.isSaved ? (
                    <><BookmarkCheck className="w-4 h-4" /> <span className="text-sm font-bold">Saved</span></>
                  ) : (
                    <><Bookmark className="w-4 h-4" /> <span className="text-sm font-bold">Save</span></>
                  )}
                </button>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">{selectedEvent.title}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 mr-3 text-brand-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Location</p>
                    <p className="font-semibold text-gray-900">{selectedEvent.location}</p>
                    {selectedEvent.distance !== null && <p className="text-xs text-gray-500">{selectedEvent.distance} km away</p>}
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 mr-3 text-brand-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Date</p>
                    <p className="font-semibold text-gray-900">{new Date(selectedEvent.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="w-5 h-5 mr-3 text-brand-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Time</p>
                    <p className="font-semibold text-gray-900">{selectedEvent.startTime} — {selectedEvent.endTime}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Users className="w-5 h-5 mr-3 text-brand-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Participants</p>
                    <p className="font-semibold text-gray-900">{selectedEvent.participantCount} / {selectedEvent.maxParticipants}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-2 text-lg">Description</h4>
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-xl">{selectedEvent.description}</p>
              </div>

              <div className="mb-8">
                <h4 className="font-bold text-gray-900 mb-3 text-lg">Created By</h4>
                <div 
                  className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl inline-flex cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => navigate(`/users/${selectedEvent.createdById}`)}
                >
                  <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold">
                    {selectedEvent.creator?.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selectedEvent.creator?.name}</p>
                    <p className="text-xs text-gray-500">Organizer</p>
                  </div>
                </div>
              </div>

              {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                <div className="mb-8">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">Participants ({selectedEvent.participantCount})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedEvent.participants.map((p: any) => (
                      <div 
                        key={p.userId} 
                        className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => navigate(`/users/${p.userId}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center font-bold text-xs">
                            {p.user?.name?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-900">{p.user?.name || 'Unknown User'}</p>
                            <p className="text-xs text-gray-500">{p.user?.city || 'Unknown Location'}</p>
                          </div>
                        </div>
                        <span className="text-xs text-brand-600 font-medium">View</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-100">
                {selectedEvent.dynamicStatus === 'CANCELLED' ? (
                  <Button variant="outline" className="flex-1 opacity-50 cursor-not-allowed" disabled>This event is cancelled</Button>
                ) : selectedEvent.dynamicStatus === 'COMPLETED' ? (
                  <Button variant="outline" className="flex-1 opacity-50 cursor-not-allowed" disabled>This event has ended</Button>
                ) : selectedEvent.createdById === currentUser?.id ? (
                  <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" onClick={() => handleCancel(selectedEvent.id)}>Cancel Event</Button>
                ) : selectedEvent.hasJoined ? (
                  <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" onClick={() => handleLeave(selectedEvent.id)}>Leave Event</Button>
                ) : selectedEvent.participantCount >= selectedEvent.maxParticipants ? (
                  <Button variant="outline" className="flex-1 opacity-50 cursor-not-allowed" disabled>Event is Full</Button>
                ) : (
                  <Button variant="primary" className="flex-1 py-4 text-lg" onClick={() => handleJoin(selectedEvent.id)}>Join Event</Button>
                )}
                <Button variant="outline" className="sm:flex-none" onClick={() => setSelectedEvent(null)}>Close</Button>
              </div>
              
              {(selectedEvent.hasJoined || selectedEvent.createdById === currentUser?.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Button 
                    variant="primary" 
                    className="w-full py-3 flex items-center justify-center gap-2" 
                    onClick={() => { setActiveDiscussion(selectedEvent); setSelectedEvent(null); }}
                  >
                    <MessageCircle className="w-5 h-5" />
                    Open Event Discussion
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <Card className="w-full max-w-xl bg-white relative my-8">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Event</h2>
              
              {formError && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                  {formError}
                </div>
              )}
              
              <form onSubmit={handleCreateSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Event Title</label>
                  <Input 
                    required 
                    placeholder="e.g. Morning Walk at Green Park"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                    <select 
                      className="w-full border-gray-300 rounded-xl px-4 py-3 text-base focus:ring-brand-500 focus:border-brand-500 bg-gray-50 border-2"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                    <Input 
                      required 
                      placeholder="e.g. Guntur"
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                    <Input 
                      type="date" 
                      required 
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                    <Input 
                      type="time" 
                      required 
                      value={formData.startTime}
                      onChange={e => setFormData({...formData, startTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">End Time</label>
                    <Input 
                      type="time" 
                      required 
                      value={formData.endTime}
                      onChange={e => setFormData({...formData, endTime: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Max Participants</label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="1000"
                    required 
                    value={formData.maxParticipants}
                    onChange={e => setFormData({...formData, maxParticipants: parseInt(e.target.value) || 1})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                  <textarea 
                    required 
                    rows={4}
                    placeholder="Describe what the event is about..."
                    className="w-full border-gray-300 rounded-xl px-4 py-3 text-base focus:ring-brand-500 focus:border-brand-500 bg-gray-50 border-2 resize-none"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Discussion Modal */}
      {activeDiscussion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-hidden">
          <Card className="w-full max-w-2xl bg-white relative h-[90vh] flex flex-col my-8 overflow-hidden rounded-2xl">
            <div className="p-4 md:p-6 border-b border-gray-100 flex items-center gap-4 bg-white shrink-0">
              <button 
                onClick={() => { setActiveDiscussion(null); setSelectedEvent(activeDiscussion); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{activeDiscussion.title}</h3>
                <p className="text-xs text-brand-600 font-medium">Event Discussion</p>
              </div>
              <button 
                onClick={() => setActiveDiscussion(null)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 flex flex-col gap-4 hide-scrollbar">
              {messagesLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="font-medium text-gray-900">No discussion yet</p>
                  <p className="text-sm">Start the conversation with other participants.</p>
                </div>
              ) : (
                messages.map((msg: any) => {
                  const isMe = msg.senderId === currentUser?.id;
                  return (
                    <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : 'self-start'}`}>
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer" onClick={() => navigate(`/users/${msg.senderId}`)}>
                        {msg.sender?.name?.[0] || 'U'}
                      </div>
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700">{msg.sender?.name}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-sm'}`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <input
                  type="text"
                  placeholder={activeDiscussion.dynamicStatus === 'CANCELLED' ? "Event is cancelled" : "Type a message..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={activeDiscussion.dynamicStatus === 'CANCELLED'}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || activeDiscussion.dynamicStatus === 'CANCELLED'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-500 text-white rounded-full hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
