import { Link } from "react-router-dom";

export default function NewDraftPage() {
  return (
    <div className="page">
      <h1>NFL Mock Draft Predictor</h1>
      <p>Standalone drafts have been retired.</p>

      <div className="card">
        <p>
          Create or join a room from the home page to build a draft with the
          current authenticated flow.
        </p>
        <Link to="/">Go to home</Link>
      </div>

      <div className="card">
        <Link to="/admin/draft-order">Admin: Edit Draft Order</Link>
      </div>
    </div>
  );
}
