const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If accessing via LAN IP or hostname (e.g. 10.x.x.x, 192.168.x.x), dynamically use host at :5000/api
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && (!envUrl || envUrl.includes('localhost') || envUrl.includes('192.168.'))) {
      return `${window.location.protocol}//${hostname}:5000/api`;
    }
  }
  return envUrl || 'http://localhost:5000/api';
};

export const API_URL = getApiUrl();

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('saathi_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status} Error` }));
      throw new Error(error.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  } catch (err: any) {
    console.error(`API Error on ${endpoint}:`, err);
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error(`Unable to connect to server at ${API_URL}. Please check your connection.`);
    }
    throw err;
  }
};
