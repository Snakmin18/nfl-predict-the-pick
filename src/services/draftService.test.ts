import type { MockDraft } from "../types/draft";
import type { Prospect } from "../types/prospect";
import {
  canEditOfficialDraft,
  canEditParticipantDraft,
  canSubmitParticipantDraft,
  getOfficialDraftMessage,
  getSubmitDraftMessage,
  isDraftLocked,
} from "./draftService";

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
    title: "Test Draft",
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
        predictedPlayer: createProspect("prospect-1", "Caleb Test"),
      },
      {
        pickNumber: 2,
        teamId: "WAS",
        predictedPlayer: createProspect("prospect-2", "Drake Teste"),
      },
    ],
    ...overrides,
  };
}

describe("draftService permissions", () => {
  it("allows the draft owner to edit a participant lobby draft", () => {
    const draft = createDraft();

    expect(
      canEditParticipantDraft({
        currentUserId: "user-1",
        draft,
      }),
    ).toBe(true);
  });

  it("prevents a non-owner from editing a participant draft", () => {
    const draft = createDraft();

    expect(
      canEditParticipantDraft({
        currentUserId: "user-2",
        draft,
      }),
    ).toBe(false);
  });

  it("allows only app admins to edit the results board", () => {
    const officialDraft = createDraft({
      id: "official-1",
      lobbyId: undefined,
      participantId: undefined,
      isOfficialResult: true,
      userId: "admin-user",
      roundLimit: 7,
    });

    expect(
      canEditOfficialDraft({
        draft: officialDraft,
        isCurrentUserAppAdmin: true,
      }),
    ).toBe(true);
    expect(
      canEditOfficialDraft({
        draft: officialDraft,
        isCurrentUserAppAdmin: false,
      }),
    ).toBe(false);
    expect(getOfficialDraftMessage(officialDraft, false)).toBe(
      "Only app admins can edit the results board.",
    );
  });

  it("locks a participant draft after it has been submitted", () => {
    const draft = createDraft({
      submittedAt: "2026-04-24T20:00:00.000Z",
    });

    expect(
      isDraftLocked({
        currentUserId: "user-1",
        draft,
        isCurrentUserAppAdmin: false,
        isSubmissionDeadlinePassed: false,
        lobby: null,
      }),
    ).toBe(true);
  });

  it("requires all prediction picks to be complete before submission", () => {
    const incompleteDraft = createDraft({
      picks: [
        {
          pickNumber: 1,
          teamId: "CHI",
          predictedPlayer: createProspect("prospect-1", "Caleb Test"),
        },
        {
          pickNumber: 2,
          teamId: "WAS",
          predictedPlayer: null,
        },
      ],
    });

    const context = {
      currentUserId: "user-1",
      draft: incompleteDraft,
      isCurrentUserAppAdmin: false,
      isSubmissionDeadlinePassed: false,
      lobby: null,
    };

    expect(canSubmitParticipantDraft(context, 1)).toBe(false);
    expect(getSubmitDraftMessage(context, 1)).toContain("1/2 completed");
  });
});
