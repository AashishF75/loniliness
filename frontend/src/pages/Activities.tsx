import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, MapPin, Users, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { activityService } from '../services/activityService';
import { useTranslation } from 'react-i18next';

export function Activities() {
  const [activities, setActivities] = useState<any[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      const data = await activityService.getActivities();
      setActivities(data);
      const joined = await activityService.getJoinedActivities();
      setJoinedIds(joined);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleJoin = async (id: string) => {
    if (joinedIds.includes(id)) return;

    // Optimistic UI update
    setJoinedIds([...joinedIds, id]);
    setActivities(prev => prev.map(a => a.id === id ? { ...a, participants: a.participants + 1 } : a));

    const newJoined = await activityService.joinActivity(id);
    setJoinedIds(newJoined);
  };

  const todayActivities = activities.filter(a => a.isToday);
  const upcomingActivities = activities.filter(a => !a.isToday);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="p-10 text-center bg-brand-50/50 border-brand-100 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-2xl font-bold text-brand-800">{t('activities.findingLocal')}</p>
        </Card>
      </div>
    );
  }

  const renderActivityCard = (activity: any) => {
    const isJoined = joinedIds.includes(activity.id);

    return (
      <Card key={activity.id} className="flex flex-col lg:flex-row gap-6 lg:gap-8 p-6 md:p-8 hover:border-brand-400 transition-all items-start lg:items-center">
        <div className="w-24 h-24 lg:w-32 lg:h-32 bg-brand-50 border-4 border-brand-100 rounded-3xl flex items-center justify-center text-5xl lg:text-7xl shrink-0 shadow-inner">
          {activity.icon}
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">{activity.name}</h3>
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">{activity.description}</p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-4 mt-2">
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-800 bg-gray-100 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl border border-gray-200">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
              {activity.date} at {activity.time}
            </div>
            <div className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-800 bg-gray-100 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl border border-gray-200">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
              {activity.location} ({activity.distance} km)
            </div>
            <div className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-brand-900 bg-brand-100 px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl border border-brand-200 shadow-sm">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-brand-700" />
              {activity.participants} {t('activities.participants')}
            </div>
          </div>
        </div>

        <div className="flex items-center shrink-0 w-full lg:w-auto mt-4 lg:mt-0">
          <Button
            size="lg"
            className={`w-full lg:w-48 h-16 text-xl sm:text-2xl font-bold transition-all ${
              isJoined
                ? 'bg-green-100 text-green-800 border-2 border-green-400 opacity-100 shadow-none'
                : 'bg-brand-600 hover:bg-brand-700 shadow-md'
            }`}
            onClick={() => handleJoin(activity.id)}
            disabled={isJoined}
            variant={isJoined ? 'outline' : 'primary'}
          >
            {isJoined ? (
              <span className="flex items-center">
                <Check className="w-8 h-8 mr-2 text-green-600" /> {t('activities.joined')}
              </span>
            ) : (
              t('activities.join')
            )}
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-8 md:gap-12 pb-8">
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-3">{t('activities.communityActivities')}</h1>
        <p className="text-xl md:text-2xl text-gray-600 font-medium">{t('activities.joinLocalEvents')}</p>
      </div>

      <div className="flex flex-col gap-10">
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-2 sm:gap-3">
            <span className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            {t('activities.todaysActivities')}
          </h2>
          <div className="flex flex-col gap-6">
            {todayActivities.length === 0 && (
              <Card className="p-8 text-center bg-gray-50 border-dashed border-2 border-gray-300">
                <p className="text-2xl text-gray-500 font-bold">{t('activities.noActivitiesToday')}</p>
                <p className="text-lg text-gray-400 mt-2">{t('activities.checkUpcoming')}</p>
              </Card>
            )}
            {todayActivities.map(renderActivityCard)}
          </div>
        </section>

        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 flex items-center gap-2 sm:gap-3 mt-4">
            <span className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            {t('activities.upcomingActivities')}
          </h2>
          <div className="flex flex-col gap-6">
            {upcomingActivities.length === 0 && (
              <Card className="p-8 text-center bg-gray-50 border-dashed border-2 border-gray-300">
                <p className="text-2xl text-gray-500 font-bold">{t('activities.noUpcomingActivities')}</p>
              </Card>
            )}
            {upcomingActivities.map(renderActivityCard)}
          </div>
        </section>
      </div>
    </div>
  );
}
