export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address || "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDID(did: string): string {
  if (!did || did.length < 24) return did || "";
  return `${did.slice(0, 18)}...${did.slice(-6)}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp > 1e11 ? timestamp : timestamp * 1000);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
