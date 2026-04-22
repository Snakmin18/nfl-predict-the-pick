import type { Prospect } from "../types/prospect";

type Props = {
  prospects: Prospect[];
  selectedPickNumber: number | null;
  onDraftProspect: (prospect: Prospect) => void;
};

export default function TopProspectsPanel({
  prospects,
  selectedPickNumber,
  onDraftProspect,
}: Props) {
  return (
    <aside className="prospects-panel">
      <h2>Top Available Prospects</h2>
      <p>
        {selectedPickNumber
          ? `Drafting for pick #${selectedPickNumber}`
          : "Select a pick to draft a player"}
      </p>

      <div className="prospects-grid">
        {prospects.map((prospect) => (
          <div key={prospect.id} className="prospect-card">
            <div className="prospect-card__rank">#{prospect.ranking}</div>
            <div className="prospect-card__name">{prospect.name}</div>
            <div className="prospect-card__meta">
              {prospect.position ?? "—"} | {prospect.school}
            </div>

            <button
              type="button"
              disabled={selectedPickNumber === null}
              onClick={() => onDraftProspect(prospect)}
            >
              Draft
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
