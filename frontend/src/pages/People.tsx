import React, { useState, useEffect } from 'react';
import { User, MapPin, Sparkles, Filter, Check, Clock, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { connectionService } from '../services/connectionService';
import { userService } from '../services/userService';

export function People() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [radius, setRadius] = useState<number>(0);
  const [interest, setInterest] = useState('');
  const [commonInterestsOnly, setCommonInterestsOnly] = useState(false);

  // Available interests from current nearby users to populate filter dropdown
  const [availableInterests, setAvailableInterests] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPeople = async (filtersObj?: any) => {
    setLoading(true);
    try {
      const user = await userService.getUser();
      if (user?.interests) setUserInterests(user.interests);

      const activeRadius = filtersObj?.radius !== undefined ? filtersObj.radius : radius;
      const currentFilters = filtersObj || { radius: activeRadius > 0 ? activeRadius : undefined, search, interest, commonInterestsOnly };
      const [nearbyPeople, connections, outgoing] = await Promise.all([
        connectionService.getNearbyPeople(currentFilters),
        connectionService.getConnections(),
        connectionService.getOutgoingRequests()
      ]);
      setPeople(nearbyPeople);

      const acceptedIds = connections.map((c: any) => c.userId);
      setConnectedIds([...acceptedIds, ...outgoing]);

      // Extract unique interests from nearby people for the filter dropdown
      if (!filtersObj) {
         const allInterests = new Set<string>();
         nearbyPeople.forEach((p:any) => p.interests?.forEach((i:string) => allInterests.add(i)));
         setAvailableInterests(Array.from(allInterests).sort());
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Location access is needed to find people near you.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  useEffect(() => {
    // Only re-fetch when filters change and we are not initial loading
    if (!loading) {
       const timer = setTimeout(() => {
         fetchPeople({ radius: radius > 0 ? radius : undefined, search, interest, commonInterestsOnly });
       }, 500); // debounce search
       return () => clearTimeout(timer);
    }
  }, [search, radius, interest, commonInterestsOnly]);

  const clearFilters = () => {
    setSearch('');
    setRadius(0);
    setInterest('');
    setCommonInterestsOnly(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="p-10 text-center bg-brand-50/50 border-brand-100 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-2xl font-bold text-brand-800">{t('people.findingCompanions')}</p>
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



  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">{t('people.nearbyPeople')}</h1>
        <Button variant="outline" className="border-gray-200 text-gray-700 bg-gray-50 h-14" onClick={() => setFilterOpen(!filterOpen)}>
          <Filter className="w-6 h-6 mr-2" />
          <span className="text-lg">{t('people.filters')}</span>
        </Button>
      </div>

      {filterOpen && (
        <Card className="bg-brand-50 border-brand-200 p-6 md:p-8 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">{t('people.searchAndFilters')}</h3>
            <button onClick={clearFilters} className="text-brand-700 hover:text-brand-900 font-bold underline">
              {t('people.clearFilters')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col gap-3 md:col-span-2">
              <label className="text-lg font-bold text-gray-800">{t('people.search')}</label>
              <input
                type="text"
                placeholder={t('people.searchCompanions')}
                className="p-4 rounded-xl border border-gray-300 bg-white text-lg focus:ring-2 focus:ring-brand-500 outline-none w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-lg font-bold text-gray-800">{t('people.distance')}</label>
              <select
                className="p-4 rounded-xl border border-gray-300 bg-white text-lg focus:ring-2 focus:ring-brand-500 outline-none"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                <option value={0}>Any Distance</option>
              </select>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-lg font-bold text-gray-800">{t('people.interestsLabel')}</label>
              <select
                className="p-4 rounded-xl border border-gray-300 bg-white text-lg focus:ring-2 focus:ring-brand-500 outline-none"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
              >
                <option value="">{t('people.allInterests')}</option>
                {availableInterests.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-300">
            <input
              type="checkbox"
              id="commonInterests"
              className="w-6 h-6 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
              checked={commonInterestsOnly}
              onChange={(e) => setCommonInterestsOnly(e.target.checked)}
            />
            <label htmlFor="commonInterests" className="text-xl font-bold text-gray-800 cursor-pointer select-none">
              {t('people.commonInterestsOnly')}
            </label>
          </div>
        </Card>
      )}

      {errorMsg ? (
        <Card className="p-10 text-center bg-red-50 border-red-200">
          <p className="text-2xl text-red-800 font-bold mb-2">{errorMsg}</p>
        </Card>
      ) : people.length === 0 ? (
        <Card className="p-10 text-center bg-gray-50 border-gray-300 border-dashed">
          {search || interest || commonInterestsOnly || radius > 0 ? (
            <>
              <p className="text-2xl text-gray-800 font-bold mb-2">{t('people.noMatches')}</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>{t('people.clearFilters')}</Button>
            </>
          ) : (
            <p className="text-2xl text-gray-800 font-bold mb-2">{t('people.noMembers')}</p>
          )}
        </Card>
      ) : null}

      <div className="flex flex-col gap-6">
        {people.map(profile => {
          const percent = profile.matchScore !== undefined ? `${profile.matchScore}% ${t('people.match')}` : t('people.profileMatchEmpty');
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
                  <p className="text-xl text-gray-500 font-medium">{t('people.age')} {profile.age}</p>
                </div>
              </div>

              <div className="flex flex-col flex-1 gap-6 w-full">
                <div className="flex flex-wrap items-center justify-start gap-4">
                  <div className="flex items-center gap-2 text-xl font-medium text-gray-700 bg-gray-100 px-5 py-2.5 rounded-2xl border border-gray-200">
                    <MapPin className="w-6 h-6 text-brand-600" />
                    {t('people.distanceAway', { distance: profile.distance })}
                  </div>
                  <div className="flex items-center gap-2 text-xl font-extrabold text-brand-800 bg-brand-100 px-5 py-2.5 rounded-2xl border border-brand-200">
                    <Sparkles className="w-6 h-6 text-brand-600" />
                    {percent}
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-3xl border border-gray-200">
                  <h4 className="text-xl font-bold text-gray-900 mb-4">{t('people.interests')}</h4>
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

              <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3 shrink-0 mt-4 lg:mt-0">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-40 lg:w-48 h-16 text-xl lg:text-2xl font-bold border-2 border-brand-300 text-brand-700 hover:bg-brand-50"
                  onClick={() => navigate(`/users/${profile.id}`, { state: { distance: profile.distance } })}
                >
                  <Eye className="w-6 h-6 mr-2" /> {t('people.viewProfile')}
                </Button>
                <Button
                  size="lg"
                  className={`w-full sm:w-40 lg:w-48 h-16 text-xl lg:text-2xl font-bold shadow-md ${isConnected ? 'bg-green-100 text-green-800 border-2 border-green-500 hover:bg-green-200 shadow-none' : ''}`}
                  onClick={() => handleConnect(profile)}
                  disabled={isConnected || isLoading}
                  variant={isConnected ? 'outline' : 'primary'}
                >
                  {isLoading ? '...' : isConnected ? <><Check className="w-6 h-6 mr-2"/> {t('people.requestSent')}</> : t('people.connect')}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
