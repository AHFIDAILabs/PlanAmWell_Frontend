// components/profile/EditProfileModal.tsx - FIXED VERSION

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    ScrollView,
    Platform,
    Image,
    Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

interface ProfileFormState {
    name: string;
    phone: string;
    gender: string;
    dateOfBirth: string;
    homeAddress: string;
    city: string;
    state: string;
    lga: string;
    userImageUri: string;
    imageChanged: boolean;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ visible, onClose }) => {
    const { user, updateUser } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [formData, setFormData] = useState<ProfileFormState>({
        name: '', phone: '', gender: '', dateOfBirth: '', homeAddress: '', city: '', 
        state: '', lga: '', userImageUri: '', imageChanged: false,
    });

    // ✅ FIXED: Better image extraction from user object
    useEffect(() => {
        if (user && visible) {
            console.log('📝 Populating form with user data');
            
            // Extract image URI properly
            let imageUri = '';
            if (typeof user.userImage === 'string') {
                imageUri = user.userImage;
            } else if (user.userImage && typeof user.userImage === 'object') {
                const imgObj = user.userImage as any;
                imageUri = imgObj.imageUrl || imgObj.secure_url || imgObj.url || '';
            }
            
            console.log('🖼️ Initial image URI:', imageUri);

            setFormData({
                name: user.name || '',
                phone: user.phone || '',
                gender: user.gender || '',
                dateOfBirth: user.dateOfBirth || '',
                homeAddress: user.homeAddress || user.preferences?.address || '',
                city: user.city || user.preferences?.city || '',
                state: user.state || user.preferences?.state || '',
                lga: user.lga || user.preferences?.lga || '',
                userImageUri: imageUri,
                imageChanged: false,
            });
        }
    }, [user, visible]);

    const handleInputChange = (key: keyof ProfileFormState, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleImagePick = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please grant media library access to select a profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, 
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            const newUri = result.assets[0].uri;
            console.log('📷 New image selected:', newUri);
            
            setFormData(prev => ({
                ...prev,
                userImageUri: newUri,
                imageChanged: true,
            }));
            
            Toast.show({ type: 'success', text1: 'Image selected' });
        }
    };

    const handleDateChange = (e: any, date: Date | undefined) => {
        setShowDatePicker(false);
        if (date) {
            handleInputChange('dateOfBirth', date.toISOString().split('T')[0]);
        }
    };
    
    const handleSave = async () => {
        if (!user || !user._id) { 
            Toast.show({ type: 'error', text1: 'Error', text2: 'User session invalid.' });
            return;
        }

        if (!formData.name.trim()) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Name is required.' });
            return;
        }

        setIsSaving(true);

        try {
            const payload = {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                gender: formData.gender,
                dateOfBirth: formData.dateOfBirth,
                homeAddress: formData.homeAddress,
                city: formData.city,
                state: formData.state,
                lga: formData.lga,
            };

            // Only send image if it's a new local file (starts with file://)
            const imageToUpload = formData.imageChanged && formData.userImageUri.startsWith('file://') 
                ? formData.userImageUri 
                : undefined;

            console.log('💾 Saving profile:', {
                userId: user._id,
                hasImage: !!imageToUpload,
                imageUri: imageToUpload
            });

            const updated = await updateUser(user._id.toString(), payload, imageToUpload);

            if (!updated) {
                throw new Error('No update response');
            }

            console.log('✅ Profile updated successfully');
            
            Toast.show({ 
                type: 'success', 
                text1: 'Profile updated',
                text2: 'Your profile has been updated successfully' 
            });
            
            onClose();
        } catch (error: any) {
            console.error('❌ Update error:', error);
            Toast.show({ 
                type: 'error', 
                text1: 'Update failed',
                text2: error.response?.data?.message || 'Failed to update profile'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                        <TouchableOpacity onPress={onClose} disabled={isSaving}>
                            <Feather name="x" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        <TouchableOpacity
                            style={styles.imageContainer}
                            onPress={handleImagePick}
                            disabled={isSaving}
                        >
                            <Image
                                source={{ uri: formData.userImageUri || 'https://via.placeholder.com/150' }}
                                style={styles.profileImage}
                                onError={(e) => console.error('Image load error:', e.nativeEvent.error)}
                            />
                            <View style={styles.imageOverlay}>
                                <Feather name="camera" size={18} color="#FFF" />
                            </View>
                            {formData.imageChanged && (
                                <View style={styles.imageChangedBadge}>
                                    <Text style={styles.imageChangedText}>New</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.label}>Full Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={t => handleInputChange('name', t)}
                            placeholder="Enter your full name"
                        />

                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.phone}
                            keyboardType="phone-pad"
                            onChangeText={t => handleInputChange('phone', t)}
                            placeholder="Enter your phone number"
                        />

                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={formData.gender}
                                onValueChange={v => handleInputChange('gender', v)}
                            >
                                <Picker.Item label="Select gender" value="" />
                                <Picker.Item label="Male" value="Male" />
                                <Picker.Item label="Female" value="Female" />
                                <Picker.Item label="Other" value="Other" />
                            </Picker>
                        </View>

                        <Text style={styles.label}>Date of Birth</Text>
                        <TouchableOpacity
                            style={styles.input}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={formData.dateOfBirth ? styles.dateText : styles.datePlaceholder}>
                                {formData.dateOfBirth || 'Select date'}
                            </Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                mode="date"
                                value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()}
                                onChange={handleDateChange}
                                maximumDate={new Date()}
                            />
                        )}

                        <Text style={styles.label}>Home Address</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.homeAddress}
                            onChangeText={t => handleInputChange('homeAddress', t)}
                            placeholder="Enter your home address"
                        />

                        <Text style={styles.label}>City</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.city}
                            onChangeText={t => handleInputChange('city', t)}
                            placeholder="Enter your city"
                        />

                        <Text style={styles.label}>State</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.state}
                            onChangeText={t => handleInputChange('state', t)}
                            placeholder="Enter your state"
                        />

                        <Text style={styles.label}>LGA</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.lga}
                            onChangeText={t => handleInputChange('lga', t)}
                            placeholder="Enter your LGA"
                        />
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        width: '100%',
        maxHeight: Platform.OS === 'ios' ? '90%' : '85%',
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 15,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        paddingVertical: 20,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        marginBottom: 15,
        backgroundColor: '#FAFAFA'
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#FAFAFA',
        marginBottom: 15,
    },
    dateText: {
        color: '#333',
    },
    datePlaceholder: {
        color: '#999',
    },
    imageContainer: {
        alignSelf: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: '#D81E5B',
    },
    imageOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#D81E5B',
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    imageChangedBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    imageChangedText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: '#D81E5B',
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 10,
        marginBottom: Platform.OS === 'ios' ? 25 : 15,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#CCC',
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default EditProfileModal;