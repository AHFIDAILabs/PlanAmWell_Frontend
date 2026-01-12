// screens/video/IncomingCallScreen.tsx - Fixed TypeScript types
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Vibration,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { StackScreenProps } from '@react-navigation/stack';
import { AppStackParamList } from '../../types/App';

// ✅ Fixed: Use proper StackScreenProps type
type IncomingCallScreenProps = StackScreenProps<AppStackParamList, 'IncomingCall'>;

export default function IncomingCallScreen({ route, navigation }: IncomingCallScreenProps) {
  const {
    appointmentId,
    callerName = 'Unknown Caller',
    callerImage,
    callerType,
    channelName,
  } = route.params;

  const [pulseAnim] = useState(new Animated.Value(1));
  const soundRef = useRef<Audio.Sound | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start ringtone and vibration
    startRingtone();
    startVibration();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto-dismiss after 60 seconds
    const timeout = setTimeout(() => {
      handleDecline();
    }, 60000);

    return () => {
      clearTimeout(timeout);
      cleanup();
    };
  }, []);

  const startRingtone = async () => {
    try {
      // Configure audio to play even in silent mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Load and play ringtone
      const { sound } = await Audio.Sound.createAsync(
        // require('../../assets/sounds/ringtone.mp3'), // Add custom ringtone
        { uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, // Fallback
        {
          isLooping: true,
          volume: 1.0,
          shouldPlay: true,
        }
      );

      soundRef.current = sound;
      console.log('🔔 Ringtone playing');
    } catch (error) {
      console.error('❌ Failed to play ringtone:', error);
    }
  };

  const startVibration = () => {
    const pattern = [0, 400, 200, 400, 200, 400];
    
    if (Platform.OS === 'android') {
      Vibration.vibrate(pattern, true);
    } else {
      vibrationIntervalRef.current = setInterval(() => {
        Vibration.vibrate(400);
      }, 1000);
    }
  };

  const cleanup = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (error) {
        console.error('❌ Failed to stop ringtone:', error);
      }
    }

    Vibration.cancel();
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
  };

  const handleAccept = async () => {
    await cleanup();

    // Navigate to video call screen
    navigation.replace('VideoCallScreen', {
      appointmentId,
      name: callerName,
      patientId: '', // You may need to pass this from route params
      role: callerType === 'Doctor' ? 'user' : 'doctor',
    });
  };

  const handleDecline = async () => {
    await cleanup();

    // TODO: Send decline notification to backend
    // await declineCall(appointmentId);

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('HomeScreen');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Incoming Video Call</Text>
        </View>

        {/* Caller Info */}
        <View style={styles.callerContainer}>
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            {callerImage ? (
              <Image source={{ uri: callerImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={80} color="#fff" />
              </View>
            )}
          </Animated.View>

          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.callerType}>
            {callerType === 'Doctor' ? 'Doctor' : 'Patient'}
          </Text>

          <View style={styles.callingContainer}>
            <View style={styles.pulsingDot} />
            <Text style={styles.callingText}>Incoming call...</Text>
          </View>
        </View>

        {/* Call Actions */}
        <View style={styles.actionsContainer}>
          {/* Decline Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDecline}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.actionButtonGradient}
            >
              <Ionicons
                name="call"
                size={32}
                color="#fff"
                style={{ transform: [{ rotate: '135deg' }] }}
              />
            </LinearGradient>
            <Text style={styles.actionLabel}>Decline</Text>
          </TouchableOpacity>

          {/* Accept Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAccept}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="videocam" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.actionLabel}>Accept</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Info */}
        <View style={styles.infoContainer}>
          <Ionicons name="lock-closed" size={16} color="#94a3b8" />
          <Text style={styles.infoText}>End-to-end encrypted</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gradient: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  callerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 24,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  callerType: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 24,
  },
  callingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  callingText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    paddingVertical: 40,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 40,
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
});