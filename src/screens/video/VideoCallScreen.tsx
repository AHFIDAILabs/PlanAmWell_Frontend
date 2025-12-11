// screens/VideoCallScreen.tsx - FULLY CORRECTED VERSION

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoCall, VideoTokenResponse } from '../../hooks/useVideoCall';

// --- CORRECTED AGORA IMPORTS ---
// 1. Import the Engine Creator Function as default
import RtcEngine from 'react-native-agora';

// 2. Import all required components, enums, and types as NAMED EXPORTS
import {
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine, // Type definition for the engine instance
} from 'react-native-agora';

import AgoraRtcRenderView from 'react-native-agora';
// --------------------------------

interface Props {
  route: any;
  navigation: any;
}

// ⚠️ Note: We must use a type assertion for the view components here
// because the Agora package's type definition file is often incorrect for JSX usage.
const RtcLocalView = AgoraRtcRenderView as any;
const RtcRemoteView = AgoraRtcRenderView as any;


export default function VideoCallScreen({ route, navigation }: Props) {
  const { appointmentId, name, patientId, role } = route.params;
  const { startCall, endCall } = useVideoCall();

  // Use ref to store engine instance
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

  useEffect(() => {
    initCall();

    // Call duration timer
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    // Cleanup on unmount
    return () => {
      clearInterval(timer);
      leaveCall();
    };
  }, []);

  const initCall = async () => {
    try {
      // Step 1: Get token from backend
      const data = await startCall(appointmentId);
      setTokenData(data);

      // 💥 Step 2: CORRECT ENGINE CREATION & Initialization (No createClient)
      // RtcEngine is the creator function (createAgoraRtcEngine)
      const engineInstance: IRtcEngine = RtcEngine(); 
      engineRef.current = engineInstance;

      // Initialize the engine with the App ID
      await engineInstance.initialize({ appId: data.appId });

      // Step 3: Enable video
      await engineInstance.enableVideo();

      // Step 4: Set channel profile
      // Use the corrected enum name
      await engineInstance.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);

      // Step 5: Set client role (broadcaster can send and receive)
      // Use the corrected enum name
      await engineInstance.setClientRole(ClientRoleType.ClientRoleBroadcaster); 

      // Step 6: Setup event listeners with proper types
    // FIX 1: "UserJoined" -> "userJoined" (or "onUserJoined")
    engineInstance.addListener('onUserJoined', (connection: any, uid: number) => {
        console.log('✅ User joined:', uid);
        setRemoteUid(uid);
    });

    // FIX 2: "UserOffline" -> "userOffline" (or "onUserOffline")
    engineInstance.addListener('onUserOffline', (connection: any, uid: number) => {
        console.log('❌ User offline:', uid);
        setRemoteUid(null);
    });

    // FIX 3: "JoinChannelSuccess" -> "onJoinChannelSuccess"
    engineInstance.addListener('onJoinChannelSuccess', (connection: any, elapsed: number) => {
        console.log('✅ Joined channel:', connection.channelId, 'with UID:', connection.localUid);
        setIsConnected(true);
    });
    
    // FIX 4: "Error" -> "onError"
    engineInstance.addListener('onError', (err: number, msg: string) => {
        console.error('⚠️ Agora error code:', err, msg);
        Alert.alert('Connection Error', `Error code: ${err}`);
    });

      // Step 7: Start local preview
      await engineInstance.startPreview();
      setIsInitialized(true);

      // Step 8: Join channel
      await engineInstance.joinChannel(data.token, data.channelName, data.uid, {});

      console.log('🎥 Video call initialized successfully');
    } catch (error: any) {
      console.error('❌ Video call initialization failed:', error);
      Alert.alert(
        'Connection Failed',
        error?.message || 'Failed to join video call. Please try again.'
      );
      navigation.goBack();
    }
  };

  const leaveCall = async () => {
    const engine = engineRef.current;
    if (engine) {
      try {
        await engine.stopPreview();
        await engine.leaveChannel();
        engine.removeAllListeners();
        // The modern SDK uses release to clean up, not destroy
        await engine.release(); 
        engineRef.current = null;
        console.log('🔴 Left call and released engine');
      } catch (err: any) {
        console.error('Error cleaning up Agora:', err);
      }
    }
    
    // Notify backend
    if (tokenData && role === 'doctor') {
      await endCall(appointmentId);
    }
    
    navigation.goBack();
  };

  const toggleMute = async () => {
    const engine = engineRef.current;
    if (engine) {
      try {
        await engine.muteLocalAudioStream(!isMuted);
        setIsMuted(!isMuted);
      } catch (err) {
        console.error('Toggle mute error:', err);
      }
    }
  };

  const toggleVideo = async () => {
    const engine = engineRef.current;
    if (engine) {
      try {
        // use enableLocalVideo as muteLocalVideoStream is often related to network publish state
        await engine.enableLocalVideo(isVideoOff); 
        setIsVideoOff(!isVideoOff);
      } catch (err) {
        console.error('Toggle video error:', err);
      }
    }
  };

  const toggleSpeaker = async () => {
    const engine = engineRef.current;
    if (engine) {
      try {
        // setEnableSpeakerphone is the correct method
        await engine.setEnableSpeakerphone(!isSpeakerOn);
        setIsSpeakerOn(!isSpeakerOn);
      } catch (err) {
        console.error('Toggle speaker error:', err);
      }
    }
  };

  const switchCamera = async () => {
    const engine = engineRef.current;
    if (engine) {
      try {
        await engine.switchCamera();
      } catch (err) {
        console.error('Switch camera error:', err);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
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
          <Text style={styles.loadingText}>Connecting to call... </Text>
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
              { backgroundColor: isConnected ? '#10B981' : '#EF4444' },
            ]}
          />
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </Text>
        </View>
        <Text style={styles.duration}>{formatDuration(callDuration)}</Text>
      </View>

      {/* Video Container */}
      <View style={styles.videoContainer}>
        {/* Remote Video */}
        {remoteUid ? (
          // 💥 CORRECTED JSX: Use the direct component name
          <RtcRemoteView
            style={styles.remoteVideo}
            // The modern SDK expects the remote user's UID and the channel ID
            uid={remoteUid}
            channelId={tokenData.channelName} 
            renderMode={1} // 1 = Hidden mode (aspect fill)
            zOrderMediaOverlay={false}
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <Ionicons name="person-circle-outline" size={80} color="#fff" />
            <Text style={styles.placeholderText}>
              Waiting for {role === 'doctor' ? 'patient' : 'doctor'}...
            </Text>
          </View>
        )}

        {/* Local Video Preview */}
        <View style={styles.localVideoContainer}>
          {!isVideoOff ? (
            // 💥 CORRECTED JSX: Use the direct component name
            <RtcLocalView
              style={styles.localVideo}
              uid={tokenData.uid} // Local view must have the local UID (or 0 for older SDKs)
              channelId={tokenData.channelName}
              renderMode={1} // 1 = Hidden mode (aspect fill)
              zOrderMediaOverlay={true}
            />
          ) : (
            <View style={styles.videoOffPlaceholder}>
              <Ionicons name="videocam-off" size={32} color="#fff" />
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
            <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
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
          <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
            <Ionicons name="camera-reverse" size={28} color="#fff" />
            <Text style={styles.controlLabel}>Flip</Text>
          </TouchableOpacity>
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
    gap: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  duration: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
  controls: {
    padding: 20,
    paddingBottom: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
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
    // The rotation for the call icon is now applied directly to the icon in the JSX, 
    // so it doesn't mess up the touchable area.
  },
});