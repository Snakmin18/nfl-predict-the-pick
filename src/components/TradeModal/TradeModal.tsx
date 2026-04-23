import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { nflTeams as teams } from "../../data/nflTeams";
import type { MockDraft } from "../../types/draft";
import { formatTeamLabel } from "../../utils/teams";
import type { PendingTrade } from "../../utils/trades";
import { getCurrentOwnerPickNumbers } from "../../utils/trades";
import styles from "./TradeModal.module.css";

type Props = {
  isOpen: boolean;
  draft: MockDraft;
  initialPickNumber: number | null;
  onClose: () => void;
  onApplyTrade: (trade: PendingTrade) => void;
};

function togglePick(current: number[], pickNumber: number) {
  if (current.includes(pickNumber)) {
    return current.filter((value) => value !== pickNumber);
  }

  return [...current, pickNumber].sort((a, b) => a - b);
}

export default function TradeModal({
  isOpen,
  draft,
  initialPickNumber,
  onClose,
  onApplyTrade,
}: Props) {
  const initialPick = useMemo(
    () =>
      initialPickNumber === null
        ? null
        : (draft.picks.find((pick) => pick.pickNumber === initialPickNumber) ??
          null),
    [draft, initialPickNumber],
  );

  const defaultTeamAId = initialPick?.teamId ?? draft.picks[0]?.teamId ?? "";
  const defaultTeamBId =
    teams.find((team) => team.id !== defaultTeamAId)?.id ?? "";

  const [teamAId, setTeamAId] = useState(defaultTeamAId);
  const [teamBId, setTeamBId] = useState(defaultTeamBId);
  const [teamAPickNumbers, setTeamAPickNumbers] = useState<number[]>(
    initialPick ? [initialPick.pickNumber] : [],
  );
  const [teamBPickNumbers, setTeamBPickNumbers] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const teamAPicks = useMemo(
    () => getCurrentOwnerPickNumbers(draft, teamAId),
    [draft, teamAId],
  );

  const teamBPicks = useMemo(
    () => getCurrentOwnerPickNumbers(draft, teamBId),
    [draft, teamBId],
  );

  const validTeamAPickNumbers = useMemo(() => {
    const validPicks = new Set(teamAPicks);
    return teamAPickNumbers.filter((pick) => validPicks.has(pick));
  }, [teamAPickNumbers, teamAPicks]);

  const validTeamBPickNumbers = useMemo(() => {
    const validPicks = new Set(teamBPicks);
    return teamBPickNumbers.filter((pick) => validPicks.has(pick));
  }, [teamBPickNumbers, teamBPicks]);

  const canApplyTrade =
    teamAId !== "" &&
    teamBId !== "" &&
    teamAId !== teamBId &&
    (validTeamAPickNumbers.length > 0 || validTeamBPickNumbers.length > 0);

  const tradeSummary = [
    validTeamAPickNumbers.length > 0
      ? `${formatTeamLabel(teamBId)} receives: ${validTeamAPickNumbers
          .map((pick) => `#${pick}`)
          .join(", ")}`
      : null,
    validTeamBPickNumbers.length > 0
      ? `${formatTeamLabel(teamAId)} receives: ${validTeamBPickNumbers
          .map((pick) => `#${pick}`)
          .join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const handleApply = () => {
    if (!canApplyTrade) return;

    onApplyTrade({
      teamAId,
      teamBId,
      teamAPickNumbers: validTeamAPickNumbers,
      teamBPickNumbers: validTeamBPickNumbers,
    });

    onClose();
  };

  if (!isOpen) {
    return null;
  }

  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) {
    console.error("Modal root not found!");
    return <div>Modal root not found</div>;
  }

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-modal-title"
      >
        <div className={styles.header}>
          <div>
            <h2 id="trade-modal-title">Trade Picks</h2>
            <p>Move ownership of existing picks between teams.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close trade modal"
          >
            x
          </button>
        </div>

        <div className={styles.teamSelects}>
          <label className={styles.field}>
            <span>Team A</span>
            <select
              value={teamAId}
              onChange={(e) => {
                const nextTeamAId = e.target.value;
                setTeamAId(nextTeamAId);

                if (nextTeamAId === teamBId) {
                  const fallbackTeamId =
                    teams.find((team) => team.id !== nextTeamAId)?.id ?? "";
                  setTeamBId(fallbackTeamId);
                }

                setTeamAPickNumbers([]);
              }}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.city} {team.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Team B</span>
            <select
              value={teamBId}
              onChange={(e) => {
                setTeamBId(e.target.value);
                setTeamBPickNumbers([]);
              }}
            >
              {teams
                .filter((team) => team.id !== teamAId)
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.city} {team.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <div className={styles.columns}>
          <div className={styles.column}>
            <h3>{formatTeamLabel(teamAId)}</h3>
            <p className={styles.subtle}>Picks going to Team B</p>

            {teamAPicks.length === 0 ? (
              <p className={styles.empty}>No picks currently owned.</p>
            ) : (
              <div className={styles.pickList}>
                {teamAPicks.map((pickNumber) => (
                  <label
                    key={`${teamAId}-${pickNumber}`}
                    className={styles.pickOption}
                  >
                    <input
                      type="checkbox"
                      checked={teamAPickNumbers.includes(pickNumber)}
                      onChange={() =>
                        setTeamAPickNumbers((current) =>
                          togglePick(current, pickNumber),
                        )
                      }
                    />
                    <span>Pick #{pickNumber}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className={styles.column}>
            <h3>{formatTeamLabel(teamBId)}</h3>
            <p className={styles.subtle}>Picks going to Team A</p>

            {teamBPicks.length === 0 ? (
              <p className={styles.empty}>No picks currently owned.</p>
            ) : (
              <div className={styles.pickList}>
                {teamBPicks.map((pickNumber) => (
                  <label
                    key={`${teamBId}-${pickNumber}`}
                    className={styles.pickOption}
                  >
                    <input
                      type="checkbox"
                      checked={teamBPickNumbers.includes(pickNumber)}
                      onChange={() =>
                        setTeamBPickNumbers((current) =>
                          togglePick(current, pickNumber),
                        )
                      }
                    />
                    <span>Pick #{pickNumber}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.summary}>
            {tradeSummary || "Select at least one pick to trade."}
          </div>

          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className={styles.applyButton}
              onClick={handleApply}
              disabled={!canApplyTrade}
            >
              Apply Trade
            </button>
          </div>
        </div>
      </div>
    </div>,
    modalRoot,
  );
}
