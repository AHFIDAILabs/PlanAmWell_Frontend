// hooks/useDoctors.ts

import { useState, useEffect, useCallback } from 'react';
import { IDoctor } from '../types/backendType';
import { fetchApprovedDoctors } from '../services/Doctor';

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
            // No approved doctors is a legitimate, honest empty state — not
            // an error — so it's left for the screen's own "no doctors
            // currently available" UI rather than substituted with fake
            // profiles a patient could actually try to book.
            setDoctors(fetchedDoctors ?? []);
        } catch (err) {
            console.error('Doctor hook error:', err);
            setDoctors([]);
            setError('Could not load doctors. Please check your connection and try again.');
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