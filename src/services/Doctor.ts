// services/Doctor.ts - ENHANCED & UPDATED VERSION

import axios, { AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { IDoctor, DoctorRegistrationData } from '../types/backendType'; 
import { TOKEN_KEY } from './Auth';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/doctors`;

// API response types
interface DoctorListResponse {
    success: true;
    data: IDoctor[];
}

interface SingleDoctorResponse {
    success: true;
    data: IDoctor;
    message?: string;
}

interface DoctorCategoriesResponse {
    success: true;
    data: Array<{ specialization: string; count: number }>;
}

interface ApiResponse {
    success: boolean;
    message?: string;
}

/**
 * 🧑‍⚕️ Register a new doctor (Self-registration)
 * Handles multipart form data for file upload.
 */
export const registerDoctor = async (
    data: DoctorRegistrationData,
    imageUri: string
): Promise<IDoctor | null> => {
    try {
        console.log('[DoctorService] Registering new doctor...');
        
        const formData = new FormData();
        
        // Append all text fields
        Object.keys(data).forEach(key => {
            const value = (data as any)[key];
            if (value !== undefined && value !== null) {
                formData.append(key, value.toString());
            }
        });

        // Append the image file
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('doctorImage', {
            uri: imageUri,
            name: filename || 'doctor_image.jpg',
            type,
        } as any); 

        const response: AxiosResponse<SingleDoctorResponse> = await axios.post(API_URL, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (response.data.success) {
            console.log('[DoctorService] ✅ Doctor registered successfully');
            return response.data.data;
        }
        return null;
    } catch (error: any) {
        console.error('[DoctorService] ❌ Registration error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * 📋 Fetch all approved doctors for public display.
 * This endpoint is public but enhanced with token if available.
 */
export const fetchApprovedDoctors = async (): Promise<IDoctor[] | null> => {
    try {
        console.log('[DoctorService] Fetching approved doctors...');
        
        // Try to get token for better experience, but don't fail if not present
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        
        const headers: any = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        
        const response: AxiosResponse<DoctorListResponse> = await axios.get(API_URL, {
            headers
        });
        
        if (response.data.success) {
            console.log(`[DoctorService] ✅ Fetched ${response.data.data.length} doctors`);
            return response.data.data;
        }
        return null;
    } catch (error: any) {
        console.error('[DoctorService] ❌ Error fetching doctors:', error.response?.data || error.message);
        return null;
    }
};

/**
 * 👤 Fetch a single doctor profile by ID.
 * Requires authentication token.
 */
export const fetchDoctorProfile = async (doctorId: string, token?: string): Promise<IDoctor | null> => {
    try {
        console.log(`[DoctorService] Fetching doctor profile: ${doctorId}`);
        
        // If token not provided, get it from SecureStore
        let authToken: string | null = token || null;
        if (!authToken) {
            authToken = await SecureStore.getItemAsync(TOKEN_KEY);
        }
        
        if (!authToken) {
            console.error('[DoctorService] No authentication token available');
            throw new Error('Authentication required');
        }
        
        const url = `${API_URL}/${doctorId}`;
        
        const response: AxiosResponse<SingleDoctorResponse> = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        });
        
        if (response.data.success) {
            console.log('[DoctorService] ✅ Doctor profile fetched');
            return response.data.data;
        }
        return null;
    } catch (error: any) {
        console.error(`[DoctorService] ❌ Error fetching doctor ${doctorId}:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Alias for fetchDoctorProfile for consistency
 */
export const fetchDoctorById = fetchDoctorProfile;

/**
 * 🏥 Get doctor categories (specializations with counts)
 */
export const fetchDoctorCategories = async (): Promise<Array<{ specialization: string; count: number }>> => {
    try {
        console.log('[DoctorService] Fetching doctor categories...');
        
        const response: AxiosResponse<DoctorCategoriesResponse> = await axios.get(
            `${API_URL}/doctorCategories`
        );
        
        if (response.data.success && response.data.data) {
            console.log(`[DoctorService] ✅ Fetched ${response.data.data.length} categories`);
            return response.data.data;
        }
        
        return [];
    } catch (error: any) {
        console.error('[DoctorService] ❌ Error fetching categories:', error.response?.data || error.message);
        return [];
    }
};

/**
 * ✏️ Update doctor profile
 * Can be used by doctor (own profile) or admin (any profile)
 */
export const updateDoctorProfile = async (
    doctorId: string,
    updateData: Partial<DoctorRegistrationData>,
    token?: string,
    imageUri?: string
): Promise<IDoctor | null> => {
    try {
        console.log(`[DoctorService] Updating doctor profile: ${doctorId}`);
        
        // Get token
        let authToken: string | null = token || null;
        if (!authToken) {
            authToken = await SecureStore.getItemAsync(TOKEN_KEY);
        }
        
        if (!authToken) {
            throw new Error('Authentication required');
        }
        
        const formData = new FormData();
        
        // Append update data fields
        Object.keys(updateData).forEach(key => {
            const value = (updateData as any)[key];
            if (value !== undefined && value !== null) {
                if (typeof value === 'object' && !(value instanceof File)) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, value.toString());
                }
            }
        });
        
        // Append image if provided
        if (imageUri && imageUri.startsWith('file://')) {
            const filename = imageUri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename || '');
            const type = match ? `image/${match[1]}` : `image/jpeg`;
            
            formData.append('doctorImage', {
                uri: imageUri,
                name: filename || 'doctor_image.jpg',
                type,
            } as any);
        }
        
        const response: AxiosResponse<SingleDoctorResponse> = await axios.put(
            `${API_URL}/${doctorId}`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        
        if (response.data.success) {
            console.log('[DoctorService] ✅ Doctor profile updated');
            return response.data.data;
        }
        
        return null;
    } catch (error: any) {
        console.error(`[DoctorService] ❌ Error updating doctor:`, error.response?.data || error.message);
        throw error;
    }
};


