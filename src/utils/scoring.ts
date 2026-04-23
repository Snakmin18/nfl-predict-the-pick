import type { MockDraft } from "../types/draft";
import type { Participant } from "../types/lobby";
import type { Prospect } from "../types/prospect";
import { getDraftRoundLimit, getRoundForPick } from "./draft";

export type ScoredPick = {
  pickNumber: number;
  points: number;
  playerPoints: number;
  tradePoints: number;
  predictedPlayer: Prospect | null;
  officialPlayer: Prospect | null;
  officialPickNumber: number | null;
  pickDistance: number | null;
  tradePredictedSuccessfully: boolean;
};

export type DraftScore = {
  draftId: string;
  title: string;
  participantId?: string;
  participantName: string;
  points: number;
  possiblePoints: number;
  availablePoints: number;
  completedOfficialPicks: number;
  completedOfficialTrades: number;
  scoredPicks: ScoredPick[];
};

function getProspectKey(prospect: Prospect | null) {
  return prospect?.matchKey ?? null;
}

function getPointsForPickDistance(pickDistance: number | null) {
  if (pickDistance === null) return 0;
  if (pickDistance === 0) return 100;
  if (pickDistance === 1) return 75;
  if (pickDistance === 2) return 50;
  if (pickDistance === 3) return 25;
  return 0;
}

function isTradedPick(
  pick: { teamId: string; startingTeamId?: string } | undefined,
) {
  return Boolean(pick && pick.teamId !== (pick.startingTeamId ?? pick.teamId));
}

function isTradePredictedSuccessfully(
  pick: { teamId: string; startingTeamId?: string },
  officialPick: { teamId: string; startingTeamId?: string } | undefined,
) {
  const startingTeamId = pick.startingTeamId ?? pick.teamId;
  const officialStartingTeamId =
    officialPick?.startingTeamId ?? officialPick?.teamId;

  return (
    isTradedPick(pick) &&
    isTradedPick(officialPick) &&
    pick.teamId === officialPick?.teamId &&
    startingTeamId === officialStartingTeamId
  );
}

export function scoreDraft(
  draft: MockDraft,
  officialDraft: MockDraft,
  participant?: Participant,
): DraftScore {
  const roundLimit = Math.min(
    getDraftRoundLimit(draft),
    getDraftRoundLimit(officialDraft),
  );
  const officialPicksByPickNumber = new Map(
    officialDraft.picks.map((pick) => [pick.pickNumber, pick]),
  );
  const officialPicksByPlayerKey = new Map(
    officialDraft.picks
      .filter((pick) => pick.predictedPlayer)
      .map((pick) => [getProspectKey(pick.predictedPlayer), pick]),
  );

  const scoredPicks = draft.picks
    .filter((pick) => getRoundForPick(pick.pickNumber) <= roundLimit)
    .map((pick) => {
      const officialPick = officialPicksByPickNumber.get(pick.pickNumber);
      const officialPlayer = officialPick?.predictedPlayer ?? null;
      const predictedPlayerKey = getProspectKey(pick.predictedPlayer);
      const matchedOfficialPick = predictedPlayerKey
        ? officialPicksByPlayerKey.get(predictedPlayerKey)
        : undefined;
      const officialPickNumber = matchedOfficialPick?.pickNumber ?? null;
      const pickDistance =
        officialPickNumber === null
          ? null
          : Math.abs(officialPickNumber - pick.pickNumber);
      const playerPoints = getPointsForPickDistance(pickDistance);
      const tradePredictedSuccessfully = isTradePredictedSuccessfully(
        pick,
        officialPick,
      );
      const tradePoints = tradePredictedSuccessfully ? 50 : 0;

      return {
        pickNumber: pick.pickNumber,
        points: playerPoints + tradePoints,
        playerPoints,
        tradePoints,
        predictedPlayer: pick.predictedPlayer,
        officialPlayer,
        officialPickNumber,
        pickDistance,
        tradePredictedSuccessfully,
      };
    });
  const completedOfficialPicks = scoredPicks.filter((pick) => pick.officialPlayer)
    .length;
  const completedOfficialTrades = officialDraft.picks.filter(
    (pick) => getRoundForPick(pick.pickNumber) <= roundLimit && isTradedPick(pick),
  ).length;

  return {
    draftId: draft.id,
    title: draft.title,
    participantId: draft.participantId,
    participantName: participant?.name ?? draft.title,
    points: scoredPicks.reduce((total, pick) => total + pick.points, 0),
    possiblePoints: scoredPicks.length * 100 + completedOfficialTrades * 50,
    availablePoints: completedOfficialPicks * 100 + completedOfficialTrades * 50,
    completedOfficialPicks,
    completedOfficialTrades,
    scoredPicks,
  };
}

export function scoreLobbyDrafts(
  drafts: MockDraft[],
  participants: Participant[],
  officialDraft?: MockDraft,
) {
  if (!officialDraft) return [];

  const participantsById = new Map(
    participants.map((participant) => [participant.id, participant]),
  );

  return drafts
    .filter((draft) => !draft.isOfficialResult && draft.submittedAt)
    .map((draft) =>
      scoreDraft(
        draft,
        officialDraft,
        draft.participantId
          ? participantsById.get(draft.participantId)
          : undefined,
      ),
    )
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.participantName.localeCompare(b.participantName);
    });
}
