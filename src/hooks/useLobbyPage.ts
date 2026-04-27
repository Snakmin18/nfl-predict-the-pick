import { useEffect, useState } from "react";
import type { Lobby, Participant } from "../types/lobby";
import type { MockDraft } from "../types/draft";
import { supabase } from "../lib/supabase/client";
import {
  countSubmittedDrafts,
  createLobbyParticipantDraft,
  getLobbyScores,
  getParticipantDraft,
  loadLobbyPageData,
  loadOfficialLobbyDraft,
} from "../services/lobbyService";

type Options = {
  lobbyId: string;
  participantId: string;
};

export function useLobbyPage({ lobbyId, participantId }: Options) {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [drafts, setDrafts] = useState<MockDraft[]>([]);
  const [officialDraft, setOfficialDraft] = useState<MockDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRoom() {
      setIsLoading(true);
      setLoadError("");

      try {
        const {
          lobby: loadedLobby,
          participant: loadedParticipant,
          participants: loadedParticipants,
          drafts: loadedDrafts,
          officialDraft: loadedOfficialDraft,
        } = await loadLobbyPageData(lobbyId, participantId);

        if (!isMounted) return;

        setLobby(loadedLobby);
        setParticipant(loadedParticipant);
        setParticipants(loadedParticipants);
        setDrafts(loadedDrafts);
        setOfficialDraft(loadedOfficialDraft);
      } catch {
        if (isMounted) setLoadError("Unable to load room.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadRoom();

    return () => {
      isMounted = false;
    };
  }, [lobbyId, participantId]);

  const lobbyYear = lobby?.year;
  const officialDraftId = officialDraft?.id;

  useEffect(() => {
    if (!supabase || !lobbyYear) return;

    const realtimeClient = supabase;
    let isSubscribed = true;
    let refreshTimer: number | undefined;

    const refreshOfficialDraft = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(async () => {
        try {
          const updatedOfficialDraft = await loadOfficialLobbyDraft(lobbyYear);
          if (isSubscribed) setOfficialDraft(updatedOfficialDraft);
        } catch {
          // Realtime refreshes are opportunistic; the current scoreboard remains usable.
        }
      }, 300);
    };

    const officialDraftChannel = realtimeClient
      .channel(`lobby-official-draft-${lobbyYear}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drafts",
          filter: `year=eq.${lobbyYear}`,
        },
        refreshOfficialDraft,
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      window.clearTimeout(refreshTimer);
      void realtimeClient.removeChannel(officialDraftChannel);
    };
  }, [lobbyYear]);

  useEffect(() => {
    if (!supabase || !lobbyYear || !officialDraftId) return;

    const realtimeClient = supabase;
    let isSubscribed = true;
    let refreshTimer: number | undefined;

    const refreshOfficialDraft = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(async () => {
        try {
          const updatedOfficialDraft = await loadOfficialLobbyDraft(lobbyYear);
          if (isSubscribed) setOfficialDraft(updatedOfficialDraft);
        } catch {
          // Realtime refreshes are opportunistic; the current scoreboard remains usable.
        }
      }, 300);
    };

    const officialPicksChannel = realtimeClient
      .channel(`lobby-official-draft-picks-${officialDraftId}`)
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
  }, [lobbyYear, officialDraftId]);

  const participantDraft = getParticipantDraft(drafts, participant?.id);
  const scores = getLobbyScores(drafts, participants, officialDraft);
  const submittedDraftCount = countSubmittedDrafts(drafts);
  const participantDraftCount = drafts.length;

  const handleCreateDraft = async () => {
    if (!lobby || !participant) return null;
    return createLobbyParticipantDraft(lobby, participant);
  };

  return {
    drafts,
    handleCreateDraft,
    isLoading,
    loadError,
    lobby,
    officialDraft,
    participant,
    participantDraft,
    participantDraftCount,
    participants,
    scores,
    submittedDraftCount,
  };
}
