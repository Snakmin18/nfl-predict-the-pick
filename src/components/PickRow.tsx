import type { DraftPick } from "../types/draft";
import { formatTeamLabel } from "../utils/teams";

type Props = {
  pick: DraftPick;
  isSelected: boolean;
  onSelectPick: (pickNumber: number) => void;
  onClearPick: (pickNumber: number) => void;
};

export default function PickRow({
  pick,
  isSelected,
  onSelectPick,
  onClearPick,
}: Props) {
  return (
    <div
      className={`pick-row ${isSelected ? "pick-row--selected" : ""}`}
      onClick={() => onSelectPick(pick.pickNumber)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelectPick(pick.pickNumber);
        }
      }}
    >
      <div className="pick-row__top">
        <div>
          <strong>#{pick.pickNumber}</strong>
        </div>
        <div>{formatTeamLabel(pick.teamId, pick.originalOwnerTeamId)}</div>
      </div>

      <div className="pick-row__current">
        <strong>Prediction:</strong>{" "}
        {pick.predictedPlayer
          ? `${pick.predictedPlayer.name} (${pick.predictedPlayer.position ?? "—"}, ${pick.predictedPlayer.school})`
          : "No player selected"}
      </div>

      {pick.predictedPlayer && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClearPick(pick.pickNumber);
          }}
        >
          Clear Pick
        </button>
      )}
    </div>
  );
}
