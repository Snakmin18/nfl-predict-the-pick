import { useState } from "react";
import { Link } from "react-router-dom";
import type { Lobby } from "../../../types/lobby";
import type { DraftScore } from "../../../utils/scoring";
import styles from "./LobbyScoreboardCard.module.css";

type Props = {
  lobby: Lobby;
  officialDraftExists: boolean;
  scores: DraftScore[];
  viewerParticipantId: string;
};

export default function LobbyScoreboardCard({
  lobby,
  officialDraftExists,
  scores,
  viewerParticipantId,
}: Props) {
  const [isScoringGuideOpen, setIsScoringGuideOpen] = useState(false);
  const leadingScore = scores[0]?.points ?? 0;

  return (
    <div className="card">
      <h2>Scoreboard</h2>
      <details
        className={styles.scoringGuide}
        open={isScoringGuideOpen}
        onToggle={(event) => setIsScoringGuideOpen(event.currentTarget.open)}
      >
        <summary className={styles.scoringToggle}>
          {isScoringGuideOpen
            ? "Hide scoring breakdown"
            : "Show scoring breakdown"}
        </summary>
        <div className={styles.scoringContent}>
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
      </details>
      {!officialDraftExists ? (
        <p>
          The official {lobby.year} draft has not been created yet. Scores will
          appear once the app admin starts saving official picks.
        </p>
      ) : scores.length === 0 ? (
        <p>No submitted participant drafts yet.</p>
      ) : (
        <div className={styles.scoreboard}>
          {scores.map((score, index) => (
            <Link
              key={score.draftId}
              className={styles.row}
              to={`/draft/${score.draftId}`}
              state={{ viewerParticipantId }}
            >
              <div className={styles.rowTop}>
                <div className={styles.playerSummary}>
                  <span className={styles.rankBadge}>#{index + 1}</span>
                  <span className={styles.playerName}>{score.participantName}</span>
                </div>
                <strong className={styles.points}>{score.points}</strong>
              </div>

              <div className={styles.barTrack} aria-hidden="true">
                <span
                  className={styles.barFill}
                  style={{
                    width: `${
                      leadingScore > 0 ? (score.points / leadingScore) * 100 : 0
                    }%`,
                  }}
                />
              </div>

              <div className={styles.rowMeta}>
                <span>Points</span>
                <span>
                  Official picks: {score.completedOfficialPicks}/
                  {score.scoredPicks.length}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
