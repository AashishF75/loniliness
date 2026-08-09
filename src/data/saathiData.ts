export interface Companion {
  id: string;
  name: string;
  distance: string;
  location: string;
  age: number;
  languages: string[];
  bio: string;
  hobbies: string[];
  verified: boolean;
  connected: boolean;
  image: string;
}

export interface Activity {
  id: string;
  title: string;
  category: string;
  distance: string;
  image: string;
}

export interface Reminder {
  id: string;
  title: string;
  completed: boolean;
}

export const INITIAL_COMPANIONS: Companion[] = [
  {
    id: '1',
    name: 'Ramesh Sharma Ji',
    distance: '0.4 km away',
    location: 'Green Park, Sector 4',
    age: 68,
    languages: ['Hindi', 'English'],
    bio: '"Retired Bank Manager. Enjoys morning walks and Kishore Kumar songs."',
    hobbies: ['Morning Walk', 'Classical Music', 'Gardening'],
    verified: true,
    connected: true,
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150',
  }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: '1',
    title: 'Morning Park Walk & Laughter Yoga',
    category: 'Health & Fitness',
    distance: '0.3 km away',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600',
  }
];

export const INITIAL_REMINDERS: Reminder[] = [];
export const FAMILY_MEMBERS: any[] = [];
