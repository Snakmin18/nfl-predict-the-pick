export type LobbyStatus = "waiting" | "in-progress" | "complete";

export type Lobby = {
  id: string;
  code: string;
  name: string;
  hostParticipantId: string;
  hostUserId?: string;
  year: number;
  roundLimit: number;
  createdAt: string;
  status: LobbyStatus;
};

export type ParticipantRole = "host" | "player";

export type Participant = {
  id: string;
  lobbyId: string;
  userId?: string;
  name: string;
  role: ParticipantRole;
  joinedAt: string;
};
