import type { MockDraft } from "../types/draft";
import { getDraftRoundLimit, getRoundForPick } from "../utils/draft";
import type { DraftScore } from "../utils/scoring";
import PickRow from "./PickRow";

type Props = {
  draft: MockDraft;
  score?: DraftScore;
  isLocked?: boolean;
  selectedPickNumber: number | null;
  onSelectPick: (pickNumber: number) => void;
  onClearPick: (pickNumber: number) => void;
  onOpenTrade: (pickNumber: number) => void;
};

export default function DraftBoard({
  draft,
  score,
  isLocked = false,
  selectedPickNumber,
  onSelectPick,
  onClearPick,
  onOpenTrade,
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
    <div className="draft-board">
      <div className="draft-board__rounds" aria-label="Draft rounds">
        {Array.from({ length: roundLimit }, (_, index) => index + 1).map(
          (round) => (
            <button
              key={round}
              type="button"
              className={
                round === selectedRound
                  ? "draft-board__round draft-board__round--active"
                  : "draft-board__round"
              }
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
          isLocked={isLocked}
          isSelected={selectedPickNumber === pick.pickNumber}
          onSelectPick={onSelectPick}
          onClearPick={onClearPick}
          onOpenTrade={onOpenTrade}
        />
      ))}
    </div>
  );
}
