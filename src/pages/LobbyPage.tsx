import { Link, useNavigate, useParams } from "react-router-dom";
import CountdownTimer from "../components/CountdownTimer/CountdownTimer";
import LobbyDraftListCard from "../components/LobbyPage/LobbyDraftListCard/LobbyDraftListCard";
import LobbyParticipantsCard from "../components/LobbyPage/LobbyParticipantsCard/LobbyParticipantsCard";
import LobbyScoreboardCard from "../components/LobbyPage/LobbyScoreboardCard/LobbyScoreboardCard";
import LobbyWelcomeCard from "../components/LobbyPage/LobbyWelcomeCard/LobbyWelcomeCard";
import { DRAFT_SUBMISSION_DEADLINE } from "../utils/deadlines";
import { useLobbyPage } from "../hooks/useLobbyPage";

export default function LobbyPage() {
  const { lobbyId = "", participantId = "" } = useParams();
  const navigate = useNavigate();
  const {
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
  } = useLobbyPage({
    lobbyId,
    participantId,
  });

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

  const handleCreateParticipantDraft = async () => {
    const draft = await handleCreateDraft();
    if (draft) {
      navigate(`/draft/${draft.id}`);
    }
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

      <LobbyWelcomeCard
        lobby={lobby}
        participant={participant}
        participantDraft={participantDraft}
        onCreateDraft={handleCreateParticipantDraft}
        viewerParticipantId={participant.id}
      />

      <LobbyParticipantsCard lobby={lobby} participants={participants} />

      <LobbyScoreboardCard
        lobby={lobby}
        officialDraftExists={Boolean(officialDraft)}
        participantDraftCount={participantDraftCount}
        scores={scores}
        submittedDraftCount={submittedDraftCount}
        viewerParticipantId={participant.id}
      />

      <LobbyDraftListCard
        drafts={drafts}
        viewerParticipantId={participant.id}
      />
    </div>
  );
}
