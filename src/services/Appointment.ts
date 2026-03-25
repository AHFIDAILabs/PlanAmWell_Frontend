// services/Appointment.ts - WITH ENHANCED DEBUGGING

import axios, { AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from './Auth';
import { IAppointment } from '../types/backendType';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/appointments`;

export interface CreateAppointmentData {
  doctorId: string;
  scheduledAt: Date | string;
  duration?: number;
  reason?: string;
  notes?: string;
  shareUserInfo?: boolean;
  paymentReference? : string;
paymentStatus?: "pending" | "paid" | "failed";
}

interface UpdateAppointmentData {
    scheduledAt?: Date | string;
    status?: "pending" | "confirmed" | "cancelled" | "completed" | "rejected" | "rescheduled";
    notes?: string;
    proposedAt?: Date | string;
    paymentStatus?: "pending" | "paid" | "failed";
    userId?: string;
    doctorId?: string;
    duration?: number;
    reason?: string;
    shareUserInfo?: boolean;
    consultationType?: "video" | "in-person" | "chat" | "audio";
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
}

/**
 * Get authentication token from storage
 */
const getAuthToken = async (): Promise<string> => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) {
        throw new Error('Authentication required. Please log in.');
    }
    return token;
};

/**
 * 🩺 Get doctor's appointments (Doctor) - WITH ENHANCED DEBUGGING
 */
export const getDoctorAppointments = async (
  statuses?: string[]
): Promise<IAppointment[]> => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[AppointmentService] 🔍 FETCHING DOCTOR APPOINTMENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const token = await getAuthToken();
    console.log('[AppointmentService] ✅ Token retrieved');
    console.log('[AppointmentService] Token preview:', token.substring(0, 30) + '...');

    // Prepare query params
    const params = statuses ? { statuses: statuses.join(",") } : {};
    console.log('[AppointmentService] Query params:', params);

    const fullUrl = `${API_URL}/doctor`;
    console.log('[AppointmentService] 📡 Request URL:', fullUrl);
    console.log('[AppointmentService] 📡 Full API_URL:', API_URL);
    console.log('[AppointmentService] 📡 SERVER_URL:', SERVER_URL);

    console.log('[AppointmentService] 🚀 Sending request...');
    
    const response: AxiosResponse<ApiResponse<IAppointment[]>> = await axios.get(
      fullUrl,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      }
    );

    console.log('[AppointmentService] 📥 Response received');
    console.log('[AppointmentService] Status code:', response.status);
    console.log('[AppointmentService] Response success:', response.data.success);
    console.log('[AppointmentService] Response data exists:', !!response.data.data);
    
    if (response.data.data) {
      console.log('[AppointmentService] 📊 Raw appointments count:', response.data.data.length);
      console.log('[AppointmentService] 📋 First appointment (if any):', 
        response.data.data[0] ? JSON.stringify(response.data.data[0], null, 2) : 'NONE');
    }

    if (response.data.success && response.data.data) {
      console.log(`[AppointmentService] ✅ Successfully fetched ${response.data.data.length} appointments`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return response.data.data;
    }

    console.log('[AppointmentService] ⚠️ Success was false or no data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return [];
  } catch (error: any) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('[AppointmentService] ❌ ERROR OCCURRED');
    console.error('[AppointmentService] Error message:', error.message);
    console.error('[AppointmentService] Error response status:', error.response?.status);
    console.error('[AppointmentService] Error response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('[AppointmentService] Full error:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    throw error;
  }
};

/**
 * 📅 Create a new appointment (User)
 */
export const createAppointment = async (
    appointmentData: CreateAppointmentData
): Promise<IAppointment> => {
    try {
        console.log('[AppointmentService] Creating appointment...');
        
        const token = await getAuthToken();
        
        const response: AxiosResponse<ApiResponse<IAppointment>> = await axios.post(
            API_URL,
            appointmentData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        
        if (response.data.success && response.data.data) {
            console.log('[AppointmentService] ✅ Appointment created successfully');
            return response.data.data;
        }
        
        throw new Error(response.data.message || 'Failed to create appointment');
    } catch (error: any) {
        console.error('[AppointmentService] ❌ Create error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * 📋 Get my appointments (User)
 */
export const getMyAppointments = async (): Promise<IAppointment[]> => {
    try {
        console.log('[AppointmentService] Fetching my appointments...');
        
        const token = await getAuthToken();
        
        const response: AxiosResponse<ApiResponse<IAppointment[]>> = await axios.get(
            `${API_URL}/my`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        
        if (response.data.success && response.data.data) {
            console.log(`[AppointmentService] ✅ Fetched ${response.data.data.length} appointments`);
            return response.data.data;
        }
        
        return [];
    } catch (error: any) {
        console.error('[AppointmentService] ❌ Fetch error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * ✏️ Update appointment
 */
export const updateAppointment = async (
    appointmentId: string,
    updateData: UpdateAppointmentData
): Promise<IAppointment> => {
    try {
        console.log(`[AppointmentService] Updating appointment ${appointmentId}...`);
        
        const token = await getAuthToken();
        
        const response: AxiosResponse<ApiResponse<IAppointment>> = await axios.patch(
            `${API_URL}/${appointmentId}`,
            updateData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        
        if (response.data.success && response.data.data) {
            console.log('[AppointmentService] ✅ Appointment updated successfully');
            return response.data.data;
        }
        
        throw new Error(response.data.message || 'Failed to update appointment');
    } catch (error: any) {
        console.error('[AppointmentService] ❌ Update error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * 🗑️ Delete appointment (Admin only)
 */
export const deleteAppointment = async (appointmentId: string): Promise<boolean> => {
    try {
        console.log(`[AppointmentService] Deleting appointment ${appointmentId}...`);
        
        const token = await getAuthToken();
        
        const response: AxiosResponse<ApiResponse<null>> = await axios.delete(
            `${API_URL}/${appointmentId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        
        if (response.data.success) {
            console.log('[AppointmentService] ✅ Appointment deleted successfully');
            return true;
        }
        
        return false;
    } catch (error: any) {
        console.error('[AppointmentService] ❌ Delete error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * 👮 Get all appointments (Admin only)
 */
export const getAllAppointments = async (): Promise<IAppointment[]> => {
    try {
        console.log('[AppointmentService] Fetching all appointments (Admin)...');
        
        const token = await getAuthToken();
        
        const response: AxiosResponse<ApiResponse<IAppointment[]>> = await axios.get(
            API_URL,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        
        if (response.data.success && response.data.data) {
            console.log(`[AppointmentService] ✅ Fetched ${response.data.data.length} appointments`);
            return response.data.data;
        }
        
        return [];
    } catch (error: any) {
        console.error('[AppointmentService] ❌ Fetch error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * ❌ Cancel appointment (convenience method)
 */
export const cancelAppointment = async (appointmentId: string, notes?: string): Promise<IAppointment> => {
    return updateAppointment(appointmentId, {
        status: 'cancelled',
        notes: notes || 'Cancelled by user',
    });
};


/**
 * 🏁 End appointment — Doctor only
 * Calls PATCH /api/v1/appointments/:id/end
 * Sets status → completed, locks the conversation, notifies both parties.
 */
export const endAppointment = async (appointmentId: string): Promise<IAppointment> => {
  try {
    console.log(`[AppointmentService] Ending appointment ${appointmentId}...`);
 
    const token = await getAuthToken();
 
    const response: AxiosResponse<ApiResponse<IAppointment>> = await axios.patch(
      `${API_URL}/${appointmentId}/end`,
      {},   // no body needed — the backend derives everything from the appointment
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
 
    if (response.data.success && response.data.data) {
      console.log("[AppointmentService] ✅ Appointment ended successfully");
      return response.data.data;
    }
 
    throw new Error(response.data.message || "Failed to end appointment");
  } catch (error: any) {
    console.error(
      "[AppointmentService] ❌ End error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

/**
 * ✅ Confirm appointment (Doctor - convenience method)
 */
export const confirmAppointment = async (appointmentId: string): Promise<IAppointment> => {
    return updateAppointment(appointmentId, {
        status: 'confirmed',
    });
};

/**
 * 🏁 Complete appointment (Doctor - convenience method)
 */
export const completeAppointment = async (appointmentId: string, notes?: string): Promise<IAppointment> => {
    return updateAppointment(appointmentId, {
        status: 'completed',
        notes,
    });
};

/**
 * 📊 Helper: Get appointment statistics
 */
export const getAppointmentStats = (appointments: IAppointment[]) => {
    return {
        total: appointments.length,
        pending: appointments.filter(a => a.status === 'pending').length,
        confirmed: appointments.filter(a => a.status === 'confirmed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
        completed: appointments.filter(a => a.status === 'completed').length,
    };
};

/**
 * 📅 Helper: Get upcoming appointments
 */
export const getUpcomingAppointments = (appointments: IAppointment[]): IAppointment[] => {
    const now = new Date();
    return appointments
        .filter(a => new Date(a.scheduledAt) > now && a.status !== 'cancelled')
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
};

/**
 * 📜 Helper: Get past appointments
 */
export const getPastAppointments = (appointments: IAppointment[]): IAppointment[] => {
    const now = new Date();
    return appointments
        .filter(a => new Date(a.scheduledAt) <= now || a.status === 'completed')
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
};

/**
 * 🕐 Helper: Format appointment time
 */
export const formatAppointmentTime = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};

/**
 * 🎨 Helper: Get status color
 */
export const getStatusColor = (status: IAppointment['status']): string => {
    switch (status) {
        case 'confirmed':
            return '#10B981'; // Green
        case 'pending':
            return '#3B82F6'; // Blue
        case 'cancelled':
            return '#EF4444'; // Red
        case 'completed':
            return '#6B7280'; // Gray
        default:
            return '#6B7280';
    }
};

/**
 * 📱 Helper: Get status icon
 */
export const getStatusIcon = (status: IAppointment['status']): string => {
    switch (status) {
        case 'confirmed':
            return 'checkmark-circle';
        case 'pending':
            return 'time';
        case 'cancelled':
            return 'close-circle';
        case 'completed':
            return 'checkmark-done';
        default:
            return 'help-circle';
    }
};

// services/Appointment.ts
export const getAppointmentById = async (appointmentId: string) => {
  try {
    console.log(`[AppointmentService] Fetching appointment ${appointmentId}...`);
    const token = await getAuthToken();

    const response: AxiosResponse<ApiResponse<IAppointment>> = await axios.get(
      `${API_URL}/appointment/${appointmentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.success && response.data.data) {
      console.log('[AppointmentService] ✅ Appointment fetched successfully');
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch appointment');

  } catch (error: any) {
    console.error('[AppointmentService] ❌ Fetch error:', error.response?.data || error.message);
    throw error;
  }
};

