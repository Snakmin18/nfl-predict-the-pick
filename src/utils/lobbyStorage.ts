import type { Lobby } from "../types/lobby";
import { supabase } from "../lib/supabase/client";

const LOBBY_PREFIX = "lobby:";

type LobbyRow = {
  id: string;
  code: string;
  name: string;
  host_participant_id: string;
  host_user_id: string | null;
  year: number | null;
  round_limit: number | null;
  status: Lobby["status"];
  created_at: string;
};

const LOBBY_SELECT_COLUMNS =
  "id, code, name, host_participant_id, host_user_id, year, round_limit, status, created_at";

function toLobby(row: LobbyRow): Lobby {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    hostParticipantId: row.host_participant_id,
    hostUserId: row.host_user_id ?? undefined,
    year: row.year ?? 2026,
    roundLimit: row.round_limit ?? 7,
    status: row.status,
    createdAt: row.created_at,
  };
}

function normalizeLobby(lobby: Lobby): Lobby {
  return {
    ...lobby,
    year: lobby.year ?? 2026,
    roundLimit: lobby.roundLimit ?? 1,
  };
}

function toLobbyRow(lobby: Lobby): LobbyRow {
  return {
    id: lobby.id,
    code: lobby.code,
    name: lobby.name,
    host_participant_id: lobby.hostParticipantId,
    host_user_id: lobby.hostUserId ?? null,
    year: lobby.year ?? 2026,
    round_limit: lobby.roundLimit ?? 1,
    status: lobby.status,
    created_at: lobby.createdAt,
  };
}

function saveLobbyLocally(lobby: Lobby) {
  localStorage.setItem(`${LOBBY_PREFIX}${lobby.id}`, JSON.stringify(lobby));
}

function loadLobbyLocally(lobbyId: string): Lobby | null {
  const raw = localStorage.getItem(`${LOBBY_PREFIX}${lobbyId}`);
  if (!raw) return null;

  try {
    return normalizeLobby(JSON.parse(raw) as Lobby);
  } catch {
    return null;
  }
}

function loadLobbyByCodeLocally(code: string): Lobby | null {
  const normalizedCode = code.trim().toUpperCase();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LOBBY_PREFIX)) continue;

    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const lobby = JSON.parse(raw) as Lobby;
      if (lobby.code.toUpperCase() === normalizedCode) {
        return normalizeLobby(lobby);
      }
    } catch {
      continue;
    }
  }

  return null;
}

function getAllLobbiesLocally(): Lobby[] {
  const lobbies: Lobby[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LOBBY_PREFIX)) continue;

    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      lobbies.push(normalizeLobby(JSON.parse(raw) as Lobby));
    } catch {
      // skip invalid entries
    }
  }

  return lobbies.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function saveLobby(lobby: Lobby) {
  saveLobbyLocally(lobby);

  if (!supabase) return;

  const { error } = await supabase.from("lobbies").insert(toLobbyRow(lobby));
  if (error) throw error;
}

export async function loadLobby(lobbyId: string): Promise<Lobby | null> {
  if (!supabase) return loadLobbyLocally(lobbyId);

  const { data, error } = await supabase
    .from("lobbies")
    .select(LOBBY_SELECT_COLUMNS)
    .eq("id", lobbyId)
    .maybeSingle();

  if (error) throw error;
  return data ? toLobby(data as LobbyRow) : null;
}

export async function getHostedLobbies(userId: string): Promise<Lobby[]> {
  if (!supabase) {
    return getAllLobbiesLocally().filter((lobby) => lobby.hostUserId === userId);
  }

  const { data, error } = await supabase
    .from("lobbies")
    .select(LOBBY_SELECT_COLUMNS)
    .eq("host_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as LobbyRow[]).map(toLobby);
}

export async function getLobbiesByIds(lobbyIds: string[]): Promise<Lobby[]> {
  if (lobbyIds.length === 0) return [];

  if (!supabase) {
    const byId = new Set(lobbyIds);
    return getAllLobbiesLocally().filter((lobby) => byId.has(lobby.id));
  }

  const { data, error } = await supabase
    .rpc("find_lobbies_by_ids", { lobby_ids: lobbyIds });

  if (error) throw error;
  return (data as LobbyRow[]).map(toLobby);
}

export async function findLobbyByCode(code: string): Promise<Lobby | null> {
  const normalizedCode = code.trim().toUpperCase();

  if (!supabase) return loadLobbyByCodeLocally(normalizedCode);

  const { data, error } = await supabase.rpc("find_lobby_by_code", {
    room_code: normalizedCode,
  });

  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;
  return result ? toLobby(result as LobbyRow) : null;
}

export function generateLobbyCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return code;
}
