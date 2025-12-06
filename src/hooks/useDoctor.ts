// hooks/useDoctors.ts

import { useState, useEffect, useCallback } from 'react';
import { IDoctor } from '../types/backendType';
import { fetchApprovedDoctors } from '../services/Doctor';

// --- LOCAL ASSET IMPORTS (Assuming these paths are correct) ---
const DOC_1_ASSET = require('../assets/images/doc_1.jpeg');
const DOC_2_ASSET = require('../assets/images/doc_2.jpeg');
const DOC_3_ASSET = require('../assets/images/doc_2.jpeg');
// -----------------------------------------------------------

// --- PLACEHOLDER DATA (Used when API returns no approved doctors) ---
const PLACEHOLDER_DOCTORS: IDoctor[] = [
    {
        _id: 'mock_1',
        firstName: 'Evelyn',
        lastName: 'Wood',
        email: 'evelyn@example.com',
        
        specialization: 'Pediatric Specialist',
        licenseNumber: 'LIC-7890',
        status: 'approved',
        ratings: 4.9,
        state: "",
        lga: "",
        // Crucially, setting imageUrl to the local asset ID (number)
        doctorImage: { 
            _id: 'img_mock_1', 
            imageUrl: DOC_1_ASSET, 
            imageCldId: 'mock' 
        } as any,
    },
    {
        _id: 'mock_2',
        firstName: 'Nathan',
        lastName: 'Scott',
        email: 'nathan@example.com',
       
        specialization: 'Family Medicine',
        licenseNumber: 'LIC-1011',
        status: 'approved',
        ratings: 4.5,
         state: "",
        lga: "",
        doctorImage: { 
            _id: 'img_mock_2', 
            imageUrl: DOC_2_ASSET, 
            imageCldId: 'mock' 
        } as any,
    },
    {
        _id: 'mock_3',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah@example.com',
     
        specialization: 'Oncologist',
        licenseNumber: 'LIC-2022',
        status: 'approved',
        ratings: 5.0,
         state: "",
        lga: "",
        doctorImage: { 
            _id: 'img_mock_3', 
            imageUrl: DOC_3_ASSET, 
            imageCldId: 'mock' 
        } as any,
    },
];
// -------------------------------------------------------------------


/**
 * Custom hook to fetch and manage the list of approved doctors.
 */
export function useDoctors() {
    const [doctors, setDoctors] = useState<IDoctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetches the list of approved doctors from the backend API.
     */
    const loadDoctors = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedDoctors = await fetchApprovedDoctors();
            
            if (fetchedDoctors && fetchedDoctors.length > 0) {
                setDoctors(fetchedDoctors);
            } else {
                // If data is null or empty, use placeholders
                setDoctors(PLACEHOLDER_DOCTORS);
                
                // Set a warning error indicating mock data is being used
                setError('No approved doctors found in the system. Displaying placeholder profiles.');
            }
        } catch (err) {
            console.error('Doctor hook error:', err);
            // If the fetch completely fails, show placeholders and a strong error
            setDoctors(PLACEHOLDER_DOCTORS);
            setError('Connection failed. Displaying temporary mock profiles.'); 
        } finally {
            setLoading(false);
        }
    }, []);

    // Load doctors on initial mount
    useEffect(() => {
        loadDoctors();
    }, [loadDoctors]);

    return {
        doctors,
        loading,
        error,
        refreshDoctors: loadDoctors,
    };
}