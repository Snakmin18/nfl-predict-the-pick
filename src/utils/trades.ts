import type { DraftPick, MockDraft } from "../types/draft";

export type PendingTrade = {
  teamAId: string;
  teamBId: string;
  teamAPickNumbers: number[];
  teamBPickNumbers: number[];
};

type TradeAsset = {
  pickNumber: number;
  newOwnerTeamId: string;
};

function preserveOriginalOwner(
  pick: DraftPick,
  newOwnerTeamId: string,
): DraftPick {
  const originalOwnerTeamId = pick.originalOwnerTeamId ?? pick.teamId;
  const startingTeamId = pick.startingTeamId ?? pick.teamId;

  return {
    ...pick,
    teamId: newOwnerTeamId,
    startingTeamId,
    originalOwnerTeamId,
  };
}

export function buildTradeAssets(trade: PendingTrade): TradeAsset[] {
  return [
    ...trade.teamAPickNumbers.map((pickNumber) => ({
      pickNumber,
      newOwnerTeamId: trade.teamBId,
    })),
    ...trade.teamBPickNumbers.map((pickNumber) => ({
      pickNumber,
      newOwnerTeamId: trade.teamAId,
    })),
  ];
}

export function applyPickTrade(
  draft: MockDraft,
  trade: PendingTrade,
): MockDraft {
  const assets = buildTradeAssets(trade);
  const updatesByPickNumber = new Map<number, string>();

  for (const asset of assets) {
    updatesByPickNumber.set(asset.pickNumber, asset.newOwnerTeamId);
  }

  return {
    ...draft,
    picks: draft.picks.map((pick) => {
      const newOwnerTeamId = updatesByPickNumber.get(pick.pickNumber);

      if (!newOwnerTeamId || newOwnerTeamId === pick.teamId) {
        return pick;
      }

      return preserveOriginalOwner(pick, newOwnerTeamId);
    }),
  };
}

export function getCurrentOwnerPickNumbers(
  draft: MockDraft,
  teamId: string,
): number[] {
  return draft.picks
    .filter((pick) => pick.teamId === teamId)
    .map((pick) => pick.pickNumber)
    .sort((a, b) => a - b);
}
