import { useEffect, useMemo, useState } from "react";
import type { MockDraft } from "../types/draft";
import type { Lobby } from "../types/lobby";
import type { Prospect } from "../types/prospect";
import type { PendingTrade } from "../utils/trades";
import { getTopAvailableProspects, isPickInPredictionRange } from "../utils/draft";
import { isPastDraftSubmissionDeadline } from "../utils/deadlines";
import { saveDraft } from "../repositories/draftRepository";
import { scoreDraft, type DraftScore } from "../utils/scoring";
import { supabase } from "../lib/supabase/client";
import { applyPickTrade } from "../utils/trades";
import {
  canEditOfficialDraft,
  canEditParticipantDraft,
  canSubmitParticipantDraft,
  countCompletedPredictionPicks,
  getOfficialDraftMessage,
  getPredictionPicks,
  getSubmitDraftMessage,
  isDraftLocked as getIsDraftLocked,
  isParticipantLobbyDraft,
  loadDraftPageData,
  loadOfficialDraftForYear,
  submitParticipantDraft,
} from "../services/draftService";
import { rankedProspects } from "../data/prospects";

type Options = {
  draftId: string;
  viewerParticipantId?: string | null;
};

export function useDraftPage({ draftId, viewerParticipantId }: Options) {
  const [draft, setDraft] = useState<MockDraft | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [officialDraft, setOfficialDraft] = useState<MockDraft | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isCurrentUserAppAdmin, setIsCurrentUserAppAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedPickNumber, setSelectedPickNumber] = useState<number | null>(1);
  const [saveStatus, setSaveStatus] = useState("");
  const [tradePickNumber, setTradePickNumber] = useState<number | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isSubmissionDeadlinePassed, setIsSubmissionDeadlinePassed] = useState(
    () => isPastDraftSubmissionDeadline(),
  );

  const availableProspects = useMemo(() => {
    if (!draft) return [];
    return getTopAvailableProspects(rankedProspects, draft);
  }, [draft]);

  const draftYear = draft?.year;
  const isOfficialResult = draft?.isOfficialResult;
  const officialDraftId = officialDraft?.id;

  useEffect(() => {
    let isMounted = true;

    loadDraftPageData(draftId)
      .then(
        ({
          draft: loadedDraft,
          currentUserId: nextUserId,
          isCurrentUserAppAdmin: nextIsAppAdmin,
          lobby: loadedLobby,
          officialDraft: loadedOfficialDraft,
        }) => {
          if (!isMounted) return;

          setDraft(loadedDraft);
          setCurrentUserId(nextUserId);
          setIsCurrentUserAppAdmin(nextIsAppAdmin);
          setLobby(loadedLobby);
          setOfficialDraft(loadedOfficialDraft);
        },
      )
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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setIsSubmissionDeadlinePassed(isPastDraftSubmissionDeadline());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!supabase || !draftYear || isOfficialResult) return;

    const realtimeClient = supabase;
    let isSubscribed = true;
    let refreshTimer: number | undefined;

    const refreshOfficialDraft = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(async () => {
        try {
          const updatedOfficialDraft = await loadOfficialDraftForYear(draftYear);
          if (isSubscribed) setOfficialDraft(updatedOfficialDraft);
        } catch {
          // Realtime refreshes are opportunistic; the normal page state remains usable.
        }
      }, 300);
    };

    const officialDraftChannel = realtimeClient
      .channel(`official-draft-${draftYear}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drafts",
          filter: `year=eq.${draftYear}`,
        },
        refreshOfficialDraft,
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      window.clearTimeout(refreshTimer);
      void realtimeClient.removeChannel(officialDraftChannel);
    };
  }, [draftYear, isOfficialResult]);

  useEffect(() => {
    if (!supabase || !draftYear || isOfficialResult || !officialDraftId) return;

    const realtimeClient = supabase;
    let isSubscribed = true;
    let refreshTimer: number | undefined;

    const refreshOfficialDraft = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(async () => {
        try {
          const updatedOfficialDraft = await loadOfficialDraftForYear(draftYear);
          if (isSubscribed) setOfficialDraft(updatedOfficialDraft);
        } catch {
          // Realtime refreshes are opportunistic; the normal page state remains usable.
        }
      }, 300);
    };

    const officialPicksChannel = realtimeClient
      .channel(`official-draft-picks-${officialDraftId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "draft_picks",
          filter: `draft_id=eq.${officialDraftId}`,
        },
        refreshOfficialDraft,
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      window.clearTimeout(refreshTimer);
      void realtimeClient.removeChannel(officialPicksChannel);
    };
  }, [draftYear, isOfficialResult, officialDraftId]);

  const score: DraftScore | undefined =
    draft && officialDraft && !draft.isOfficialResult
      ? scoreDraft(draft, officialDraft)
      : undefined;

  const predictionPicks = getPredictionPicks(draft);
  const completedPredictionPicks = countCompletedPredictionPicks(draft);
  const isParticipantDraft = isParticipantLobbyDraft(draft);
  const draftAccessContext = {
    currentUserId,
    draft,
    isCurrentUserAppAdmin,
    isSubmissionDeadlinePassed,
    lobby,
  };
  const canEditParticipant = canEditParticipantDraft(draftAccessContext);
  const canEditOfficial = canEditOfficialDraft(draftAccessContext);
  const isDraftSubmitted = Boolean(draft?.submittedAt);
  const isDraftLocked = getIsDraftLocked(draftAccessContext);
  const canSubmitDraft = canSubmitParticipantDraft(
    draftAccessContext,
    completedPredictionPicks,
  );
  const submitDraftMessage = getSubmitDraftMessage(
    draftAccessContext,
    completedPredictionPicks,
  );
  const officialDraftMessage = getOfficialDraftMessage(
    draft,
    isCurrentUserAppAdmin,
  );
  const backTo =
    draft?.lobbyId &&
    (viewerParticipantId || draft.participantId || lobby?.hostParticipantId)
      ? `/lobby/${draft.lobbyId}/${
          viewerParticipantId ?? draft.participantId ?? lobby?.hostParticipantId
        }`
      : "/";

  const handleSelectPick = (pickNumber: number) => {
    setSelectedPickNumber(pickNumber);
  };

  const handleDraftProspect = (prospect: Prospect) => {
    if (
      !draft ||
      selectedPickNumber === null ||
      (isParticipantDraft && !canEditParticipant) ||
      (draft.isOfficialResult && !canEditOfficial) ||
      draft.submittedAt ||
      (draft.lobbyId && !draft.isOfficialResult && isSubmissionDeadlinePassed)
    ) {
      return;
    }

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
    if (
      !draft ||
      (isParticipantDraft && !canEditParticipant) ||
      (draft.isOfficialResult && !canEditOfficial) ||
      draft.submittedAt ||
      (draft.lobbyId && !draft.isOfficialResult && isSubmissionDeadlinePassed)
    ) {
      return;
    }

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
    if (
      (isParticipantDraft && !canEditParticipant) ||
      (draft?.isOfficialResult && !canEditOfficial) ||
      draft?.submittedAt ||
      (draft?.lobbyId && !draft.isOfficialResult && isSubmissionDeadlinePassed)
    ) {
      return;
    }

    setTradePickNumber(pickNumber);
    setIsTradeModalOpen(true);
  };

  const handleCloseTrade = () => {
    setIsTradeModalOpen(false);
    setTradePickNumber(null);
  };

  const handleApplyTrade = (trade: PendingTrade) => {
    if (
      !draft ||
      (isParticipantDraft && !canEditParticipant) ||
      (draft.isOfficialResult && !canEditOfficial) ||
      draft.submittedAt ||
      (draft.lobbyId && !draft.isOfficialResult && isSubmissionDeadlinePassed)
    ) {
      return;
    }

    const updatedDraft = applyPickTrade(draft, trade);

    setDraft(updatedDraft);
    setSaveStatus("");
  };

  const handleSaveDraft = async () => {
    if (
      !draft ||
      (isParticipantDraft && !canEditParticipant) ||
      (draft.isOfficialResult && !canEditOfficial) ||
      draft.submittedAt ||
      (draft.lobbyId && !draft.isOfficialResult && isSubmissionDeadlinePassed)
    ) {
      return;
    }

    setSaveStatus("Saving...");
    await saveDraft(draft);
    setSaveStatus("Saved.");
  };

  const handleSubmitDraft = async () => {
    if (
      !draft ||
      draft.isOfficialResult ||
      !canEditParticipant ||
      draft.submittedAt ||
      isSubmissionDeadlinePassed
    ) {
      return;
    }

    const shouldSubmit = window.confirm(
      "Submit this draft? Your picks will be locked and you will not be able to edit them afterward.",
    );

    if (!shouldSubmit) {
      return;
    }

    setSaveStatus("Submitting...");
    const submittedDraft = await submitParticipantDraft(draft);
    setDraft(submittedDraft);
    setSaveStatus("Submitted.");
  };

  return {
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
  };
}
