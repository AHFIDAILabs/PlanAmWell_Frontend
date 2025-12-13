// src/services/socketService.ts
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from './Auth';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  async connect() {
    try {
      // Prevent multiple simultaneous connection attempts
      if (this.isConnecting) {
        console.log('⏳ Socket connection already in progress');
        return;
      }

      if (this.socket?.connected) {
        console.log('✅ Socket already connected');
        return;
      }

      this.isConnecting = true;

      // ✅ Get token from SecureStore
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      
      if (!token) {
        console.log('❌ No token found, cannot connect to Socket.IO');
        this.isConnecting = false;
        return;
      }

      const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:4000';

      this.socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        autoConnect: true,
      });

      this.setupListeners();
      
      console.log('🔌 Socket.IO connection initiated to:', serverUrl);
      this.isConnecting = false;
    } catch (error) {
      console.error('❌ Socket connection error:', error);
      this.isConnecting = false;
    }
  }

  private setupListeners() {
    if (!this.socket) return;

    // ✅ Connection established
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected (ID:', this.socket?.id, ')');
      this.reconnectAttempts = 0;
    });

    // ✅ Server confirmed connection
    this.socket.on('connected', (data) => {
      console.log('✅ Server confirmed connection:', data);
    });

    // ❌ Disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      
      // Auto-reconnect if server disconnected us
      if (reason === 'io server disconnect') {
        console.log('🔄 Attempting to reconnect...');
        this.socket?.connect();
      }
    });

    // ❌ Connection error
    this.socket.on('connect_error', async (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('❌ Max reconnection attempts reached');
        
        // Try to refresh token and reconnect
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          if (token && this.socket) {
            this.socket.auth = { token };
            console.log('🔄 Token refreshed, retrying connection...');
          }
        } catch (err) {
          console.error('❌ Token refresh failed:', err);
        }
      }
    });

    // ❌ Generic error
    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // ✅ Reconnect attempt
    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`);
    });

    // ✅ Reconnection successful
    this.socket.io.on('reconnect', (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);
      this.reconnectAttempts = 0;
    });
  }

  /**
   * 🔔 Listen for new notifications
   */
  onNotification(callback: (notification: any) => void) {
    if (!this.socket) {
      console.warn('⚠️ Socket not initialized, cannot listen for notifications');
      return;
    }
    this.socket.on('new-notification', callback);
  }

  /**
   * 🔕 Remove notification listener
   */
  offNotification(callback: (notification: any) => void) {
    if (!this.socket) return;
    this.socket.off('new-notification', callback);
  }

  /**
   * ✅ Mark notification as read (emit to server)
   */
  markNotificationRead(notificationId: string) {
    if (!this.socket?.connected) {
      console.warn('⚠️ Socket not connected, cannot mark notification as read');
      return;
    }
    this.socket.emit('mark-notification-read', notificationId);
  }

  /**
   * 🔌 Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
      console.log('🔌 Socket.IO disconnected manually');
    }
  }

  /**
   * ✅ Check connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * 🔄 Reconnect manually
   */
  async reconnect() {
    this.disconnect();
    await this.connect();
  }
}

export default new SocketService();