import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { loadLobby, loadStoredAdminPin } from "../utils/lobbyStorage";
import {
  getParticipantsByLobby,
  loadParticipant,
} from "../utils/participantStorage";
import { getAllDrafts, saveDraft } from "../utils/draftStorage";
import { loadDraftOrder } from "../utils/draftOrderStorage";
import { buildDraft } from "../utils/draft";
import { scoreLobbyDrafts } from "../utils/scoring";
import type { Lobby, Participant } from "../types/lobby";
import type { MockDraft } from "../types/draft";

export default function LobbyPage() {
  const { lobbyId = "", participantId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [drafts, setDrafts] = useState<MockDraft[]>([]);
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

        if (!isMounted) return;

        setLobby(loadedLobby);
        setParticipant(loadedParticipant);
        setParticipants(loadedParticipants);
        setDrafts(allDrafts.filter((draft) => draft.lobbyId === lobbyId));
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
    (draft) =>
      draft.participantId === participant.id && !draft.isOfficialResult,
  );
  const officialDraft = drafts.find((draft) => draft.isOfficialResult);
  const scores = scoreLobbyDrafts(drafts, participants, officialDraft);
  const submittedDraftCount = drafts.filter(
    (draft) => !draft.isOfficialResult && draft.submittedAt,
  ).length;
  const participantDraftCount = drafts.filter(
    (draft) => !draft.isOfficialResult,
  ).length;
  const navigationState = location.state as { adminPin?: string } | null;
  const knownAdminPin =
    navigationState?.adminPin ?? loadStoredAdminPin(lobby.id);

  const handleCreateDraft = async () => {
    const draftOrder = loadDraftOrder();
    const title = `${participant.name}'s Draft`;
    const draft = buildDraft(title, draftOrder, {
      lobbyId: lobby.id,
      participantId: participant.id,
      roundLimit: lobby.roundLimit,
    });
    await saveDraft(draft);
    navigate(`/draft/${draft.id}`);
  };

  const handleCreateOfficialDraft = async () => {
    const draftOrder = loadDraftOrder();
    const draft = buildDraft("Official Results", draftOrder, {
      lobbyId: lobby.id,
      isOfficialResult: true,
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

      <div className="card">
        <h2>Welcome, {participant.name}</h2>
        <p>
          You are logged in as <strong>{participant.role}</strong>.
        </p>
        {participant.role === "admin" ? (
          <div>
            <p>
              As admin, you can create the official results draft or review the
              room drafts.
            </p>
            {knownAdminPin && (
              <p>
                Admin PIN: <strong>{knownAdminPin}</strong>
              </p>
            )}
            {officialDraft ? (
              <Link
                to={`/draft/${officialDraft.id}`}
                state={{ viewerParticipantId: participant.id }}
              >
                Open official results draft
              </Link>
            ) : (
              <button onClick={handleCreateOfficialDraft}>
                Create Official Results Draft
              </button>
            )}
          </div>
        ) : (
          <div>
            <p>
              Submit your predictions and compare against the official results
              after each round.
            </p>
            {participantDraft ? (
              <Link to={`/draft/${participantDraft.id}`}>
                {participantDraft.submittedAt
                  ? "Open your submitted draft"
                  : "Open your draft"}
              </Link>
            ) : (
              <button onClick={handleCreateDraft}>Create Your Draft</button>
            )}
          </div>
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
          <p>Create the official results draft to start scoring.</p>
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
                  {score.points}/{score.completedOfficialPicks * 100}
                </strong>
                <span>
                  {score.completedOfficialPicks}/{score.possiblePoints / 100}
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
                  {draft.isOfficialResult
                    ? "(Official Results)"
                    : draft.submittedAt
                      ? "(Submitted)"
                      : "(Not submitted)"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
