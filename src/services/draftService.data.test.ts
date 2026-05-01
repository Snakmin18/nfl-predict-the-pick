import type { MockDraft } from "../types/draft";
import type { Lobby } from "../types/lobby";
import type { Profile } from "../types/profile";

const {
  getAuthUserMock,
  loadDraftMock,
  loadLobbyMock,
  loadOfficialDraftMock,
  loadProfileMock,
} = vi.hoisted(() => ({
  getAuthUserMock: vi.fn(),
  loadDraftMock: vi.fn(),
  loadLobbyMock: vi.fn(),
  loadOfficialDraftMock: vi.fn(),
  loadProfileMock: vi.fn(),
}));

vi.mock("../utils/auth", () => ({
  getAuthUser: getAuthUserMock,
}));

vi.mock("../repositories/draftRepository", async () => {
  const actual = await vi.importActual<
    typeof import("../repositories/draftRepository")
  >("../repositories/draftRepository");

  return {
    ...actual,
    loadDraft: loadDraftMock,
    loadOfficialDraft: loadOfficialDraftMock,
    saveDraft: vi.fn(),
  };
});

vi.mock("../utils/lobbyStorage", () => ({
  loadLobby: loadLobbyMock,
}));

vi.mock("../utils/profileStorage", () => ({
  loadProfile: loadProfileMock,
}));

import { loadDraftPageData } from "./draftService";

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

describe("draftService page data loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads participant draft page data with auth, profile, lobby, and official draft", async () => {
    const draft = createDraft({
      lobbyId: "lobby-1",
      userId: "user-1",
    });
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
    const profile: Profile = {
      id: "user-1",
      displayName: "Jake",
      isAppAdmin: true,
      createdAt: "2026-04-01T00:00:00.000Z",
    };
    const officialDraft = createDraft({
      id: "official-1",
      isOfficialResult: true,
    });

    loadDraftMock.mockResolvedValue(draft);
    getAuthUserMock.mockResolvedValue({ id: "user-1", email: "jake@example.com" });
    loadProfileMock.mockResolvedValue(profile);
    loadLobbyMock.mockResolvedValue(lobby);
    loadOfficialDraftMock.mockResolvedValue(officialDraft);

    const result = await loadDraftPageData("draft-1");

    expect(loadDraftMock).toHaveBeenCalledWith("draft-1");
    expect(loadProfileMock).toHaveBeenCalledWith("user-1");
    expect(loadLobbyMock).toHaveBeenCalledWith("lobby-1");
    expect(loadOfficialDraftMock).toHaveBeenCalledWith(2026);
    expect(result).toEqual({
      currentUserId: "user-1",
      draft,
      isCurrentUserAppAdmin: true,
      lobby,
      officialDraft,
    });
  });

  it("skips dependent lookups when there is no authenticated user", async () => {
    const draft = createDraft({
      lobbyId: "lobby-1",
    });
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
    const officialDraft = createDraft({
      id: "official-1",
      isOfficialResult: true,
    });

    loadDraftMock.mockResolvedValue(draft);
    getAuthUserMock.mockResolvedValue(null);
    loadLobbyMock.mockResolvedValue(lobby);
    loadOfficialDraftMock.mockResolvedValue(officialDraft);

    const result = await loadDraftPageData("draft-1");

    expect(loadProfileMock).not.toHaveBeenCalled();
    expect(result.currentUserId).toBeNull();
    expect(result.isCurrentUserAppAdmin).toBe(false);
    expect(result.lobby).toBe(lobby);
    expect(result.officialDraft).toBe(officialDraft);
  });

  it("does not load lobby or official draft for an official result draft", async () => {
    const officialDraft = createDraft({
      id: "official-1",
      isOfficialResult: true,
      lobbyId: undefined,
    });

    loadDraftMock.mockResolvedValue(officialDraft);
    getAuthUserMock.mockResolvedValue({ id: "user-1" });
    loadProfileMock.mockResolvedValue(null);

    const result = await loadDraftPageData("official-1");

    expect(loadLobbyMock).not.toHaveBeenCalled();
    expect(loadOfficialDraftMock).not.toHaveBeenCalled();
    expect(result.lobby).toBeNull();
    expect(result.officialDraft).toBeNull();
  });
});
