import { format, formatDistanceToNow } from "date-fns";

export function formatTime(ts) {
  if (!ts) return "—";
  try { return format(new Date(ts), "HH:mm:ss"); } catch { return ts; }
}

export function formatDateTime(ts) {
  if (!ts) return "—";
  try { return format(new Date(ts), "MMM d, HH:mm"); } catch { return ts; }
}

export function timeAgo(ts) {
  if (!ts) return "—";
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ts; }
}

export function formatDate(ts) {
  if (!ts) return "—";
  try { return format(new Date(ts), "yyyy-MM-dd"); } catch { return ts; }
}
