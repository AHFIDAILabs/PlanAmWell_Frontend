import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import Toast from 'react-native-toast-message';
import BottomBar from '../../components/common/BottomBar';
import EditProfileModal from '../../components/profile/EditProfileModal';
import { notificationService } from '../../services/notification';
import { IUpcomingAppointment } from '../../types/backendType';
import { useVideoCall } from '../../hooks/useVideoCall';
interface ProfileMenuItemProps {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    onPress: () => void;
    color?: string;
    badge?: number;
}

const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({ 
    icon, 
    title, 
    onPress, 
    color = '#222',
    badge 
}) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuItemLeft}>
            <View
                style={[
                    styles.iconContainer,
                    { backgroundColor: color === '#D81E5B' ? '#FFE6EC' : '#F0F0F0' }
                ]}
            >
                <Feather name={icon} size={20} color={color} />
            </View>
            <Text style={styles.menuItemText}>{title}</Text>
        </View>
        <View style={styles.menuItemRight}>
            {badge !== undefined && badge > 0 && (
                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </View>
            )}
            <Feather name="chevron-right" size={20} color="#ccc" />
        </View>
    </TouchableOpacity>
);

const ProfileScreen = () => {
    const navigation = useNavigation<any>(); 
    const { user, handleLogout, refreshUser, loading: authLoading, isAuthenticated, isAnonymous } = useAuth();
     const { getCallStatus } = useVideoCall();


    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [imageUri, setImageUri] = useState<string>('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [upcomingAppointments, setUpcomingAppointments] = useState<IUpcomingAppointment[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [joiningCall, setJoiningCall] = useState<string | null>(null);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && (!isAuthenticated || isAnonymous)) {
            navigation.navigate('AuthStack', { screen: 'Login' });
        }
    }, [authLoading, isAuthenticated, isAnonymous, navigation]);

    // Extract image URI
    useEffect(() => {
        if (user) {
            const newImageUri = getImageUri();
            setImageUri(newImageUri);
        }
    }, [user]);

    // 🔔 Fetch unread notifications count
    const fetchUnreadCount = async () => {
        try {
            const response = await notificationService.getUnreadCount();
            if (response.success) {
                setUnreadCount(response.data.count);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    // 📅 Fetch upcoming appointments summary
    const fetchAppointmentsSummary = async () => {
        try {
            setLoadingAppointments(true);
            const response = await notificationService.getUpcomingAppointmentsSummary();
            if (response.success) {
                setUpcomingAppointments(response.data.upcoming);
                setPendingCount(response.data.pendingCount);
            }
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
        } finally {
            setLoadingAppointments(false);
        }
    };

    // Refresh on screen focus
    useFocusEffect(
        React.useCallback(() => {
            // Force refresh counts every time screen is focused
            fetchUnreadCount();
            fetchAppointmentsSummary();
            
            // Set up an interval to refresh counts every 30 seconds while on this screen
            const interval = setInterval(() => {
                fetchUnreadCount();
            }, 30000); // 30 seconds

            return () => clearInterval(interval);
        }, [])
    );

    const getImageUri = (): string => {
        if (!user?.userImage) return '';
        if (typeof user.userImage === 'string') return user.userImage;
        if (typeof user.userImage === 'object') {
            const img: any = user.userImage;
            return img?.imageUrl || img?.secure_url || img?.url || '';
        }
        return '';
    };

    const getDoctorImageUri = (doctor: any): string => {
        if (!doctor.profileImage) return `https://ui-avatars.com/api/?name=${doctor.firstName}+${doctor.lastName}`;
        if (typeof doctor.profileImage === 'string') return doctor.profileImage;
        if (typeof doctor.profileImage === 'object') {
            return doctor.profileImage.imageUrl || doctor.profileImage.secure_url || doctor.profileImage.url || '';
        }
        return '';
    };

    const getTimeUntil = (scheduledAt: string) => {
        const now = new Date();
        const apptTime = new Date(scheduledAt);
        const diff = apptTime.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        return 'Soon';
    };

const handleAppointmentPress = async (appointment: IUpcomingAppointment) => {
    try {
        setJoiningCall(appointment._id);

        // Single API call to check call status and get token
        const response = await getCallStatus(appointment._id);

       if (!response.success) {
    Alert.alert(
      'Too Early',
      response.message || 'Call cannot be joined yet'
    );
    return;
  }
        const { isActive, token } = response.data;
        const doctorName = `${appointment.doctorId.firstName} ${appointment.doctorId.lastName}`;

        // Navigate directly to video call if active or allow join attempt
        navigation.navigate('VideoCallScreen', {
            appointmentId: appointment._id,
            name: doctorName,
            role: 'User', // always 'User' when patient
            autoJoin: isActive, // autoJoin only if call is active
            fromAppointmentList: true,
            token, // optional: pass token if your backend provides it
        });

        // If call is not active, you could also show an alert to inform user
        if (!isActive) {
            Alert.alert(
                'Video Call Pending',
                'The doctor has not started the call yet. You will join when the call starts.',
                [{ text: 'OK', style: 'default' }]
            );
        }
    } catch (error: any) {
        console.error('Failed to check call status:', error);

        // Allow user to try joining anyway
        Alert.alert(
            'Unable to Check Call Status',
            'Would you like to try joining the call anyway?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Try Joining',
                    onPress: () => {
                        const doctorName = `${appointment.doctorId.firstName} ${appointment.doctorId.lastName}`;
                        navigation.navigate('VideoCallScreen', {
                            appointmentId: appointment._id,
                            name: doctorName,
                            role: 'User',
                            autoJoin: true,
                            fromAppointmentList: true,
                        });
                    },
                },
            ]
        );
    } finally {
        setJoiningCall(null);
    }
};


    if (authLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D81E5B" />
            </SafeAreaView>
        );
    }

    const displayName = user?.name || 'Guest User';
    const displayEmail = user?.email || 'N/A';
    const role = user?.roles?.[0] || 'User';

    const handleLogoutPress = async () => {
        try {
            await handleLogout();
            Toast.show({
                type: 'success',
                text1: 'Logged out',
                text2: 'You have been successfully logged out.'
            });
            navigation.navigate("AuthStack", { screen: "Login" });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Logout failed.'
            });
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{role} Profile</Text>
                <TouchableOpacity onPress={() => navigation.navigate('SettingsScreen' as never)}>
                    <Feather name="settings" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <TouchableOpacity onPress={() => setIsEditModalVisible(true)}>
                        {imageUri ? (
                            <Image
                                key={imageUri}
                                source={{ uri: imageUri }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <View style={[styles.profileImage, styles.placeholderImage]}>
                                <Feather name="user" size={40} color="#999" />
                            </View>
                        )}
                        <View style={styles.cameraIconOverlay}>
                            <Feather name="camera" size={16} color="#FFF" />
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.name}>{displayName}</Text>
                    <Text style={styles.email}>{displayEmail}</Text>

                    <ProfileMenuItem
                        icon="edit"
                        title="Edit Profile"
                        onPress={() => setIsEditModalVisible(true)}
                        color="#D81E5B"
                    />

                    <ProfileMenuItem
                        icon={role === 'Doctor' ? 'activity' : 'clock'}
                        title={role === 'Doctor' ? 'Manage Availability' : 'Consultation History'}
                        onPress={() => navigation.navigate('ConsultationHistory')}
                        color="#D81E5B"
                        badge={pendingCount}
                    />
                </View>

                {/* 📅 Upcoming Appointments Section */}
                {role !== 'Doctor' && (
                    <View style={styles.appointmentsSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('ConsultationHistory')}>
                                <Text style={styles.seeAllText}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingAppointments ? (
                            <ActivityIndicator size="small" color="#D81E5B" style={{ marginVertical: 20 }} />
                        ) : upcomingAppointments.length === 0 ? (
                            <View style={styles.emptyAppointments}>
                                <Feather name="calendar" size={40} color="#CCC" />
                                <Text style={styles.emptyText}>No upcoming appointments</Text>
                            </View>
                        ) : (
                            upcomingAppointments.map((appt) => (
                                <TouchableOpacity
                                    key={appt._id}
                                    style={[
                                        styles.appointmentCard,
                                        joiningCall === appt._id && styles.appointmentCardDisabled
                                    ]}
                                    onPress={() => handleAppointmentPress(appt)}
                                    disabled={joiningCall === appt._id}
                                >
                                    <Image
                                        source={{ uri: getDoctorImageUri(appt.doctorId) }}
                                        style={styles.appointmentAvatar}
                                    />
                                    <View style={styles.appointmentInfo}>
                                        <Text style={styles.appointmentDoctor}>
                                            Dr. {appt.doctorId.firstName} {appt.doctorId.lastName}
                                        </Text>
                                        <Text style={styles.appointmentSpec}>
                                            {appt.doctorId.specialization}
                                        </Text>
                                        <Text style={styles.appointmentTime}>
                                            {new Date(appt.scheduledAt).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    </View>
                                    {joiningCall === appt._id ? (
                                        <ActivityIndicator size="small" color="#D81E5B" />
                                    ) : (
                                        <View style={styles.appointmentBadge}>
                                            <Feather name="video" size={14} color="#FFF" />
                                            <Text style={styles.appointmentBadgeText}>
                                                {getTimeUntil(appt.scheduledAt)}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}

                {/* Menu Group */}
                <View style={styles.menuGroup}>
                    <ProfileMenuItem 
                        icon="bell" 
                        title="Notifications" 
                        onPress={() => navigation.navigate('NotificationsScreen' as never)}
                        badge={unreadCount}
                    />
                    <ProfileMenuItem 
                        icon="lock" 
                        title="Privacy Settings" 
                        onPress={() => navigation.navigate('PrivacySettingsScreen')} 
                    />
                    <ProfileMenuItem 
                        icon="help-circle" 
                        title="Help & Support" 
                        onPress={() => navigation.navigate('HelpSupportScreen')} 
                    />
                </View>

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogoutPress}
                    disabled={authLoading}
                >
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
            </ScrollView>

            <BottomBar activeRoute="ProfileScreen" cartItemCount={0} />

            <EditProfileModal
                visible={isEditModalVisible}
                onClose={async () => {
                    setIsEditModalVisible(false);
                    await refreshUser();
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F9F9' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F9F9' },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingTop: 10, 
        paddingBottom: 15, 
        backgroundColor: '#FFF', 
        borderBottomWidth: 1, 
        borderBottomColor: '#EEE' 
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#222' },
    content: { padding: 20, paddingBottom: 100 },
    
    profileCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 16, 
        alignItems: 'center', 
        padding: 20, 
        marginBottom: 20, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 5, 
        elevation: 3 
    },
    profileImage: { 
        width: 100, 
        height: 100, 
        borderRadius: 50, 
        marginBottom: 15, 
        borderWidth: 3, 
        borderColor: '#D81E5B' 
    },
    placeholderImage: { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
    cameraIconOverlay: { 
        position: 'absolute', 
        bottom: 12, 
        right: -8, 
        backgroundColor: '#D81E5B', 
        borderRadius: 12, 
        width: 30, 
        height: 30, 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 2, 
        borderColor: '#FFF' 
    },
    name: { fontSize: 22, fontWeight: 'bold', color: '#222' },
    email: { fontSize: 14, color: '#888', marginBottom: 20 },
    
    appointmentsSection: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
    seeAllText: { fontSize: 14, color: '#D81E5B', fontWeight: '600' },
    emptyAppointments: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    emptyText: { fontSize: 14, color: '#999', marginTop: 8 },
    appointmentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    appointmentCardDisabled: {
        opacity: 0.6,
    },
    appointmentAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EEE',
    },
    appointmentInfo: { flex: 1, marginLeft: 12 },
    appointmentDoctor: { fontSize: 15, fontWeight: '700', color: '#222' },
    appointmentSpec: { fontSize: 12, color: '#666', marginTop: 2 },
    appointmentTime: { fontSize: 12, color: '#D81E5B', marginTop: 4, fontWeight: '600' },
    appointmentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#D81E5B',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    appointmentBadgeText: { fontSize: 11, color: '#FFF', fontWeight: '700' },
    
    menuGroup: { 
        backgroundColor: '#FFF', 
        borderRadius: 16, 
        overflow: 'hidden', 
        marginBottom: 20, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 5, 
        elevation: 3 
    },
    menuItem: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingVertical: 15, 
        paddingHorizontal: 15, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F5F5F5' 
    },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
    menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconContainer: { 
        width: 38, 
        height: 38, 
        borderRadius: 10, 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginRight: 15 
    },
    menuItemText: { fontSize: 16, color: '#444' },
    badgeContainer: {
        backgroundColor: '#D81E5B',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
    },
    
    logoutButton: { 
        backgroundColor: '#FFEEEE', 
        padding: 15, 
        borderRadius: 10, 
        alignItems: 'center', 
        marginTop: 10 
    },
    logoutButtonText: { color: '#D81E5B', fontSize: 18, fontWeight: 'bold' },
});

export default ProfileScreen;