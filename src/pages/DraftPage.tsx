import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import DraftBoard from "../components/DraftBoard";
import TopProspectsPanel from "../components/TopProspectsPanel";
import TradeModal from "../components/TradeModal";

import { rankedProspects } from "../data/prospects";

import type { MockDraft } from "../types/draft";
import type { Lobby } from "../types/lobby";
import type { Prospect } from "../types/prospect";
import type { PendingTrade } from "../utils/trades";

import {
  getDraftRoundLimit,
  getTopAvailableProspects,
  getRoundForPick,
  isPickInPredictionRange,
} from "../utils/draft";
import {
  getAllDrafts,
  loadDraft,
  saveDraft,
} from "../utils/draftStorage";
import { loadLobby } from "../utils/lobbyStorage";
import { scoreDraft, type DraftScore } from "../utils/scoring";
import { applyPickTrade } from "../utils/trades";

export default function DraftPage() {
  const { draftId = "" } = useParams();
  const location = useLocation();
  const navigationState = location.state as { viewerParticipantId?: string } | null;

  const [draft, setDraft] = useState<MockDraft | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [officialDraft, setOfficialDraft] = useState<MockDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedPickNumber, setSelectedPickNumber] = useState<number | null>(
    1,
  );
  const [saveStatus, setSaveStatus] = useState("");
  const [tradePickNumber, setTradePickNumber] = useState<number | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  const availableProspects = useMemo(() => {
    if (!draft) return [];
    return getTopAvailableProspects(rankedProspects, draft);
  }, [draft]);

  useEffect(() => {
    let isMounted = true;

    loadDraft(draftId)
      .then(async (loadedDraft) => {
        if (!isMounted) return;

        setDraft(loadedDraft);

        if (loadedDraft?.lobbyId) {
          const loadedLobby = await loadLobby(loadedDraft.lobbyId);
          if (isMounted) setLobby(loadedLobby);
        }

        if (loadedDraft?.lobbyId && !loadedDraft.isOfficialResult) {
          const allDrafts = await getAllDrafts();
          const loadedOfficialDraft =
            allDrafts.find(
              (candidate) =>
                candidate.lobbyId === loadedDraft.lobbyId &&
                candidate.isOfficialResult,
            ) ?? null;

          if (isMounted) setOfficialDraft(loadedOfficialDraft);
        }
      })
      .catch(() => {
        if (isMounted) setLoadError("Unable to load draft.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [draftId]);

  const handleSelectPick = (pickNumber: number) => {
    setSelectedPickNumber(pickNumber);
  };

  const handleDraftProspect = (prospect: Prospect) => {
    if (!draft || selectedPickNumber === null || draft.submittedAt) return;

    const updatedDraft: MockDraft = {
      ...draft,
      picks: draft.picks.map((pick) =>
        pick.pickNumber === selectedPickNumber
          ? { ...pick, predictedPlayer: prospect }
          : pick,
      ),
    };

    setDraft(updatedDraft);
    setSaveStatus("");

    const nextEmptyPick = updatedDraft.picks.find(
      (pick) =>
        pick.pickNumber > selectedPickNumber &&
        isPickInPredictionRange(updatedDraft, pick.pickNumber) &&
        !pick.predictedPlayer,
    );

    if (nextEmptyPick) {
      setSelectedPickNumber(nextEmptyPick.pickNumber);
    }
  };

  const handleClearPick = (pickNumber: number) => {
    if (!draft || draft.submittedAt) return;

    const updatedDraft: MockDraft = {
      ...draft,
      picks: draft.picks.map((pick) =>
        pick.pickNumber === pickNumber
          ? { ...pick, predictedPlayer: null }
          : pick,
      ),
    };

    setDraft(updatedDraft);
    setSaveStatus("");
  };

  const handleOpenTrade = (pickNumber: number) => {
    if (draft?.submittedAt) return;

    setTradePickNumber(pickNumber);
    setIsTradeModalOpen(true);
  };

  const handleCloseTrade = () => {
    setIsTradeModalOpen(false);
    setTradePickNumber(null);
  };

  const handleApplyTrade = (trade: PendingTrade) => {
    if (!draft || draft.submittedAt) return;

    const updatedDraft = applyPickTrade(draft, trade);

    setDraft(updatedDraft);
    setSaveStatus("");
  };

  const handleSaveDraft = async () => {
    if (!draft || draft.submittedAt) return;

    setSaveStatus("Saving...");
    await saveDraft(draft);
    setSaveStatus("Saved.");
  };

  const handleSubmitDraft = async () => {
    if (!draft || draft.isOfficialResult || draft.submittedAt) return;

    const submittedDraft = {
      ...draft,
      submittedAt: new Date().toISOString(),
    };

    setDraft(submittedDraft);
    setSaveStatus("Submitting...");
    await saveDraft(submittedDraft);
    setSaveStatus("Submitted.");
  };

  const score: DraftScore | undefined =
    draft && officialDraft && !draft.isOfficialResult
      ? scoreDraft(draft, officialDraft)
      : undefined;

  const predictionPicks = draft
    ? draft.picks.filter(
        (pick) => getRoundForPick(pick.pickNumber) <= getDraftRoundLimit(draft),
      )
    : [];
  const completedPredictionPicks = predictionPicks.filter(
    (pick) => pick.predictedPlayer,
  ).length;
  const isParticipantLobbyDraft = Boolean(
    draft?.lobbyId && !draft.isOfficialResult,
  );
  const isDraftSubmitted = Boolean(draft?.submittedAt);
  const isDraftLocked = isParticipantLobbyDraft && isDraftSubmitted;
  const canSubmitDraft =
    isParticipantLobbyDraft &&
    !isDraftSubmitted &&
    predictionPicks.length > 0 &&
    completedPredictionPicks === predictionPicks.length;
  const backTo =
    draft?.lobbyId &&
    (navigationState?.viewerParticipantId ||
      draft.participantId ||
      lobby?.hostParticipantId)
      ? `/lobby/${draft.lobbyId}/${
          navigationState?.viewerParticipantId ??
          draft.participantId ??
          lobby?.hostParticipantId
        }`
      : "/";

  if (isLoading) {
    return (
      <div className="page">
        <h1>Loading draft...</h1>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page">
        <h1>{loadError}</h1>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

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
      <Link to={backTo}>Back</Link>
      <h1>{draft.title}</h1>

      {score && (
        <div className="score-summary">
          <strong>
            Score: {score.points}/{score.completedOfficialPicks * 100}
          </strong>
          <span>
            Official picks completed: {score.completedOfficialPicks}/
            {score.possiblePoints / 100}
          </span>
        </div>
      )}

      {isParticipantLobbyDraft && (
        <div className="card">
          <h2>{isDraftSubmitted ? "Draft submitted" : "Submit your draft"}</h2>
          <p>
            Picks complete: {completedPredictionPicks}/{predictionPicks.length}
          </p>
          {isDraftSubmitted ? (
            <p>
              Submitted {new Date(draft.submittedAt as string).toLocaleString()}
            </p>
          ) : (
            <div className="draft-actions">
              <button type="button" onClick={handleSaveDraft}>
                Save Progress
              </button>
              <button
                type="button"
                disabled={!canSubmitDraft}
                onClick={handleSubmitDraft}
              >
                Submit Draft
              </button>
            </div>
          )}
          {saveStatus && <p>{saveStatus}</p>}
        </div>
      )}

      {draft.isOfficialResult && (
        <div className="card">
          <h2>Official results</h2>
          <p>Save after entering official picks to update scoring.</p>
          <button type="button" onClick={handleSaveDraft}>
            Save Official Results
          </button>
          {saveStatus && <p>{saveStatus}</p>}
        </div>
      )}

      <div className="draft-layout">
        <div className="draft-layout__left">
          <DraftBoard
            draft={draft}
            score={score}
            isLocked={isDraftLocked}
            selectedPickNumber={selectedPickNumber}
            onSelectPick={handleSelectPick}
            onClearPick={handleClearPick}
            onOpenTrade={handleOpenTrade}
          />
        </div>

        <div className="draft-layout__right">
          <TopProspectsPanel
            prospects={availableProspects}
            selectedPickNumber={selectedPickNumber}
            isLocked={isDraftLocked}
            onDraftProspect={handleDraftProspect}
          />
        </div>
      </div>

      {isTradeModalOpen && (
        <TradeModal
          isOpen={isTradeModalOpen}
          draft={draft}
          initialPickNumber={tradePickNumber}
          onClose={handleCloseTrade}
          onApplyTrade={handleApplyTrade}
        />
      )}
    </div>
  );
}
