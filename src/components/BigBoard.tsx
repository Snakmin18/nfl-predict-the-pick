import type { Player } from "../types/player";

type Props = {
  players: Player[];
  draftedPlayerIds: Set<string>;
  onRemove: (playerId: string) => void;
  onSelect: (player: Player) => void;
};

export default function BigBoard({
  players,
  draftedPlayerIds,
  onRemove,
  onSelect,
}: Props) {
  return (
    <div className="big-board">
      <h2>Big Board</h2>

      {players.length === 0 && <p>No players added yet.</p>}

      {players.map((player) => {
        const isTaken = draftedPlayerIds.has(player.id);

        return (
          <div key={player.id} className="big-board__item">
            <div>
              <strong>{player.name}</strong>{" "}
              <span>
                {player.position ?? "—"} | {player.school ?? "—"}
              </span>
            </div>

            <div className="big-board__actions">
              <button disabled={isTaken} onClick={() => onSelect(player)}>
                Draft
              </button>

              <button onClick={() => onRemove(player.id)}>Remove</button>
            </div>

            {isTaken && <div className="taken-label">Drafted</div>}
          </div>
        );
      })}
    </div>
  );
}
