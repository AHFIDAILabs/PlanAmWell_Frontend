// services/advocacyService.ts
import axios from 'axios';

// Define the base URL using the environment variable
const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL;
const BASE_URL = `${SERVER_URL}/api/v1`; 
if (!SERVER_URL) {
  console.error("SERVER_URL environment variable is not set!");
}
export interface IAdvocacyArticle {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: 'educational' | 'success-story' | 'policy-brief' | 'community-resource';
  tags: string[];
  author: {
    name: string;
    role?: string;
    userId?: string;
  };
  featuredImage?: {
    url: string;
    alt?: string;
    caption?: string;
  };
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  readTime?: number;
  views: number;
  likes: number;
  publishedAt?: string;
  commentsCount: number;
  commentsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IComment {
  _id: string;
  articleId: string;
  userId?: string;
  author: {
    name: string;
    email?: string;
    userId?: string;
  };
  content: string;
  parentCommentId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  likes: number;
  likedBy: string[];
  isEdited: boolean;
  editedAt?: string;
  replies: IComment[];
  depth: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IPaginationResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class AdvocacyService {
  private baseURL = `${BASE_URL}/advocacy`;

  // ==================== ARTICLES ====================

  // Get all articles with filters
  async getArticles(params?: {
    category?: string;
    tag?: string;
    featured?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sort?: string;
  }): Promise<IPaginationResponse<IAdvocacyArticle>> {
    const response = await axios.get(this.baseURL, { params });
    return response.data;
  }

  // Get recent articles
  async getRecentArticles(limit: number = 5): Promise<{ success: boolean; data: IAdvocacyArticle[] }> {
    const response = await axios.get(`${this.baseURL}/recent`, { params: { limit } });
    return response.data;
  }

  // Get featured articles
  async getFeaturedArticles(limit: number = 3): Promise<{ success: boolean; data: IAdvocacyArticle[] }> {
    const response = await axios.get(`${this.baseURL}/featured`, { params: { limit } });
    return response.data;
  }

  // Get categories with counts
  async getCategories(): Promise<{ success: boolean; data: { category: string; count: number }[] }> {
    const response = await axios.get(`${this.baseURL}/categories`);
    return response.data;
  }

  // Get all tags
  async getTags(): Promise<{ success: boolean; data: { tag: string; count: number }[] }> {
    const response = await axios.get(`${this.baseURL}/tags`);
    return response.data;
  }

  // Get single article by slug
  async getArticleBySlug(slug: string): Promise<{ success: boolean; data: IAdvocacyArticle }> {
    const response = await axios.get(`${this.baseURL}/${slug}`);
    return response.data;
  }

  // Search articles
  async searchArticles(
    query: string,
    params?: {
      category?: string;
      tags?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<IPaginationResponse<IAdvocacyArticle>> {
    const response = await axios.get(`${this.baseURL}/search`, {
      params: { q: query, ...params },
    });
    return response.data;
  }

  // Like an article
  async likeArticle(articleId: string): Promise<{ success: boolean; data: { likes: number } }> {
    const response = await axios.post(`${this.baseURL}/${articleId}/like`);
    return response.data;
  }

  // ==================== COMMENTS ====================

  // Get article comments
  async getArticleComments(
    articleId: string,
    params?: { page?: number; limit?: number; sort?: string }
  ): Promise<IPaginationResponse<IComment>> {
    const response = await axios.get(`${this.baseURL}/${articleId}/comments`, { params });
    return response.data;
  }

  // Get comment replies
  async getCommentReplies(commentId: string): Promise<{ success: boolean; data: IComment[] }> {
    const response = await axios.get(`${this.baseURL}/comments/${commentId}/replies`);
    return response.data;
  }

  // Add a comment
  async addComment(
    articleId: string,
    content: string,
    parentCommentId?: string,
    token?: string
  ): Promise<{ success: boolean; message: string; data: IComment }> {
    const response = await axios.post(
      `${this.baseURL}/${articleId}/comments`,
      { content, parentCommentId },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return response.data;
  }

  // Edit a comment
  async editComment(
    commentId: string,
    content: string,
    token: string
  ): Promise<{ success: boolean; message: string; data: IComment }> {
    const response = await axios.put(
      `${this.baseURL}/comments/${commentId}`,
      { content },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  }

  // Delete a comment
  async deleteComment(commentId: string, token: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`${this.baseURL}/comments/${commentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  // Toggle comment like
  async toggleCommentLike(
    commentId: string,
    token: string
  ): Promise<{ success: boolean; message: string; data: { likes: number; hasLiked: boolean } }> {
    const response = await axios.post(
      `${this.baseURL}/comments/${commentId}/like`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  }

  // Flag a comment
  async flagComment(commentId: string, reason: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${this.baseURL}/comments/${commentId}/flag`, { reason });
    return response.data;
  }
}

export default new AdvocacyService();