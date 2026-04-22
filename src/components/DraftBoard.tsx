import type { MockDraft } from "../types/draft";
import PickRow from "./PickRow";

type Props = {
  draft: MockDraft;
  selectedPickNumber: number | null;
  onSelectPick: (pickNumber: number) => void;
  onClearPick: (pickNumber: number) => void;
};

export default function DraftBoard({
  draft,
  selectedPickNumber,
  onSelectPick,
  onClearPick,
}: Props) {
  return (
    <div className="draft-board">
      {draft.picks.map((pick) => (
        <PickRow
          key={pick.pickNumber}
          pick={pick}
          isSelected={selectedPickNumber === pick.pickNumber}
          onSelectPick={onSelectPick}
          onClearPick={onClearPick}
        />
      ))}
    </div>
  );
}
