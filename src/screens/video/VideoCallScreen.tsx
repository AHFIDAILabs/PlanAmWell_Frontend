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

// ── Fallback ICE servers used only when the backend fetch fails ──────────────
// The app always tries GET /api/v1/video/ice-servers first so TURN credentials
// can be rotated on the server without rebuilding the APK.
const FALLBACK_ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls:       'turn:openrelay.metered.ca:80',
      username:   'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls:       'turn:openrelay.metered.ca:443',
      username:   'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

// ── Route params ─────────────────────────────────────────────────────────────
interface RouteParams {
  appointmentId:       string;
  name?:               string;
  role?:               string;    // raw string from navigation — normalised below
  autoJoin?:           boolean;
  fromAppointmentList?: boolean;
  userImage?:          string;
  doctorImage?:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function VideoCallScreen({ route, navigation }: any) {
  const {
    appointmentId,
    name = 'Participant',
    role: rawRole = 'User',
  } = route.params as RouteParams;

  // Normalise to 'Doctor' | 'User' to match backend expectations.
  const normalised = rawRole.toLowerCase();
  const role: 'Doctor' | 'User' = normalised === 'doctor' ? 'Doctor' : 'User';

  const userImage   = route.params?.userImage   || 'https://placehold.co/200x200';
  const doctorImage = route.params?.doctorImage || 'https://placehold.co/200x200';

  const { startCall, endCall, getIceServers } = useVideoCall();

  // ── Refs (survive re-renders, never cause re-renders) ────────────────────
  const pcRef               = useRef<RTCPeerConnection | null>(null);
  const localStreamRef      = useRef<MediaStream | null>(null);
  // Manually-managed remote stream — react-native-webrtc sometimes delivers
  // ontrack with an empty streams[] array, so we build the stream from the
  // raw track as a fallback.
  const remoteStreamRef     = useRef<MediaStream | null>(null);

  // Lifecycle guards
  const isMountedRef        = useRef(true);   // false after unmount
  const initStartedRef      = useRef(false);  // prevents double-init in StrictMode
  const hasCleanedUpRef     = useRef(false);  // prevents double-cleanup
  const selfEndedRef        = useRef(false);  // true when WE ended the call

  // WebRTC state
  const isInitiatorRef      = useRef(false);
  const offerSentRef        = useRef(false);
  const iceCandidateQueue   = useRef<any[]>([]);

  // Timer refs
  const readyIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Exact handler refs for precise socket.off() — avoids stripping other listeners
  const callEndedHandlerRef    = useRef<((d: any) => void) | null>(null);
  const callDeclinedHandlerRef = useRef<((d: any) => void) | null>(null);

  // ── State ────────────────────────────────────────────────────────────────
  const [localStream,   setLocalStream]   = useState<MediaStream | null>(null);
  const [remoteStream,  setRemoteStream]  = useState<MediaStream | null>(null);
  const [isConnected,   setIsConnected]   = useState(false);
  const [isConnecting,  setIsConnecting]  = useState(true);   // loading until init done
  const [isMuted,       setIsMuted]       = useState(false);
  const [isVideoOff,    setIsVideoOff]    = useState(false);
  const [isSpeakerOn,   setIsSpeakerOn]  = useState(true);
  const [callDuration,  setCallDuration]  = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeSetState = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    if (isMountedRef.current) setter(value);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Permissions ──────────────────────────────────────────────────────────
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    return (
      result['android.permission.CAMERA']       === PermissionsAndroid.RESULTS.GRANTED &&
      result['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
    );
  };

  // ── Audio session ────────────────────────────────────────────────────────
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

  // ── Build RTCPeerConnection ───────────────────────────────────────────────
  // react-native-webrtc v124 wires on* handlers via defineEventAttribute at
  // runtime, so we cast to `any` for the three assignments below.
  const createPeerConnection = (apptId: string, iceConfig: { iceServers: any[] }): RTCPeerConnection => {
    const pc    = new RTCPeerConnection(iceConfig);
    const pcAny = pc as any;

    pcAny.onicecandidate = ({ candidate }: { candidate: any }) => {
      if (candidate) {
        socketService.getSocket()?.emit('webrtc-ice-candidate', {
          appointmentId: apptId,
          candidate,
        });
      }
    };

    pcAny.ontrack = (event: any) => {
      if (!isMountedRef.current) return;

      // react-native-webrtc sometimes delivers ontrack with streams = []
      // even when the sender called addTrack(track, stream). Handle both paths.
      let stream: MediaStream | null = event.streams?.[0] ?? null;

      if (!stream && event.track) {
        // Fallback: manually accumulate tracks into our own MediaStream
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(event.track);
        stream = remoteStreamRef.current;
      }

      console.log(`📺 ontrack: kind=${event.track?.kind}, streams=${event.streams?.length}, built=${!event.streams?.[0]}`);

      if (stream) {
        safeSetState(setRemoteStream, stream);
        safeSetState(setIsConnected, true);
        if (!durationTimerRef.current) {
          durationTimerRef.current = setInterval(() => {
            if (isMountedRef.current) setCallDuration(prev => prev + 1);
          }, 1000);
        }
      }
    };

    pcAny.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`🔌 WebRTC state: ${state}`);
      // Reset the offer flag on failure so the 5-second retry can create a
      // fresh offer (ICE restart) instead of being silently blocked forever.
      if (state === 'failed' || state === 'disconnected') {
        offerSentRef.current = false;
        iceCandidateQueue.current = [];
      }
    };

