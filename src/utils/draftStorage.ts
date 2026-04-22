import type { DraftPick, MockDraft } from "../types/draft";
import type { Prospect } from "../types/prospect";
import { supabase } from "./supabaseClient";

const DRAFT_PREFIX = "draft:";

type DraftRow = {
  id: string;
  lobby_id: string | null;
  participant_id: string | null;
  title: string;
  year: number;
  created_at: string;
  is_official_result: boolean;
  round_limit: number | null;
  submitted_at: string | null;
};

type DraftPickRow = {
  draft_id: string;
  pick_number: number;
  team_id: string;
  original_owner_team_id: string | null;
  predicted_player: Prospect | null;
};

type DraftWithPickRows = DraftRow & {
  draft_picks?: DraftPickRow[];
};

function toDraft(row: DraftWithPickRows): MockDraft {
  return {
    id: row.id,
    lobbyId: row.lobby_id ?? undefined,
    participantId: row.participant_id ?? undefined,
    title: row.title,
    year: row.year,
    createdAt: row.created_at,
    isOfficialResult: row.is_official_result,
    roundLimit: row.round_limit ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
    picks: (row.draft_picks ?? [])
      .map(toDraftPick)
      .sort((a, b) => a.pickNumber - b.pickNumber),
  };
}

function toDraftRow(draft: MockDraft): DraftRow {
  return {
    id: draft.id,
    lobby_id: draft.lobbyId ?? null,
    participant_id: draft.participantId ?? null,
    title: draft.title,
    year: draft.year,
    created_at: draft.createdAt,
    is_official_result: Boolean(draft.isOfficialResult),
    round_limit: draft.roundLimit ?? null,
    submitted_at: draft.submittedAt ?? null,
  };
}

function toDraftPick(row: DraftPickRow): DraftPick {
  return {
    pickNumber: row.pick_number,
    teamId: row.team_id,
    originalOwnerTeamId: row.original_owner_team_id ?? undefined,
    predictedPlayer: row.predicted_player,
  };
}

function toDraftPickRow(draftId: string, pick: DraftPick): DraftPickRow {
  return {
    draft_id: draftId,
    pick_number: pick.pickNumber,
    team_id: pick.teamId,
    original_owner_team_id: pick.originalOwnerTeamId ?? null,
    predicted_player: pick.predictedPlayer,
  };
}

function saveDraftLocally(draft: MockDraft) {
  localStorage.setItem(`${DRAFT_PREFIX}${draft.id}`, JSON.stringify(draft));
}

function loadDraftLocally(draftId: string): MockDraft | null {
  const raw = localStorage.getItem(`${DRAFT_PREFIX}${draftId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as MockDraft;
  } catch {
    return null;
  }
}

function getAllDraftsLocally(): MockDraft[] {
  const drafts: MockDraft[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(DRAFT_PREFIX)) continue;

    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      drafts.push(JSON.parse(raw) as MockDraft);
    } catch {
      // skip bad data
    }
  }

  return drafts.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function saveDraft(draft: MockDraft) {
  saveDraftLocally(draft);

  if (!supabase) return;

  const { error: draftError } = await supabase
    .from("drafts")
    .upsert(toDraftRow(draft), { onConflict: "id" });

  if (draftError) throw draftError;

  const { error: picksError } = await supabase
    .from("draft_picks")
    .upsert(draft.picks.map((pick) => toDraftPickRow(draft.id, pick)), {
      onConflict: "draft_id,pick_number",
    });

  if (picksError) throw picksError;
}

export async function loadDraft(draftId: string): Promise<MockDraft | null> {
  if (!supabase) return loadDraftLocally(draftId);

  const { data, error } = await supabase
    .from("drafts")
    .select("*, draft_picks(*)")
    .eq("id", draftId)
    .maybeSingle();

  if (error) throw error;
  return data ? toDraft(data as DraftWithPickRows) : null;
}

export async function getAllDrafts(): Promise<MockDraft[]> {
  if (!supabase) return getAllDraftsLocally();

  const { data, error } = await supabase
    .from("drafts")
    .select("*, draft_picks(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as DraftWithPickRows[]).map(toDraft);
}
