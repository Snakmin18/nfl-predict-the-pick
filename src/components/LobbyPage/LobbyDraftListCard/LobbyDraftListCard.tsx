import { Link } from "react-router-dom";
import type { MockDraft } from "../../../types/draft";

type Props = {
  drafts: MockDraft[];
  viewerParticipantId: string;
};

export default function LobbyDraftListCard({
  drafts,
  viewerParticipantId,
}: Props) {
  return (
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
                state={{ viewerParticipantId }}
              >
                {draft.title} {draft.submittedAt ? "(Submitted)" : "(Not submitted)"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
