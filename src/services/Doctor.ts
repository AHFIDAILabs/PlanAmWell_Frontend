// services/Doctor.ts

import axios, { AxiosResponse } from 'axios';
import { IDoctor, DoctorRegistrationData } from '../types/backendType'; 


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
    data: DoctorRegistrationData, // Use the full imported type
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
        const type = match ? `image/${match[1]}` : `image/jpeg`; // Default to jpeg if type unknown

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
 */
export const fetchApprovedDoctors = async (): Promise<IDoctor[] | null> => {
    try {
        const url = API_URL; 
        const response: AxiosResponse<DoctorListResponse> = await axios.get(url);
        
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
 * Fetch a single doctor profile. Requires a token for authorization.
 */
export const fetchDoctorProfile = async (doctorId: string, token: string): Promise<IDoctor | null> => {
    try {
        const url = `${API_URL}/${doctorId}`; 
        const response: AxiosResponse<SingleDoctorResponse> = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
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