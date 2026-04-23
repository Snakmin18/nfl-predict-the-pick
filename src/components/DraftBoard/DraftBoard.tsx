import type { MockDraft } from "../../types/draft";
import type { Prospect } from "../../types/prospect";
import { getDraftRoundLimit, getRoundForPick } from "../../utils/draft";
import type { DraftScore } from "../../utils/scoring";
import PickRow from "../PickRow/PickRow";
import styles from "./DraftBoard.module.css";

type Props = {
  draft: MockDraft;
  score?: DraftScore;
  availableProspects: Prospect[];
  isLocked?: boolean;
  selectedPickNumber: number | null;
  onSelectPick: (pickNumber: number) => void;
  onClearPick: (pickNumber: number) => void;
  onOpenTrade: (pickNumber: number) => void;
  onDraftProspect: (prospect: Prospect) => void;
};

export default function DraftBoard({
  draft,
  score,
  availableProspects,
  isLocked = false,
  selectedPickNumber,
  onSelectPick,
  onClearPick,
  onOpenTrade,
  onDraftProspect,
}: Props) {
  const roundLimit = getDraftRoundLimit(draft);
  const selectedRound = selectedPickNumber
    ? Math.min(getRoundForPick(selectedPickNumber), roundLimit)
    : 1;
  const visiblePicks = draft.picks.filter(
    (pick) => getRoundForPick(pick.pickNumber) === selectedRound,
  );
  const scoredPicksByPickNumber = new Map(
    score?.scoredPicks.map((pick) => [pick.pickNumber, pick]),
  );

  return (
    <div className={styles.board}>
      <div className={styles.rounds} aria-label="Draft rounds">
        {Array.from({ length: roundLimit }, (_, index) => index + 1).map(
          (round) => (
            <button
              key={round}
              type="button"
              className={`${styles.round} ${
                round === selectedRound ? styles.roundActive : ""
              }`.trim()}
              onClick={() => {
                const firstPickInRound = draft.picks.find(
                  (pick) => getRoundForPick(pick.pickNumber) === round,
                );

                if (firstPickInRound) {
                  onSelectPick(firstPickInRound.pickNumber);
                }
              }}
            >
              Round {round}
            </button>
          ),
        )}
      </div>

      {visiblePicks.map((pick) => (
        <PickRow
          key={pick.pickNumber}
          pick={pick}
          scoredPick={scoredPicksByPickNumber.get(pick.pickNumber)}
          availableProspects={availableProspects}
          isLocked={isLocked}
          isSelected={selectedPickNumber === pick.pickNumber}
          onSelectPick={onSelectPick}
          onClearPick={onClearPick}
          onOpenTrade={onOpenTrade}
          onDraftProspect={onDraftProspect}
        />
      ))}
    </div>
  );
}
