import type { Player } from "../types/player";

const BASE_URL = import.meta.env.VITE_CFBD_BASE_URL;
const API_KEY = import.meta.env.VITE_CFBD_API_KEY;

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

export async function searchPlayers(searchTerm: string): Promise<Player[]> {
  if (!searchTerm.trim()) return [];

  const url = new URL("/player/search", BASE_URL);
  url.searchParams.set("searchTerm", searchTerm);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`CFBD request failed: ${response.status}`);
  }

  const data = (await response.json()) as CfbdPlayerResponse[];

  return data.map((player, index) => ({
    id: String(player.id ?? `${player.name ?? "player"}-${index}`),
    name:
      player.name?.trim() ||
      [player.firstName, player.lastName].filter(Boolean).join(" ") ||
      "Unknown Player",
    position: player.position,
    school: player.school ?? player.team,
    year: player.year,
  }));
}
