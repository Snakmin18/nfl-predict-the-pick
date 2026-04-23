import { useEffect, useMemo, useState } from "react";
import { searchPlayers } from "../../api/cfbd";
import type { Prospect } from "../../types/prospect";
import { buildProspectMatchKey } from "../../utils/prospects";
import styles from "./ProspectPicker.module.css";

type Props = {
  prospects: Prospect[];
  selectedPickNumber: number | null;
  isLocked?: boolean;
  resultLimit?: number;
  compact?: boolean;
  inputId: string;
  onDraftProspect: (prospect: Prospect) => void;
};

function normalizePosition(position?: string) {
  return position?.trim().toUpperCase() ?? "";
}

export default function ProspectPicker({
  prospects,
  selectedPickNumber,
  isLocked = false,
  resultLimit = 15,
  compact = false,
  inputId,
  onDraftProspect,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [cfbdProspects, setCfbdProspects] = useState<Prospect[]>([]);
  const [cfbdStatus, setCfbdStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const normalizedSelectedPosition = normalizePosition(selectedPosition);

  const positionOptions = useMemo(() => {
    return Array.from(
      new Set(
        prospects
          .map((prospect) => normalizePosition(prospect.position))
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [prospects]);

  useEffect(() => {
    if (
      normalizedSelectedPosition &&
      !positionOptions.includes(normalizedSelectedPosition)
    ) {
      setSelectedPosition("");
    }
  }, [normalizedSelectedPosition, positionOptions]);

  const filteredProspects = useMemo(() => {
    if (!normalizedSelectedPosition) {
      return prospects;
    }

    return prospects.filter(
      (prospect) =>
        normalizePosition(prospect.position) === normalizedSelectedPosition,
    );
  }, [normalizedSelectedPosition, prospects]);

  const localSearchProspects = useMemo(() => {
    if (!normalizedSearchTerm) {
      return filteredProspects.slice(0, resultLimit);
    }

    return filteredProspects
      .filter((prospect) => {
        const searchableText = [
          prospect.name,
          prospect.school,
          prospect.position ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearchTerm);
      })
      .slice(0, Math.max(resultLimit, 20));
  }, [filteredProspects, normalizedSearchTerm, resultLimit]);

  const shouldSearchCfbd =
    normalizedSearchTerm.length >= 2 && localSearchProspects.length === 0;

  useEffect(() => {
    if (!shouldSearchCfbd) {
      return;
    }

    let isCanceled = false;

    const timeoutId = window.setTimeout(() => {
      setCfbdStatus("loading");

      searchPlayers(searchTerm)
        .then((players) => {
          if (isCanceled) return;

          setCfbdProspects(
            players
              .filter((player) => {
                if (!normalizedSelectedPosition) return true;

                return (
                  normalizePosition(player.position) ===
                  normalizedSelectedPosition
                );
              })
              .slice(0, Math.max(resultLimit, 20))
              .map((player, index) => {
                const school = player.school ?? "Unknown school";

                return {
                  id: `cfbd:${player.id}`,
                  name: player.name,
                  school,
                  position: player.position,
                  year: player.year,
                  ranking: 10000 + index,
                  matchKey: buildProspectMatchKey(player.name, school),
                };
              }),
          );
          setCfbdStatus("idle");
        })
        .catch(() => {
          if (isCanceled) return;

          setCfbdProspects([]);
          setCfbdStatus("error");
        });
    }, 300);

    return () => {
      isCanceled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    normalizedSelectedPosition,
    resultLimit,
    searchTerm,
    shouldSearchCfbd,
  ]);

  const visibleProspects = shouldSearchCfbd
    ? cfbdProspects
    : localSearchProspects;
  const visibleCfbdStatus = shouldSearchCfbd ? cfbdStatus : "idle";

  return (
    <div className={compact ? styles.compact : undefined}>
      <div className={styles.filterRow}>
        <label className={styles.filter} htmlFor={`${inputId}-position`}>
          <span>Position</span>
          <select
            id={`${inputId}-position`}
            value={selectedPosition}
            onChange={(event) => setSelectedPosition(event.target.value)}
          >
            <option value="">All positions</option>
            {positionOptions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.search} htmlFor={inputId}>
        <span>Search prospects</span>
        <input
          id={inputId}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Type a player name"
        />
      </label>

      <div className={styles.grid}>
        {visibleCfbdStatus === "loading" ? (
          <p className={styles.empty}>Searching college football data...</p>
        ) : visibleCfbdStatus === "error" ? (
          <p className={styles.empty}>College football search is unavailable.</p>
        ) : visibleProspects.length === 0 ? (
          <p className={styles.empty}>
            No available prospects found
            {selectedPosition ? ` for ${selectedPosition}` : ""}.
          </p>
        ) : (
          visibleProspects.map((prospect) => (
            <div key={prospect.id} className={styles.card}>
              <div className={styles.rank}>#{prospect.ranking}</div>
              <div className={styles.name}>{prospect.name}</div>
              <div className={styles.meta}>
                {prospect.position ?? "N/A"} | {prospect.school}
              </div>

              <button
                type="button"
                disabled={selectedPickNumber === null || isLocked}
                onClick={() => onDraftProspect(prospect)}
              >
                Draft
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
