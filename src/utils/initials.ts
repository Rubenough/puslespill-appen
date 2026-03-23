export function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// Deterministisk farge basert på navn — samme person får alltid samme farge
const AVATAR_COLORS = [
  { bg: "#A7F3D0", text: "#065F46" }, // grønn
  { bg: "#FBCFE8", text: "#9D174D" }, // rosa
  { bg: "#BFDBFE", text: "#1E40AF" }, // blå
  { bg: "#FDE68A", text: "#92400E" }, // gul
  { bg: "#CECBF6", text: "#3C3489" }, // lilla
  { bg: "#F9A8D4", text: "#831843" }, // rød
];

export function getAvatarColor(name: string | null) {
  if (!name) return AVATAR_COLORS[0];
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
