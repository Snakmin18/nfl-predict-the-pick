import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { nflTeams as teams } from "../data/nflTeams";
import type { MockDraft } from "../types/draft";
import { formatTeamLabel } from "../utils/teams";
import type { PendingTrade } from "../utils/trades";
import { getCurrentOwnerPickNumbers } from "../utils/trades";

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

  const portal = createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(9, 16, 29, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 9999,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          width: "min(960px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#0f172a",
          color: "#e5e7eb",
          border: "1px solid #334155",
          borderRadius: "16px",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.45)",
          padding: "1.25rem",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-modal-title"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h2
              id="trade-modal-title"
              style={{ margin: "0 0 0.2rem", color: "#f8fafc" }}
            >
              Trade Picks
            </h2>
            <p style={{ margin: 0, color: "#94a3b8" }}>
              Move ownership of existing picks between teams.
            </p>
          </div>

          <button
            type="button"
            style={{
              background: "transparent",
              color: "#cbd5e1",
              border: "1px solid #334155",
              borderRadius: "10px",
              width: "40px",
              height: "40px",
              fontSize: "1.5rem",
              lineHeight: "1",
              cursor: "pointer",
            }}
            onClick={onClose}
            aria-label="Close trade modal"
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(240px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <label
            style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
          >
            <span style={{ fontSize: "0.92rem", color: "#cbd5e1" }}>
              Team A
            </span>
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
              style={{
                background: "#111827",
                color: "#f8fafc",
                border: "1px solid #475569",
                borderRadius: "10px",
                padding: "0.7rem 0.8rem",
              }}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.city} {team.name}
                </option>
              ))}
            </select>
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
          >
            <span style={{ fontSize: "0.92rem", color: "#cbd5e1" }}>
              Team B
            </span>
            <select
              value={teamBId}
              onChange={(e) => {
                setTeamBId(e.target.value);
                setTeamBPickNumbers([]);
              }}
              style={{
                background: "#111827",
                color: "#f8fafc",
                border: "1px solid #475569",
                borderRadius: "10px",
                padding: "0.7rem 0.8rem",
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "1rem",
            marginTop: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "1rem",
            }}
          >
            <h3 style={{ margin: "0 0 0.25rem", color: "#f8fafc" }}>
              {formatTeamLabel(teamAId)}
            </h3>
            <p
              style={{
                margin: "0 0 0.75rem",
                color: "#94a3b8",
                fontSize: "0.9rem",
              }}
            >
              Picks going to Team B
            </p>

            {teamAPicks.length === 0 ? (
              <p style={{ margin: 0, color: "#94a3b8" }}>
                No picks currently owned.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                  maxHeight: "280px",
                  overflowY: "auto",
                }}
              >
                {teamAPicks.map((pickNumber) => (
                  <label
                    key={`${teamAId}-${pickNumber}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      color: "#e5e7eb",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={teamAPickNumbers.includes(pickNumber)}
                      onChange={() =>
                        setTeamAPickNumbers((current) =>
                          togglePick(current, pickNumber),
                        )
                      }
                      style={{ accentColor: "#60a5fa", cursor: "pointer" }}
                    />
                    <span>Pick #{pickNumber}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "1rem",
            }}
          >
            <h3 style={{ margin: "0 0 0.25rem", color: "#f8fafc" }}>
              {formatTeamLabel(teamBId)}
            </h3>
            <p
              style={{
                margin: "0 0 0.75rem",
                color: "#94a3b8",
                fontSize: "0.9rem",
              }}
            >
              Picks going to Team A
            </p>

            {teamBPicks.length === 0 ? (
              <p style={{ margin: 0, color: "#94a3b8" }}>
                No picks currently owned.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.6rem",
                  maxHeight: "280px",
                  overflowY: "auto",
                }}
              >
                {teamBPicks.map((pickNumber) => (
                  <label
                    key={`${teamBId}-${pickNumber}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      color: "#e5e7eb",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={teamBPickNumbers.includes(pickNumber)}
                      onChange={() =>
                        setTeamBPickNumbers((current) =>
                          togglePick(current, pickNumber),
                        )
                      }
                      style={{ accentColor: "#60a5fa", cursor: "pointer" }}
                    />
                    <span>Pick #{pickNumber}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
          }}
        >
          <div
            style={{
              minHeight: "1.25rem",
              color: "#cbd5e1",
              fontSize: "0.95rem",
            }}
          >
            {tradeSummary || "Select at least one pick to trade."}
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              style={{
                borderRadius: "10px",
                padding: "0.7rem 1rem",
                background: "transparent",
                color: "#e5e7eb",
                border: "1px solid #475569",
                cursor: "pointer",
              }}
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              style={{
                borderRadius: "10px",
                padding: "0.7rem 1rem",
                background: canApplyTrade ? "#2563eb" : "#666",
                color: "white",
                border: "1px solid #2563eb",
                cursor: canApplyTrade ? "pointer" : "not-allowed",
                opacity: canApplyTrade ? 1 : 0.5,
              }}
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

  return portal;
}
