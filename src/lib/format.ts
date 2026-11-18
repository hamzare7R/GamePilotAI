const countFormatter = new Intl.NumberFormat("en-US");

export function formatCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? countFormatter.format(value) : "—";
}

export function formatBytes(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "—";
  if (value === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** exponent;
  return `${amount.toFixed(exponent === 0 || amount >= 10 ? 0 : 1)} ${units[exponent]}`;
}

export function formatRelativeTime(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown";

  const diffMs = timestamp - Date.now();
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return formatter.format(days, "day");

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
