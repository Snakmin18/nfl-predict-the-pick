import type { DraftOrderItem, MockDraft } from "../types/draft";
import type { Prospect } from "../types/prospect";

const ROUND_END_PICK_NUMBERS = [32, 64, 100, 140, 181, 216, 257];

export const MAX_DRAFT_ROUNDS = ROUND_END_PICK_NUMBERS.length;

export function getRoundForPick(pickNumber: number) {
  const roundIndex = ROUND_END_PICK_NUMBERS.findIndex(
    (roundEndPickNumber) => pickNumber <= roundEndPickNumber,
  );

  return roundIndex === -1 ? MAX_DRAFT_ROUNDS : roundIndex + 1;
}

export function getDraftRoundLimit(draft: MockDraft) {
  return draft.roundLimit ?? MAX_DRAFT_ROUNDS;
}

export function isPickInPredictionRange(draft: MockDraft, pickNumber: number) {
  return getRoundForPick(pickNumber) <= getDraftRoundLimit(draft);
}

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
  limit?: number,
) {
  const draftedIds = getDraftedProspectIds(draft);
  const availableProspects = allProspects.filter((p) => !draftedIds.has(p.id));

  return typeof limit === "number"
    ? availableProspects.slice(0, limit)
    : availableProspects;
}

export function buildDraft(
  title: string,
  draftOrder: DraftOrderItem[],
  options?: {
    lobbyId?: string;
    participantId?: string;
    userId?: string;
    isOfficialResult?: boolean;
    roundLimit?: number;
    year?: number;
  },
): MockDraft {
  return {
    id: crypto.randomUUID(),
    title,
    year: options?.year ?? 2026,
    createdAt: new Date().toISOString(),
    lobbyId: options?.lobbyId,
    participantId: options?.participantId,
    userId: options?.userId,
    isOfficialResult: options?.isOfficialResult,
    roundLimit: options?.roundLimit,
    picks: draftOrder.map((item) => ({
      pickNumber: item.pickNumber,
      teamId: item.teamId,
      startingTeamId: item.teamId,
      originalOwnerTeamId: item.originalOwnerTeamId,
      predictedPlayer: null,
    })),
  };
}
