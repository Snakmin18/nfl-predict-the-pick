import type { MockDraft } from "../types/draft";
import {
  applyPickTrade,
  buildTradeAssets,
  getCurrentOwnerPickNumbers,
  type PendingTrade,
} from "./trades";

function createDraft(overrides: Partial<MockDraft> = {}): MockDraft {
  return {
    id: "draft-1",
    title: "Draft",
    year: 2026,
    createdAt: "2026-04-01T00:00:00.000Z",
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
      {
        pickNumber: 3,
        teamId: "CHI",
        startingTeamId: "CHI",
        predictedPlayer: null,
      },
    ],
    ...overrides,
  };
}

describe("trade utils", () => {
  it("builds the correct trade assets for both teams", () => {
    const trade: PendingTrade = {
      teamAId: "CHI",
      teamBId: "MIN",
      teamAPickNumbers: [1, 3],
      teamBPickNumbers: [12],
    };

    expect(buildTradeAssets(trade)).toEqual([
      { pickNumber: 1, newOwnerTeamId: "MIN" },
      { pickNumber: 3, newOwnerTeamId: "MIN" },
      { pickNumber: 12, newOwnerTeamId: "CHI" },
    ]);
  });

  it("applies a trade and preserves original ownership history", () => {
    const draft = createDraft();
    const tradedDraft = applyPickTrade(draft, {
      teamAId: "CHI",
      teamBId: "MIN",
      teamAPickNumbers: [1],
      teamBPickNumbers: [2],
    });

    expect(tradedDraft.picks[0]).toMatchObject({
      pickNumber: 1,
      teamId: "MIN",
      startingTeamId: "CHI",
      originalOwnerTeamId: "CHI",
    });
    expect(tradedDraft.picks[1]).toMatchObject({
      pickNumber: 2,
      teamId: "CHI",
      startingTeamId: "WAS",
      originalOwnerTeamId: "WAS",
    });
    expect(tradedDraft.picks[2]).toBe(draft.picks[2]);
  });

  it("does not rewrite picks when the trade keeps the same owner", () => {
    const draft = createDraft();

    const unchangedDraft = applyPickTrade(draft, {
      teamAId: "CHI",
      teamBId: "WAS",
      teamAPickNumbers: [],
      teamBPickNumbers: [],
    });

    expect(unchangedDraft.picks).toEqual(draft.picks);
  });

  it("returns sorted pick numbers for the current owner", () => {
    const draft = createDraft({
      picks: [
        {
          pickNumber: 11,
          teamId: "MIN",
          startingTeamId: "CHI",
          predictedPlayer: null,
        },
        {
          pickNumber: 4,
          teamId: "MIN",
          startingTeamId: "MIN",
          predictedPlayer: null,
        },
        {
          pickNumber: 9,
          teamId: "CHI",
          startingTeamId: "CHI",
          predictedPlayer: null,
        },
      ],
    });

    expect(getCurrentOwnerPickNumbers(draft, "MIN")).toEqual([4, 11]);
    expect(getCurrentOwnerPickNumbers(draft, "CHI")).toEqual([9]);
  });
});
