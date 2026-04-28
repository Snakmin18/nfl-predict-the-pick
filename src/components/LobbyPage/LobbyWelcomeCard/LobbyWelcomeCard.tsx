import { Link } from "react-router-dom";
import type { Lobby, Participant } from "../../../types/lobby";
import type { MockDraft } from "../../../types/draft";
import styles from "./LobbyWelcomeCard.module.css";

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

      <div className={styles.scoringGuide}>
        <h3>Scoring</h3>
        <div className={styles.scoringGrid}>
          <span>Exact pick</span>
          <strong>100 pts</strong>
          <span>1 pick off</span>
          <strong>75 pts</strong>
          <span>2 picks off</span>
          <strong>50 pts</strong>
          <span>3 picks off</span>
          <strong>25 pts</strong>
          <span>Correct trade</span>
          <strong>+50 pts</strong>
        </div>
      </div>

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
