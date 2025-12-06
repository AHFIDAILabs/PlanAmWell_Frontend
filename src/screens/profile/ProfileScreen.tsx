// screens/ProfileScreen.tsx - FIXED VERSION

import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Image,
    ActivityIndicator,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import Toast from 'react-native-toast-message';
import BottomBar from '../../components/common/BottomBar';
import EditProfileModal from '../../components/profile/EditProfileModal'; 

interface ProfileMenuItemProps {
    icon: keyof typeof Feather.glyphMap;
    title: string;
    onPress: () => void;
    color?: string;
}

const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({ icon, title, onPress, color = '#222' }) => (
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
        <Feather name="chevron-right" size={20} color="#ccc" />
    </TouchableOpacity>
);

const ProfileScreen = () => {
    const navigation = useNavigation<any>(); 
    const { user, handleLogout, refreshUser, loading: authLoading } = useAuth();

    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isImageUpdateVisible, setIsImageUpdateVisible] = useState(false);

    // Debug: Log user data when it changes
    useEffect(() => {
        if (user) {
            console.log('👤 User data updated:', {
                name: user.name,
                userImage: user.userImage,
                userImageType: typeof user.userImage,
                userImageKeys: user.userImage && typeof user.userImage === 'object' 
                    ? Object.keys(user.userImage) 
                    : 'not an object'
            });
        }
    }, [user]);

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
navigation.navigate("AuthStack", {
    screen: "Login"
});
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Logout failed.'
            });
        }
    };
    
    // ✅ FIXED: Comprehensive image URI extraction
    const getImageUri = (): string => {
        const placeholder = 'https://via.placeholder.com/150';
        
        // Case 1: No userImage at all
        if (!user?.userImage) {
            console.log('📷 No userImage found, using placeholder');
            return placeholder;
        }

        // Case 2: userImage is a string (direct URL)
        if (typeof user.userImage === 'string') {
            console.log('📷 userImage is string:', user.userImage);
            return user.userImage || placeholder;
        }

        // Case 3: userImage is an object (populated from backend)
        if (typeof user.userImage === 'object') {
            const imageObj = user.userImage as any;
            
            // Check all possible property names
            const imageUrl = 
                imageObj.imageUrl ||      // Most common
                imageObj.secure_url ||    // Cloudinary direct response
                imageObj.url ||           // Alternative
                null;

            console.log('📷 userImage is object:', {
                hasImageUrl: !!imageObj.imageUrl,
                hasSecureUrl: !!imageObj.secure_url,
                hasUrl: !!imageObj.url,
                finalUrl: imageUrl
            });

            return imageUrl || placeholder;
        }

        console.log('📷 Unknown userImage type, using placeholder');
        return placeholder;
    };

    const imageUri = getImageUri();
    console.log('📷 Final image URI:', imageUri);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{role} Profile</Text>
                <TouchableOpacity onPress={() => navigation.navigate('SettingsScreen' as never)}>
                    <Feather name="settings" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.profileCard}>
                   
                    <TouchableOpacity onPress={() => setIsImageUpdateVisible(true)}>
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.profileImage}
                            onError={(e) => {
                                console.error('❌ Image load error:', e.nativeEvent.error);
                            }}
                            onLoad={() => {
                                console.log('✅ Image loaded successfully:', imageUri);
                            }}
                        />
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
                        onPress={() => {}}
                        color="#D81E5B"
                    />
                </View>

                <View style={styles.menuGroup}>
                    <ProfileMenuItem icon="bell" title="Notifications" onPress={() => navigation.navigate('NotificationsScreen' as never)}/>
                    <ProfileMenuItem icon="lock" title="Privacy Settings" onPress={() => navigation.navigate('PrivacySettingsScreen')} />
                    <ProfileMenuItem icon="help-circle" title="Help & Support" onPress={() => navigation.navigate('HelpSupportScreen')} />
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
                onClose={() => {
                    setIsEditModalVisible(false);
                    refreshUser();
                }}
            />

            <Modal
                visible={isImageUpdateVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsImageUpdateVisible(false)}
            >
                <View style={styles.modalContainerPlaceholder}>
                    <View style={styles.modalContentPlaceholder}>
                        <Text style={styles.modalTextPlaceholder}>Image Picker/Action Sheet Goes Here</Text>
                        <TouchableOpacity onPress={() => setIsImageUpdateVisible(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F9F9F9' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F9F9' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#222' },
    content: { padding: 20 },
    profileCard: { backgroundColor: '#FFF', borderRadius: 16, alignItems: 'center', padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
    profileImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 15, borderWidth: 3, borderColor: '#D81E5B' },
    cameraIconOverlay: { position: 'absolute', bottom: 12, right: -8, backgroundColor: '#D81E5B', borderRadius: 12, width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    name: { fontSize: 22, fontWeight: 'bold', color: '#222' },
    email: { fontSize: 14, color: '#888', marginBottom: 20 },
    menuGroup: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    menuItemText: { fontSize: 16, color: '#444' },
    logoutButton: { backgroundColor: '#FFEEEE', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    logoutButtonText: { color: '#D81E5B', fontSize: 18, fontWeight: 'bold' },
    modalContainerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContentPlaceholder: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: '80%' },
    modalTextPlaceholder: { fontSize: 16, marginBottom: 10 },
    modalCloseText: { color: '#D81E5B', textAlign: 'center', fontWeight: 'bold' },
});

export default ProfileScreen;