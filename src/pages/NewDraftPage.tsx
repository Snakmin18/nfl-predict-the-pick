import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { MockDraft } from "../types/draft";
import { getAllDrafts, saveDraft } from "../utils/draftStorage";
import { loadDraftOrder } from "../utils/draftOrderStorage";
import { buildDraft } from "../utils/draft";

function buildInitialDraft(title: string): MockDraft {
  return buildDraft(title, loadDraftOrder());
}

export default function NewDraftPage() {
  const [title, setTitle] = useState("");
  const [drafts, setDrafts] = useState<MockDraft[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    getAllDrafts()
      .then((loadedDrafts) => {
        if (isMounted) {
          setDrafts(loadedDrafts.filter((draft) => !draft.isOfficialResult));
        }
      })
      .catch(() => {
        if (isMounted) setError("Unable to load drafts.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingDrafts(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateDraft = async () => {
    const finalTitle = title.trim() || "My Mock Draft";
    const draft = buildInitialDraft(finalTitle);

    try {
      await saveDraft(draft);
      navigate(`/draft/${draft.id}`);
    } catch {
      setError("Unable to create draft. Please try again.");
    }
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
        {error && <p className="error">{error}</p>}
        <button onClick={handleCreateDraft}>Create Draft</button>
      </div>

      <div className="card">
        <Link to="/admin/draft-order">Admin: Edit Draft Order</Link>
      </div>

      <div className="card">
        <h2>Saved Drafts</h2>
        {isLoadingDrafts ? (
          <p>Loading drafts...</p>
        ) : drafts.length === 0 ? (
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
