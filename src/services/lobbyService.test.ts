import type { MockDraft } from "../types/draft";
import type { Lobby, Participant } from "../types/lobby";

const {
  buildDraftMock,
  getDraftsByLobbyMock,
  getParticipantsByLobbyMock,
  loadLobbyMock,
  loadOfficialDraftMock,
  loadParticipantMock,
  loadDraftOrderMock,
  getCurrentUserIdMock,
  scoreLobbyDraftsMock,
  saveDraftMock,
} = vi.hoisted(() => ({
  buildDraftMock: vi.fn(),
  getDraftsByLobbyMock: vi.fn(),
  getParticipantsByLobbyMock: vi.fn(),
  loadLobbyMock: vi.fn(),
  loadOfficialDraftMock: vi.fn(),
  loadParticipantMock: vi.fn(),
  loadDraftOrderMock: vi.fn(),
  getCurrentUserIdMock: vi.fn(),
  scoreLobbyDraftsMock: vi.fn(),
  saveDraftMock: vi.fn(),
}));

vi.mock("../utils/draft", async () => {
  const actual = await vi.importActual<typeof import("../utils/draft")>(
    "../utils/draft",
  );

  return {
    ...actual,
    buildDraft: buildDraftMock,
  };
});

vi.mock("../utils/draftOrderStorage", () => ({
  loadDraftOrder: loadDraftOrderMock,
}));

