import type { MockDraft } from "../types/draft";
import type { Prospect } from "../types/prospect";

export function getDraftedProspectIds(draft: MockDraft): Set<string> {
  const ids = new Set<string>();

  for (const pick of draft.picks) {
    if (pick.predictedPlayer?.id) {
      ids.add(pick.predictedPlayer.id);
    }
  }

  return ids;
}

export function getTopAvailableProspects(
  allProspects: Prospect[],
  draft: MockDraft,
  limit = 15,
) {
  const draftedIds = getDraftedProspectIds(draft);

  return allProspects.filter((p) => !draftedIds.has(p.id)).slice(0, limit);
}
