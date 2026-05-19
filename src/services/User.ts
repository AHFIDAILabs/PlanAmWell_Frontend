// services/User.ts

import axios, { AxiosResponse } from 'axios';
import { IUser, IDoctor, AuthEntity } from '../types/backendType';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const USER_API_URL = `${SERVER_URL}/api/v1/users`;
const DOCTOR_API_URL = `${SERVER_URL}/api/v1/doctors`;

export interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string;
  homeAddress?: string;
  city?: string;
  lga?: string;
  state?: string;
  country?: string;
  dateOfBirth?: string;
  gender?: string;
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
      // Use /profile endpoint — populates doctorImage and works for any approval status
      const url = `${DOCTOR_API_URL}/profile`;
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

    // If image is provided, use FormData with native fetch (preserves multipart boundary)
    if (imageUri) {
      const formData = new FormData();

      Object.keys(data).forEach((key) => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value as string);
        }
      });

      const filename = imageUri.split('/').pop() || 'profile_image.jpg';
      const ext = (/\.(\w+)$/.exec(filename)?.[1] ?? 'jpg').toLowerCase();
      formData.append('userImage', {
        uri: imageUri,
        name: filename,
        type: ext === 'jpg' ? 'image/jpeg' : `image/${ext}`,
      } as any);

      // Do NOT set Content-Type — fetch sets it automatically with the correct boundary
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData as any,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || `Server error: ${res.status}`);
      }

      return await res.json();
    } else {
      // No image — send plain JSON
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