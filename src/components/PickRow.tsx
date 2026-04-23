import type { DraftPick } from "../types/draft";
import type { Prospect } from "../types/prospect";
import type { ScoredPick } from "../utils/scoring";
import { formatTeamLabel } from "../utils/teams";
import ProspectPicker from "./ProspectPicker";

type Props = {
  pick: DraftPick;
  scoredPick?: ScoredPick;
  availableProspects: Prospect[];
  isLocked?: boolean;
  isSelected: boolean;
  onSelectPick: (pickNumber: number) => void;
  onClearPick: (pickNumber: number) => void;
  onOpenTrade: (pickNumber: number) => void;
  onDraftProspect: (prospect: Prospect) => void;
};

export default function PickRow({
  pick,
  scoredPick,
  availableProspects,
  isLocked = false,
  isSelected,
  onSelectPick,
  onClearPick,
  onOpenTrade,
  onDraftProspect,
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
          <strong>+{scoredPick.playerPoints}</strong>{" "}
          Official: {scoredPick.officialPlayer.name}
        </div>
      )}

      {scoredPick?.tradePredictedSuccessfully && (
        <div className="pick-row__trade-hit">
          Trade predicted successfully (+{scoredPick.tradePoints})
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

      {!isLocked && isSelected && (
        <div
          className="pick-row__mobile-picker"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <ProspectPicker
            prospects={availableProspects}
            selectedPickNumber={pick.pickNumber}
            isLocked={isLocked}
            resultLimit={6}
            inputId={`mobile-prospect-search-${pick.pickNumber}`}
            onDraftProspect={onDraftProspect}
          />
        </div>
      )}
    </div>
  );
}
