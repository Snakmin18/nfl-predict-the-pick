import type { DraftOrderItem } from "../types/draft";
import { draftOrder2026 } from "../data/draftOrder";

const STORAGE_KEY = "draft-order:2026";

export function loadDraftOrder(): DraftOrderItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return draftOrder2026;
  }

  try {
    return JSON.parse(raw) as DraftOrderItem[];
  } catch {
    return draftOrder2026;
  }
}

export function saveDraftOrder(order: DraftOrderItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export function resetDraftOrder() {
  localStorage.removeItem(STORAGE_KEY);
}
