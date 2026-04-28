import type { Player } from "../types/player";
import { supabase } from "../lib/supabase/client";

type CfbdPlayerResponse = {
  id?: string | number;
  name?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  team?: string;
  school?: string;
  year?: number;
};

type CfbdPlayerSearchResponse = {
  players: CfbdPlayerResponse[];
};

function toPlayer(player: CfbdPlayerResponse, index: number): Player {
  return {
    id: String(player.id ?? `${player.name ?? "player"}-${index}`),
    name:
      player.name?.trim() ||
      [player.firstName, player.lastName].filter(Boolean).join(" ") ||
      "Unknown Player",
    position: player.position,
    school: player.school ?? player.team,
    year: player.year,
  };
}

export async function searchPlayers(searchTerm: string): Promise<Player[]> {
  if (!searchTerm.trim()) return [];
  if (!supabase) return [];

  const { data, error } = await supabase.functions.invoke<CfbdPlayerSearchResponse>(
    "cfbd-player-search",
    {
      body: { searchTerm },
    },
  );

  if (error) {
    throw new Error(error.message || "CFBD request failed.");
  }

  const players = data?.players ?? [];
  return players.map(toPlayer);
}
