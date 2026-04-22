import type { Prospect } from "./prospect";

export type DraftOrderItem = {
  pickNumber: number;
  teamId: string;
  originalOwnerTeamId?: string;
};

export type DraftPick = {
  pickNumber: number;
  teamId: string;
  originalOwnerTeamId?: string;
  predictedPlayer: Prospect | null;
};

export type MockDraft = {
  id: string;
  title: string;
  year: number;
  createdAt: string;
  picks: DraftPick[];
};
