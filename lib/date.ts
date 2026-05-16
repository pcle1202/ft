export function daysSince(dateString?: string): number {
  if (!dateString) return Infinity;

  const today = new Date();
  const date = new Date(dateString);

  const diffTime = today.getTime() - date.getTime();

  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function getStatus(
  lastDate: string | undefined,
  frequencyDays: number
): "good" | "dueSoon" | "overdue" {
  const days = daysSince(lastDate);

  if (days >= frequencyDays) {
    return "overdue";
  }

  if (days >= frequencyDays * 0.8) {
    return "dueSoon";
  }

  return "good";
}

export function formatLastInteraction(dateString?: string): string {
  if (!dateString) return "Never";

  const days = daysSince(dateString);

  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";

  return `${days} days ago`;
}