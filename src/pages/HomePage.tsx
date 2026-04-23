import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthPanel from "../components/AuthPanel";
import {
  generateAdminPin,
  generateLobbyCode,
  getAllLobbies,
  loadLobbyByCode,
  saveLobby,
} from "../utils/lobbyStorage";
import {
  getParticipantsByUser,
  saveParticipant,
} from "../utils/participantStorage";
import {
  getAuthUser,
  getCurrentUserId,
  signOut,
  type AuthUser,
} from "../utils/auth";
import { loadProfile } from "../utils/profileStorage";
import type { Lobby, Participant } from "../types/lobby";
import type { Profile } from "../types/profile";

type MyLobbyEntry = {
  lobby: Lobby;
  participantId: string;
  role: Participant["role"];
};

async function loadMyLobbyEntries(userId: string): Promise<MyLobbyEntry[]> {
  const [loadedLobbies, loadedParticipants] = await Promise.all([
    getAllLobbies(),
    getParticipantsByUser(userId),
  ]);
  const lobbiesById = new Map(loadedLobbies.map((lobby) => [lobby.id, lobby]));
  const entriesByLobbyId = new Map<string, MyLobbyEntry>();

  function addEntry(entry: MyLobbyEntry) {
    const existingEntry = entriesByLobbyId.get(entry.lobby.id);
    if (!existingEntry || entry.role === "admin") {
      entriesByLobbyId.set(entry.lobby.id, entry);
    }
  }

  for (const lobby of loadedLobbies) {
    if (lobby.hostUserId === userId) {
      addEntry({
        lobby,
        participantId: lobby.hostParticipantId,
        role: "admin",
      });
    }
  }

  for (const participant of loadedParticipants) {
    const lobby = lobbiesById.get(participant.lobbyId);
    if (!lobby) continue;

    addEntry({
      lobby,
      participantId: participant.id,
      role: participant.role,
    });
  }

  return Array.from(entriesByLobbyId.values()).sort(
    (a, b) =>
      new Date(b.lobby.createdAt).getTime() -
      new Date(a.lobby.createdAt).getTime(),
  );
}

export default function HomePage() {
  const [openHomeSection, setOpenHomeSection] = useState<
    "create" | "join"
  >("create");
  const [roomName, setRoomName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [roundLimit, setRoundLimit] = useState(1);
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authError, setAuthError] = useState("");
  const [myLobbies, setMyLobbies] = useState<MyLobbyEntry[]>([]);
  const [isLoadingLobbies, setIsLoadingLobbies] = useState(true);
  const [createError, setCreateError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function loadHome() {
      const loadedUser = await getAuthUser();

      const loadedProfile = loadedUser ? await loadProfile(loadedUser.id) : null;
      const loadedLobbies = loadedUser
        ? await loadMyLobbyEntries(loadedUser.id)
        : [];

      if (isMounted) {
        setAuthUser(loadedUser);
        setProfile(loadedProfile);
        if (loadedProfile?.displayName) {
          setAdminName((current) => current || loadedProfile.displayName);
          setPlayerName((current) => current || loadedProfile.displayName);
        }
        setMyLobbies(loadedLobbies);
      }
    }

    loadHome()
      .catch(() => {
        if (isMounted) setAuthError("Unable to load account.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingLobbies(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuthChange = async (user: AuthUser | null) => {
    setAuthUser(user);

    const nextProfile = user ? await loadProfile(user.id) : null;
    const nextLobbies = user ? await loadMyLobbyEntries(user.id) : [];
    setProfile(nextProfile);
    setMyLobbies(nextLobbies);

    if (nextProfile?.displayName) {
      setAdminName((current) => current || nextProfile.displayName);
      setPlayerName((current) => current || nextProfile.displayName);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthUser(null);
      setProfile(null);
      setMyLobbies([]);
      setAuthError("");
    } catch {
      setAuthError("Unable to sign out.");
    }
  };

  const handleCreateLobby = async () => {
    if (!authUser) {
      setCreateError("Sign in before creating a room.");
      return;
    }

    const name = roomName.trim() || "My Draft Lobby";
    const admin = adminName.trim() || profile?.displayName || "Host";

    const lobbyId = crypto.randomUUID();
    const participantId = crypto.randomUUID();
    const code = generateLobbyCode();
    const adminPin = generateAdminPin();
    const now = new Date().toISOString();
    const userId = await getCurrentUserId();

    const lobby: Lobby = {
      id: lobbyId,
      code,
      name,
      hostParticipantId: participantId,
      hostUserId: userId,
      adminPin,
      year: 2026,
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
        userId,
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

  const handleJoinLobby = async () => {
    if (!authUser) {
      setJoinError("Sign in before joining a room.");
      return;
    }

    const code = joinCode.trim().toUpperCase();
    const name = playerName.trim() || profile?.displayName || "Guest";

    try {
      const lobby = await loadLobbyByCode(code);
      if (!lobby) {
        setJoinError("Room code not found.");
        return;
      }

      const participantId = crypto.randomUUID();
      const now = new Date().toISOString();
      const userId = await getCurrentUserId();

      await saveParticipant({
        id: participantId,
        lobbyId: lobby.id,
        userId,
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
    <>
      <header className="site-header">
        <Link className="site-header__brand" to="/">
          NFL Predict The Pick
        </Link>

        <nav className="site-header__nav" aria-label="Admin navigation">
          {profile?.isAppAdmin && (
            <Link to="/admin/official-draft">App Admin: Official Draft</Link>
          )}
        </nav>

        {authUser && (
          <div className="site-header__account">
            <span>{profile?.displayName ?? authUser.email ?? "Signed in"}</span>
            <button type="button" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        )}
      </header>

      <div className="page">
        <p className="page-intro">
          Create a room, invite friends with a room code, and submit your own
          mock draft.
        </p>

        {!authUser && <AuthPanel user={authUser} onAuthChange={handleAuthChange} />}
        {authError && <p className="error">{authError}</p>}

        {authUser && (
          <>
          <details
            className="card accordion-card"
            open={openHomeSection === "create"}
            onToggle={(event) => {
              if (event.currentTarget.open) setOpenHomeSection("create");
            }}
          >
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

          <details
            className="card accordion-card"
            open={openHomeSection === "join"}
            onToggle={(event) => {
              if (event.currentTarget.open) setOpenHomeSection("join");
            }}
          >
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

          <div className="card">
            <h2>My Lobbies</h2>
            {isLoadingLobbies ? (
              <p>Loading lobbies...</p>
            ) : myLobbies.length === 0 ? (
              <p>Create or join a room to see it here.</p>
            ) : (
              <div className="my-lobbies">
                {myLobbies.map(({ lobby, participantId, role }) => (
                  <Link
                    className="my-lobbies__item"
                    key={lobby.id}
                    to={`/lobby/${lobby.id}/${participantId}`}
                    state={{ viewerParticipantId: participantId }}
                  >
                    <span>
                      <strong>{lobby.name}</strong>
                      <span className="my-lobbies__code">{lobby.code}</span>
                    </span>
                    <span className="my-lobbies__role">
                      {role === "admin" ? "Host" : "Player"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          </>
        )}
      </div>
    </>
  );
}
