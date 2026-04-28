import type { MockDraft } from "../types/draft";
import type { Lobby } from "../types/lobby";
import { getDraftRoundLimit, getRoundForPick } from "../utils/draft";
import { getAuthUser } from "../utils/auth";
import { loadLobby } from "../utils/lobbyStorage";
import { loadProfile } from "../utils/profileStorage";
import {
  loadDraft,
  loadOfficialDraft,
  saveDraft,
} from "../repositories/draftRepository";

type DraftAccessContext = {
  currentUserId: string | null;
  draft: MockDraft | null;
  isCurrentUserAppAdmin: boolean;
  isSubmissionDeadlinePassed: boolean;
  lobby: Lobby | null;
};

export type DraftPageData = {
  currentUserId: string | null;
  draft: MockDraft | null;
  isCurrentUserAppAdmin: boolean;
  lobby: Lobby | null;
  officialDraft: MockDraft | null;
};

export async function loadDraftPageData(draftId: string): Promise<DraftPageData> {
  const [draft, authUser] = await Promise.all([loadDraft(draftId), getAuthUser()]);
  const currentUserId = authUser?.id ?? null;

  const [profile, lobby, officialDraft] = await Promise.all([
    authUser ? loadProfile(authUser.id) : Promise.resolve(null),
    draft?.lobbyId ? loadLobby(draft.lobbyId) : Promise.resolve(null),
    draft && !draft.isOfficialResult
      ? loadOfficialDraft(draft.year)
      : Promise.resolve(null),
  ]);

  return {
    currentUserId,
    draft,
    isCurrentUserAppAdmin: Boolean(profile?.isAppAdmin),
    lobby,
    officialDraft,
  };
}

export function isParticipantLobbyDraft(draft: MockDraft | null) {
  return Boolean(draft?.lobbyId && !draft.isOfficialResult);
}

export function canEditParticipantDraft({
  currentUserId,
  draft,
}: Pick<DraftAccessContext, "currentUserId" | "draft">) {
  return Boolean(
    draft &&
      isParticipantLobbyDraft(draft) &&
      currentUserId &&
      draft.userId === currentUserId,
  );
}

export function canEditOfficialDraft({
  draft,
  isCurrentUserAppAdmin,
}: Pick<DraftAccessContext, "draft" | "isCurrentUserAppAdmin">) {
  return Boolean(draft?.isOfficialResult && isCurrentUserAppAdmin);
}

export function isDraftLocked(context: DraftAccessContext) {
  return (
    (isParticipantLobbyDraft(context.draft) &&
      (!canEditParticipantDraft(context) ||
        Boolean(context.draft?.submittedAt) ||
        context.isSubmissionDeadlinePassed)) ||
    (Boolean(context.draft?.isOfficialResult) && !canEditOfficialDraft(context))
  );
}

export function getPredictionPicks(draft: MockDraft | null) {
  if (!draft) return [];

  return draft.picks.filter(
    (pick) => getRoundForPick(pick.pickNumber) <= getDraftRoundLimit(draft),
  );
}

export function countCompletedPredictionPicks(draft: MockDraft | null) {
  return getPredictionPicks(draft).filter((pick) => pick.predictedPlayer).length;
}

export function canSubmitParticipantDraft(
  context: DraftAccessContext,
  completedPredictionPicks: number,
) {
  const predictionPicks = getPredictionPicks(context.draft);

  return (
    canEditParticipantDraft(context) &&
    !context.draft?.submittedAt &&
    !context.isSubmissionDeadlinePassed &&
    predictionPicks.length > 0 &&
    completedPredictionPicks === predictionPicks.length
  );
}

export function getSubmitDraftMessage(
  context: DraftAccessContext,
  completedPredictionPicks: number,
) {
  const predictionPicks = getPredictionPicks(context.draft);

  if (!isParticipantLobbyDraft(context.draft)) {
    return "";
  }

  if (!canEditParticipantDraft(context)) {
    return "This draft can only be edited or submitted by its owner.";
  }

  if (context.draft?.submittedAt) {
    return "This draft has already been submitted.";
  }

  if (context.isSubmissionDeadlinePassed) {
    return "Submissions are closed for this draft.";
  }

  if (completedPredictionPicks < predictionPicks.length) {
    return `Finish all picks before submitting. ${completedPredictionPicks}/${predictionPicks.length} completed.`;
  }

  return "Submitting will lock your draft and prevent further edits.";
}

export function getOfficialDraftMessage(
  draft: MockDraft | null,
  isCurrentUserAppAdmin: boolean,
) {
  if (!draft?.isOfficialResult) {
    return "";
  }

  return isCurrentUserAppAdmin
    ? "Save after entering official picks to update scoring."
    : "Only app admins can edit the official draft.";
}

export async function submitParticipantDraft(draft: MockDraft) {
  const submittedDraft = {
    ...draft,
    submittedAt: new Date().toISOString(),
  };

  await saveDraft(submittedDraft);
  return submittedDraft;
}

export async function loadOfficialDraftForYear(year: number) {
  return loadOfficialDraft(year);
}