    return pc;
  };

  // ── Cleanup ───────────────────────────────────────────────────────────────
  // Must be idempotent — called from both useEffect return and handleEndCall.
  const cleanup = async () => {
    if (hasCleanedUpRef.current) return;
    hasCleanedUpRef.current = true;

    // Clear timers
    if (readyIntervalRef.current)  { clearInterval(readyIntervalRef.current);  readyIntervalRef.current  = null; }
    if (durationTimerRef.current)  { clearInterval(durationTimerRef.current);  durationTimerRef.current  = null; }

    // Remove socket listeners by exact reference so we don't affect other screens
    const socket = socketService.getSocket();
    if (socket) {
      if (callEndedHandlerRef.current)    socket.off('call-ended',           callEndedHandlerRef.current);
      if (callDeclinedHandlerRef.current) socket.off('call-declined',        callDeclinedHandlerRef.current);
      socket.off('webrtc-ready');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
    }

    socketService.leaveAppointment(appointmentId);

    // Stop local media tracks
    localStreamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    localStreamRef.current  = null;
    remoteStreamRef.current = null;

    // Close peer connection
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;

    // Notify backend (best-effort)
    try { await endCall(appointmentId); } catch {}
  };

  // ── Main initialisation ───────────────────────────────────────────────────
  const initCall = async () => {
    // StrictMode double-invoke guard
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    try {
      // 1. Permissions
      const permitted = await requestPermissions();
      if (!permitted) {
        Alert.alert('Permissions Required', 'Camera and microphone access are needed for video calls.');
        navigation.goBack();
        return;
      }

      await applyAudioMode(true);

      // 2. Ensure Socket.IO is live
      //    socketService.connect() polls instead of returning false when a
      //    connection attempt is already in flight (fixed in previous session).
      let sock = socketService.getSocket();
      if (!sock?.connected) {
        console.log(sock ? '🔄 Socket disconnected — reconnecting…' : '🔌 No socket — connecting…');

        const connected: boolean = sock
          ? await socketService.reconnect().then(() => socketService.getSocket()?.connected ?? false)
          : await socketService.connect();

        if (!connected) {
          // One final check after the async operations settle
          sock = socketService.getSocket();
          if (!sock?.connected) {
            throw new Error(
              'Unable to establish a real-time connection. ' +
              'Please check your internet and try again.'
            );
          }
        }
      }

      if (!isMountedRef.current) return;  // navigated away during connect

      // 3. Capture the live socket instance — must happen AFTER connect so we
      //    register listeners on the correct (possibly new) socket object.
      const activeSocket = socketService.getSocket()!;

      // 4. Join the appointment signalling room BEFORE the backend HTTP call.
      //    This ensures we are in the room and ready to relay webrtc-* events
      //    before the backend sends push notifications / emits call-ringing.
      socketService.joinAppointment(appointmentId);

      // 5. Register call-lifecycle listeners on the live socket.
      //    Store refs so cleanup() removes these exact functions.
      const handleCallEnded = (data: { appointmentId: string; callDuration?: number }) => {
        if (data.appointmentId !== appointmentId) return;
        if (selfEndedRef.current) return;
        Alert.alert(
          'Call Ended',
          `The call was ended by the ${role === 'Doctor' ? 'patient' : 'doctor'}.`,
          [{
            text: 'OK',
            onPress: async () => {
              await cleanup();
              if (isMountedRef.current) navigation.goBack();
            },
          }],
          { cancelable: false },
        );
      };

      const handleCallDeclined = (data: { appointmentId: string }) => {
        if (data.appointmentId !== appointmentId) return;
        selfEndedRef.current = true;
        Alert.alert(
          'Call Declined',
          `${name} declined the call.`,
          [{
            text: 'OK',
            onPress: async () => {
              await cleanup();
              if (isMountedRef.current) navigation.goBack();
            },
          }],
          { cancelable: false },
        );
      };

      callEndedHandlerRef.current    = handleCallEnded;
      callDeclinedHandlerRef.current = handleCallDeclined;
      activeSocket.on('call-ended',    handleCallEnded);
      activeSocket.on('call-declined', handleCallDeclined);

      // 6. Register with the backend — get channel name and initiator flag.
      //    startCall throws a human-readable string on any non-network error.
      const data: VideoTokenResponse = await startCall(appointmentId);

      if (!isMountedRef.current) return;

      isInitiatorRef.current = data.isInitiator;
      console.log(`📞 Call session: channel=${data.channelName}, isInitiator=${data.isInitiator}, callStatus=${data.callStatus}`);

      // 7. Capture local camera + mic
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user', width: 640, height: 480 },
      }) as MediaStream;

      if (!isMountedRef.current) {
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      safeSetState(setLocalStream, stream);

      // 8. Fetch ICE servers (falls back to openrelay if backend unreachable),
      //    then create the RTCPeerConnection and attach local tracks.
      const iceServers = await getIceServers();
      const iceConfig  = iceServers.length > 0 ? { iceServers } : FALLBACK_ICE_SERVERS;
      const pc = createPeerConnection(appointmentId, iceConfig);
      pcRef.current = pc;
      stream.getTracks().forEach((track: MediaStreamTrack) => {
        pc.addTrack(track, stream);
      });

      // 9. WebRTC signalling handlers
      //
      //    Flow (Socket.IO relays all events to the *other* side of the room):
      //      Receiver emits webrtc-ready  → server relays to initiator
      //      Initiator receives it        → creates and sends webrtc-offer
      //      Receiver receives offer      → creates and sends webrtc-answer
      //      Both exchange webrtc-ice-candidate until connected
      //
      //    Both sides emit webrtc-ready immediately and retry every 5 s until
      //    pc.connectionState === 'connected', so timing order doesn't matter.

      // ── Initiator: respond to peer-ready by creating an offer ──────────────
      const handlePeerReady = async () => {
        if (!isInitiatorRef.current || offerSentRef.current) return;
        offerSentRef.current = true;
        try {
          // iceRestart: true lets this double as an ICE-restart offer when
          // onconnectionstatechange resets offerSentRef after a failure.
          const offer = await (pc as any).createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          activeSocket.emit('webrtc-offer', { appointmentId, offer });
          console.log('📤 webrtc-offer sent');
        } catch (e) {
          console.error('❌ createOffer failed:', e);
          offerSentRef.current = false;   // allow retry on next webrtc-ready
        }
      };

      // ── Receiver: process incoming offer and reply with answer ────────────
      const handleOffer = async (payload: any) => {
        // Payload shape from server: { appointmentId, offer }
        const offer = payload?.offer ?? payload;
        if (!offer || isInitiatorRef.current) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          // Drain candidates that arrived before remote description was set
          for (const c of iceCandidateQueue.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          }
          iceCandidateQueue.current = [];
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          activeSocket.emit('webrtc-answer', { appointmentId, answer });
          console.log('📤 webrtc-answer sent');
        } catch (e) {
          console.error('❌ handleOffer failed:', e);
        }
      };

      // ── Initiator: complete the handshake with the answer ─────────────────
      const handleAnswer = async (payload: any) => {
        // Payload shape from server: { appointmentId, answer }
        const answer = payload?.answer ?? payload;
        if (!answer || !isInitiatorRef.current) return;
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

      // ── Both sides: trickle ICE candidates ───────────────────────────────
      const handleIceCandidate = async (payload: any) => {
        // Payload shape: { appointmentId, candidate }
        const candidate = payload?.candidate ?? payload;
        if (!candidate) return;
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            iceCandidateQueue.current.push(candidate);
          }
        } catch {
          // Stale ICE candidates after renegotiation — safe to discard
        }
      };

      activeSocket.on('webrtc-ready',         handlePeerReady);
      activeSocket.on('webrtc-offer',         handleOffer);
      activeSocket.on('webrtc-answer',        handleAnswer);
      activeSocket.on('webrtc-ice-candidate', handleIceCandidate);

      // 10. Announce readiness; retry every 5 s until WebRTC is connected.
      const emitReady = () => {
        if (!isMountedRef.current) return;
        activeSocket.emit('webrtc-ready', { appointmentId });
      };
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
      if (isMountedRef.current) {
        Alert.alert(
          'Connection Failed',
          error?.message || 'Unable to start call. Please try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } finally {
      safeSetState(setIsConnecting, false);
    }
  };

  // ── Single effect — mounts once, cleans up on unmount ───────────────────
  useEffect(() => {
    isMountedRef.current = true;
    initCall();

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        text:  'End Call',
        style: 'destructive',
        onPress: async () => {
          selfEndedRef.current = true;
          await cleanup();
          navigation.goBack();
        },
      },
    ]);
  };

  // ── Loading overlay ──────────────────────────────────────────────────────
  if (isConnecting) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Connecting to call…</Text>
      </SafeAreaView>
    );
  }

  const peerConnected = !!remoteStream;

  // ── Main UI ──────────────────────────────────────────────────────────────
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

        {/* Local picture-in-picture */}
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

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  loadingText:      { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 20 },

  header: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingHorizontal: 20,
    paddingVertical:  16,
    backgroundColor:  'rgba(0,0,0,0.7)',
  },
  headerLeft:      { flex: 1 },
  participantName: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  statusRow:       { flexDirection: 'row', alignItems: 'center' },
  statusDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  statusText:      { color: '#10B981', fontSize: 13, fontWeight: '500' },
  timerContainer:  {
    backgroundColor:  'rgba(16,185,129,0.2)',
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderRadius:      20,
  },
  timerText: { color: '#10B981', fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },

  videoContainer:   { flex: 1, backgroundColor: '#000' },
  remoteVideo:      { width: '100%', height: '100%' },
  waitingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  waitingText:      { color: '#fff', fontSize: 18, fontWeight: '500', marginTop: 12 },

  localVideoContainer: {
    position:    'absolute',
    top: 20, right: 16,
    width: 100, height: 140,
    borderRadius:    12,
    overflow:        'hidden',
    borderWidth:     2,
    borderColor:     'rgba(255,255,255,0.3)',
    backgroundColor: '#000',
  },
  localVideo:        { width: '100%', height: '100%' },
  localLabel: {
    position:         'absolute',
    bottom: 6, left: 6, right: 6,
    backgroundColor:  'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      6,
    alignItems:        'center',
  },
  localLabelText:    { color: '#fff', fontSize: 11, fontWeight: '600' },
  videoOffContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#2a2a2a' },

  controlsContainer:  { paddingHorizontal: 20, paddingVertical: 20, backgroundColor: 'rgba(0,0,0,0.7)' },
  controls:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  controlButton:      { alignItems: 'center', justifyContent: 'center', width: 60, paddingVertical: 8 },
  controlButtonActive: { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 12 },
  controlLabel:       { color: '#fff', fontSize: 11, marginTop: 4, fontWeight: '500' },
  endCallButton: {
    width: 64, height: 64,
    borderRadius:    32,
    backgroundColor: '#EF4444',
    justifyContent:  'center',
    alignItems:      'center',
  },
});
