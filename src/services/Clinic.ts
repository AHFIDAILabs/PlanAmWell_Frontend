import axios from "axios";
import { IClinic } from "../types/backendType";

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const API_URL = `${SERVER_URL}/api/v1/hospitals`;

interface ClinicsResponse {
  success: true;
  data: IClinic[];
  total: number;
}

// ── Real-world OpenStreetMap data ─────────────────────────────────────────────

/**
 * Fetch real hospitals near a GPS coordinate.
 * Backed by OpenStreetMap Overpass API — completely free.
 * @param radiusMeters  Search radius in metres (max 20 000)
 */
export const fetchNearbyClinics = async (
  lat: number,
  lng: number,
  radiusMeters = 5000
): Promise<IClinic[]> => {
  try {
    const res = await axios.get<ClinicsResponse>(`${API_URL}/nearby`, {
      params: { lat, lng, radius: radiusMeters },
      timeout: 35_000,
    });
    return res.data.success ? res.data.data : [];
  } catch (err: any) {
    console.error("[ClinicService] fetchNearbyClinics error:", err.message);
    return [];
  }
};

/**
 * Fetch real hospitals in a Nigerian city or state.
 * Geocodes the city name via Nominatim, then queries Overpass within 10 km.
 */
export const fetchClinicsByCity = async (city: string): Promise<IClinic[]> => {
  try {
    const res = await axios.get<ClinicsResponse>(`${API_URL}/by-city`, {
      params: { city },
      timeout: 40_000,
    });
    return res.data.success ? res.data.data : [];
  } catch (err: any) {
    console.error("[ClinicService] fetchClinicsByCity error:", err.message);
    return [];
  }
};

// ── Admin-curated clinics (optional — kept for future featured listings) ──────

export const fetchClinicById = async (id: string): Promise<IClinic | null> => {
  try {
    const res = await axios.get<{ success: true; data: IClinic }>(`${API_URL}/${id}`);
    return res.data.success ? res.data.data : null;
  } catch (err: any) {
    console.error("[ClinicService] fetchClinicById error:", err.message);
    return null;
  }
};
