import { useEffect, useMemo, useState } from "react";
import { searchPlayers } from "../api/cfbd";
import type { Prospect } from "../types/prospect";
import { buildProspectMatchKey } from "../utils/prospects";

type Props = {
  prospects: Prospect[];
  selectedPickNumber: number | null;
  isLocked?: boolean;
  onDraftProspect: (prospect: Prospect) => void;
};

export default function TopProspectsPanel({
  prospects,
  selectedPickNumber,
  isLocked = false,
  onDraftProspect,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cfbdProspects, setCfbdProspects] = useState<Prospect[]>([]);
  const [cfbdStatus, setCfbdStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  );
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const localSearchProspects = useMemo(() => {
    if (!normalizedSearchTerm) {
      return prospects.slice(0, 15);
    }

    return prospects
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
      .slice(0, 20);
  }, [normalizedSearchTerm, prospects]);

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
            players.slice(0, 20).map((player, index) => {
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
  }, [searchTerm, shouldSearchCfbd]);

  const visibleProspects = shouldSearchCfbd
    ? cfbdProspects
    : localSearchProspects;
  const visibleCfbdStatus = shouldSearchCfbd ? cfbdStatus : "idle";

  return (
    <aside className="prospects-panel">
      <h2>Top Available Prospects</h2>
      <p>
        {selectedPickNumber
          ? isLocked
            ? "This draft has been submitted"
            : `Drafting for pick #${selectedPickNumber}`
          : "Select a pick to draft a player"}
      </p>

      <label className="prospects-search" htmlFor="prospect-search">
        <span>Search prospects</span>
        <input
          id="prospect-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type a player name"
        />
      </label>

      <div className="prospects-grid">
        {visibleCfbdStatus === "loading" ? (
          <p className="prospects-empty">Searching college football data...</p>
        ) : visibleCfbdStatus === "error" ? (
          <p className="prospects-empty">
            College football search is unavailable.
          </p>
        ) : visibleProspects.length === 0 ? (
          <p className="prospects-empty">No available prospects found.</p>
        ) : (
          visibleProspects.map((prospect) => (
            <div key={prospect.id} className="prospect-card">
              <div className="prospect-card__rank">#{prospect.ranking}</div>
              <div className="prospect-card__name">{prospect.name}</div>
              <div className="prospect-card__meta">
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
    </aside>
  );
}
