import { act, renderHook, waitFor } from "@testing-library/react";
import type { MockDraft } from "../types/draft";
import type { Lobby, Participant } from "../types/lobby";

const {
  countSubmittedDraftsMock,
  createLobbyParticipantDraftMock,
  getLobbyScoresMock,
  getParticipantDraftMock,
  loadLobbyPageDataMock,
  loadOfficialLobbyDraftMock,
} = vi.hoisted(() => ({
  countSubmittedDraftsMock: vi.fn(),
  createLobbyParticipantDraftMock: vi.fn(),
  getLobbyScoresMock: vi.fn(),
  getParticipantDraftMock: vi.fn(),
  loadLobbyPageDataMock: vi.fn(),
  loadOfficialLobbyDraftMock: vi.fn(),
}));

vi.mock("../lib/supabase/client", () => ({
  supabase: null,
}));

vi.mock("../services/lobbyService", () => ({
  countSubmittedDrafts: countSubmittedDraftsMock,
  createLobbyParticipantDraft: createLobbyParticipantDraftMock,
  getLobbyScores: getLobbyScoresMock,
  getParticipantDraft: getParticipantDraftMock,
  loadLobbyPageData: loadLobbyPageDataMock,
  loadOfficialLobbyDraft: loadOfficialLobbyDraftMock,
}));

import { useLobbyPage } from "./useLobbyPage";

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

describe("useLobbyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads lobby state and exposes derived values", async () => {
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
    const participantDraft = createDraft({
      id: "draft-1",
      participantId: "participant-1",
    });
    const officialDraft = createDraft({
      id: "official-1",
      isOfficialResult: true,
    });
    const scores = [{ draftId: "draft-1", points: 100 }];

    loadLobbyPageDataMock.mockResolvedValue({
      lobby,
      participant,
      participants: [participant],
      drafts: [participantDraft],
      officialDraft,
    });
    getParticipantDraftMock.mockReturnValue(participantDraft);
    getLobbyScoresMock.mockReturnValue(scores);
    countSubmittedDraftsMock.mockReturnValue(1);

    const { result } = renderHook(() =>
      useLobbyPage({ lobbyId: "lobby-1", participantId: "participant-1" }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(loadLobbyPageDataMock).toHaveBeenCalledWith("lobby-1", "participant-1");
    expect(getParticipantDraftMock).toHaveBeenCalledWith(
      [participantDraft],
      "participant-1",
    );
    expect(result.current.lobby).toEqual(lobby);
    expect(result.current.participantDraft).toBe(participantDraft);
    expect(result.current.scores).toEqual(scores);
    expect(result.current.submittedDraftCount).toBe(1);
    expect(result.current.participantDraftCount).toBe(1);
  });

  it("creates a participant draft when lobby and participant are loaded", async () => {
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
    const newDraft = createDraft({ id: "created-draft" });

    loadLobbyPageDataMock.mockResolvedValue({
      lobby,
      participant,
      participants: [participant],
      drafts: [],
      officialDraft: null,
    });
    getParticipantDraftMock.mockReturnValue(undefined);
    getLobbyScoresMock.mockReturnValue([]);
    countSubmittedDraftsMock.mockReturnValue(0);
    createLobbyParticipantDraftMock.mockResolvedValue(newDraft);

    const { result } = renderHook(() =>
      useLobbyPage({ lobbyId: "lobby-1", participantId: "participant-1" }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created: MockDraft | null = null;
    await act(async () => {
      created = await result.current.handleCreateDraft();
    });

    expect(createLobbyParticipantDraftMock).toHaveBeenCalledWith(lobby, participant);
    expect(created).toBe(newDraft);
  });

  it("returns null from handleCreateDraft when required data is missing", async () => {
    loadLobbyPageDataMock.mockResolvedValue({
      lobby: null,
      participant: null,
      participants: [],
      drafts: [],
      officialDraft: null,
    });
    getParticipantDraftMock.mockReturnValue(undefined);
    getLobbyScoresMock.mockReturnValue([]);
    countSubmittedDraftsMock.mockReturnValue(0);

    const { result } = renderHook(() =>
      useLobbyPage({ lobbyId: "lobby-1", participantId: "participant-1" }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(result.current.handleCreateDraft()).resolves.toBeNull();
    expect(createLobbyParticipantDraftMock).not.toHaveBeenCalled();
  });

  it("surfaces a load error when lobby page data fails", async () => {
    loadLobbyPageDataMock.mockRejectedValue(new Error("boom"));
    getParticipantDraftMock.mockReturnValue(undefined);
    getLobbyScoresMock.mockReturnValue([]);
    countSubmittedDraftsMock.mockReturnValue(0);

    const { result } = renderHook(() =>
      useLobbyPage({ lobbyId: "lobby-1", participantId: "participant-1" }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.loadError).toBe("Unable to load room.");
    expect(result.current.lobby).toBeNull();
  });
});
