import type { Participant } from "../types/lobby";
import { supabase } from "./supabaseClient";

const PARTICIPANT_PREFIX = "participant:";

type ParticipantRow = {
  id: string;
  lobby_id: string;
  name: string;
  role: Participant["role"];
  joined_at: string;
};

function toParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    lobbyId: row.lobby_id,
    name: row.name,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

function toParticipantRow(participant: Participant): ParticipantRow {
  return {
    id: participant.id,
    lobby_id: participant.lobbyId,
    name: participant.name,
    role: participant.role,
    joined_at: participant.joinedAt,
  };
}

function saveParticipantLocally(participant: Participant) {
  localStorage.setItem(
    `${PARTICIPANT_PREFIX}${participant.id}`,
    JSON.stringify(participant),
  );
}

function loadParticipantLocally(participantId: string): Participant | null {
  const raw = localStorage.getItem(`${PARTICIPANT_PREFIX}${participantId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Participant;
  } catch {
    return null;
  }
}

function getParticipantsByLobbyLocally(lobbyId: string): Participant[] {
  const participants: Participant[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PARTICIPANT_PREFIX)) continue;

    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const participant = JSON.parse(raw) as Participant;
      if (participant.lobbyId === lobbyId) {
        participants.push(participant);
      }
    } catch {
      // skip invalid entries
    }
  }

  return participants.sort(
    (a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
  );
}

export async function saveParticipant(participant: Participant) {
  saveParticipantLocally(participant);

  if (!supabase) return;

  const { error } = await supabase
    .from("participants")
    .upsert(toParticipantRow(participant));

  if (error) throw error;
}

export async function loadParticipant(
  participantId: string,
): Promise<Participant | null> {
  if (!supabase) return loadParticipantLocally(participantId);

  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("id", participantId)
    .maybeSingle();

  if (error) throw error;
  return data ? toParticipant(data as ParticipantRow) : null;
}

export async function getParticipantsByLobby(
  lobbyId: string,
): Promise<Participant[]> {
  if (!supabase) return getParticipantsByLobbyLocally(lobbyId);

  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("lobby_id", lobbyId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data as ParticipantRow[]).map(toParticipant);
}
