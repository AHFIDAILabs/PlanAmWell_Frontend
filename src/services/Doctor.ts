import axios, { AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { IDoctor, DoctorRegistrationData } from '../types/backendType'; 
import { TOKEN_KEY } from './Auth';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/doctors`;

// Define API response shape
interface DoctorListResponse {
    success: true;
    data: IDoctor[];
}

interface SingleDoctorResponse {
    success: true;
    data: IDoctor;
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
        const url = API_URL; 

        const formData = new FormData();
        
        // Append all text fields
        Object.keys(data).forEach(key => {
            formData.append(key, (data as any)[key]);
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

        const response: AxiosResponse<SingleDoctorResponse> = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (response.data.success) {
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.error('Error registering doctor:', (error as any).response?.data || error);
        throw error;
    }
};

/**
 * Fetch all approved doctors for public display.
 * This endpoint should be public and not require authentication.
 */
export const fetchApprovedDoctors = async (): Promise<IDoctor[] | null> => {
    try {
        const url = API_URL;
        
        // Try to get token for better experience, but don't fail if not present
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        
        const headers: any = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        
        const response: AxiosResponse<DoctorListResponse> = await axios.get(url, {
            headers
        });
        
        if (response.data.success) {
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching doctors:', (error as any).response?.data || error);
        return null;
    }
};

/**
 * Fetch a single doctor profile.
 * Requires authentication token.
 */
export const fetchDoctorProfile = async (doctorId: string, token?: string): Promise<IDoctor | null> => {
    try {
        // If token not provided, get it from SecureStore
let authToken: string | null = token || null;  // Type: string | null
        if (!authToken) {
            authToken = await SecureStore.getItemAsync(TOKEN_KEY);
        }
        
        if (!authToken) {
            console.error('No authentication token available for fetching doctor profile');
            throw new Error('Authentication required');
        }
        
        const url = `${API_URL}/${doctorId}`;
        
        console.log(`Fetching doctor profile with token: ${authToken.substring(0, 20)}...`);
        
        const response: AxiosResponse<SingleDoctorResponse> = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        });
        
        if (response.data.success) {
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching doctor ${doctorId} profile:`, (error as any).response?.data || error);
        throw error;
    }
};