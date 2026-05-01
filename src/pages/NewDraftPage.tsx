import { Link } from "react-router-dom";

export default function NewDraftPage() {
  return (
    <div className="page">
      <h1>Predict The Pick</h1>
      <p>Standalone draft boards have been retired.</p>

      <div className="card">
        <p>
          Create or join a room from the home page to build a prediction board
          with the current authenticated flow.
        </p>
        <Link to="/">Go to home</Link>
      </div>

      <div className="card">
        <Link to="/admin/draft-order">App Admin: Edit Pick Order</Link>
      </div>
    </div>
  );
}
