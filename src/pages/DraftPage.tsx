import { useLocation, useParams } from "react-router-dom";
import { Link } from "react-router-dom";

import DraftBoard from "../components/DraftBoard/DraftBoard";
import DraftScoreSummary from "../components/DraftPage/DraftScoreSummary/DraftScoreSummary";
import DraftSubmissionCard from "../components/DraftPage/DraftSubmissionCard/DraftSubmissionCard";
import OfficialDraftControls from "../components/DraftPage/OfficialDraftControls/OfficialDraftControls";
import TopProspectsPanel from "../components/TopProspectsPanel/TopProspectsPanel";
import TradeModal from "../components/TradeModal/TradeModal";
import { useDraftPage } from "../hooks/useDraftPage";

export default function DraftPage() {
  const { draftId = "" } = useParams();
  const location = useLocation();
  const navigationState = location.state as { viewerParticipantId?: string } | null;
  const {
    availableProspects,
    backTo,
    canEditOfficial,
    canSubmitDraft,
    completedPredictionPicks,
    draft,
    handleApplyTrade,
    handleClearPick,
    handleCloseTrade,
    handleDraftProspect,
    handleOpenTrade,
    handleSaveDraft,
    handleSelectPick,
    handleSubmitDraft,
    isDraftLocked,
    isDraftSubmitted,
    isLoading,
    isParticipantDraft,
    isSubmissionDeadlinePassed,
    isTradeModalOpen,
    loadError,
    officialDraftMessage,
    predictionPicks,
    saveStatus,
    score,
    selectedPickNumber,
    submitDraftMessage,
    tradePickNumber,
  } = useDraftPage({
    draftId,
    viewerParticipantId: navigationState?.viewerParticipantId,
  });

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

      {score && <DraftScoreSummary score={score} />}

      {isParticipantDraft && (
        <DraftSubmissionCard
          canSubmitDraft={canSubmitDraft}
          completedPredictionPicks={completedPredictionPicks}
          handleSaveDraft={handleSaveDraft}
          handleSubmitDraft={handleSubmitDraft}
          isDraftSubmitted={isDraftSubmitted}
          isSubmissionDeadlinePassed={isSubmissionDeadlinePassed}
          predictionPickCount={predictionPicks.length}
          saveStatus={saveStatus}
          submitDraftMessage={submitDraftMessage}
          submittedAt={draft.submittedAt}
        />
      )}

      {draft.isOfficialResult && (
        <OfficialDraftControls
          canEditOfficial={canEditOfficial}
          handleSaveDraft={handleSaveDraft}
          message={officialDraftMessage}
          saveStatus={saveStatus}
        />
      )}

      <div className="draft-layout">
        <div className="draft-layout__left">
          <DraftBoard
            draft={draft}
            score={score}
            availableProspects={availableProspects}
            isLocked={isDraftLocked}
            selectedPickNumber={selectedPickNumber}
            onSelectPick={handleSelectPick}
            onClearPick={handleClearPick}
            onOpenTrade={handleOpenTrade}
            onDraftProspect={handleDraftProspect}
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
