import type { DraftOrderItem, MockDraft } from "../types/draft";
import type { Prospect } from "../types/prospect";
import {
  MAX_DRAFT_ROUNDS,
  buildDraft,
  getDraftRoundLimit,
  getDraftedProspectIds,
  getRoundForPick,
  getTopAvailableProspects,
  isPickInPredictionRange,
} from "./draft";

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
    title: "Draft",
    year: 2026,
    createdAt: "2026-04-01T00:00:00.000Z",
    picks: [],
    ...overrides,
  };
}

describe("draft utils", () => {
  it("maps picks to the correct draft round boundaries", () => {
    expect(getRoundForPick(1)).toBe(1);
    expect(getRoundForPick(32)).toBe(1);
    expect(getRoundForPick(33)).toBe(2);
    expect(getRoundForPick(100)).toBe(3);
    expect(getRoundForPick(257)).toBe(7);
    expect(getRoundForPick(300)).toBe(MAX_DRAFT_ROUNDS);
  });

  it("uses the full draft when roundLimit is missing", () => {
    expect(getDraftRoundLimit(createDraft())).toBe(MAX_DRAFT_ROUNDS);
  });

  it("checks whether a pick is inside the prediction range", () => {
    const oneRoundDraft = createDraft({ roundLimit: 1 });

    expect(isPickInPredictionRange(oneRoundDraft, 12)).toBe(true);
    expect(isPickInPredictionRange(oneRoundDraft, 40)).toBe(false);
  });

  it("collects drafted prospect ids without duplicates", () => {
    const caleb = createProspect("p1", "Caleb");
    const drake = createProspect("p2", "Drake");
    const draft = createDraft({
      picks: [
        { pickNumber: 1, teamId: "CHI", predictedPlayer: caleb },
        { pickNumber: 2, teamId: "WAS", predictedPlayer: drake },
        { pickNumber: 3, teamId: "NE", predictedPlayer: caleb },
      ],
    });

    expect(getDraftedProspectIds(draft)).toEqual(new Set(["p1", "p2"]));
  });

  it("returns only undrafted prospects and respects a limit", () => {
    const caleb = createProspect("p1", "Caleb");
    const drake = createProspect("p2", "Drake");
    const jayden = createProspect("p3", "Jayden");
    const draft = createDraft({
      picks: [{ pickNumber: 1, teamId: "CHI", predictedPlayer: caleb }],
    });

    expect(getTopAvailableProspects([caleb, drake, jayden], draft)).toEqual([
      drake,
      jayden,
    ]);
    expect(getTopAvailableProspects([caleb, drake, jayden], draft, 1)).toEqual([
      drake,
    ]);
  });

  it("builds a draft with metadata and initialized picks", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-28T12:00:00.000Z"));
    const uuidSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("00000000-0000-0000-0000-000000000123");

    const draftOrder: DraftOrderItem[] = [
      { pickNumber: 1, teamId: "CHI" },
      { pickNumber: 2, teamId: "WAS", originalOwnerTeamId: "NE" },
    ];

    const draft = buildDraft("Test Build", draftOrder, {
      lobbyId: "lobby-1",
      participantId: "participant-1",
      userId: "user-1",
      roundLimit: 2,
      year: 2027,
    });

    expect(draft).toMatchObject({
      id: "00000000-0000-0000-0000-000000000123",
      title: "Test Build",
      year: 2027,
      lobbyId: "lobby-1",
      participantId: "participant-1",
      userId: "user-1",
      roundLimit: 2,
      createdAt: "2026-04-28T12:00:00.000Z",
    });
    expect(draft.picks).toEqual([
      {
        pickNumber: 1,
        teamId: "CHI",
        startingTeamId: "CHI",
        originalOwnerTeamId: undefined,
        predictedPlayer: null,
      },
      {
        pickNumber: 2,
        teamId: "WAS",
        startingTeamId: "WAS",
        originalOwnerTeamId: "NE",
        predictedPlayer: null,
      },
    ]);

    uuidSpy.mockRestore();
    vi.useRealTimers();
  });
});
