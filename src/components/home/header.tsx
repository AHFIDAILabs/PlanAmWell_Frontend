import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
// 1. Import the useNavigation hook
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack'; // Optional: for better TypeScript typing
import { AppStackParamList } from '../../types/App';
import { useNotifications } from '../../context/notificatonContext';
import { SafeAreaView } from 'react-native-safe-area-context';


// Define the navigation prop type for this component
type HeaderNavigationProp = StackNavigationProp<AppStackParamList, 'NotificationsScreen'>;

// Define the component's props interface
interface HeaderProps {
    title?: string;
    subtitle?: string;
    titleColor?: string; // Custom color for the title
    subtitleColor?: string; // Custom color for the subtitle
    showNotification?: boolean;
    // NOTE: The onNotificationPress prop is now redundant as we are handling navigation internally,
    // but we can keep it for flexibility and call it *before* navigation.
    onNotificationPress?: () => void;
}
// --- End Type Definitions ---

// Rename Text to Animated.Text for reanimated usage
const AnimatedText = Animated.Text;

export default function Header({
    title = "Welcome back!",
    subtitle,
    titleColor,
    subtitleColor,
    showNotification = true,
    onNotificationPress, // Kept for flexibility
}: HeaderProps) {
    // 2. Use the useNavigation hook to get the navigation object
    const navigation = useNavigation<HeaderNavigationProp>();
  const { unreadCount } = useNotifications();

    // Create styles that override the defaults if a prop is provided
    const resolvedTitleStyle = titleColor ? { color: titleColor } : {};
    const resolvedSubtitleStyle = subtitleColor ? { color: subtitleColor } : {};

    // 3. Define the internal navigation function
    const handleNotificationPress = () => {
        // Execute the external prop function first (if provided)
        if (onNotificationPress) {
            onNotificationPress();
        }
        // Navigate to the NotificationsScreen
        navigation.navigate('NotificationsScreen');
    };

    return (
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <View style={styles.container}>
            <View>
                {/* Title with FadeInUp animation and dynamic color */}
                {title && (
                    <AnimatedText
                        entering={FadeInUp.delay(100).duration(800)}
                        style={[styles.title, resolvedTitleStyle]}
                    >
                        {title}
                    </AnimatedText>
                )}

                {/* Subtitle with staggered FadeInUp animation and dynamic color */}
                {subtitle && (
                    <AnimatedText
                        entering={FadeInUp.delay(200).duration(800)}
                        style={[styles.subtitle, resolvedSubtitleStyle]}
                    >
                        {subtitle}
                    </AnimatedText>
                )}
            </View>

            {/* Notification Bell */}
            {showNotification && (
                // 3. Update the onPress handler
                <TouchableOpacity onPress={handleNotificationPress}>
{unreadCount > 0 && (
  <View style={styles.badgeContainer}>
    <Animated.Text style={styles.badgeText}>
      {unreadCount > 9 ? '9+' : unreadCount}
    </Animated.Text>
  </View>
)}
                    <View style={styles.bell} >
                        <Feather name="bell" size={20} color="#D81E5B" />
                    </View>
                </TouchableOpacity>
            )}
        </View>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 30,
        paddingHorizontal: 20, // Added padding for better layout
    },
    title: {
        fontSize: 14,
        color: '#777', // Default color
        // Assuming fonts are loaded: fontFamily: 'Inter_400Regular',
    },
    subtitle: {
        fontSize: 22,
        // Assuming fonts are loaded: fontFamily: 'Inter_700Bold',
        color: '#cc3c3cff', // Default color
        marginTop: 4,
    },
    bell: {
        width: 44,
        height: 44,
        backgroundColor: '#F5F5F5',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifDot: {
        width: 12,
        height: 12,
        backgroundColor: '#D81E5B',
        borderRadius: 6,
        position: 'absolute',
        right: -2,
        top: -2,
        zIndex: 10,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    badgeContainer: {
  position: 'absolute',
  top: -4,
  right: -4,
  backgroundColor: '#D81E5B',
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 5,
  zIndex: 20,
  borderWidth: 2,
  borderColor: '#FFF',
},
badgeText: {
  color: '#FFF',
  fontSize: 10,
  fontWeight: '700',
},

});