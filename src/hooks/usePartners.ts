import { useState, useCallback } from "react";
import {
  getActivePartnersService,
  getPartnerByIdService,
  Partner,
} from "../services/partner";

export const usePartners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: any) => {
    setError(err?.response?.data?.message || "Something went wrong");
  };

  // ==================== PUBLIC ====================

  /**
   * Fetch all active partners (optional filters)
   */
  const fetchActivePartners = useCallback(
    async (filters?: { partnerType?: "individual" | "business"; profession?: string }) => {
      setLoading(true);
      try {
        const data = await getActivePartnersService(filters);
        setPartners(data);
        setError(null);
      } catch (err) {
        handleError(err);
        setError("Failed to load partners");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Fetch single partner by ID
   */
  const fetchPartnerById = useCallback(async (partnerId: string) => {
    setLoading(true);
    try {
      const data = await getPartnerByIdService(partnerId);
      setPartner(data);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    partners,
    partner,
    loading,
    error,
    fetchActivePartners,
    fetchPartnerById,
  };
};
