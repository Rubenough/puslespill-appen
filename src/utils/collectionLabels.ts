import i18n from "../lib/i18n";
import type { ItemType } from "./collections";

// Oversatte etiketter for gjenstandstyper, vanskelighetsgrad og metadata-enheter.
// DB lagrer type/difficulty som norske verdier; her mapper vi verdien til aktivt språk.

export function itemTypeLabel(type: ItemType): string {
  return i18n.t(`collections.type.${type}`);
}

export function itemTypeLabelPlural(type: ItemType): string {
  return i18n.t(`collections.typePlural.${type}`);
}

export function difficultyLabel(value: string): string {
  return i18n.t(`collections.difficulty.${value}`, { defaultValue: value });
}

export function piecesLabel(count: number): string {
  return i18n.t("collections.pieces", { count });
}

export function playersLabel(count: number): string {
  return i18n.t("collections.players", { count });
}
