// Format a saved timestamp for display while preserving invalid or missing-value fallbacks.
export function formatDate(value?: string | null) {
  if (!value) return "Not provided";

  // Parse the timestamp before checking whether it can be formatted.
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}