// 🩺 Update doctor availability
export const updateDoctorAvailabilityService = async (
  availability: Record<string, any>,
  token?: string
): Promise<IDoctor | null> => {
  try {
    console.log('[DoctorService] Updating availability...');

    let authToken: string | null = token || null;
    if (!authToken) {
      authToken = await SecureStore.getItemAsync(TOKEN_KEY);
    }
    if (!authToken) throw new Error('Authentication required');

    const response: AxiosResponse<SingleDoctorResponse> = await axios.put(
      `${API_URL}/availability`,
      { availability },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (response.data.success) {
      console.log('[DoctorService] ✅ Availability updated successfully');
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    console.error('[DoctorService] ❌ Error updating availability:', error.response?.data || error.message);
    throw error;
  }
};

// 🧑‍⚕️ Fetch logged-in doctor profile
export const fetchMyDoctorProfile = async (token?: string): Promise<IDoctor | null> => {
  try {
    console.log('[DoctorService] Fetching logged-in doctor profile...');

    let authToken: string | null = token || null;
    if (!authToken) {
      authToken = await SecureStore.getItemAsync(TOKEN_KEY);
    }
    if (!authToken) throw new Error('Authentication required');

    const response: AxiosResponse<SingleDoctorResponse> = await axios.get(`${API_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.data.success) {
      console.log('[DoctorService] ✅ Logged-in doctor profile fetched');
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    console.error('[DoctorService] ❌ Error fetching my profile:', error.response?.data || error.message);
    throw error;
  }
};


/**
 * 🗑️ Delete doctor (Admin only)
 */
export const deleteDoctor = async (doctorId: string, token?: string): Promise<boolean> => {
    try {
        console.log(`[DoctorService] Deleting doctor: ${doctorId}`);
        
        let authToken: string | null = token || null;
        if (!authToken) {
            authToken = await SecureStore.getItemAsync(TOKEN_KEY);
        }
        
        if (!authToken) {
            throw new Error('Authentication required');
        }
        
        const response: AxiosResponse<ApiResponse> = await axios.delete(
            `${API_URL}/${doctorId}`,
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
            }
        );
        
        if (response.data.success) {
            console.log('[DoctorService] ✅ Doctor deleted successfully');
            return true;
        }
        
        return false;
    } catch (error: any) {
        console.error(`[DoctorService] ❌ Error deleting doctor:`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * 🔍 Search doctors by query (client-side filtering)
 * TODO: Implement backend search endpoint for better performance
 */
export const searchDoctors = async (query: string): Promise<IDoctor[]> => {
    try {
        console.log(`[DoctorService] Searching doctors: ${query}`);
        
        const allDoctors = await fetchApprovedDoctors();
        if (!allDoctors) return [];
        
        const searchLower = query.toLowerCase();
        const filtered = allDoctors.filter(doctor => 
            `${doctor.firstName} ${doctor.lastName}`.toLowerCase().includes(searchLower) ||
            doctor.specialization.toLowerCase().includes(searchLower) ||
            doctor.email.toLowerCase().includes(searchLower)
        );
        
        console.log(`[DoctorService] ✅ Found ${filtered.length} matching doctors`);
        return filtered;
    } catch (error: any) {
        console.error('[DoctorService] ❌ Search error:', error.message);
        return [];
    }
};

/**
 * 🏥 Get doctors by specialization
 */
export const fetchDoctorsBySpecialization = async (specialization: string): Promise<IDoctor[]> => {
    try {
        console.log(`[DoctorService] Fetching doctors by specialization: ${specialization}`);
        
        const allDoctors = await fetchApprovedDoctors();
        if (!allDoctors) return [];
        
        const filtered = allDoctors.filter(
            doctor => doctor.specialization.toLowerCase() === specialization.toLowerCase()
        );
        
        console.log(`[DoctorService] ✅ Found ${filtered.length} ${specialization} doctors`);
        return filtered;
    } catch (error: any) {
        console.error('[DoctorService] ❌ Error fetching by specialization:', error.message);
        return [];
    }
};

/**
 * 📍 Get doctors by location (state/lga)
 */
export const fetchDoctorsByLocation = async (state?: string, lga?: string): Promise<IDoctor[]> => {
    try {
        console.log(`[DoctorService] Fetching doctors by location: ${state}, ${lga}`);
        
        const allDoctors = await fetchApprovedDoctors();
        if (!allDoctors) return [];
        
        let filtered = allDoctors;
        
        if (state) {
            filtered = filtered.filter(
                doctor => doctor.state?.toLowerCase() === state.toLowerCase()
            );
        }
        
        if (lga) {
            filtered = filtered.filter(
                doctor => doctor.lga?.toLowerCase() === lga.toLowerCase()
            );
        }
        
        console.log(`[DoctorService] ✅ Found ${filtered.length} doctors in location`);
        return filtered;
    } catch (error: any) {
        console.error('[DoctorService] ❌ Error fetching by location:', error.message);
        return [];
    }
};

/**
 * ⭐ Get top-rated doctors
 */
export const fetchTopRatedDoctors = async (limit: number = 5): Promise<IDoctor[]> => {
    try {
        console.log(`[DoctorService] Fetching top ${limit} rated doctors...`);
        
        const allDoctors = await fetchApprovedDoctors();
        if (!allDoctors) return [];
        
        const topRated = [...allDoctors]
            .sort((a, b) => (b.ratings || 0) - (a.ratings || 0))
            .slice(0, limit);
        
        console.log(`[DoctorService] ✅ Fetched ${topRated.length} top-rated doctors`);
        return topRated;
    } catch (error: any) {
        console.error('[DoctorService] ❌ Error fetching top-rated doctors:', error.message);
        return [];
    }
};

/**
 * 🔢 Helper: Calculate average rating from reviews
 */
export const calculateAverageRating = (reviews?: Array<{ rating: number }>): number => {
    if (!reviews || reviews.length === 0) return 0;
    
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Number((sum / reviews.length).toFixed(1));
};

/**
 * 🖼️ Helper: Get doctor image URI
 */
export const getDoctorImageUri = (doctor: IDoctor): string => {
    // Priority: profileImage string > doctorImage.imageUrl > fallback
    if (typeof doctor.profileImage === 'string' && doctor.profileImage) {
        return doctor.profileImage;
    }
    
    if (doctor.doctorImage) {
        const img = doctor.doctorImage as any;
        return img.imageUrl || img.secure_url || img.url || '';
    }
    
    // Fallback to UI Avatars
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(`${doctor.firstName} ${doctor.lastName}`)}&background=D81E5B&color=fff`;
};

// Mark doctor onboarding as complete
export const completeDoctorProfileService = async (): Promise<boolean> => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) throw new Error('Authentication required');

    const response = await axios.post(
      `${API_URL}/complete-profile`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data?.success === true;
  } catch (error: any) {
    console.error('[DoctorService] ❌ completeDoctorProfile error:', error.response?.data || error.message);
    throw error;
  }
};
