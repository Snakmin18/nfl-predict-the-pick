import rawRankings from "./playerRankings.json";
import type { Prospect } from "../types/prospect";
import { buildProspectMatchKey } from "../utils/prospects";

type RawRanking = {
  id: string;
  name: string;
  school: string;
  position?: string;
  year?: number;
  pffRank: number;
};

export const rankedProspects: Prospect[] = (rawRankings as RawRanking[])
  .map((player) => ({
    id: String(player.id),
    name: player.name,
    school: player.school,
    position: player.position,
    year: player.year,
    ranking: player.pffRank,
    matchKey: buildProspectMatchKey(player.name, player.school),
  }))
  .sort((a, b) => a.ranking - b.ranking);
