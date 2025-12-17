// VideoCallScreen.tsx — FIXED REMOTE VIDEO RENDERING

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
    name,
    role,
    autoJoin = false,
    fromAppointmentList = false,
  } = route.params as RouteParams;

  const { startCall, endCall } = useVideoCall();
  const engineRef = useRef<IRtcEngine | null>(null);

  const [tokenData, setTokenData] = useState<VideoTokenResponse | null>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);

      return (
        granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
      );
    }
    return true;
  };

  const setupListeners = (engine: IRtcEngine) => {
    engine.addListener('onJoinChannelSuccess', (connection, elapsed) => {
      console.log('✅ Successfully joined channel:', connection.channelId);
      setIsConnected(true);
    });

    engine.addListener('onUserJoined', (connection, uid, elapsed) => {
      console.log('👤 Remote user joined:', uid);
      setRemoteUid(uid);
      
    
      setTimeout(async () => {
        try {
          await engine.setupRemoteVideo({
            uid,
            renderMode: 1, // Fit mode
            sourceType: 1, // Remote video
          });
          console.log('✅ Remote video setup complete for uid:', uid);
        } catch (e) {
          console.error('❌ Failed to setup remote video:', e);
        }
      }, 100);
    });

    engine.addListener('onUserOffline', (connection, uid, reason) => {
      console.log('👋 Remote user offline:', uid, 'reason:', reason);
      if (uid === remoteUid) {
        setRemoteUid(null);
      }
    });

    engine.addListener('onRemoteVideoStateChanged', (connection, uid, state, reason, elapsed) => {
      console.log('📹 Remote video state changed:', { uid, state, reason });
    });

    engine.addListener('onError', (err, msg) => {
      console.error('❌ Agora error:', err, msg);
    });
  };

  const initCall = async () => {
    if (isConnecting || isInitialized) return;

    try {
      setIsConnecting(true);

      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert('Permission required', 'Camera & microphone access is required.');
        setIsConnecting(false);
        return;
      }

      console.log('🎥 Fetching call data...');
      const data = await startCall(appointmentId);
      setTokenData(data);

      console.log('🔧 Initializing Agora engine...');
      const engine = createAgoraRtcEngine();
      engineRef.current = engine;

      await engine.initialize({
        appId: data.appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      
      setupListeners(engine);

    
      await engine.enableAudio();
      await engine.enableVideo();
      await engine.enableLocalAudio(true);
      await engine.enableLocalVideo(true);

   
      await engine.setupLocalVideo({
        uid: data.uid,
        renderMode: 1,
        sourceType: 0, 
      });

      await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

    
      await engine.startPreview();


      console.log('🚀 Joining channel:', data.channelName);
      await engine.joinChannel(
        data.token,
        data.channelName,
        data.uid,
        { clientRoleType: ClientRoleType.ClientRoleBroadcaster }
      );

    
      await engine.setDefaultAudioRouteToSpeakerphone(true);
      await engine.setEnableSpeakerphone(true);

      setIsInitialized(true);
      setIsConnecting(false);
      
      console.log('✅ Call initialization complete');
    } catch (e: any) {
      console.error('❌ Agora init error:', e);
      Alert.alert('Call failed', e?.message || 'Unable to start call');
      setIsConnecting(false);
    }
  };

  const cleanup = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      console.log('🧹 Cleaning up call...');
      await engine.stopPreview();
      await engine.leaveChannel();
      engine.removeAllListeners();
      engine.release();
      engineRef.current = null;
    } catch (e) {
      console.warn('⚠️ Cleanup error:', e);
    }

    if (role === 'Doctor' && isConnected) {
      await endCall(appointmentId);
    }
  };

  useEffect(() => {
    if ((autoJoin || fromAppointmentList) && appointmentId) {
      initCall();
    }
    return () => {
      cleanup();
    };
  }, []);

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

  if (isConnecting) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.text}>Connecting...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
  
      <View style={styles.videoContainer}>
        {remoteUid ? (
          <>
            <RtcSurfaceView
              style={styles.remoteVideo}
              canvas={{ 
                uid: remoteUid, 
                renderMode: 1,
                sourceType: 1 
              }}
            />
            <Text style={styles.remoteLabel}>
              {name || 'Participant'}
            </Text>
          </>
        ) : (
          <View style={styles.waitingContainer}>
            <Ionicons name="person-outline" size={80} color="#666" />
            <Text style={styles.waitingText}>Waiting for participant...</Text>
            {isConnected && (
              <Text style={styles.connectedText}>✓ Connected to channel</Text>
            )}
          </View>
        )}

      
        {!isVideoOff && tokenData && (
          <View style={styles.localVideoContainer}>
            <RtcSurfaceView
              style={styles.localVideo}
              canvas={{ 
                uid: tokenData.uid, 
                renderMode: 1,
                sourceType: 0 
              }}
              zOrderMediaOverlay={true}
            />
            <Text style={styles.localLabel}>You</Text>
          </View>
        )}
      </View>

  
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleMute}
        >
          <Ionicons 
            name={isMuted ? 'mic-off' : 'mic'} 
            size={28} 
            color={isMuted ? '#EF4444' : '#fff'} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleVideo}
        >
          <Ionicons 
            name={isVideoOff ? 'videocam-off' : 'videocam'} 
            size={28} 
            color={isVideoOff ? '#EF4444' : '#fff'} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endButton}
          onPress={async () => {
            await cleanup();
            navigation.goBack();
          }}
        >
          <Ionicons 
            name="call" 
            size={30} 
            color="#fff" 
            style={{ transform: [{ rotate: '135deg' }] }} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton}
          onPress={toggleSpeaker}
        >
          <Ionicons 
            name={isSpeakerOn ? 'volume-high' : 'volume-mute'} 
            size={28} 
            color={isSpeakerOn ? '#fff' : '#EF4444'} 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#1a1a1a' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#1a1a1a'
  },
  text: { 
    color: '#fff', 
    marginTop: 10,
    fontSize: 16
  },
  videoContainer: { 
    flex: 1,
    position: 'relative'
  },
  remoteVideo: { 
    width: '100%', 
    height: '100%',
    backgroundColor: '#000'
  },
  remoteLabel: {
    position: 'absolute',
    top: 20,
    left: 20,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  waitingText: {
    color: '#999',
    fontSize: 18,
    marginTop: 16,
  },
  connectedText: {
    color: '#10B981',
    fontSize: 14,
    marginTop: 8,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#000',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  localLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});