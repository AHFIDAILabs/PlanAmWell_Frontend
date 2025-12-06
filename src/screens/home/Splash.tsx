// screens/home/Splash.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '../../types/Auth';
import type { NavigationProp } from '@react-navigation/native';

import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import logoSource from '../../assets/logo.png'; // adjust path if needed

export default function Splash() {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);

  // Properly typed navigation
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>();

  useEffect(() => {
    // Fade in + scale up logo
    opacity.value = withTiming(1, {
      duration: 1200,
      easing: Easing.out(Easing.exp),
    });

    scale.value = withDelay(
      300,
      withTiming(1, {
        duration: 1000,
        easing: Easing.out(Easing.elastic(1.2)),
      })
    );

    // Navigate after splash duration
    const timer = setTimeout(() => {
      navigation.navigate('Onboarding'); // Prevents back button returning to splash
    }, 3000); // Slightly longer than animation for smoothness

    return () => clearTimeout(timer);
  }, [navigation]); // Important: include navigation

  const animatedContainer = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const animatedLogo = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.splashContainer, animatedContainer]}>
      <LinearGradient
        colors={['#D81E5B', '#9B1D4E']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Animated.Image
            source={logoSource}
            style={[styles.logo, animatedLogo]}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Plan Am Well</Text>
        <Text style={styles.subtitle}>
          Your calm guide to reproductive health.
        </Text>

        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#FFE9E9',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  dots: {
    flexDirection: 'row',
    marginTop: 60,
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 28,
  },
});