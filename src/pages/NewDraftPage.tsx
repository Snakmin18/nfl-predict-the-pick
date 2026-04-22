import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { MockDraft } from "../types/draft";
import { getAllDrafts, saveDraft } from "../utils/draftStorage";
import { loadDraftOrder } from "../utils/draftOrderStorage";

function buildInitialDraft(title: string): MockDraft {
  const draftOrder = loadDraftOrder();

  return {
    id: crypto.randomUUID(),
    bigBoard: [],
    title,
    year: 2026,
    createdAt: new Date().toISOString(),
    picks: draftOrder.map((item) => ({
      pickNumber: item.pickNumber,
      teamId: item.teamId,
      originalOwnerTeamId: item.originalOwnerTeamId,
      predictedPlayer: null,
    })),
  };
}

export default function NewDraftPage() {
  const [title, setTitle] = useState("");
  const navigate = useNavigate();
  const drafts = useMemo(() => getAllDrafts(), []);

  const handleCreateDraft = () => {
    const finalTitle = title.trim() || "My Mock Draft";
    const draft = buildInitialDraft(finalTitle);
    saveDraft(draft);
    navigate(`/draft/${draft.id}`);
  };

  return (
    <div className="page">
      <h1>NFL Mock Draft Predictor</h1>
      <p>Create a new mock draft and make your picks.</p>

      <div className="card">
        <label htmlFor="draft-title">Draft title</label>
        <input
          id="draft-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Jake's 2026 Mock Draft"
        />
        <button onClick={handleCreateDraft}>Create Draft</button>
      </div>

      <div className="card">
        <Link to="/admin/draft-order">Admin: Edit Draft Order</Link>
      </div>

      <div className="card">
        <h2>Saved Drafts</h2>
        {drafts.length === 0 ? (
          <p>No drafts yet.</p>
        ) : (
          <ul>
            {drafts.map((draft) => (
              <li key={draft.id}>
                <Link to={`/draft/${draft.id}`}>{draft.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
