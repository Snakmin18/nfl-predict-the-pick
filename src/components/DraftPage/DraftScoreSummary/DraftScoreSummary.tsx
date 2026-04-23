import type { DraftScore } from "../../../utils/scoring";
import styles from "./DraftScoreSummary.module.css";

type Props = {
  score: DraftScore;
};

export default function DraftScoreSummary({ score }: Props) {
  return (
    <div className={styles.summary}>
      <strong>
        Score: {score.points}/{score.availablePoints}
      </strong>
      <span>
        Official picks completed: {score.completedOfficialPicks}/
        {score.scoredPicks.length}
      </span>
      <span>Trades hit: {score.completedOfficialTrades}</span>
    </div>
  );
}
