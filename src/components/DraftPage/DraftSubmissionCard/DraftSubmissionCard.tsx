import CountdownTimer from "../../CountdownTimer/CountdownTimer";
import { DRAFT_SUBMISSION_DEADLINE } from "../../../utils/deadlines";
import styles from "./DraftSubmissionCard.module.css";

type Props = {
  canSubmitDraft: boolean;
  completedPredictionPicks: number;
  handleSaveDraft: () => Promise<void>;
  handleSubmitDraft: () => Promise<void>;
  isDraftSubmitted: boolean;
  isSubmissionDeadlinePassed: boolean;
  predictionPickCount: number;
  saveStatus: string;
  submitDraftMessage: string;
  submittedAt?: string;
};

export default function DraftSubmissionCard({
  canSubmitDraft,
  completedPredictionPicks,
  handleSaveDraft,
  handleSubmitDraft,
  isDraftSubmitted,
  isSubmissionDeadlinePassed,
  predictionPickCount,
  saveStatus,
  submitDraftMessage,
  submittedAt,
}: Props) {
  return (
    <div className="card">
      <CountdownTimer deadline={DRAFT_SUBMISSION_DEADLINE} />
      <h2>{isDraftSubmitted ? "Draft submitted" : "Submit your draft"}</h2>
      <p>
        Picks complete: {completedPredictionPicks}/{predictionPickCount}
      </p>
      {isDraftSubmitted ? (
        <p>Submitted {new Date(submittedAt as string).toLocaleString()}</p>
      ) : isSubmissionDeadlinePassed ? (
        <p>Submissions are closed for this draft.</p>
      ) : (
        <div className={styles.actions}>
          <button type="button" onClick={handleSaveDraft}>
            Save Progress
          </button>
          <button
            type="button"
            disabled={!canSubmitDraft}
            onClick={handleSubmitDraft}
          >
            Submit Draft
          </button>
        </div>
      )}
      {!isDraftSubmitted && submitDraftMessage && <p>{submitDraftMessage}</p>}
      {saveStatus && <p>{saveStatus}</p>}
    </div>
  );
}
