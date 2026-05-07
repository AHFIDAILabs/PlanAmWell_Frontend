import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from './Auth';
import { Platform } from 'react-native';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  // Persisted app-level listeners — survive socket reconnects
  private appListeners = new Map<string, ((data: any) => void)[]>();

  /* ----------------------------------------
   * Wake up Render server (free tier)
   * --------------------------------------*/
  async wakeUpServer() {
    try {
      const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL;
      if (!serverUrl) return false;

      console.log('🌅 Waking up server:', serverUrl);
      const response = await fetch(serverUrl + '/');
      const data = await response.json();

      console.log('✅ Server is awake:', data);
      return true;
    } catch (error) {
      console.error('❌ Failed to wake up server:', error);
      return false;
    }
  }

  /* ----------------------------------------
   * Connect to Socket.IO
   * --------------------------------------*/
  async connect(maxWaitTime = 20000): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        if (this.isConnecting) {
          console.log('⏳ Socket connection already in progress');
          return resolve(this.socket?.connected || false);
        }

        if (this.socket?.connected) {
          console.log('✅ Socket already connected');
          return resolve(true);
        }

        this.isConnecting = true;

        // Setup timeout
        const timeoutHandle = setTimeout(() => {
          console.error('❌ Socket connection timeout after', maxWaitTime, 'ms');
          this.isConnecting = false;
          resolve(false);
        }, maxWaitTime);

        const cleanupTimeout = () => clearTimeout(timeoutHandle);

        SecureStore.getItemAsync(TOKEN_KEY).then((token) => {
          if (!token) {
            console.log('❌ No token found, cannot connect to Socket.IO');
            cleanupTimeout();
            this.isConnecting = false;
            return resolve(false);
          }

          const serverUrl =
            process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:4000';

          console.log('🔌 Connecting to Socket.IO server:', serverUrl);
          console.log('   Platform:', Platform.OS);
          console.log('   Token preview:', token.substring(0, 20) + '...');

          // Cleanup existing socket
          if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
          }

          // Wake server first
          this.wakeUpServer();

          setTimeout(() => {
            // Create socket
            this.socket = io(serverUrl, {
              auth: { token },
              transports: ['websocket'],
              upgrade: false,
              reconnection: true,
              reconnectionAttempts: this.maxReconnectAttempts,
              reconnectionDelay: 3000,
              reconnectionDelayMax: 10000,
              timeout: 20000,
              autoConnect: true,
              forceNew: true,
              path: '/socket.io/',
              withCredentials: false,
              extraHeaders: {
                'X-Client-Type': 'react-native',
                'X-Platform': Platform.OS,
              },
            });

            // Setup connection success handler
            const onConnect = () => {
              console.log('✅ Socket.IO connected');
              cleanupTimeout();
              this.setupListeners();
              this.reregisterAppListeners();
              this.isConnecting = false;
              this.socket?.off('connect', onConnect);
              resolve(true);
            };

            this.socket.on('connect', onConnect);

            // Setup connection error handler
            const onConnectError = (error: any) => {
              console.error('❌ Socket connection error:', error.message);
              cleanupTimeout();
              this.isConnecting = false;
              this.socket?.off('connect_error', onConnectError);
              resolve(false);
            };

            this.socket.on('connect_error', onConnectError);
          }, 2000);
        });
      } catch (error: any) {
        console.error('❌ Socket connection error:', error);
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  /* ----------------------------------------
   * Core socket listeners
   * --------------------------------------*/
  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      console.log('   Socket ID:', this.socket?.id);
      console.log('   Transport:', this.socket?.io.engine.transport.name);

      this.reconnectAttempts = 0;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.socket.on('connected', (data) => {
      console.log('✅ Server confirmed connection:', data);
    });

    this.socket.on('pong', (data) => {
      console.log('🏓 Pong received:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected. Reason:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', async (error: any) => {
      console.error('❌ Socket connection error:', error.message);
      this.reconnectAttempts++;

      console.log(
        `🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
      );

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        try {
          const token = await SecureStore.getItemAsync(TOKEN_KEY);
          if (token && this.socket) {
            this.socket.auth = { token };
            console.log('🔄 Token refreshed');
          }
        } catch (err) {
          console.error('❌ Token refresh failed:', err);
        }
      }
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}`);
    });

    this.socket.io.on('reconnect', (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);
      this.reconnectAttempts = 0;
    });

    this.socket.io.on('reconnect_failed', () => {
      console.error('❌ All reconnection attempts failed');
    });
  }

  /* ----------------------------------------
   * Appointment room handling (CRITICAL FIX)
   * --------------------------------------*/
  joinAppointment(appointmentId: string) {
    if (!this.socket) {
      console.error('❌ Socket not initialized — cannot join appointment room');
      return;
    }

    if (!this.socket.connected) {
      console.error('❌ Socket not connected — cannot join appointment room', {
        connected: this.socket.connected,
        disconnected: this.socket.disconnected,
      });
      return;
    }

    try {
      this.socket.emit('join-appointment', { appointmentId });
      console.log(`📡 Joined appointment room: ${appointmentId}`);
    } catch (err) {
      console.error(`❌ Failed to join appointment room:`, err);
    }
  }

  leaveAppointment(appointmentId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('leave-appointment', { appointmentId });
    console.log(`📡 Left appointment room: ${appointmentId}`);
  }

  /* ----------------------------------------
   * Notification helpers
   * --------------------------------------*/
  onNotification(event: string, callback: (data: any) => void) {
    // Store so it survives socket reconnects
    if (!this.appListeners.has(event)) {
      this.appListeners.set(event, []);
    }
    const list = this.appListeners.get(event)!;
    if (!list.includes(callback)) {
      list.push(callback);
    }

    if (this.socket) {
      this.socket.on(event, callback);
      console.log(`👂 Listening for event "${event}"`);
    } else {
      console.warn(`⚠️ Socket not initialized — "${event}" listener queued`);
    }
  }

  offNotification(event: string, callback: (data: any) => void) {
    // Remove from persistence map
    const list = this.appListeners.get(event);
    if (list) {
      const idx = list.indexOf(callback);
      if (idx !== -1) list.splice(idx, 1);
      if (list.length === 0) this.appListeners.delete(event);
    }

    if (this.socket) {
      this.socket.off(event, callback);
      console.log(`🛑 Stopped listening for event "${event}"`);
    }
  }

  private reregisterAppListeners() {
    if (!this.socket) return;
    this.appListeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => this.socket!.on(event, cb));
    });
    if (this.appListeners.size > 0) {
      console.log(`🔄 Re-registered ${this.appListeners.size} app event type(s) after reconnect`);
    }
  }

  markNotificationRead(notificationId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('mark-notification-read', notificationId);
  }

  ping() {
    if (!this.socket?.connected) return;
    this.socket.emit('ping');
    console.log('🏓 Ping sent');
  }

  /* ----------------------------------------
   * Connection utilities
   * --------------------------------------*/
  disconnect() {
    console.log('🔌 Disconnecting socket');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
      console.log('✅ Socket disconnected');
      // appListeners intentionally preserved — reregisterAppListeners() re-adds them on next connect
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionInfo() {
    if (!this.socket) {
      return { connected: false, transport: null, socketId: null };
    }

    return {
      connected: this.socket.connected,
      transport: this.socket.io.engine?.transport?.name || null,
      socketId: this.socket.id || null,
    };
  }

  async reconnect() {
    console.log('🔄 Manual reconnection requested');
    this.disconnect();
    await this.connect(15000); // Wait up to 15 seconds for reconnection
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  /* ----------------------------------------
   * Reconnect scheduling
   * --------------------------------------*/
  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      3000 * Math.pow(2, this.reconnectAttempts),
      30000
    );

    console.log(`⏱️ Scheduling reconnection in ${delay / 1000}s`);

    this.reconnectTimer = setTimeout(() => {
      console.log('🔄 Executing scheduled reconnection');
      this.reconnect();
    }, delay);
  }
}

export default new SocketService();
