import axios from 'axios';
import { IProduct } from '../types/backendType'; // Import Product type

// Define the base URL using the environment variable
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const PRODUCT_BASE_URL = `${SERVER_URL}/api/v1/products`; 

if (!SERVER_URL) {
  console.error("SERVER_URL environment variable is not set!");
}

// ---------------------------------------------------------------------
// Service Interfaces
// ---------------------------------------------------------------------

export interface ProductListResponse {
    success: boolean;
    data: IProduct[];
    page: number;
    limit: number;
}

// ---------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------

/**
 * Helper to include Authorization header if a token is provided.
 */
const getAuthHeaders = (token?: string) => ({
    headers: token ? { Authorization: `Bearer ${token}` } : {}
});


/**
 * Fetches a list of products from the server (which uses DB caching and API fallback).
 * GET /products
 */
export async function getProducts(
    page: number = 1, 
    limit: number = 20, 
    token?: string
): Promise<ProductListResponse | null> {
    try {
        const response = await axios.get<ProductListResponse>(
            `${PRODUCT_BASE_URL}?page=${page}&limit=${limit}&t=${Date.now()}`, // timestamp prevents caching
            {
                headers: {
                    'Cache-Control': 'no-cache',
                    ...getAuthHeaders(token).headers,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error fetching product list:', error);
        return null;
    }
}

/**
 * Fetches a single product by its ID.
 * GET /products/:id
 */
export async function getProductById(
    productId: string, 
    token?: string
): Promise<IProduct | null> {
    try {
        // The backend returns { success: true, data: IProduct }
        const response = await axios.get<{ success: boolean, data: IProduct }>(
            `${PRODUCT_BASE_URL}/${productId}`,
            getAuthHeaders(token)
        );
        
        return response.data.data;

    } catch (error) {
        console.error(`Error fetching product ${productId}:`, error);
        return null;
    }
}

export const getProductsByCategory = async (category: string) => {
    const res = await axios.get(`${SERVER_URL}/api/v1/products`, { params: { category } });
    return res.data.products;
};