import { useCallback, useState } from "react";
import { IAppointment } from "../types/backendType";
import { useVideoCall } from "./useVideoCall";

export function useAppointmentCallStatus() {
  const { getCallStatus } = useVideoCall();

  const [callStatusMap, setCallStatusMap] = useState<
    Record<string, { isActive: boolean; callStatus: string }>
  >({});

  const refreshCallStatus = useCallback(
    async (appointments: IAppointment[]) => {
      const updates: Record<string, { isActive: boolean; callStatus: string }> = {};
      const now = Date.now();

      const checkable = appointments.filter(appt => {
        if (!appt._id) return false;
        const diffMinutes = (new Date(appt.scheduledAt).getTime() - now) / 60000;
        return (
          appt.status === 'confirmed' &&
          diffMinutes <= 15 &&
          diffMinutes > -120
        );
      });

      console.log(`🔍 Checking status for ${checkable.length} appointments`);

      await Promise.all(
        checkable.map(async (appt) => {
          try {
            const res = await getCallStatus(appt._id!);
            
            console.log(`📞 Status for ${appt._id}:`, res.data);
            
            if (res?.success && res.data) {
              updates[appt._id!] = {
                isActive: res.data.isActive === true,
                callStatus: res.data.callStatus || 'idle',
              };
            }
          } catch (e) {
            console.warn("❌ Status check failed:", appt._id, e);
          }
        })
      );

      if (Object.keys(updates).length > 0) {
        console.log('📊 Updating call status map:', updates);
        setCallStatusMap(prev => ({ ...prev, ...updates }));
      }
    },
    [getCallStatus]
  );

  const getEffectiveStatus = useCallback(
    (appt: IAppointment): string => {
      const now = Date.now();
      const scheduledAt = new Date(appt.scheduledAt).getTime();
      const diffMinutes = (scheduledAt - now) / 60000;

      console.log(`🔍 Status check for ${appt._id}:`, {
        backendStatus: appt.status,
        diffMinutes: diffMinutes.toFixed(1),
        hasCallStatus: !!callStatusMap[appt._id!],
        callStatus: callStatusMap[appt._id!],
      });

      // 1️⃣ Terminal states
      if (['cancelled', 'rejected', 'completed'].includes(appt.status)) {
        return appt.status;
      }

      // 2️⃣ Too far in past
      if (diffMinutes <= -120) {
        return 'call-ended';
      }

      // 3️⃣ Real-time status
      const liveStatus = callStatusMap[appt._id!];
      if (liveStatus) {
        if (liveStatus.isActive) {
          return 'in-progress';
        }
        // If we checked and it's not active, but we're within 30 min of start
        if (diffMinutes < -30) {
          return 'call-ended';
        }
      }

      // 4️⃣ Confirmed within window
      if (appt.status === 'confirmed') {
        if (diffMinutes > 15) return 'confirmed';
        return 'confirmed'; // Can join
      }

      return appt.status;
    },
    [callStatusMap]
  );

  return {
    callStatusMap,
    getEffectiveStatus,
    refreshCallStatus,
  };
}