import { useState, useEffect } from 'react';
import { ICategory } from '../types/backendType';
import { getAllCategories } from '../services/category';

// Add a static 'All' category for the UI filter functionality
const ALL_CATEGORY: ICategory = {
    id: 'all',
    name: 'All',
    description: null,
    image: null,
    slug: 'all',
};

export function useCategories() {
    const [categories, setCategories] = useState<ICategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCategories() {
            setLoading(true);
            setError(null);
            try {
                const fetchedCategories = await getAllCategories();

                if (fetchedCategories) {
                    // Prepend the "All" category to the dynamic list
                    setCategories([ALL_CATEGORY, ...fetchedCategories]);
                } else {
                    setError('Failed to load categories.');
                }
            } catch (e: any) {
                setError(e.message || 'An unknown error occurred while fetching categories.');
                console.error("Error in useCategories hook:", e);
            } finally {
                setLoading(false);
            }
        }
        fetchCategories();
    }, []);

    return {
        categories,
        loading,
        error,
    };
}