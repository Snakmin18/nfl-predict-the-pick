import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CountdownTimer from "../components/CountdownTimer";
import { loadLobby } from "../utils/lobbyStorage";
import {
  getParticipantsByLobby,
  loadParticipant,
} from "../utils/participantStorage";
import {
  getAllDrafts,
  loadOfficialDraft,
  saveDraft,
} from "../utils/draftStorage";
import { loadDraftOrder } from "../utils/draftOrderStorage";
import { buildDraft } from "../utils/draft";
import { scoreLobbyDrafts } from "../utils/scoring";
import { getCurrentUserId } from "../utils/auth";
import { DRAFT_SUBMISSION_DEADLINE } from "../utils/deadlines";
import { supabase } from "../utils/supabaseClient";
import type { Lobby, Participant } from "../types/lobby";
import type { MockDraft } from "../types/draft";

export default function LobbyPage() {
  const { lobbyId = "", participantId = "" } = useParams();
  const navigate = useNavigate();
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
        const [loadedLobby, loadedParticipant, allDrafts] = await Promise.all([
          loadLobby(lobbyId),
          participantId ? loadParticipant(participantId) : Promise.resolve(null),
          getAllDrafts(),
        ]);

        const loadedParticipants = loadedLobby
          ? await getParticipantsByLobby(loadedLobby.id)
          : [];
        const loadedOfficialDraft = loadedLobby
          ? await loadOfficialDraft(loadedLobby.year)
          : null;

        if (!isMounted) return;

        setLobby(loadedLobby);
        setParticipant(loadedParticipant);
        setParticipants(loadedParticipants);
        setDrafts(
          allDrafts.filter(
            (draft) => draft.lobbyId === lobbyId && !draft.isOfficialResult,
          ),
        );
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
          const updatedOfficialDraft = await loadOfficialDraft(lobbyYear);
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
          const updatedOfficialDraft = await loadOfficialDraft(lobbyYear);
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

  if (isLoading) {
    return (
      <div className="page">
        <h1>Loading room...</h1>
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

  if (!lobby || !participant || participant.lobbyId !== lobby.id) {
    return (
      <div className="page">
        <h1>Room not found</h1>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

  const participantDraft = drafts.find(
    (draft) => draft.participantId === participant.id,
  );
  const scores = scoreLobbyDrafts(drafts, participants, officialDraft ?? undefined);
  const submittedDraftCount = drafts.filter(
    (draft) => draft.submittedAt,
  ).length;
  const participantDraftCount = drafts.length;
  const handleCreateDraft = async () => {
    const draftOrder = loadDraftOrder();
    const title = `${participant.name}'s Draft`;
    const userId = await getCurrentUserId();
    const draft = buildDraft(title, draftOrder, {
      lobbyId: lobby.id,
      participantId: participant.id,
      userId,
      year: lobby.year,
      roundLimit: lobby.roundLimit,
    });
    await saveDraft(draft);
    navigate(`/draft/${draft.id}`);
  };

  return (
    <div className="page">
      <Link to="/">Back</Link>
      <h1>{lobby.name}</h1>
      <p>
        Room code: <strong>{lobby.code}</strong>
      </p>
      <p>
        Prediction rounds:{" "}
        <strong>
          {lobby.roundLimit === 1 ? "Round 1 only" : `Rounds 1-${lobby.roundLimit}`}
        </strong>
      </p>
      <CountdownTimer deadline={DRAFT_SUBMISSION_DEADLINE} />

      <div className="card">
        <h2>Welcome, {participant.name}</h2>
        <p>
          You are logged in as{" "}
          <strong>{participant.role === "admin" ? "host" : "player"}</strong>.
        </p>
        {participant.role === "admin" && (
          <>
            <p>
              As host, you can review room drafts and keep track of who has
              submitted.
            </p>
            <p>
              Room code: <strong>{lobby.code}</strong>
            </p>
          </>
        )}

        <p>
          Submit your predictions and compare against the official results after
          each round.
        </p>

        <div className="scoring-guide">
          <h3>Scoring</h3>
          <div className="scoring-guide__grid">
            <span>Exact pick</span>
            <strong>100 pts</strong>
            <span>1 pick off</span>
            <strong>75 pts</strong>
            <span>2 picks off</span>
            <strong>50 pts</strong>
            <span>3 picks off</span>
            <strong>25 pts</strong>
            <span>Correct trade</span>
            <strong>+50 pts</strong>
          </div>
        </div>

        {participantDraft ? (
          <Link
            to={`/draft/${participantDraft.id}`}
            state={{ viewerParticipantId: participant.id }}
          >
            {participantDraft.submittedAt
              ? "Open your submitted draft"
              : "Open your draft"}
          </Link>
        ) : (
          <button onClick={handleCreateDraft}>Create Your Draft</button>
        )}
      </div>

      <div className="card">
        <h2>Room participants</h2>
        <ul>
          {participants.map((member) => (
            <li key={member.id}>
              {member.name}{" "}
              {member.id === lobby.hostParticipantId ? "(host)" : ""}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Scoreboard</h2>
        <p>
          Submitted drafts: {submittedDraftCount}/{participantDraftCount}
        </p>
        {!officialDraft ? (
          <p>
            The official {lobby.year} draft has not been created yet. Scores
            will appear once the app admin starts saving official picks.
          </p>
        ) : scores.length === 0 ? (
          <p>No submitted participant drafts yet.</p>
        ) : (
          <div className="scoreboard">
            <div className="scoreboard__header">
              <span>Player</span>
              <span>Score</span>
              <span>Official picks</span>
            </div>
            {scores.map((score) => (
              <Link
                key={score.draftId}
                className="scoreboard__row"
                to={`/draft/${score.draftId}`}
                state={{ viewerParticipantId: participant.id }}
              >
                <span>{score.participantName}</span>
                <strong>
                  {score.points}/{score.availablePoints}
                </strong>
                <span>
                  {score.completedOfficialPicks}/{score.scoredPicks.length}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Room drafts</h2>
        {drafts.length === 0 ? (
          <p>No drafts created yet.</p>
        ) : (
          <ul>
            {drafts.map((draft) => (
              <li key={draft.id}>
                <Link
                  to={`/draft/${draft.id}`}
                  state={{ viewerParticipantId: participant.id }}
                >
                  {draft.title}{" "}
                  {draft.submittedAt ? "(Submitted)" : "(Not submitted)"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
