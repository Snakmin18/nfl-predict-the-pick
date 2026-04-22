import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  generateAdminPin,
  generateLobbyCode,
  getAllLobbies,
  loadLobbyByCode,
  saveLobby,
  verifyAdminPin,
} from "../utils/lobbyStorage";
import { saveParticipant } from "../utils/participantStorage";
import type { Lobby } from "../types/lobby";

export default function HomePage() {
  const [roomName, setRoomName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [roundLimit, setRoundLimit] = useState(1);
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [adminJoinCode, setAdminJoinCode] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [joinError, setJoinError] = useState("");
  const [adminJoinError, setAdminJoinError] = useState("");
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [isLoadingLobbies, setIsLoadingLobbies] = useState(true);
  const [createError, setCreateError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    getAllLobbies()
      .then((loadedLobbies) => {
        if (isMounted) setLobbies(loadedLobbies);
      })
      .catch(() => {
        if (isMounted) setJoinError("Unable to load rooms.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingLobbies(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateLobby = async () => {
    const name = roomName.trim() || "My Draft Lobby";
    const admin = adminName.trim() || "Host";

    const lobbyId = crypto.randomUUID();
    const participantId = crypto.randomUUID();
    const code = generateLobbyCode();
    const adminPin = generateAdminPin();
    const now = new Date().toISOString();

    const lobby: Lobby = {
      id: lobbyId,
      code,
      name,
      hostParticipantId: participantId,
      adminPin,
      roundLimit,
      status: "waiting",
      createdAt: now,
    };

    try {
      setCreateError("");
      await saveLobby(lobby);
      await saveParticipant({
        id: participantId,
        lobbyId,
        name: admin,
        role: "admin",
        joinedAt: now,
      });

      navigate(`/lobby/${lobbyId}/${participantId}`, {
        state: { adminPin },
      });
    } catch {
      setCreateError("Unable to create room. Please try again.");
    }
  };

  const handleAdminRejoin = async () => {
    try {
      setAdminJoinError("");

      const adminSession = await verifyAdminPin(adminJoinCode, adminPin);
      if (!adminSession) {
        setAdminJoinError("Room code or admin PIN did not match.");
        return;
      }

      navigate(`/lobby/${adminSession.lobbyId}/${adminSession.participantId}`);
    } catch {
      setAdminJoinError("Unable to rejoin as admin. Please try again.");
    }
  };

  const handleJoinLobby = async () => {
    const code = joinCode.trim().toUpperCase();
    const name = playerName.trim() || "Guest";

    try {
      const lobby = await loadLobbyByCode(code);
      if (!lobby) {
        setJoinError("Room code not found.");
        return;
      }

      const participantId = crypto.randomUUID();
      const now = new Date().toISOString();

      await saveParticipant({
        id: participantId,
        lobbyId: lobby.id,
        name,
        role: "player",
        joinedAt: now,
      });

      navigate(`/lobby/${lobby.id}/${participantId}`);
    } catch {
      setJoinError("Unable to join room. Please try again.");
    }
  };

  return (
    <div className="page">
      <h1>NFL Draft Lobby</h1>
      <p>
        Create a room, invite friends with a room code, and submit your own mock
        draft.
      </p>

      <details className="card accordion-card" open>
        <summary>Create a room</summary>
        <div className="accordion-card__content">
          <label htmlFor="room-name">Room name</label>
          <input
            id="room-name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="2026 Draft Party"
          />
          <label htmlFor="admin-name">Your name</label>
          <input
            id="admin-name"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="Host"
          />
          <label htmlFor="round-limit">Prediction rounds</label>
          <select
            id="round-limit"
            value={roundLimit}
            onChange={(e) => setRoundLimit(Number(e.target.value))}
          >
            <option value={1}>Round 1 only</option>
            <option value={2}>Rounds 1-2</option>
            <option value={3}>Rounds 1-3</option>
            <option value={4}>Rounds 1-4</option>
            <option value={5}>Rounds 1-5</option>
            <option value={6}>Rounds 1-6</option>
            <option value={7}>Full draft</option>
          </select>
          {createError && <p className="error">{createError}</p>}
          <button onClick={handleCreateLobby}>Create Room</button>
        </div>
      </details>

      <details className="card accordion-card">
        <summary>Join a room</summary>
        <div className="accordion-card__content">
          <label htmlFor="join-code">Room code</label>
          <input
            id="join-code"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value);
              setJoinError("");
            }}
            placeholder="ABC123"
          />
          <label htmlFor="player-name">Your name</label>
          <input
            id="player-name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Player"
          />
          {joinError && <p className="error">{joinError}</p>}
          <button onClick={handleJoinLobby}>Join Room</button>
        </div>
      </details>

      <details className="card accordion-card">
        <summary>Join as admin</summary>
        <div className="accordion-card__content">
          <label htmlFor="admin-join-code">Room code</label>
          <input
            id="admin-join-code"
            value={adminJoinCode}
            onChange={(e) => {
              setAdminJoinCode(e.target.value);
              setAdminJoinError("");
            }}
            placeholder="ABC123"
          />
          <label htmlFor="admin-pin">Admin PIN</label>
          <input
            id="admin-pin"
            value={adminPin}
            onChange={(e) => {
              setAdminPin(e.target.value);
              setAdminJoinError("");
            }}
            inputMode="numeric"
            placeholder="123456"
          />
          {adminJoinError && <p className="error">{adminJoinError}</p>}
          <button onClick={handleAdminRejoin}>Join as Admin</button>
        </div>
      </details>

      <div className="card">
        <h2>Quick open</h2>
        <p>Existing rooms:</p>
        {isLoadingLobbies ? (
          <p>Loading rooms...</p>
        ) : lobbies.length === 0 ? (
          <p>No rooms created yet.</p>
        ) : (
          <ul>
            {lobbies.map((lobby) => (
              <li key={lobby.id}>
                <strong>{lobby.name}</strong> ({lobby.code})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <Link to="/new">Create a standalone draft</Link>
      </div>
    </div>
  );
}
