import { act, renderHook, waitFor } from "@testing-library/react";
import type { MockDraft } from "../types/draft";
import type { Lobby } from "../types/lobby";
import type { Prospect } from "../types/prospect";

const {
  isPastDraftSubmissionDeadlineMock,
  loadDraftPageDataMock,
  loadOfficialDraftForYearMock,
  saveDraftMock,
  submitParticipantDraftMock,
} = vi.hoisted(() => ({
  isPastDraftSubmissionDeadlineMock: vi.fn(),
  loadDraftPageDataMock: vi.fn(),
  loadOfficialDraftForYearMock: vi.fn(),
  saveDraftMock: vi.fn(),
  submitParticipantDraftMock: vi.fn(),
}));

vi.mock("../utils/deadlines", () => ({
  isPastDraftSubmissionDeadline: isPastDraftSubmissionDeadlineMock,
}));

vi.mock("../repositories/draftRepository", () => ({
  saveDraft: saveDraftMock,
}));

vi.mock("../lib/supabase/client", () => ({
  supabase: null,
}));

vi.mock("../services/draftService", async () => {
  const actual = await vi.importActual<typeof import("../services/draftService")>(
    "../services/draftService",
  );

  return {
    ...actual,
    loadDraftPageData: loadDraftPageDataMock,
    loadOfficialDraftForYear: loadOfficialDraftForYearMock,
    submitParticipantDraft: submitParticipantDraftMock,
  };
});

import { useDraftPage } from "./useDraftPage";

function createProspect(id: string, name: string): Prospect {
  return {
    id,
    name,
    school: "Test U",
    ranking: 1,
    matchKey: name.toLowerCase().replace(/\s+/g, "-"),
  };
}

function createDraft(overrides: Partial<MockDraft> = {}): MockDraft {
  return {
    id: "draft-1",
    title: "Jake's Draft",
    year: 2026,
    createdAt: "2026-04-01T00:00:00.000Z",
    lobbyId: "lobby-1",
    participantId: "participant-1",
    userId: "user-1",
    roundLimit: 1,
    picks: [
      {
        pickNumber: 1,
        teamId: "CHI",
        startingTeamId: "CHI",
        predictedPlayer: null,
      },
      {
        pickNumber: 2,
        teamId: "WAS",
        startingTeamId: "WAS",
        predictedPlayer: null,
      },
    ],
    ...overrides,
  };
}

describe("useDraftPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPastDraftSubmissionDeadlineMock.mockReturnValue(false);
    loadOfficialDraftForYearMock.mockResolvedValue(null);
    submitParticipantDraftMock.mockImplementation(async (draft: MockDraft) => draft);
  });

  it("loads initial page data and exposes derived navigation state", async () => {
    const draft = createDraft();
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

    loadDraftPageDataMock.mockResolvedValue({
      currentUserId: "user-1",
      draft,
      isCurrentUserAppAdmin: false,
      lobby,
      officialDraft: null,
    });

    const { result } = renderHook(() =>
      useDraftPage({ draftId: "draft-1", viewerParticipantId: "participant-9" }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(loadDraftPageDataMock).toHaveBeenCalledWith("draft-1");
    expect(result.current.draft).toEqual(draft);
    expect(result.current.backTo).toBe("/lobby/lobby-1/participant-9");
    expect(result.current.canSubmitDraft).toBe(false);
    expect(result.current.completedPredictionPicks).toBe(0);
  });

  it("drafts a prospect into the selected pick and advances to the next empty pick", async () => {
    const draft = createDraft();
    const prospect = createProspect("prospect-1", "Caleb Test");

    loadDraftPageDataMock.mockResolvedValue({
      currentUserId: "user-1",
      draft,
      isCurrentUserAppAdmin: false,
      lobby: null,
      officialDraft: null,
    });

    const { result } = renderHook(() => useDraftPage({ draftId: "draft-1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleDraftProspect(prospect);
    });

    expect(result.current.draft?.picks[0].predictedPlayer).toEqual(prospect);
    expect(result.current.selectedPickNumber).toBe(2);
    expect(result.current.completedPredictionPicks).toBe(1);
  });

  it("saves an editable participant draft", async () => {
    const draft = createDraft({
      picks: [
        {
          pickNumber: 1,
          teamId: "CHI",
          startingTeamId: "CHI",
          predictedPlayer: createProspect("prospect-1", "Caleb Test"),
        },
      ],
    });

    loadDraftPageDataMock.mockResolvedValue({
      currentUserId: "user-1",
      draft,
      isCurrentUserAppAdmin: false,
      lobby: null,
      officialDraft: null,
    });

    const { result } = renderHook(() => useDraftPage({ draftId: "draft-1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleSaveDraft();
    });

    expect(saveDraftMock).toHaveBeenCalledWith(draft);
    expect(result.current.saveStatus).toBe("Saved.");
  });

  it("submits an editable participant draft after confirmation", async () => {
    const draft = createDraft({
      picks: [
        {
          pickNumber: 1,
          teamId: "CHI",
          startingTeamId: "CHI",
          predictedPlayer: createProspect("prospect-1", "Caleb Test"),
        },
      ],
    });
    const submittedDraft = {
      ...draft,
      submittedAt: "2026-04-25T00:00:00.000Z",
    };

    loadDraftPageDataMock.mockResolvedValue({
      currentUserId: "user-1",
      draft,
      isCurrentUserAppAdmin: false,
      lobby: null,
      officialDraft: null,
    });
    submitParticipantDraftMock.mockResolvedValue(submittedDraft);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    const { result } = renderHook(() => useDraftPage({ draftId: "draft-1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handleSubmitDraft();
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(submitParticipantDraftMock).toHaveBeenCalledWith(draft);
    expect(result.current.draft?.submittedAt).toBe("2026-04-25T00:00:00.000Z");
    expect(result.current.saveStatus).toBe("Submitted.");

    confirmSpy.mockRestore();
  });

  it("surfaces a load error when initial data fetch fails", async () => {
    loadDraftPageDataMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useDraftPage({ draftId: "draft-1" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.loadError).toBe("Unable to load draft.");
    expect(result.current.draft).toBeNull();
  });
});
