import { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

export type ItemType = "puslespill" | "brettspill";

export const ITEM_ICONS: Record<ItemType, IoniconsName> = {
  puslespill: "extension-puzzle-outline",
  brettspill: "dice-outline",
};

export const ITEM_LABELS: Record<ItemType, string> = {
  puslespill: "Puslespill",
  brettspill: "Brettspill",
};
