import { buildDraft } from "../utils/draft";
import { loadDraftOrder } from "../utils/draftOrderStorage";
import { getCurrentUserId } from "../utils/auth";
import { loadLobby } from "../utils/lobbyStorage";
import {
  getParticipantsByLobby,
  loadParticipant,
} from "../utils/participantStorage";
import { scoreLobbyDrafts } from "../utils/scoring";
import {
  getDraftsByLobby,
  loadOfficialDraft,
  saveDraft,
} from "../repositories/draftRepository";
import type { MockDraft } from "../types/draft";
import type { Lobby, Participant } from "../types/lobby";

export type LobbyPageData = {
  lobby: Lobby | null;
  participant: Participant | null;
  participants: Participant[];
  drafts: MockDraft[];
  officialDraft: MockDraft | null;
};

export async function loadLobbyPageData(
  lobbyId: string,
  participantId: string,
): Promise<LobbyPageData> {
  const [lobby, participant, drafts] = await Promise.all([
    loadLobby(lobbyId),
    participantId ? loadParticipant(participantId) : Promise.resolve(null),
    getDraftsByLobby(lobbyId),
  ]);

  const [participants, officialDraft] = await Promise.all([
    lobby ? getParticipantsByLobby(lobby.id) : Promise.resolve([]),
    lobby ? loadOfficialDraft(lobby.year) : Promise.resolve(null),
  ]);

  return {
    lobby,
    participant,
    participants,
    drafts: drafts.filter((draft) => !draft.isOfficialResult),
    officialDraft,
  };
}

export async function loadOfficialLobbyDraft(year: number) {
  return loadOfficialDraft(year);
}

export function getParticipantDraft(
  drafts: MockDraft[],
  participantId: string | undefined,
) {
  return drafts.find((draft) => draft.participantId === participantId);
}

export function getLobbyScores(
  drafts: MockDraft[],
  participants: Participant[],
  officialDraft: MockDraft | null,
) {
  return scoreLobbyDrafts(drafts, participants, officialDraft ?? undefined);
}

export function countSubmittedDrafts(drafts: MockDraft[]) {
  return drafts.filter((draft) => draft.submittedAt).length;
}

export async function createLobbyParticipantDraft(
  lobby: Lobby,
  participant: Participant,
) {
  const draftOrder = loadDraftOrder();
  const title = `${participant.name}'s Draft`;
  const userId = await getCurrentUserId();
  const draft = buildDraft(title, draftOrder, {
    lobbyId: lobby.id,
    participantId: participant.id,
    userId,
    year: lobby.year,
    roundLimit: lobby.roundLimit,
  });

  await saveDraft(draft);
  return draft;
}
