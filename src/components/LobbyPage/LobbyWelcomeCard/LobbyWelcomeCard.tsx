import { Link } from "react-router-dom";
import type { Lobby, Participant } from "../../../types/lobby";
import type { MockDraft } from "../../../types/draft";

type Props = {
  lobby: Lobby;
  participant: Participant;
  participantDraft?: MockDraft;
  onCreateDraft: () => Promise<void>;
  viewerParticipantId: string;
};

export default function LobbyWelcomeCard({
  lobby,
  participant,
  participantDraft,
  onCreateDraft,
  viewerParticipantId,
}: Props) {
  return (
    <div className="card">
      <h2>Welcome, {participant.name}</h2>
      <p>
        You are logged in as{" "}
        <strong>{participant.role === "host" ? "host" : "player"}</strong>.
      </p>
      {participant.role === "host" && (
        <>
          <p>
            As host, you can review room drafts and keep track of who has
            submitted.
          </p>
          <p>
            Room code: <strong>{lobby.code}</strong>
          </p>
        </>
      )}

      <p>
        Submit your predictions and compare against the official results after
        each round.
      </p>

      {participantDraft ? (
        <Link
          to={`/draft/${participantDraft.id}`}
          state={{ viewerParticipantId }}
        >
          {participantDraft.submittedAt
            ? "Open your submitted draft"
            : "Open your draft"}
        </Link>
      ) : (
        <button onClick={onCreateDraft}>Create Your Draft</button>
      )}
    </div>
  );
}
