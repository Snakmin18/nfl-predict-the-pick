import type { MockDraft } from "../types/draft";

const DRAFT_PREFIX = "draft:";

export function saveDraft(draft: MockDraft) {
  localStorage.setItem(`${DRAFT_PREFIX}${draft.id}`, JSON.stringify(draft));
}

export function loadDraft(draftId: string): MockDraft | null {
  const raw = localStorage.getItem(`${DRAFT_PREFIX}${draftId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as MockDraft;
  } catch {
    return null;
  }
}

export function getAllDrafts(): MockDraft[] {
  const drafts: MockDraft[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(DRAFT_PREFIX)) continue;

    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      drafts.push(JSON.parse(raw) as MockDraft);
    } catch {
      // skip bad data
    }
  }

  return drafts.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
