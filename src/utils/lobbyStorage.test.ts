import type { Lobby } from "../types/lobby";

const { supabaseState } = vi.hoisted(() => ({
  supabaseState: {
    current: null as null | {
      from: ReturnType<typeof vi.fn>;
      rpc?: ReturnType<typeof vi.fn>;
    },
  },
}));

vi.mock("../lib/supabase/client", () => ({
  get supabase() {
    return supabaseState.current;
  },
}));

import {
  findLobbyByCode,
  generateLobbyCode,
  getHostedLobbies,
  getLobbiesByIds,
  loadLobby,
  saveLobby,
} from "./lobbyStorage";

function createLobby(overrides: Partial<Lobby> = {}): Lobby {
  return {
    id: "lobby-1",
    code: "ROOM1",
    name: "Draft Room",
    hostParticipantId: "participant-host",
    hostUserId: "host-user",
    year: 2026,
    roundLimit: 1,
    createdAt: "2026-04-01T00:00:00.000Z",
    status: "waiting",
    ...overrides,
  };
}

describe("lobbyStorage", () => {
  beforeEach(() => {
    supabaseState.current = null;
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("saves and loads a lobby locally when Supabase is unavailable", async () => {
    const lobby = createLobby();

    await saveLobby(lobby);
    await expect(loadLobby("lobby-1")).resolves.toEqual(lobby);
  });

  it("finds a lobby by room code locally with normalized casing", async () => {
    await saveLobby(createLobby({ code: "ABC123" }));

    await expect(findLobbyByCode(" abc123 ")).resolves.toMatchObject({
      id: "lobby-1",
      code: "ABC123",
    });
  });

  it("returns hosted lobbies for a user in local fallback", async () => {
    await saveLobby(createLobby({ id: "lobby-1", hostUserId: "user-1" }));
    await saveLobby(createLobby({ id: "lobby-2", hostUserId: "user-2" }));

    const lobbies = await getHostedLobbies("user-1");

    expect(lobbies).toHaveLength(1);
    expect(lobbies[0].id).toBe("lobby-1");
  });

  it("returns only matching lobby ids in local fallback", async () => {
    await saveLobby(createLobby({ id: "lobby-1" }));
    await saveLobby(createLobby({ id: "lobby-2" }));

    const lobbies = await getLobbiesByIds(["lobby-2"]);

    expect(lobbies).toHaveLength(1);
    expect(lobbies[0].id).toBe("lobby-2");
  });

  it("uses RPC-backed lookup when Supabase is configured", async () => {
    const rpcMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: "lobby-1",
          code: "ROOM1",
          name: "Draft Room",
          host_participant_id: "participant-host",
          host_user_id: "host-user",
          year: 2026,
          round_limit: 1,
          status: "waiting",
          created_at: "2026-04-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    supabaseState.current = {
      from: vi.fn(),
      rpc: rpcMock,
    };

    const lobby = await findLobbyByCode("room1");

    expect(rpcMock).toHaveBeenCalledWith("find_lobby_by_code", {
      room_code: "ROOM1",
    });
    expect(lobby).toMatchObject({
      id: "lobby-1",
      code: "ROOM1",
      hostUserId: "host-user",
    });
  });

  it("generates a six-character room code without ambiguous characters", () => {
    const code = generateLobbyCode();

    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});
