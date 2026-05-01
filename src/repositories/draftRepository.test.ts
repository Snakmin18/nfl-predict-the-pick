import type { Prospect } from "../types/prospect";

const { supabaseState } = vi.hoisted(() => ({
  supabaseState: {
    current: null as null | {
      from: ReturnType<typeof vi.fn>;
    },
  },
}));

vi.mock("../lib/supabase/client", () => ({
  get supabase() {
    return supabaseState.current;
  },
}));

import {
  getDraftsByLobby,
  loadDraft,
  loadOfficialDraft,
  saveDraft,
} from "./draftRepository";

function createProspect(id: string, name: string): Prospect {
  return {
    id,
    name,
    school: "Test U",
    ranking: 1,
    matchKey: name.toLowerCase().replace(/\s+/g, "-"),
  };
}

function createSupabaseDraftRow() {
  return {
    id: "draft-1",
    lobby_id: "lobby-1",
    participant_id: "participant-1",
    user_id: "user-1",
    title: "Stored Draft",
    year: 2026,
    created_at: "2026-04-01T00:00:00.000Z",
    is_official_result: false,
    round_limit: 2,
    submitted_at: null,
    draft_picks: [
      {
        draft_id: "draft-1",
        pick_number: 2,
        team_id: "WAS",
        starting_team_id: "WAS",
        original_owner_team_id: null,
        predicted_player: createProspect("p2", "Drake Teste"),
      },
      {
        draft_id: "draft-1",
        pick_number: 1,
        team_id: "CHI",
        starting_team_id: "CHI",
        original_owner_team_id: null,
        predicted_player: createProspect("p1", "Caleb Test"),
      },
    ],
  };
}

function createDraft() {
  return {
    id: "draft-1",
    title: "Stored Draft",
    year: 2026,
    createdAt: "2026-04-01T00:00:00.000Z",
    lobbyId: "lobby-1",
    participantId: "participant-1",
    userId: "user-1",
    roundLimit: 2,
    picks: [
      {
        pickNumber: 1,
        teamId: "CHI",
        startingTeamId: "CHI",
        predictedPlayer: createProspect("p1", "Caleb Test"),
      },
      {
        pickNumber: 2,
        teamId: "WAS",
        startingTeamId: "WAS",
        predictedPlayer: createProspect("p2", "Drake Teste"),
      },
    ],
  };
}

describe("draftRepository", () => {
  beforeEach(() => {
    supabaseState.current = null;
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("saves a draft locally when Supabase is unavailable", async () => {
    const draft = createDraft();

    await saveDraft(draft);

    expect(JSON.parse(localStorage.getItem("draft:draft-1") ?? "{}")).toMatchObject({
      id: "draft-1",
      title: "Stored Draft",
    });
  });

  it("saves a draft to Supabase and upserts draft picks", async () => {
    const draftUpsertMock = vi.fn().mockResolvedValue({ error: null });
    const picksUpsertMock = vi.fn().mockResolvedValue({ error: null });
    const fromMock = vi.fn((table: string) => {
      if (table === "drafts") {
        return { upsert: draftUpsertMock };
      }

      if (table === "draft_picks") {
        return { upsert: picksUpsertMock };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    supabaseState.current = {
      from: fromMock,
    };

    await saveDraft(createDraft());

    expect(draftUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "draft-1",
        lobby_id: "lobby-1",
        participant_id: "participant-1",
        user_id: "user-1",
        round_limit: 2,
      }),
      { onConflict: "id" },
    );
    expect(picksUpsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          draft_id: "draft-1",
          pick_number: 1,
          team_id: "CHI",
        }),
        expect.objectContaining({
          draft_id: "draft-1",
          pick_number: 2,
          team_id: "WAS",
        }),
      ],
      { onConflict: "draft_id,pick_number" },
    );
  });

  it("loads a draft from Supabase and sorts picks by pick number", async () => {
    const maybeSingleMock = vi
      .fn()
      .mockResolvedValue({ data: createSupabaseDraftRow(), error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    supabaseState.current = {
      from: fromMock,
    };

    const result = await loadDraft("draft-1");

    expect(eqMock).toHaveBeenCalledWith("id", "draft-1");
    expect(result?.picks.map((pick) => pick.pickNumber)).toEqual([1, 2]);
    expect(result).toMatchObject({
      id: "draft-1",
      lobbyId: "lobby-1",
      participantId: "participant-1",
      userId: "user-1",
      roundLimit: 2,
    });
  });

  it("loads drafts by lobby from local storage when Supabase is unavailable", async () => {
    localStorage.setItem(
      "draft:draft-1",
      JSON.stringify(createDraft()),
    );
    localStorage.setItem(
      "draft:draft-2",
      JSON.stringify({
        ...createDraft(),
        id: "draft-2",
        lobbyId: "other-lobby",
      }),
    );

    const drafts = await getDraftsByLobby("lobby-1");

    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe("draft-1");
  });

  it("loads the official draft by year from Supabase", async () => {
    const maybeSingleMock = vi
      .fn()
      .mockResolvedValue({
        data: {
          ...createSupabaseDraftRow(),
          id: "official-1",
          lobby_id: null,
          participant_id: null,
          is_official_result: true,
        },
        error: null,
      });
    const isMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const secondEqMock = vi.fn().mockReturnValue({ is: isMock });
    const firstEqMock = vi.fn().mockReturnValue({ eq: secondEqMock });
    const selectMock = vi.fn().mockReturnValue({ eq: firstEqMock });
    const fromMock = vi.fn().mockReturnValue({ select: selectMock });

    supabaseState.current = {
      from: fromMock,
    };

    const result = await loadOfficialDraft(2026);

    expect(firstEqMock).toHaveBeenCalledWith("year", 2026);
    expect(secondEqMock).toHaveBeenCalledWith("is_official_result", true);
    expect(isMock).toHaveBeenCalledWith("lobby_id", null);
    expect(result?.isOfficialResult).toBe(true);
    expect(result?.lobbyId).toBeUndefined();
  });
});
