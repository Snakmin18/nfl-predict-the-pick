import { Link } from "react-router-dom";
import type { Lobby } from "../../../types/lobby";
import type { DraftScore } from "../../../utils/scoring";
import styles from "./LobbyScoreboardCard.module.css";

type Props = {
  lobby: Lobby;
  officialDraftExists: boolean;
  participantDraftCount: number;
  scores: DraftScore[];
  submittedDraftCount: number;
  viewerParticipantId: string;
};

export default function LobbyScoreboardCard({
  lobby,
  officialDraftExists,
  participantDraftCount,
  scores,
  submittedDraftCount,
  viewerParticipantId,
}: Props) {
  return (
    <div className="card">
      <h2>Scoreboard</h2>
      <p>
        Submitted drafts: {submittedDraftCount}/{participantDraftCount}
      </p>
      {!officialDraftExists ? (
        <p>
          The official {lobby.year} draft has not been created yet. Scores will
          appear once the app admin starts saving official picks.
        </p>
      ) : scores.length === 0 ? (
        <p>No submitted participant drafts yet.</p>
      ) : (
        <div className={styles.scoreboard}>
          <div className={styles.header}>
            <span>Player</span>
            <span>Score</span>
            <span>Official picks</span>
          </div>
          {scores.map((score) => (
            <Link
              key={score.draftId}
              className={styles.row}
              to={`/draft/${score.draftId}`}
              state={{ viewerParticipantId }}
            >
              <span>{score.participantName}</span>
              <strong>
                {score.points}/{score.availablePoints}
              </strong>
              <span>
                {score.completedOfficialPicks}/{score.scoredPicks.length}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
