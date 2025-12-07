import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import Animated, { 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  useAnimatedStyle, 
  FadeIn, 
  Easing 
} from 'react-native-reanimated';
import { useAuth } from '../../hooks/useAuth';
import { AppStackParamList } from '../../types/App';
import { AuthStackParamList } from '../../types/Auth';

const { height } = Dimensions.get('window');

// Composite navigation type to access both AuthStack and RootStack
type OnboardingScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<AuthStackParamList, 'Onboarding'>,
  StackNavigationProp<AppStackParamList>
>;

export default function OnboardingScreen() {
  const breath = useSharedValue(1);
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const { completeOnboarding, enableGuestMode } = useAuth();

  React.useEffect(() => {
    breath.value = withRepeat(
      withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const breathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  const handleSkip = async () => {
    try {
      // First complete onboarding
      await completeOnboarding();
      // Then enable guest mode (sets isAuthenticated = true)
      await enableGuestMode();
      
      // Navigate to HomeScreen via the parent navigator
      const parent = navigation.getParent();
      if (parent) {
        parent.reset({
          index: 0,
          routes: [{ name: 'HomeScreen' }],
        });
      }
    } catch (error) {
      console.error('Error in handleSkip:', error);
    }
  };

  const handleNext = async () => {
    try {
      await completeOnboarding();
      // Stay within AuthStack and navigate to Register
      navigation.navigate('Register');
    } catch (error) {
      console.error('Error in handleNext:', error);
    }
  };

  const handleLogin = async () => {
    try {
      await completeOnboarding();
      // Stay within AuthStack and navigate to Login
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error in handleLogin:', error);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(800)} style={styles.container}>
      <LinearGradient colors={['#FFFFFF', '#FFF5F5']} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <Animated.View style={[styles.shieldCircle, breathingStyle]}>
          <Image
            source={require('../../assets/images/logo.jpg')}
            style={styles.shieldImage}
            resizeMode="cover"
          />
        </Animated.View>

        <Text style={styles.welcome}>Welcome to PlanAmWell</Text>
        <Text style={styles.description}>
          Your trusted partner in reproductive health and wellness.
        </Text>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogin}>
          <Text style={styles.loginText}>Already have an account? Log In</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Continue as Guest</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingTop: height * 0.12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  shieldCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    overflow: 'hidden',
    backgroundColor: '#FDF2F5',
    marginBottom: 60,
  },
  shieldImage: { width: '100%', height: '100%' },
  welcome: { 
    fontFamily: 'Inter_700Bold', 
    fontSize: 30, 
    color: '#1A1A1A', 
    textAlign: 'center', 
    marginBottom: 12 
  },
  description: { 
    fontFamily: 'Inter_400Regular', 
    fontSize: 16, 
    color: '#666', 
    textAlign: 'center', 
    lineHeight: 26, 
    marginBottom: 20 
  },
  nextButton: { 
    backgroundColor: '#D81E5B', 
    paddingVertical: 18, 
    paddingHorizontal: 80, 
    borderRadius: 30, 
    marginTop: 40, 
    marginBottom: 30 
  },
  nextText: { 
    fontFamily: 'Inter_600SemiBold', 
    fontSize: 18, 
    color: '#FFF' 
  },
  loginText: { 
    fontFamily: 'Inter_500Medium', 
    fontSize: 16, 
    color: '#D81E5B' 
  },
  skipButton: { 
    position: 'absolute', 
    top: 60, 
    right: 32 
  },
  skipText: { 
    fontFamily: 'Inter_600SemiBold', 
    fontSize: 16, 
    color: '#D81E5B' 
  },
});