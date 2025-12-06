// services/User.ts - WITH ENHANCED DEBUGGING

import axios from 'axios';
import { IUser } from '../types/backendType';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const BASE_URL = `${SERVER_URL}/api/v1/users`; 

if (!SERVER_URL) {
  console.error("SERVER_URL environment variable is not set!");
}

/**
 * User profile fetch
 * GET /users/profile/me  
 */
export const fetchUserProfile = async (token: string) => {
  console.log("📤 Sending profile request...");
  console.log("   Token exists:", !!token);
  console.log("   Token preview:", token ? token.substring(0, 30) + "..." : "NONE");
  console.log("   API URL:", `${BASE_URL}/profile/me`);
  
  try {
    const response = await axios.get(`${BASE_URL}/profile/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log("✅ Profile fetch successful");
    
    // 🔍 DEBUG: Log the full response structure
    console.log("📦 Response data structure:", {
      success: response.data.success,
      hasData: !!response.data.data,
      dataKeys: response.data.data ? Object.keys(response.data.data) : [],
    });
    
    // 🔍 DEBUG: Specifically log userImage
    if (response.data.data?.userImage) {
      console.log("🖼️ UserImage from backend:", {
        type: typeof response.data.data.userImage,
        value: response.data.data.userImage,
        keys: typeof response.data.data.userImage === 'object' 
          ? Object.keys(response.data.data.userImage) 
          : 'N/A'
      });
    } else {
      console.log("🖼️ No userImage in response");
    }
    
    return response.data;
  } catch (error: any) {
    console.error("❌ Profile fetch failed");
    console.error("   Status:", error.response?.status);
    console.error("   Message:", error.response?.data?.message || error.message);
    throw error;
  }
};

/**
 * Update user profile
 * PUT /users/:id
 */
export interface UpdateUserData {
  name?: string;
  phone?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  homeAddress?: string;
  city?: string;
  state?: string;
  lga?: string;
  preferences?: Record<string, any>;
}

export const updateUserProfile = async (
  userId: string,
  token: string,
  userData: UpdateUserData,
  imageUri?: string
) => {
  console.log("📤 Sending profile update...");
  console.log("   User ID:", userId);
  console.log("   Has image:", !!imageUri);
  console.log("   Image URI:", imageUri);
  
  try {
    const formData = new FormData();

    // Attach image if present
    if (imageUri) {
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const ext = filename.split('.').pop();
      const type = ext ? `image/${ext}` : 'image/jpeg';
      
      console.log("📎 Attaching image:", { filename, type });
      
      formData.append('userImage', { 
        uri: imageUri, 
        name: filename, 
        type 
      } as any);
    }

    // Attach text fields
    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await axios.put(`${BASE_URL}/${userId}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log("✅ Profile update successful");
    
    // 🔍 DEBUG: Log the update response
    console.log("📦 Update response:", {
      success: response.data.success,
      hasData: !!response.data.data,
      userImage: response.data.data?.userImage,
      userImageType: typeof response.data.data?.userImage,
    });
    
    if (response.data.data?.userImage && typeof response.data.data.userImage === 'object') {
      console.log("🖼️ Updated userImage keys:", Object.keys(response.data.data.userImage));
      console.log("🖼️ Updated userImage value:", response.data.data.userImage);
    }

    return response.data;
  } catch (error: any) {
    console.error('❌ Profile update failed');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Delete user profile image
 * DELETE /users/:id/image
 */
export const deleteUserProfileImage = async (userId: string, token: string) => {
  console.log("📤 Sending delete profile image request...");
  
  try {
    const response = await axios.delete(`${BASE_URL}/${userId}/image`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    console.log("✅ Profile image deleted successfully");
    return response.data;
  } catch (error: any) {
    console.error("❌ Profile image deletion failed");
    console.error("   Status:", error.response?.status);
    console.error("   Message:", error.response?.data?.message || error.message);
    throw error;
  }
};