import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadDraftOrder } from "../utils/draftOrderStorage";
import { buildDraft } from "../utils/draft";
import {
  loadOfficialDraft,
  saveDraft,
} from "../repositories/draftRepository";
import { getAuthUser } from "../utils/auth";
import { loadProfile } from "../utils/profileStorage";

const OFFICIAL_DRAFT_YEAR = 2026;

export default function OfficialDraftPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Loading results board...");

  useEffect(() => {
    let isMounted = true;

    async function openOfficialDraft() {
      const user = await getAuthUser();
      const profile = user ? await loadProfile(user.id) : null;

      if (!user || !profile?.isAppAdmin) {
        if (isMounted) setStatus("Only app admins can edit the results board.");
        return;
      }

      const existingDraft = await loadOfficialDraft(OFFICIAL_DRAFT_YEAR);
      if (existingDraft) {
        navigate(`/draft/${existingDraft.id}`, { replace: true });
        return;
      }

      const draft = buildDraft(
        `${OFFICIAL_DRAFT_YEAR} Draft Results`,
        loadDraftOrder(),
        {
          userId: user.id,
          year: OFFICIAL_DRAFT_YEAR,
          isOfficialResult: true,
          roundLimit: 7,
        },
      );

      await saveDraft(draft);
      navigate(`/draft/${draft.id}`, { replace: true });
    }

    openOfficialDraft().catch(() => {
      if (isMounted) setStatus("Unable to open the results board.");
    });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="page">
      <h1>Draft Results</h1>
      <p>{status}</p>
      <Link to="/">Back to home</Link>
    </div>
  );
}
