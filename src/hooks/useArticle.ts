// Hook for single article
import { useState, useEffect} from 'react';
import advocacyService, { IAdvocacyArticle } from '../services/Advocacy';


export const useArticle = (slug: string) => {
  const [article, setArticle] = useState<IAdvocacyArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await advocacyService.getArticleBySlug(slug);
        setArticle(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch article');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  return { article, loading, error };
};