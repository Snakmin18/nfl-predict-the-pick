import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DraftBoard from "../components/DraftBoard";
import TopProspectsPanel from "../components/TopProspectsPanel";
import { rankedProspects } from "../data/prospects";
import type { MockDraft } from "../types/draft";
import type { Prospect } from "../types/prospect";
import { getTopAvailableProspects } from "../utils/draft";
import { loadDraft, saveDraft } from "../utils/draftStorage";

export default function DraftPage() {
  const { draftId = "" } = useParams();
  const initialDraft = useMemo(() => loadDraft(draftId), [draftId]);
  const [draft, setDraft] = useState<MockDraft | null>(initialDraft);
  const [selectedPickNumber, setSelectedPickNumber] = useState<number | null>(
    1,
  );

  const topAvailableProspects = useMemo(() => {
    if (!draft) return [];
    return getTopAvailableProspects(rankedProspects, draft, 15);
  }, [draft]);

  const handleSelectPick = (pickNumber: number) => {
    setSelectedPickNumber(pickNumber);
  };

  const handleDraftProspect = (prospect: Prospect) => {
    if (!draft || selectedPickNumber === null) return;

    const updatedDraft: MockDraft = {
      ...draft,
      picks: draft.picks.map((pick) =>
        pick.pickNumber === selectedPickNumber
          ? { ...pick, predictedPlayer: prospect }
          : pick,
      ),
    };

    setDraft(updatedDraft);
    saveDraft(updatedDraft);

    const nextEmptyPick = updatedDraft.picks.find(
      (pick) => pick.pickNumber > selectedPickNumber && !pick.predictedPlayer,
    );

    if (nextEmptyPick) {
      setSelectedPickNumber(nextEmptyPick.pickNumber);
    }
  };

  const handleClearPick = (pickNumber: number) => {
    if (!draft) return;

    const updatedDraft: MockDraft = {
      ...draft,
      picks: draft.picks.map((pick) =>
        pick.pickNumber === pickNumber
          ? { ...pick, predictedPlayer: null }
          : pick,
      ),
    };

    setDraft(updatedDraft);
    saveDraft(updatedDraft);
  };

  if (!draft) {
    return (
      <div className="page">
        <h1>Draft not found</h1>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/">← Back</Link>
      <h1>{draft.title}</h1>

      <div className="draft-layout">
        <div className="draft-layout__left">
          <DraftBoard
            draft={draft}
            selectedPickNumber={selectedPickNumber}
            onSelectPick={handleSelectPick}
            onClearPick={handleClearPick}
          />
        </div>

        <div className="draft-layout__right">
          <TopProspectsPanel
            prospects={topAvailableProspects}
            selectedPickNumber={selectedPickNumber}
            onDraftProspect={handleDraftProspect}
          />
        </div>
      </div>
    </div>
  );
}
