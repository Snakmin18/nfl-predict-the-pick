export type LobbyStatus = "waiting" | "in-progress" | "complete";

export type Lobby = {
  id: string;
  code: string;
  name: string;
  hostParticipantId: string;
  adminPin?: string;
  roundLimit: number;
  createdAt: string;
  status: LobbyStatus;
};

export type ParticipantRole = "admin" | "player";

export type Participant = {
  id: string;
  lobbyId: string;
  name: string;
  role: ParticipantRole;
  joinedAt: string;
};
