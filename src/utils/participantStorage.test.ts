import type { Participant } from "../types/lobby";

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
  getParticipantsByLobby,
  getParticipantsByUser,
  loadParticipant,
  saveParticipant,
} from "./participantStorage";

function createParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: "participant-1",
    lobbyId: "lobby-1",
    userId: "user-1",
    name: "Jake",
    role: "player",
    joinedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("participantStorage", () => {
  beforeEach(() => {
    supabaseState.current = null;
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("saves and loads a participant locally when Supabase is unavailable", async () => {
    const participant = createParticipant();

    await saveParticipant(participant);
    await expect(loadParticipant("participant-1")).resolves.toEqual(participant);
  });

  it("returns lobby participants sorted by join time in local fallback", async () => {
    await saveParticipant(
      createParticipant({
        id: "participant-2",
        joinedAt: "2026-04-01T02:00:00.000Z",
      }),
    );
    await saveParticipant(
      createParticipant({
        id: "participant-1",
        joinedAt: "2026-04-01T01:00:00.000Z",
      }),
    );

    const participants = await getParticipantsByLobby("lobby-1");

    expect(participants.map((participant) => participant.id)).toEqual([
      "participant-1",
      "participant-2",
    ]);
  });

  it("returns user participants sorted newest first in local fallback", async () => {
    await saveParticipant(
      createParticipant({
        id: "participant-1",
        joinedAt: "2026-04-01T01:00:00.000Z",
      }),
    );
    await saveParticipant(
      createParticipant({
        id: "participant-2",
        joinedAt: "2026-04-01T03:00:00.000Z",
      }),
    );

    const participants = await getParticipantsByUser("user-1");

    expect(participants.map((participant) => participant.id)).toEqual([
      "participant-2",
      "participant-1",
    ]);
  });

  it("inserts a participant into Supabase when configured", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    supabaseState.current = {
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    };

    await saveParticipant(createParticipant({ role: "host" }));

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "participant-1",
        lobby_id: "lobby-1",
        user_id: "user-1",
        role: "host",
      }),
    );
  });
});
