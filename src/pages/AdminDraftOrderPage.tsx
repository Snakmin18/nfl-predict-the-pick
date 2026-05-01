import { useState } from "react";
import { Link } from "react-router-dom";
import { proTeams } from "../data/proTeams";
import type { DraftOrderItem } from "../types/draft";
import {
  loadDraftOrder,
  resetDraftOrder,
  saveDraftOrder,
} from "../utils/draftOrderStorage";
import { formatTeamLabel } from "../utils/teams";

function normalizePickNumbers(order: DraftOrderItem[]): DraftOrderItem[] {
  return order.map((item, index) => ({
    ...item,
    pickNumber: index + 1,
  }));
}

function swapItems(order: DraftOrderItem[], indexA: number, indexB: number) {
  const updated = [...order];
  [updated[indexA], updated[indexB]] = [updated[indexB], updated[indexA]];
  return normalizePickNumbers(updated);
}

export default function AdminDraftOrderPage() {
  const [order, setOrder] = useState<DraftOrderItem[]>(() => loadDraftOrder());
  const [savedMessage, setSavedMessage] = useState("");

  const updateItem = (
    index: number,
    key: "teamId" | "originalOwnerTeamId",
    value: string,
  ) => {
    setSavedMessage("");

    setOrder((prev) => {
      const updated = [...prev];
      const current = updated[index];

      updated[index] = {
        ...current,
        [key]: value || undefined,
      };

      return updated;
    });
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setSavedMessage("");
    setOrder((prev) => swapItems(prev, index, index - 1));
  };

  const moveDown = (index: number) => {
    if (index === order.length - 1) return;
    setSavedMessage("");
    setOrder((prev) => swapItems(prev, index, index + 1));
  };

  const handleSave = () => {
    saveDraftOrder(order);
    setSavedMessage("Pick order saved.");
  };

  const handleReset = () => {
    resetDraftOrder();
    setOrder(loadDraftOrder());
    setSavedMessage("Pick order reset to file default.");
  };

  return (
    <div className="page">
      <Link to="/">Back</Link>
      <h1>Draft Order Controls</h1>
      <p>Edit the live pick order used for new prediction boards.</p>

      <div className="card">
        <div className="admin-actions">
          <button onClick={handleSave}>Save Pick Order</button>
          <button type="button" onClick={handleReset}>
            Reset to Default
          </button>
        </div>

        {savedMessage && <p>{savedMessage}</p>}
      </div>

      <div className="draft-board">
        {order.map((item, index) => (
          <div className="pick-row" key={item.pickNumber}>
            <div className="pick-row__top">
              <strong>Pick #{item.pickNumber}</strong>
            </div>

            <div className="admin-field">
              <label htmlFor={`team-${item.pickNumber}`}>Current owner</label>
              <select
                id={`team-${item.pickNumber}`}
                value={item.teamId}
                onChange={(e) => updateItem(index, "teamId", e.target.value)}
              >
                {proTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-field">
              <label htmlFor={`original-${item.pickNumber}`}>
                Original owner
              </label>
              <select
                id={`original-${item.pickNumber}`}
                value={item.originalOwnerTeamId ?? ""}
                onChange={(e) =>
                  updateItem(index, "originalOwnerTeamId", e.target.value)
                }
              >
                <option value="">Same as current owner</option>
                {proTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-preview">
              <strong>Preview:</strong>{" "}
              {formatTeamLabel(item.teamId, item.originalOwnerTeamId)}
            </div>

            <div className="admin-actions">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
              >
                Move Up
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index === order.length - 1}
              >
                Move Down
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
