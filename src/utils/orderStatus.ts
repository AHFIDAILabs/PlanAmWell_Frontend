// Shared status-tone logic for order payment/delivery status badges —
// previously duplicated (and drifted, e.g. missing "cancelled"/"failed"
// handling) between OrderDetailsScreen and anywhere else that shows these
// same values. Matches the admin dashboard's tone mapping
// (Admin/admin-dashboard/app/lib/orderStatus.ts) so all surfaces agree on
// what each status means visually.
export type StatusTone = "positive" | "neutral" | "negative";

const NEGATIVE = ["cancelled", "failed"];
const POSITIVE = ["paid", "delivered", "shipped"];

export function statusTone(value?: string): StatusTone {
  const v = value?.toLowerCase();
  if (v && NEGATIVE.includes(v)) return "negative";
  if (v && POSITIVE.includes(v)) return "positive";
  return "neutral";
}
