import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token?: string): Socket {
    const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('saathi_auth_token') : null);

    // Derive server base URL from window location or env
    let backendUrl = 'http://localhost:5000';
    if (typeof window !== 'undefined') {
      if (import.meta.env.VITE_API_URL) {
        backendUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
      } else if (window.location.hostname !== 'localhost') {
        backendUrl = window.location.origin;
      }
    }

    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(backendUrl, {
      auth: {
        token: authToken
      },
      autoConnect: true,
      reconnection: true,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO connected successfully:', this.socket?.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });

    return this.socket;
  }

  joinLocationRoom(parentId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        return resolve({ success: false, error: 'Socket not connected' });
      }

      this.socket.emit('join:location', { parentId }, (response: any) => {
        if (response) {
          resolve(response);
        } else {
          resolve({ success: false, error: 'No response from server' });
        }
      });
    });
  }

  sendParentLocationUpdate(): Promise<{ success: boolean; message?: string; error?: string }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        return resolve({ success: false, error: 'Socket not connected' });
      }

      this.socket.emit('parent:location:update', {}, (response: any) => {
        if (response) {
          resolve(response);
        } else {
          resolve({ success: false, error: 'No response from server' });
        }
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
export default socketService;
