// screens/VideoCallScreen.tsx - ENHANCED & FIXED VERSION

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoCall, VideoTokenResponse } from '../../hooks/useVideoCall';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcSurfaceView,
  VideoCanvas,
} from 'react-native-agora';

interface Props {
  route: any;
  navigation: any;
}

export default function VideoCallScreen({ route, navigation }: Props) {
  const { appointmentId, name, patientId, role } = route.params;
  const { startCall, endCall } = useVideoCall();

  // Engine ref
  const engineRef = useRef<IRtcEngine | null>(null);
  
  // State management
  const [tokenData, setTokenData] = useState<VideoTokenResponse | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');

  // Cleanup ref to prevent multiple cleanups
  const isCleaningUp = useRef(false);

  useEffect(() => {
    initCall();

    // Call duration timer
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    // Cleanup on unmount
    return () => {
      clearInterval(timer);
      cleanup();
    };
  }, []);

  const initCall = async () => {
    try {
      console.log('🎥 Initializing video call for appointment:', appointmentId);
      
      // Step 1: Get token from backend
      const data = await startCall(appointmentId);
      setTokenData(data);
      console.log('✅ Token received:', { channelName: data.channelName, uid: data.uid });

      // Step 2: Create Agora Engine
      const engine = createAgoraRtcEngine();
      engineRef.current = engine;

      // Step 3: Initialize with App ID
      await engine.initialize({
        appId: data.appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      // Step 4: Setup event listeners BEFORE enabling video
      setupEventListeners(engine);

      // Step 5: Enable audio and video
      await engine.enableAudio();
      await engine.enableVideo();

      // Step 6: Set client role
      await engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      // Step 7: Enable speaker by default (for video calls)
      await engine.setDefaultAudioRouteToSpeakerphone(true);
      await engine.setEnableSpeakerphone(true);

      // Step 8: Start preview
      await engine.startPreview();
      setIsInitialized(true);

      // Step 9: Join channel
      await engine.joinChannel(data.token, data.channelName, data.uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });

      console.log('✅ Video call initialized successfully');
    } catch (error: any) {
      console.error('❌ Video call initialization failed:', error);
      Alert.alert(
        'Connection Failed',
        error?.message || 'Failed to join video call. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const setupEventListeners = (engine: IRtcEngine) => {
    // User joined channel
    engine.addListener('onUserJoined', (connection, uid) => {
      console.log('✅ Remote user joined:', uid);
      setRemoteUid(uid);
    });

    // User left channel
    engine.addListener('onUserOffline', (connection, uid, reason) => {
      console.log('❌ Remote user offline:', uid, 'Reason:', reason);
      if (remoteUid === uid) {
        setRemoteUid(null);
      }
    });

    // Successfully joined channel
    engine.addListener('onJoinChannelSuccess', (connection, elapsed) => {
      console.log('✅ Joined channel:', connection.channelId, 'UID:', connection.localUid);
      setIsConnected(true);
    });

    // Connection state changed
    engine.addListener('onConnectionStateChanged', (connection, state, reason) => {
      console.log('🔄 Connection state changed:', state, 'Reason:', reason);
      if (state === 3) { // Connected
        setIsConnected(true);
      } else if (state === 1 || state === 4) { // Disconnected or Failed
        setIsConnected(false);
      }
    });

    // Network quality
    engine.addListener('onNetworkQuality', (connection, quality) => {
      if (quality <= 2) {
        setConnectionQuality('excellent');
      } else if (quality <= 4) {
        setConnectionQuality('good');
      } else {
        setConnectionQuality('poor');
      }
    });

    // Error occurred
    engine.addListener('onError', (err, msg) => {
      console.error('⚠️ Agora error:', err, msg);
      if (err === 17) { // Join channel rejected
        Alert.alert('Connection Error', 'Failed to join call. Please try again.');
      }
    });

    // Remote video state changed
    engine.addListener('onRemoteVideoStateChanged', (connection, uid, state, reason) => {
      console.log('📹 Remote video state changed:', uid, state, reason);
    });

    // Audio volume indication (optional - for showing speaking indicator)
    engine.addListener('onAudioVolumeIndication', (connection, speakers, totalVolume) => {
      // Can be used to show visual indicator when someone is speaking
    });
  };

  const cleanup = async () => {
    if (isCleaningUp.current) {
      console.log('⚠️ Cleanup already in progress');
      return;
    }

    isCleaningUp.current = true;
    const engine = engineRef.current;

    if (engine) {
      try {
        console.log('🧹 Cleaning up Agora engine...');

        // Stop preview
        try {
          await engine.stopPreview();
        } catch (e) {
          console.warn('Stop preview error:', e);
        }

        // Leave channel
        try {
          await engine.leaveChannel();
        } catch (e) {
          console.warn('Leave channel error:', e);
        }

        // Remove all listeners
        engine.removeAllListeners();

        // Release engine resources
        engine.release();

        engineRef.current = null;
        console.log('✅ Agora engine cleaned up');
      } catch (error) {
        console.error('❌ Cleanup error:', error);
      }
    }

    // Notify backend (only if doctor and call was active)
    if (tokenData && role === 'doctor' && isConnected) {
      try {
        await endCall(appointmentId, undefined);
        console.log('✅ Backend notified of call end');
      } catch (error) {
        console.error('❌ Failed to notify backend:', error);
      }
    }
  };

  const leaveCall = async () => {
    await cleanup();
    navigation.goBack();
  };

  const toggleMute = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      await engine.muteLocalAudioStream(!isMuted);
      setIsMuted(!isMuted);
      console.log(`🎤 Audio ${!isMuted ? 'muted' : 'unmuted'}`);
    } catch (error) {
      console.error('Toggle mute error:', error);
    }
  };

  const toggleVideo = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      await engine.muteLocalVideoStream(!isVideoOff);
      setIsVideoOff(!isVideoOff);
      console.log(`📹 Video ${!isVideoOff ? 'disabled' : 'enabled'}`);
    } catch (error) {
      console.error('Toggle video error:', error);
    }
  };

  const toggleSpeaker = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      await engine.setEnableSpeakerphone(!isSpeakerOn);
      setIsSpeakerOn(!isSpeakerOn);
      console.log(`🔊 Speaker ${!isSpeakerOn ? 'disabled' : 'enabled'}`);
    } catch (error) {
      console.error('Toggle speaker error:', error);
    }
  };

  const switchCamera = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      await engine.switchCamera();
      console.log('🔄 Camera switched');
    } catch (error) {
      console.error('Switch camera error:', error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this consultation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: leaveCall,
        },
      ]
    );
  };

  // Show loading screen while initializing
  if (!isInitialized || !tokenData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Connecting to call...</Text>
          <Text style={styles.loadingSubtext}>{name || 'Participant'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View
            style={[
              styles.statusDot,
              { 
                backgroundColor: isConnected 
                  ? (connectionQuality === 'poor' ? '#F59E0B' : '#10B981')
                  : '#EF4444' 
              },
            ]}
          />
          <Text style={styles.statusText}>
            {isConnected 
              ? (connectionQuality === 'poor' ? 'Poor Connection' : 'Connected')
              : 'Connecting...'}
          </Text>
        </View>
        <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
      </View>

      {/* Video Container */}
      <View style={styles.videoContainer}>
        {/* Remote Video */}
        {remoteUid ? (
          <RtcSurfaceView
            style={styles.remoteVideo}
            canvas={{
              uid: remoteUid,
              renderMode: 1, // Hidden (aspect fill)
              sourceType: 1, // Remote
            }}
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <Ionicons name="person-circle-outline" size={80} color="#fff" />
            <Text style={styles.placeholderText}>
              Waiting for {role === 'doctor' ? 'patient' : 'doctor'}...
            </Text>
            <Text style={styles.placeholderSubtext}>
              {name || 'Participant'}
            </Text>
          </View>
        )}

        {/* Local Video Preview */}
        <View style={styles.localVideoContainer}>
          {!isVideoOff ? (
            <RtcSurfaceView
              style={styles.localVideo}
              canvas={{
                uid: 0, // 0 represents local user
                renderMode: 1, // Hidden (aspect fill)
                sourceType: 0, // Local camera
              }}
              zOrderMediaOverlay={true}
            />
          ) : (
            <View style={styles.videoOffPlaceholder}>
              <Ionicons name="videocam-off" size={32} color="#fff" />
              <Text style={styles.videoOffText}>Camera Off</Text>
            </View>
          )}
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          {/* Mute Button */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              isMuted && styles.controlButtonActive,
            ]}
            onPress={toggleMute}
          >
            <Ionicons
              name={isMuted ? 'mic-off' : 'mic'}
              size={28}
              color={isMuted ? '#EF4444' : '#fff'}
            />
            <Text style={styles.controlLabel}>
              {isMuted ? 'Unmute' : 'Mute'}
            </Text>
          </TouchableOpacity>

          {/* Video Toggle */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              isVideoOff && styles.controlButtonActive,
            ]}
            onPress={toggleVideo}
          >
            <Ionicons
              name={isVideoOff ? 'videocam-off' : 'videocam'}
              size={28}
              color={isVideoOff ? '#EF4444' : '#fff'}
            />
            <Text style={styles.controlLabel}>Video</Text>
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity
            style={styles.endCallButton}
            onPress={handleEndCall}
          >
            <Ionicons 
              name="call" 
              size={32} 
              color="#fff" 
              style={{ transform: [{ rotate: '135deg' }] }} 
            />
          </TouchableOpacity>

          {/* Speaker Toggle */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              !isSpeakerOn && styles.controlButtonActive,
            ]}
            onPress={toggleSpeaker}
          >
            <Ionicons
              name={isSpeakerOn ? 'volume-high' : 'volume-mute'}
              size={28}
              color={!isSpeakerOn ? '#EF4444' : '#fff'}
            />
            <Text style={styles.controlLabel}>Speaker</Text>
          </TouchableOpacity>

          {/* Flip Camera */}
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={switchCamera}
          >
            <Ionicons name="camera-reverse" size={28} color="#fff" />
            <Text style={styles.controlLabel}>Flip</Text>
          </TouchableOpacity>
        </View>

        {/* Participant Name */}
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>
            {role === 'doctor' ? 'Patient' : 'Doctor'}: {name || 'Unknown'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    zIndex: 10,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  duration: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '500',
  },
  placeholderSubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
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
  videoOffPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
  },
  videoOffText: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 4,
  },
  controls: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(239,68,68,0.3)',
  },
  controlLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  participantInfo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  participantName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});