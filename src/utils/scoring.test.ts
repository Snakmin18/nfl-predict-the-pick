import type { MockDraft } from "../types/draft";
import type { Participant } from "../types/lobby";
import type { Prospect } from "../types/prospect";
import { scoreDraft, scoreLobbyDrafts } from "./scoring";

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
    roundLimit: 1,
    picks: [
      {
        pickNumber: 1,
        teamId: "CHI",
        startingTeamId: "CHI",
        predictedPlayer: createProspect("p1", "Player One"),
      },
      {
        pickNumber: 2,
        teamId: "WAS",
        startingTeamId: "WAS",
        predictedPlayer: createProspect("p2", "Player Two"),
      },
    ],
    ...overrides,
  };
}

describe("scoring", () => {
  it("awards exact-pick points and available points correctly", () => {
    const playerDraft = createDraft();
    const officialDraft = createDraft();

    const score = scoreDraft(playerDraft, officialDraft);

    expect(score.points).toBe(200);
    expect(score.availablePoints).toBe(200);
    expect(score.completedOfficialPicks).toBe(2);
    expect(score.scoredPicks[0].playerPoints).toBe(100);
  });

  it("awards distance-based points when a player is one pick off", () => {
    const playerDraft = createDraft({
      picks: [
        {
          pickNumber: 1,
          teamId: "CHI",
          startingTeamId: "CHI",
          predictedPlayer: createProspect("p2", "Player Two"),
        },
        {
          pickNumber: 2,
          teamId: "WAS",
          startingTeamId: "WAS",
          predictedPlayer: createProspect("p1", "Player One"),
        },
      ],
    });
    const officialDraft = createDraft();

    const score = scoreDraft(playerDraft, officialDraft);

    expect(score.points).toBe(150);
    expect(score.scoredPicks[0].pickDistance).toBe(1);
    expect(score.scoredPicks[0].playerPoints).toBe(75);
  });

  it("awards trade bonus points when the traded team is predicted correctly", () => {
    const tradeProspect = createProspect("p3", "Trade Target");
    const playerDraft = createDraft({
      picks: [
        {
          pickNumber: 1,
          teamId: "MIN",
          startingTeamId: "CHI",
          predictedPlayer: tradeProspect,
        },
      ],
    });
    const officialDraft = createDraft({
      picks: [
        {
          pickNumber: 1,
          teamId: "MIN",
          startingTeamId: "CHI",
          predictedPlayer: tradeProspect,
        },
      ],
    });

    const score = scoreDraft(playerDraft, officialDraft);

    expect(score.scoredPicks[0].tradePredictedSuccessfully).toBe(true);
    expect(score.scoredPicks[0].tradePoints).toBe(50);
    expect(score.points).toBe(150);
    expect(score.availablePoints).toBe(150);
  });

  it("only scores submitted participant drafts in lobby rankings", () => {
    const submittedDraft = createDraft({
      id: "submitted-draft",
      participantId: "participant-1",
      submittedAt: "2026-04-01T01:00:00.000Z",
    });
    const unsubmittedDraft = createDraft({
      id: "open-draft",
      participantId: "participant-2",
      submittedAt: undefined,
    });
    const officialDraft = createDraft({
      id: "official-draft",
      isOfficialResult: true,
      participantId: undefined,
      submittedAt: undefined,
    });
    const participants: Participant[] = [
      {
        id: "participant-1",
        lobbyId: "lobby-1",
        userId: "user-1",
        name: "Alice",
        role: "player",
        joinedAt: "2026-04-01T00:00:00.000Z",
      },
      {
        id: "participant-2",
        lobbyId: "lobby-1",
        userId: "user-2",
        name: "Bob",
        role: "player",
        joinedAt: "2026-04-01T00:00:00.000Z",
      },
    ];

    const scores = scoreLobbyDrafts(
      [submittedDraft, unsubmittedDraft],
      participants,
      officialDraft,
    );

    expect(scores).toHaveLength(1);
    expect(scores[0].draftId).toBe("submitted-draft");
    expect(scores[0].participantName).toBe("Alice");
  });
});
