import { useState, useEffect, useCallback } from 'react';
import { IProduct } from '../types/backendType';
import { getProducts } from '../services/product';
import { useAuth } from './useAuth';

export function useProducts() {
    const { userToken } = useAuth();
    const [products, setProducts] = useState<IProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchProducts = useCallback(async (pageNum: number = 1) => {
        setLoading(true);
        setError(null);

        try {
            // Pass userToken if available; guests will use undefined
            const response = await getProducts(pageNum, 20, userToken || undefined);

            if (response && response.data) {
                const newProducts = response.data;

                setProducts(prev =>
                    pageNum === 1 ? newProducts : [...prev, ...newProducts]
                );

                setPage(pageNum);
                setHasMore(newProducts.length === 20);
            } else {
                setError('Failed to fetch product data.');
            }
        } catch (e: any) {
            setError(e.message || 'An unknown error occurred while fetching products.');
            console.error("Error in useProducts hook:", e);
        } finally {
            setLoading(false);
        }
    }, [userToken]);

    useEffect(() => {
        // Always fetch products, even for guests
        fetchProducts(1);
    }, [fetchProducts]);

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchProducts(page + 1);
        }
    };

    return {
        products,
        loading,
        error,
        hasMore,
        loadMore,
        refresh: () => fetchProducts(1),
    };
}
