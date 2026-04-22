import type { DraftPick } from "../types/draft";
import type { ScoredPick } from "../utils/scoring";
import { formatTeamLabel } from "../utils/teams";

type Props = {
  pick: DraftPick;
  scoredPick?: ScoredPick;
  isLocked?: boolean;
  isSelected: boolean;
  onSelectPick: (pickNumber: number) => void;
  onClearPick: (pickNumber: number) => void;
  onOpenTrade: (pickNumber: number) => void;
};

export default function PickRow({
  pick,
  scoredPick,
  isLocked = false,
  isSelected,
  onSelectPick,
  onClearPick,
  onOpenTrade,
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
          ? `${pick.predictedPlayer.name} (${pick.predictedPlayer.position ?? "N/A"}, ${pick.predictedPlayer.school})`
          : "No player selected"}
      </div>

      {scoredPick?.officialPlayer && (
        <div className="pick-row__score">
          <strong>+{scoredPick.points}</strong>{" "}
          Official: {scoredPick.officialPlayer.name}
        </div>
      )}

      {scoredPick?.officialPickNumber && pick.predictedPlayer && (
        <div className="pick-row__score">
          {pick.predictedPlayer.name} went #{scoredPick.officialPickNumber}
          {scoredPick.pickDistance !== null
            ? ` (${scoredPick.pickDistance} pick${scoredPick.pickDistance === 1 ? "" : "s"} off)`
            : ""}
        </div>
      )}

      {!isLocked && (
        <div className="pick-row__actions">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTrade(pick.pickNumber);
            }}
          >
            Trade
          </button>

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
      )}
    </div>
  );
}
