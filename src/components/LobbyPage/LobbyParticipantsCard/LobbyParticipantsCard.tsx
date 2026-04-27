import type { Lobby, Participant } from "../../../types/lobby";

type Props = {
  lobby: Lobby;
  participants: Participant[];
};

export default function LobbyParticipantsCard({
  lobby,
  participants,
}: Props) {
  return (
    <div className="card">
      <h2>Room participants</h2>
      <ul>
        {participants.map((member) => (
          <li key={member.id}>
            {member.name} {member.id === lobby.hostParticipantId ? "(host)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
