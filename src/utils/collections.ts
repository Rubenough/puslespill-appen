import { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

export type ItemType = "puslespill" | "brettspill";
export type ItemStatus = "Tilgjengelig" | "Utlånt";

export const ITEM_ICONS: Record<ItemType, IoniconsName> = {
  puslespill: "extension-puzzle-outline",
  brettspill: "dice-outline",
};

export const ITEM_LABELS: Record<ItemType, string> = {
  puslespill: "Puslespill",
  brettspill: "Brettspill",
};

export const DIFFICULTY_OPTIONS = ["Lett", "Middels", "Vanskelig"] as const;

export type Item = {
  id: string;
  title: string;
  brand: string | null;
  piece_count: number | null;
  player_count: number | null;
  difficulty: string | null;
  status: ItemStatus | null;
};
