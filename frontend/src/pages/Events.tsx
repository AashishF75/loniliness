import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock, Search, Plus, X, ArrowLeft, Filter } from 'lucide-react';
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
  
  // Filters
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('All');
  const [radiusFilter, setRadiusFilter] = useState('All');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
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
  }, [category, dateFilter, radiusFilter]);

  const fetchUser = async () => {
    const user = await userService.getUser();
    setCurrentUser(user);
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
                  <h3 className="text-xl font-bold text-gray-900 line-clamp-2">{event.title}</h3>
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
                
                <div className="inline-block bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-lg">
                  {event.category}
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
              <div className="inline-block bg-brand-50 text-brand-700 font-bold px-3 py-1 rounded-full text-sm mb-4">
                {selectedEvent.category}
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
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl inline-flex">
                  <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold">
                    {selectedEvent.creator?.name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selectedEvent.creator?.name}</p>
                    <p className="text-xs text-gray-500">Organizer</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-100">
                {selectedEvent.createdById === currentUser?.id ? (
                  <Button variant="outline" className="flex-1 opacity-50 cursor-not-allowed" disabled>You are the organizer</Button>
                ) : selectedEvent.hasJoined ? (
                  <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300" onClick={() => handleLeave(selectedEvent.id)}>Leave Event</Button>
                ) : selectedEvent.participantCount >= selectedEvent.maxParticipants ? (
                  <Button variant="outline" className="flex-1 opacity-50 cursor-not-allowed" disabled>Event is Full</Button>
                ) : (
                  <Button variant="primary" className="flex-1 py-4 text-lg" onClick={() => handleJoin(selectedEvent.id)}>Join Event</Button>
                )}
                <Button variant="outline" className="sm:flex-none" onClick={() => setSelectedEvent(null)}>Close</Button>
              </div>
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
    </div>
  );
}
