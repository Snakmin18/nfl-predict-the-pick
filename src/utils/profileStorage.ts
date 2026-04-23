import type { Profile } from "../types/profile";
import { supabase } from "../lib/supabase/client";

const PROFILE_PREFIX = "profile:";

type ProfileRow = {
  id: string;
  display_name: string;
  is_app_admin?: boolean;
  created_at?: string;
};

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    isAppAdmin: row.is_app_admin,
    createdAt: row.created_at,
  };
}

function toProfileRow(profile: Profile): ProfileRow {
  return {
    id: profile.id,
    display_name: profile.displayName,
  };
}

function saveProfileLocally(profile: Profile) {
  localStorage.setItem(`${PROFILE_PREFIX}${profile.id}`, JSON.stringify(profile));
}

function loadProfileLocally(userId: string): Profile | null {
  const raw = localStorage.getItem(`${PROFILE_PREFIX}${userId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: Profile) {
  saveProfileLocally(profile);

  if (!supabase) return;

  const { error } = await supabase
    .from("profiles")
    .insert(toProfileRow(profile));

  if (error) throw error;
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return loadProfileLocally(userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? toProfile(data as ProfileRow) : null;
}
