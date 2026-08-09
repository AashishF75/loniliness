export const INITIAL_USER = {
  id: 'u1',
  name: 'Ramesh Kumar',
  age: '65',
  city: 'Delhi',
  area: 'Lajpat Nagar',
  interests: ['Morning Walk', 'Gardening', 'Yoga'],
  preferredTimes: ['Morning', 'Evening'],
  familyConsent: false
};

export const INITIAL_ACTIVITIES = [
  { id: 'a1', name: 'Morning Walk', icon: '👟', date: 'Today', time: '7:00 AM', location: 'Community Park', participants: 12, description: 'A gentle morning walk with neighbors followed by tea.', distance: 0.5, isToday: true },
  { id: 'a2', name: 'Yoga', icon: '🧘', date: 'Today', time: '8:00 AM', location: 'Community Hall', participants: 15, description: 'Beginner friendly chair yoga for flexibility and relaxation.', distance: 1.2, isToday: true },
  { id: 'a3', name: 'Gardening Group', icon: '🌱', date: 'Tomorrow', time: '5:00 PM', location: 'Green Park', participants: 8, description: 'Help plant seasonal flowers and share gardening tips.', distance: 0.8, isToday: false },
  { id: 'a4', name: 'Bhajan & Hobby Circle', icon: '🎵', date: 'This Sunday', time: '6:00 PM', location: 'Community Center', participants: 24, description: 'Weekly spiritual bhajan singing and group discussions.', distance: 1.5, isToday: false }
];

export const INITIAL_PEOPLE = [
  { id: 'p1', name: 'Suresh', age: 65, distance: 0.8, interests: ['Morning Walk', 'Gardening', 'Reading'] },
  { id: 'p2', name: 'Lakshmi', age: 63, distance: 1.2, interests: ['Bhajan', 'Walking', 'Cooking', 'Spiritual Activities'] },
  { id: 'p3', name: 'Ravi', age: 68, distance: 1.7, interests: ['Reading', 'Gardening', 'Music'] },
  { id: 'p4', name: 'Meena', age: 61, distance: 2.1, interests: ['Yoga', 'Cooking', 'Morning Walk'] },
];

export const INITIAL_CONNECTIONS = [
  {
    id: 'p1',
    name: 'Suresh',
    age: 65,
    interests: ['Morning Walk', 'Gardening'],
    status: 'connected',
    messages: [
      { sender: 'me', text: 'Do you go for morning walks?' },
      { sender: 'them', text: 'Yes, every morning at 7.' },
      { sender: 'me', text: 'Great! I will join tomorrow.' }
    ]
  },
  {
    id: 'p4',
    name: 'Meena',
    age: 61,
    interests: ['Yoga', 'Cooking'],
    status: 'pending',
    messages: []
  },
  {
    id: 'p3',
    name: 'Ravi',
    age: 68,
    interests: ['Reading', 'Gardening'],
    status: 'connected',
    messages: []
  }
];
