import React, { useState, useEffect } from 'react';
import { User, MapPin, Sparkles, Filter, Check, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { connectionService } from '../services/connectionService';
import { userService } from '../services/userService';

export function People() {
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const user = await userService.getUser();
      if (user?.interests) setUserInterests(user.interests);
      
      const nearbyPeople = await connectionService.getNearbyPeople();
      setPeople(nearbyPeople);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="p-10 text-center bg-brand-50/50 border-brand-100 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-2xl font-bold text-brand-800">Finding companions near you...</p>
        </Card>
      </div>
    );
  }

  const handleConnect = async (person: any) => {
    setLoadingIds(prev => [...prev, person.id]);
    await connectionService.sendConnectionRequest(person);
    setLoadingIds(prev => prev.filter(id => id !== person.id));
    setConnectedIds(prev => [...prev, person.id]);
  };

  const calculateMatch = (profileInterests: string[]) => {
    const shared = profileInterests.filter(i => userInterests.includes(i));
    let percent = 55;
    if (shared.length === 1) percent = 70;
    else if (shared.length === 2) percent = 85;
    else if (shared.length >= 3) percent = 95;
    return { percent, shared };
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">People Near You</h1>
        <Button variant="outline" className="border-gray-200 text-gray-700 bg-gray-50 h-14" onClick={() => setFilterOpen(!filterOpen)}>
          <Filter className="w-6 h-6 mr-2" />
          <span className="text-lg">Filters</span>
        </Button>
      </div>

      {filterOpen && (
        <Card className="bg-brand-50 border-brand-200 p-6 md:p-8 animate-in fade-in slide-in-from-top-2">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Adjust Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-lg font-bold text-gray-800">Distance</label>
              <select className="p-4 rounded-xl border border-gray-300 bg-white text-lg focus:ring-2 focus:ring-brand-500 outline-none">
                <option>Within 2 km</option>
                <option>Within 5 km</option>
                <option>Within 10 km</option>
              </select>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-lg font-bold text-gray-800">Age Range</label>
              <select className="p-4 rounded-xl border border-gray-300 bg-white text-lg focus:ring-2 focus:ring-brand-500 outline-none">
                <option>60 - 70 years</option>
                <option>50 - 60 years</option>
                <option>70+ years</option>
              </select>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-lg font-bold text-gray-800">Interests</label>
              <select className="p-4 rounded-xl border border-gray-300 bg-white text-lg focus:ring-2 focus:ring-brand-500 outline-none">
                <option>Any Shared Interest</option>
                <option>Yoga</option>
                <option>Reading</option>
                <option>Morning Walk</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-8">
            <Button size="lg" className="text-xl h-14 px-8" onClick={() => setFilterOpen(false)}>Apply Filters</Button>
          </div>
        </Card>
      )}

      {people.length === 0 && (
        <Card className="p-10 text-center bg-gray-50 border-gray-300 border-dashed">
          <p className="text-2xl text-gray-600 font-bold">No new people found nearby.</p>
        </Card>
      )}

      <div className="flex flex-col gap-6">
        {people.map(profile => {
          const { percent } = calculateMatch(profile.interests);
          const isConnected = connectedIds.includes(profile.id);
          const isLoading = loadingIds.includes(profile.id);
          
          return (
            <Card key={profile.id} className="flex flex-col lg:flex-row gap-6 lg:gap-8 p-6 md:p-8 items-start lg:items-center hover:border-brand-300 transition-colors">
              <div className="flex flex-row lg:flex-col items-center gap-6 shrink-0 w-full lg:w-40 border-b lg:border-b-0 border-gray-100 pb-6 lg:pb-0">
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center border-4 border-brand-50 shrink-0">
                  <User className="w-12 h-12 lg:w-16 lg:h-16" />
                </div>
                <div className="text-left lg:text-center">
                  <h2 className="text-3xl font-extrabold text-gray-900 mb-1">{profile.name}</h2>
                  <p className="text-xl text-gray-500 font-medium">Age {profile.age}</p>
                </div>
              </div>

              <div className="flex flex-col flex-1 gap-6 w-full">
                <div className="flex flex-wrap items-center justify-start gap-4">
                  <div className="flex items-center gap-2 text-xl font-medium text-gray-700 bg-gray-100 px-5 py-2.5 rounded-2xl border border-gray-200">
                    <MapPin className="w-6 h-6 text-brand-600" />
                    {profile.distance} km away
                  </div>
                  <div className="flex items-center gap-2 text-xl font-extrabold text-brand-800 bg-brand-100 px-5 py-2.5 rounded-2xl border border-brand-200">
                    <Sparkles className="w-6 h-6 text-brand-600" />
                    {percent}% Match
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-gray-200">
                  <h4 className="text-xl font-bold text-gray-900 mb-4">Interests</h4>
                  <div className="flex flex-wrap gap-3">
                    {profile.interests.map((interest: string) => {
                      const isShared = userInterests.includes(interest);
                      return (
                        <span 
                          key={interest} 
                          className={`px-4 py-2 rounded-xl text-lg font-medium flex items-center gap-2 ${
                            isShared ? 'bg-brand-600 text-white border-brand-700 shadow-sm' : 'bg-white text-gray-700 border-gray-300 border'
                          }`}
                        >
                          {interest}
                          {isShared && <Check className="w-5 h-5 text-brand-200" />}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-auto flex shrink-0 mt-2 lg:mt-0">
                <Button 
                  size="lg" 
                  className={`w-full lg:w-48 h-16 text-xl lg:text-2xl font-bold shadow-md ${isConnected ? 'bg-green-100 text-green-800 border-2 border-green-500 hover:bg-green-200 shadow-none' : ''}`}
                  onClick={() => handleConnect(profile)}
                  disabled={isConnected || isLoading}
                  variant={isConnected ? 'outline' : 'primary'}
                >
                  {isLoading ? 'Sending...' : isConnected ? <><Check className="w-6 h-6 mr-2"/> Request Sent</> : 'Connect'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
