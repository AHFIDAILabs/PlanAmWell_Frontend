// services/User.ts

import axios, { AxiosResponse } from 'axios';
import { IUser, IDoctor, AuthEntity } from '../types/backendType';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const USER_API_URL = `${SERVER_URL}/api/v1/users`;
const DOCTOR_API_URL = `${SERVER_URL}/api/v1/doctors`;

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  lga? : string;
  state? : string;
  country?: string;
  dateOfBirth?: string;
  gender?: string;
  profileImage?: string;
}

interface UserProfileResponse {
  success: boolean;
  data: IUser | IDoctor; // Can be either
}

/**
 * Decode JWT token to get user role without verification
 * This is safe because we only use it to route the API call - the backend still verifies the token
 */
const decodeToken = (token: string): { role?: string; id?: string } => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return {};
  }
};

/**
 * Fetch user or doctor profile based on token role
 * GET /users/profile/me OR /doctors/{doctorId}
 */
export const fetchUserProfile = async (token: string): Promise<UserProfileResponse | null> => {
  try {
    console.log('📤 Sending profile request...');
    console.log('    Token exists:', !!token);
    console.log('    Token preview:', token.substring(0, 30) + '...');

    // Decode token to determine role
    const decoded = decodeToken(token);
    const isDoctor = decoded.role === 'Doctor';
    const userId = decoded.id;

    console.log('    Decoded role:', decoded.role);
    console.log('    User ID:', userId);

    let response: AxiosResponse<UserProfileResponse>;

    if (isDoctor && userId) {
      // Fetch doctor profile
      const url = `${DOCTOR_API_URL}/${userId}`;
      console.log('    API URL (Doctor):', url);
      
      response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } else {
      // Fetch user profile
      const url = `${USER_API_URL}/profile/me`;
      console.log('    API URL (User):', url);
      
      response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    console.log('✅ Profile fetched successfully');
    
    if (response.data.success) {
      return response.data;
    }
    return null;
  } catch (error: any) {
    console.error('❌ Profile fetch failed');
    if (error.response) {
      console.error('    Status:', error.response.status);
      console.error('    Message:', error.response.data?.message || 'Unknown error');
    }
    throw error;
  }
};

/**
 * Update user profile
 * PUT /users/profile/{userId}
 */
export const updateUserProfile = async (
  userId: string,
  token: string,
  data: UpdateUserData,
  imageUri?: string
): Promise<UserProfileResponse | null> => {
  try {
    const url = `${USER_API_URL}/${userId}`;

    // If image is provided, use FormData
    if (imageUri) {
      const formData = new FormData();

      // Append all text fields
      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      // Append the image file
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('userImage', {
        uri: imageUri,
        name: filename || 'profile_image.jpg',
        type,
      } as any);

      const response = await axios.put<UserProfileResponse>(url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } else {
      // No image, send JSON
      const response = await axios.put<UserProfileResponse>(url, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Delete user account
 * DELETE /users/profile/{userId}
 */
export const deleteUserAccount = async (
  userId: string,
  token: string
): Promise<{ success: boolean; message: string } | null> => {
  try {
    const url = `${USER_API_URL}/profile/${userId}`;

    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
};