import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  RtcSurfaceView,
  ChannelProfileType,
  ClientRoleType,
} from 'react-native-agora';
import { useVideoCall, VideoTokenResponse } from '../../hooks/useVideoCall';
import socketService from '../../services/socketService';

interface RouteParams {
  appointmentId: string;
  name?: string;
  role: 'Doctor' | 'User';
  autoJoin?: boolean;
  fromAppointmentList?: boolean;
}

export default function VideoCallScreen({ route, navigation }: any) {
  const {
    appointmentId,
    name = 'Participant',
    role,
    autoJoin = false,
    fromAppointmentList = false,
  } = route.params as RouteParams;

  const { startCall, endCall } = useVideoCall();
  const engineRef = useRef<IRtcEngine | null>(null);

  // 🔧 ADDED — cleanup guard
  const hasCleanedUpRef = useRef(false);

  const [tokenData, setTokenData] = useState<VideoTokenResponse | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] =
    useState<'excellent' | 'good' | 'poor'>('excellent');

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      return (
        granted['android.permission.CAMERA'] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.RECORD_AUDIO'] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  };

  const setupListeners = (engine: IRtcEngine) => {
    engine.registerEventHandler({
      onJoinChannelSuccess: (connection, elapsed) => {
        console.log('✅ Joined channel successfully', {
          channel: connection.channelId,
          localUid: connection.localUid,
          elapsed,
        });
        setIsConnected(true);
      },

      onUserJoined: (_, uid) => {
        console.log('👤 Remote user joined:', uid);
        setRemoteUid(uid);
      },

      onUserOffline: (_, uid, reason) => {
        console.log('👋 Remote user left:', uid, 'Reason:', reason);
        if (remoteUid === uid) setRemoteUid(null);
      },

      onRemoteVideoStateChanged: (_, uid, state, reason) => {
        console.log('📹 Remote video state:', { uid, state, reason });
      },

      onNetworkQuality: (_, __, txQuality) => {
        const quality =
          txQuality <= 2 ? 'excellent' : txQuality <= 3 ? 'good' : 'poor';
        setConnectionQuality(quality);
      },

      onError: (err, msg) => console.error('❌ Agora error:', err, msg),
    });
  };

  const initCall = async () => {
    if (isConnecting || isInitialized) return;

    try {
      setIsConnecting(true);

      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Permissions Required', 'Camera & microphone access needed.');
        navigation.goBack();
        return;
      }

      const data = await startCall(appointmentId);
      setTokenData(data);

      const engine = createAgoraRtcEngine();
      engineRef.current = engine;

      await engine.initialize({
        appId: data.appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      setupListeners(engine);

      await engine.enableAudio();
      await engine.enableVideo();
      await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
      await engine.setDefaultAudioRouteToSpeakerphone(true);
      await engine.setEnableSpeakerphone(true);
      await engine.startPreview();

      setIsInitialized(true);
      setIsConnecting(false);

      await engine.joinChannel(
        data.token,
        data.channelName,
        data.uid,
        { clientRoleType: ClientRoleType.ClientRoleBroadcaster }
      );

      await engine.muteLocalVideoStream(false);
      await engine.muteLocalAudioStream(false);
    } catch (error: any) {
      console.error('❌ Init failed:', error);
      Alert.alert(
        'Connection Failed',
        error?.message || 'Unable to start call.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      setIsConnecting(false);
    }
  };

  const cleanup = async () => {
    if (hasCleanedUpRef.current) return;
    hasCleanedUpRef.current = true;

    const engine = engineRef.current;

    try {
      if (engine) {
        await engine.stopPreview();
        await engine.leaveChannel();
        engine.removeAllListeners();
        engine.release();
        engineRef.current = null;
      }
    } catch (error) {
      console.warn('⚠️ Cleanup error:', error);
    }

    if (role === 'Doctor' && isConnected) {
      try {
        await endCall(appointmentId);
      } catch {}
    }
  };

  // 🔧 ADDED — join / leave appointment socket room
  useEffect(() => {
    if (!appointmentId) return;

    socketService.joinAppointment(appointmentId);
    console.log('📡 Joined appointment socket room:', appointmentId);

    return () => {
      socketService.leaveAppointment(appointmentId);
      console.log('📡 Left appointment socket room:', appointmentId);
    };
  }, [appointmentId]);

  // ✅ call-ended listener (UNCHANGED)
  useEffect(() => {
    if (!appointmentId) return;

    const socket = socketService.getSocket();
    if (!socket) {
      console.warn('⚠️ Socket not available for call-ended listener');
      return;
    }

    const handleCallEnded = (data: {
      appointmentId: string;
      callDuration: number;
    }) => {
      console.log('🔔 Received call-ended event:', data);

      if (data.appointmentId === appointmentId) {
        Alert.alert(
          'Call Ended',
          `The call has been ended by the ${
            role === 'Doctor' ? 'patient' : 'doctor'
          }.`,
          [
            {
              text: 'OK',
              onPress: async () => {
                await cleanup();
                navigation.goBack();
              },
            },
          ],
          { cancelable: false }
        );
      }
    };

    socket.on('call-ended', handleCallEnded);
    console.log('👂 Listening for call-ended events');

    return () => {
      socket.off('call-ended', handleCallEnded);
      console.log('🛑 Stopped listening for call-ended events');
    };
  }, [appointmentId, role]);

  useEffect(() => {
    if ((autoJoin || fromAppointmentList) && appointmentId) initCall();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!isConnected || !remoteUid) return;
    const interval = setInterval(
      () => setCallDuration((prev) => prev + 1),
      1000
    );
    return () => clearInterval(interval);
  }, [isConnected, remoteUid]);

  const toggleMute = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.muteLocalAudioStream(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.muteLocalVideoStream(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  const toggleSpeaker = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.setEnableSpeakerphone(!isSpeakerOn);
    setIsSpeakerOn(!isSpeakerOn);
  };

  const switchCamera = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.switchCamera();
  };

  const handleEndCall = () => {
    Alert.alert('End Call', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Call',
        style: 'destructive',
        onPress: async () => {
          await cleanup();
          navigation.goBack();
        },
      },
    ]);
  };

  if (isConnecting) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Connecting to call...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.participantName}>{name}</Text>
          {isConnected && (
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.statusText}>Connected</Text>
            </View>
          )}
        </View>

        {isConnected && remoteUid && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>
              {formatDuration(callDuration)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.videoContainer}>
        {remoteUid ? (
          <RtcSurfaceView
            style={styles.remoteVideo}
            canvas={{ uid: remoteUid, renderMode: 1 }}
          />
        ) : (
          <View style={styles.waitingContainer}>
            <Ionicons name="person-outline" size={80} color="#666" />
            <Text style={styles.waitingText}>
              Waiting for {name}...
            </Text>
            <ActivityIndicator size="small" color="#666" style={{ marginTop: 12 }} />
          </View>
        )}

        {!isVideoOff && tokenData && (
          <View style={styles.localVideoContainer}>
            <RtcSurfaceView
              style={styles.localVideo}
              canvas={{ uid: tokenData.uid, renderMode: 1, sourceType: 0 }}
              zOrderMediaOverlay
              zOrderOnTop
            />
            <View style={styles.localLabel}>
              <Text style={styles.localLabelText}>You</Text>
            </View>
          </View>
        )}

        {isVideoOff && (
          <View
            style={[
              styles.localVideoContainer,
              styles.videoOffContainer,
            ]}
          >
            <Ionicons name="videocam-off" size={32} color="#fff" />
            <Text style={styles.videoOffText}>Camera Off</Text>
          </View>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={26}
              color={isMuted ? '#EF4444' : '#fff'}
            />
            <Text style={styles.controlLabel}>
              {isMuted ? 'Unmute' : 'Mute'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              isVideoOff && styles.controlButtonActive,
            ]}
            onPress={toggleVideo}
          >
            <Ionicons
              name={isVideoOff ? 'videocam-off' : 'videocam'}
              size={26}
              color={isVideoOff ? '#EF4444' : '#fff'}
            />
            <Text style={styles.controlLabel}>Video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endCallButton}
            onPress={handleEndCall}
          >
            <Ionicons
              name="call"
              size={28}
              color="#fff"
              style={{ transform: [{ rotate: '135deg' }] }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              !isSpeakerOn && styles.controlButtonActive,
            ]}
            onPress={toggleSpeaker}
          >
            <Ionicons
              name={isSpeakerOn ? 'volume-high' : 'volume-mute'}
              size={26}
              color={!isSpeakerOn ? '#EF4444' : '#fff'}
            />
            <Text style={styles.controlLabel}>Speaker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={switchCamera}
          >
            <Ionicons name="camera-reverse" size={26} color="#fff" />
            <Text style={styles.controlLabel}>Flip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  headerLeft: { flex: 1 },
  participantName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
  },

  timerContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  videoContainer: { flex: 1, backgroundColor: '#000' },
  remoteVideo: { width: '100%', height: '100%' },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#000',
  },
  localVideo: { width: '100%', height: '100%' },
  localLabel: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  localLabelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  videoOffContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  videoOffText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 12,
  },
  controlsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    paddingVertical: 8,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
