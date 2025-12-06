import axios from 'axios';
import { ICategory } from '../types/backendType'; // Import the new category type

// Define the base URL using the environment variable
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const CATEGORY_BASE_URL = `${SERVER_URL}/api/v1/categories`; // Assuming your category router is mounted at /api/v1/category

if (!SERVER_URL) {
  console.error("SERVER_URL environment variable is not set!");
}

// ---------------------------------------------------------------------
// Service Interfaces
// ---------------------------------------------------------------------

export interface CategoryListResponse {
    success: boolean;
    count: number;
    categories: ICategory[];
}

/**
 * Fetches the full list of categories from the backend.
 * GET /category
 */
export async function getAllCategories(): Promise<ICategory[] | null> {
    try {
        const response = await axios.get<CategoryListResponse>(CATEGORY_BASE_URL);
        
        // We return just the array of categories
        return response.data.categories;
        
    } catch (error) {
        console.error('Error fetching category list:', error);
        return null;
    }
}