vi.mock("../utils/auth", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

vi.mock("../utils/scoring", () => ({
  scoreLobbyDrafts: scoreLobbyDraftsMock,
}));

vi.mock("../repositories/draftRepository", () => ({
  getDraftsByLobby: getDraftsByLobbyMock,
  loadOfficialDraft: loadOfficialDraftMock,
  saveDraft: saveDraftMock,
}));

vi.mock("../utils/lobbyStorage", () => ({
  loadLobby: loadLobbyMock,
}));

vi.mock("../utils/participantStorage", () => ({
  getParticipantsByLobby: getParticipantsByLobbyMock,
  loadParticipant: loadParticipantMock,
}));

import {
  countSubmittedDrafts,
  createLobbyParticipantDraft,
  getLobbyScores,
  getParticipantDraft,
  loadLobbyPageData,
  loadOfficialLobbyDraft,
} from "./lobbyService";

function createDraft(overrides: Partial<MockDraft> = {}): MockDraft {
  return {
    id: "draft-1",
    title: "Draft",
    year: 2026,
    createdAt: "2026-04-01T00:00:00.000Z",
    picks: [],
    ...overrides,
  };
}

describe("lobbyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads lobby page data and filters out official drafts from room drafts", async () => {
    const lobby: Lobby = {
      id: "lobby-1",
      code: "ROOM1",
      name: "Draft Room",
      hostParticipantId: "participant-host",
      hostUserId: "host-user",
      year: 2026,
      roundLimit: 1,
      createdAt: "2026-04-01T00:00:00.000Z",
      status: "waiting",
    };
    const participant: Participant = {
      id: "participant-1",
      lobbyId: "lobby-1",
      userId: "user-1",
      name: "Jake",
      role: "player",
      joinedAt: "2026-04-01T00:00:00.000Z",
    };
    const roomDraft = createDraft({
      id: "room-draft",
      lobbyId: "lobby-1",
      participantId: "participant-1",
    });
    const officialDraft = createDraft({
      id: "official-draft",
      isOfficialResult: true,
    });

    loadLobbyMock.mockResolvedValue(lobby);
    loadParticipantMock.mockResolvedValue(participant);
    getDraftsByLobbyMock.mockResolvedValue([roomDraft, officialDraft]);
    getParticipantsByLobbyMock.mockResolvedValue([participant]);
    loadOfficialDraftMock.mockResolvedValue(officialDraft);

    const result = await loadLobbyPageData("lobby-1", "participant-1");

    expect(loadLobbyMock).toHaveBeenCalledWith("lobby-1");
    expect(loadParticipantMock).toHaveBeenCalledWith("participant-1");
    expect(getDraftsByLobbyMock).toHaveBeenCalledWith("lobby-1");
    expect(getParticipantsByLobbyMock).toHaveBeenCalledWith("lobby-1");
    expect(loadOfficialDraftMock).toHaveBeenCalledWith(2026);
    expect(result).toEqual({
      lobby,
      participant,
      participants: [participant],
      drafts: [roomDraft],
      officialDraft,
    });
  });

  it("returns empty participant data safely when no participant id is provided", async () => {
    const lobby: Lobby = {
      id: "lobby-1",
      code: "ROOM1",
      name: "Draft Room",
      hostParticipantId: "participant-host",
      hostUserId: "host-user",
      year: 2026,
      roundLimit: 1,
      createdAt: "2026-04-01T00:00:00.000Z",
      status: "waiting",
    };

    loadLobbyMock.mockResolvedValue(lobby);
    getDraftsByLobbyMock.mockResolvedValue([]);
    getParticipantsByLobbyMock.mockResolvedValue([]);
    loadOfficialDraftMock.mockResolvedValue(null);

    const result = await loadLobbyPageData("lobby-1", "");

    expect(loadParticipantMock).not.toHaveBeenCalled();
    expect(result.participant).toBeNull();
    expect(result.participants).toEqual([]);
    expect(result.officialDraft).toBeNull();
  });

  it("finds the participant draft by participant id", () => {
    const draftA = createDraft({ id: "a", participantId: "participant-a" });
    const draftB = createDraft({ id: "b", participantId: "participant-b" });

    expect(getParticipantDraft([draftA, draftB], "participant-b")).toBe(draftB);
    expect(getParticipantDraft([draftA, draftB], "missing")).toBeUndefined();
  });

  it("counts only submitted drafts", () => {
    const openDraft = createDraft({ id: "open" });
    const submittedDraft = createDraft({
      id: "submitted",
      submittedAt: "2026-04-01T01:00:00.000Z",
    });

    expect(countSubmittedDrafts([openDraft, submittedDraft])).toBe(1);
  });

  it("delegates lobby scoring to the scoring utility", () => {
    const drafts = [createDraft()];
    const participants: Participant[] = [
      {
        id: "participant-1",
        lobbyId: "lobby-1",
        userId: "user-1",
        name: "Jake",
        role: "player",
        joinedAt: "2026-04-01T00:00:00.000Z",
      },
    ];
    const officialDraft = createDraft({ id: "official", isOfficialResult: true });

    scoreLobbyDraftsMock.mockReturnValue([{ draftId: "draft-1" }]);

    expect(getLobbyScores(drafts, participants, officialDraft)).toEqual([
      { draftId: "draft-1" },
    ]);
    expect(scoreLobbyDraftsMock).toHaveBeenCalledWith(
      drafts,
      participants,
      officialDraft,
    );
  });

  it("loads the official lobby draft for a year", async () => {
    const officialDraft = createDraft({ id: "official", isOfficialResult: true });
    loadOfficialDraftMock.mockResolvedValue(officialDraft);

    await expect(loadOfficialLobbyDraft(2026)).resolves.toBe(officialDraft);
    expect(loadOfficialDraftMock).toHaveBeenCalledWith(2026);
  });

  it("builds and saves a participant draft with the current user", async () => {
    const lobby: Lobby = {
      id: "lobby-1",
      code: "ROOM1",
      name: "Draft Room",
      hostParticipantId: "participant-host",
      hostUserId: "host-user",
      year: 2027,
      roundLimit: 2,
      createdAt: "2026-04-01T00:00:00.000Z",
      status: "waiting",
    };
    const participant: Participant = {
      id: "participant-1",
      lobbyId: "lobby-1",
      userId: "user-1",
      name: "Jake",
      role: "player",
      joinedAt: "2026-04-01T00:00:00.000Z",
    };
    const draftOrder = [{ pickNumber: 1, teamId: "CHI" }];
    const builtDraft = createDraft({ id: "built-draft", title: "Jake's Draft" });

    loadDraftOrderMock.mockReturnValue(draftOrder);
    getCurrentUserIdMock.mockResolvedValue("user-1");
    buildDraftMock.mockReturnValue(builtDraft);

    const result = await createLobbyParticipantDraft(lobby, participant);

    expect(loadDraftOrderMock).toHaveBeenCalled();
    expect(getCurrentUserIdMock).toHaveBeenCalled();
    expect(buildDraftMock).toHaveBeenCalledWith("Jake's Draft", draftOrder, {
      lobbyId: "lobby-1",
      participantId: "participant-1",
      userId: "user-1",
      year: 2027,
      roundLimit: 2,
    });
    expect(saveDraftMock).toHaveBeenCalledWith(builtDraft);
    expect(result).toBe(builtDraft);
  });
});
