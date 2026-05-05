import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import {
  RTCPeerConnection,
  RTCView,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
  MediaStreamTrack,
} from 'react-native-webrtc';
import { useVideoCall, VideoTokenResponse } from '../../hooks/useVideoCall';
import socketService from '../../services/socketService';

// ── Free ICE servers (Google STUN + Open Relay TURN) ─────────────────────────
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

interface RouteParams {
  appointmentId: string;
  name?: string;
  role?: string;           // 'Doctor' | 'User' | 'doctor' | 'user'
  autoJoin?: boolean;
  fromAppointmentList?: boolean;
  userImage?: string;
  doctorImage?: string;
}

export default function VideoCallScreen({ route, navigation }: any) {
  const {
    appointmentId,
    name = 'Participant',
    role: rawRole = 'User',
  } = route.params as RouteParams;

  // Normalise role to match backend ('Doctor' | 'User')
  const normalised = rawRole.toLowerCase();
  const role: 'Doctor' | 'User' = normalised === 'doctor' ? 'Doctor' : 'User';

  const userImage   = (route.params?.userImage)   || 'https://placehold.co/200x200';
  const doctorImage = (route.params?.doctorImage) || 'https://placehold.co/200x200';

  const { startCall, endCall } = useVideoCall();

  // ── Refs ─────────────────────────────────────────────────────────────────
  const pcRef             = useRef<RTCPeerConnection | null>(null);
  const localStreamRef    = useRef<MediaStream | null>(null);
  const hasCleanedUpRef   = useRef(false);
  const offerSentRef      = useRef(false);
  const iceCandidateQueue = useRef<any[]>([]);
  const readyIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitiatorRef    = useRef(false);

  // ── State ────────────────────────────────────────────────────────────────
  const [localStream,  setLocalStream]  = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected,  setIsConnected]  = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted,      setIsMuted]      = useState(false);
  const [isVideoOff,   setIsVideoOff]   = useState(false);
  const [isSpeakerOn,  setIsSpeakerOn]  = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Permissions ──────────────────────────────────────────────────────────
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    return (
      granted['android.permission.CAMERA']      === PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
    );
  };

  // ── Audio session via expo-av ─────────────────────────────────────────────
  const applyAudioMode = async (speakerOn: boolean) => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:         true,
        playsInSilentModeIOS:       true,
        staysActiveInBackground:    true,
        shouldDuckAndroid:          false,
        playThroughEarpieceAndroid: !speakerOn,
      });
    } catch (e) {
      console.warn('⚠️ Audio mode error:', e);
    }
  };

  // ── Build peer connection ─────────────────────────────────────────────────
  // react-native-webrtc v124 registers on* attributes via defineEventAttribute
  // at runtime but the TypeScript declarations don't expose them on the class
  // directly, so we cast to any for the three event handler assignments.
  const createPeerConnection = (apptId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const pcAny = pc as any;

    pcAny.onicecandidate = ({ candidate }: { candidate: any }) => {
      if (candidate) {
        socketService.getSocket()?.emit('webrtc-ice-candidate', {
          appointmentId: apptId,
          candidate,
        });
      }
    };

    pcAny.ontrack = ({ streams }: { streams?: MediaStream[] }) => {
      const stream = streams?.[0];
      if (stream) {
        setRemoteStream(stream);
        setIsConnected(true);
        if (!durationTimerRef.current) {
          durationTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
        }
      }
    };

    pcAny.onconnectionstatechange = () => {
      console.log(`🔌 WebRTC connection state: ${pc.connectionState}`);
    };

    return pc;
  };

  // ── Initialise call ───────────────────────────────────────────────────────
  const initCall = async () => {
    if (isConnecting) return;
    setIsConnecting(true);

    try {
      const permitted = await requestPermissions();
      if (!permitted) {
        Alert.alert('Permissions Required', 'Camera & microphone access is needed.');
        navigation.goBack();
        return;
      }

      await applyAudioMode(true);

      // Backend: register participant, get isInitiator flag
      const data: VideoTokenResponse = await startCall(appointmentId);
      isInitiatorRef.current = data.isInitiator;

      // Capture local media
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user', width: 640, height: 480 },
      }) as MediaStream;

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Build peer connection and attach tracks
      const pc = createPeerConnection(appointmentId);
      pcRef.current = pc;
      stream.getTracks().forEach((track: MediaStreamTrack) => {
        pc.addTrack(track, stream);
      });

      // ── Socket signaling listeners ────────────────────────────────────────
      const socket = socketService.getSocket();
      if (!socket) throw new Error('Socket not connected');

      const handlePeerReady = async () => {
        // Only the initiator responds to peer-ready by creating an offer
        if (!isInitiatorRef.current || offerSentRef.current) return;
        offerSentRef.current = true;
        try {
          const offer = await pc.createOffer({});
          await pc.setLocalDescription(offer);
          socket.emit('webrtc-offer', { appointmentId, offer });
        } catch (e) {
          console.error('❌ createOffer failed:', e);
        }
      };

      const handleOffer = async ({ offer }: { appointmentId: string; offer: any }) => {
        if (isInitiatorRef.current) return; // receiver only
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          for (const c of iceCandidateQueue.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          iceCandidateQueue.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc-answer', { appointmentId, answer });
        } catch (e) {
          console.error('❌ handleOffer failed:', e);
        }
      };

      const handleAnswer = async ({ answer }: { appointmentId: string; answer: any }) => {
        if (!isInitiatorRef.current) return; // initiator only
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          for (const c of iceCandidateQueue.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          iceCandidateQueue.current = [];
        } catch (e) {
          console.error('❌ handleAnswer failed:', e);
        }
      };

      const handleIceCandidate = async ({ candidate }: { appointmentId: string; candidate: any }) => {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        } else {
          iceCandidateQueue.current.push(candidate);
        }
      };

      socket.on('webrtc-ready',         handlePeerReady);
      socket.on('webrtc-offer',         handleOffer);
      socket.on('webrtc-answer',        handleAnswer);
      socket.on('webrtc-ice-candidate', handleIceCandidate);

      // Announce readiness; retry every 5 s until the peer connection is up
      const emitReady = () => socket.emit('webrtc-ready', { appointmentId });
      emitReady();
      readyIntervalRef.current = setInterval(() => {
        if (pcRef.current?.connectionState === 'connected') {
          clearInterval(readyIntervalRef.current!);
          readyIntervalRef.current = null;
        } else {
          emitReady();
        }
      }, 5000);

    } catch (error: any) {
      console.error('❌ initCall failed:', error);
      Alert.alert(
        'Connection Failed',
        error?.message || 'Unable to start call.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } finally {
      setIsConnecting(false);
    }
  };

  // ── Cleanup ──────────────────────────────────────────────────────────────
  const cleanup = async () => {
    if (hasCleanedUpRef.current) return;
    hasCleanedUpRef.current = true;

    if (readyIntervalRef.current)  clearInterval(readyIntervalRef.current);
    if (durationTimerRef.current)  clearInterval(durationTimerRef.current);

    const socket = socketService.getSocket();
    if (socket) {
      socket.off('webrtc-ready');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
    }

    localStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    localStreamRef.current = null;

    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;

    try { await endCall(appointmentId); } catch {}
  };

  // ── Socket room + call-ended ─────────────────────────────────────────────
  useEffect(() => {
    if (!appointmentId) return;
    socketService.joinAppointment(appointmentId);

    const socket = socketService.getSocket();
    const handleCallEnded = (data: { appointmentId: string; callDuration: number }) => {
      if (data.appointmentId !== appointmentId) return;
      Alert.alert(
        'Call Ended',
        `The call was ended by the ${role === 'Doctor' ? 'patient' : 'doctor'}.`,
        [{ text: 'OK', onPress: async () => { await cleanup(); navigation.goBack(); } }],
        { cancelable: false },
      );
    };
    socket?.on('call-ended', handleCallEnded);

    return () => {
      socket?.off('call-ended', handleCallEnded);
      socketService.leaveAppointment(appointmentId);
    };
  }, [appointmentId]);

  // ── Auto-start ───────────────────────────────────────────────────────────
  useEffect(() => {
    initCall();
    return () => { cleanup(); };
  }, []);

  // ── Controls ─────────────────────────────────────────────────────────────
  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsVideoOff(!track.enabled);
  };

  const toggleSpeaker = async () => {
    const next = !isSpeakerOn;
    setIsSpeakerOn(next);
    await applyAudioMode(next);
  };

  const switchCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) (track as any)._switchCamera();
  };

  const handleEndCall = () => {
    Alert.alert('End Call', 'Are you sure you want to end the call?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Call',
        style: 'destructive',
        onPress: async () => { await cleanup(); navigation.goBack(); },
      },
    ]);
  };

  // ── Connecting overlay ───────────────────────────────────────────────────
  if (isConnecting) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Connecting to call...</Text>
      </SafeAreaView>
    );
  }

  const peerConnected = !!remoteStream;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.participantName}>{name}</Text>
          {isConnected && (
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Connected</Text>
            </View>
          )}
        </View>
        {isConnected && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{formatDuration(callDuration)}</Text>
          </View>
        )}
      </View>

      {/* Video area */}
      <View style={styles.videoContainer}>
        {peerConnected ? (
          <RTCView
            streamURL={remoteStream!.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
            mirror={false}
            zOrder={0}
          />
        ) : (
          <View style={styles.waitingContainer}>
            <Ionicons name="person-outline" size={80} color="#666" />
            <Text style={styles.waitingText}>Waiting for {name}…</Text>
            <ActivityIndicator size="small" color="#666" style={{ marginTop: 12 }} />
          </View>
        )}

        {/* Local PiP */}
        {!isVideoOff && localStream ? (
          <View style={styles.localVideoContainer}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              mirror
              zOrder={1}
            />
            <View style={styles.localLabel}>
              <Text style={styles.localLabelText}>You</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.localVideoContainer, styles.videoOffContainer]}>
            <Image
              source={{ uri: role === 'Doctor' ? doctorImage : userImage }}
              style={styles.localVideo}
              resizeMode="cover"
            />
            <View style={styles.localLabel}>
              <Text style={styles.localLabelText}>You</Text>
            </View>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={26} color={isMuted ? '#EF4444' : '#fff'} />
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
            onPress={toggleVideo}
          >
            <Ionicons name={isVideoOff ? 'videocam-off' : 'videocam'} size={26} color={isVideoOff ? '#EF4444' : '#fff'} />
            <Text style={styles.controlLabel}>Video</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
            <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, !isSpeakerOn && styles.controlButtonActive]}
            onPress={toggleSpeaker}
          >
            <Ionicons
              name={isSpeakerOn ? 'volume-high' : 'volume-mute'}
              size={26}
              color={!isSpeakerOn ? '#EF4444' : '#fff'}
            />
            <Text style={styles.controlLabel}>Speaker</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
            <Ionicons name="camera-reverse" size={26} color="#fff" />
            <Text style={styles.controlLabel}>Flip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  loadingText:      { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  headerLeft:      { flex: 1 },
  participantName: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  statusRow:       { flexDirection: 'row', alignItems: 'center' },
  statusDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  statusText:      { color: '#10B981', fontSize: 13, fontWeight: '500' },
  timerContainer:  {
    backgroundColor: 'rgba(16,185,129,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: { color: '#10B981', fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },

  videoContainer:  { flex: 1, backgroundColor: '#000' },
  remoteVideo:     { width: '100%', height: '100%' },
  waitingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  waitingText:     { color: '#fff', fontSize: 18, fontWeight: '500', marginTop: 12 },

  localVideoContainer: {
    position: 'absolute',
    top: 20, right: 16,
    width: 100, height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: '#000',
  },
  localVideo:        { width: '100%', height: '100%' },
  localLabel: {
    position: 'absolute',
    bottom: 6, left: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  localLabelText:    { color: '#fff', fontSize: 11, fontWeight: '600' },
  videoOffContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2a2a2a' },

  controlsContainer: { paddingHorizontal: 20, paddingVertical: 20, backgroundColor: 'rgba(0,0,0,0.7)' },
  controls:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  controlButton:     { alignItems: 'center', justifyContent: 'center', width: 60, paddingVertical: 8 },
  controlButtonActive: { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 12 },
  controlLabel:      { color: '#fff', fontSize: 11, marginTop: 4, fontWeight: '500' },
  endCallButton: {
    width: 64, height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
