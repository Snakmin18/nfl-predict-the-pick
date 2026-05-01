import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthPanel from "../components/AuthPanel/AuthPanel";
import Modal from "../components/Modal/Modal";
import styles from "./HomePage.module.css";
import {
  findLobbyByCode,
  generateLobbyCode,
  getHostedLobbies,
  getLobbiesByIds,
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

type HomeModalMode = "auth" | "create" | "join" | "rooms" | null;
const ACCOUNT_ROOM_PAGE_SIZE = 3;

async function loadMyLobbyEntries(userId: string): Promise<MyLobbyEntry[]> {
  const [hostedLobbies, loadedParticipants] = await Promise.all([
    getHostedLobbies(userId),
    getParticipantsByUser(userId),
  ]);
  const participantLobbyIds = Array.from(
    new Set(loadedParticipants.map((participant) => participant.lobbyId)),
  );
  const participantLobbies = await getLobbiesByIds(participantLobbyIds);
  const loadedLobbies = [...hostedLobbies, ...participantLobbies];
  const lobbiesById = new Map(loadedLobbies.map((lobby) => [lobby.id, lobby]));
  const entriesByLobbyId = new Map<string, MyLobbyEntry>();

  function addEntry(entry: MyLobbyEntry) {
    const existingEntry = entriesByLobbyId.get(entry.lobby.id);
    if (!existingEntry || entry.role === "host") {
      entriesByLobbyId.set(entry.lobby.id, entry);
    }
  }

  for (const lobby of loadedLobbies) {
    if (lobby.hostUserId === userId) {
      addEntry({
        lobby,
        participantId: lobby.hostParticipantId,
        role: "host",
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
  const [roomName, setRoomName] = useState("");
  const [hostName, setHostName] = useState("");
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
  const [activeModal, setActiveModal] = useState<HomeModalMode>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [accountRoomPage, setAccountRoomPage] = useState(0);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function loadHome() {
      const loadedUser = await getAuthUser();

      const loadedProfile = loadedUser
        ? await loadProfile(loadedUser.id)
        : null;
      const loadedLobbies = loadedUser
        ? await loadMyLobbyEntries(loadedUser.id)
        : [];

      if (isMounted) {
        setAuthUser(loadedUser);
        setProfile(loadedProfile);
        if (loadedProfile?.displayName) {
          setHostName((current) => current || loadedProfile.displayName);
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

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isAccountMenuOpen]);

  const handleAuthChange = async (user: AuthUser | null) => {
    setAuthUser(user);
    setAuthError("");
    setIsLoadingLobbies(Boolean(user));
    setIsAccountMenuOpen(false);
    setAccountRoomPage(0);

    try {
      const nextProfile = user ? await loadProfile(user.id) : null;
      const nextLobbies = user ? await loadMyLobbyEntries(user.id) : [];
      setProfile(nextProfile);
      setMyLobbies(nextLobbies);

      if (nextProfile?.displayName) {
        setHostName((current) => current || nextProfile.displayName);
        setPlayerName((current) => current || nextProfile.displayName);
      }
    } catch {
      setProfile(null);
      setMyLobbies([]);
      setAuthError("Unable to load account.");
    } finally {
      setIsLoadingLobbies(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setAuthUser(null);
      setProfile(null);
      setMyLobbies([]);
      setActiveModal(null);
      setIsAccountMenuOpen(false);
      setIsLoadingLobbies(false);
      setAccountRoomPage(0);
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

    const name = roomName.trim() || "My Draft Room";
    const host = hostName.trim() || profile?.displayName || "Host";

    const lobbyId = crypto.randomUUID();
    const participantId = crypto.randomUUID();
    const code = generateLobbyCode();
    const now = new Date().toISOString();
    const userId = await getCurrentUserId();

    const lobby: Lobby = {
      id: lobbyId,
      code,
      name,
      hostParticipantId: participantId,
      hostUserId: userId,
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
        name: host,
        role: "host",
        joinedAt: now,
      });

      navigate(`/lobby/${lobbyId}/${participantId}`);
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
      const lobby = await findLobbyByCode(code);
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

  const displayName = profile?.displayName ?? authUser?.email ?? "Signed in";
  const hostedLobbyCount = useMemo(
    () => myLobbies.filter((entry) => entry.role === "host").length,
    [myLobbies],
  );
  const accountRoomPageCount = useMemo(
    () => Math.max(1, Math.ceil(myLobbies.length / ACCOUNT_ROOM_PAGE_SIZE)),
    [myLobbies],
  );
  const visibleAccountRooms = useMemo(() => {
    const startIndex = accountRoomPage * ACCOUNT_ROOM_PAGE_SIZE;
    return myLobbies.slice(startIndex, startIndex + ACCOUNT_ROOM_PAGE_SIZE);
  }, [accountRoomPage, myLobbies]);
  const isModalOpen = activeModal !== null;
  const modalTitle =
    activeModal === "create"
      ? "Start your board"
      : activeModal === "join"
        ? "Join a room"
        : activeModal === "rooms"
          ? "See my rooms"
          : "Sign in";
  const modalDescription =
    activeModal === "create"
      ? "Set up a new room and invite your group in a couple of clicks."
      : activeModal === "join"
        ? "Enter a room code and jump straight into the board."
        : activeModal === "rooms"
          ? "Pick up where you left off in any room you are part of."
          : "Create an account or sign in to start playing.";
  const requiresAuthForModal =
    activeModal === "create" ||
    activeModal === "join" ||
    activeModal === "rooms";
  const showAuthGate = Boolean(!authUser && requiresAuthForModal);

  useEffect(() => {
    setAccountRoomPage((currentPage) =>
      Math.min(currentPage, accountRoomPageCount - 1),
    );
  }, [accountRoomPageCount]);

  return (
    <div className={styles.shell}>
      <div className={styles.backdrop} />

      <header className={styles.header}>
        <Link className={styles.brand} to="/">
          Predict The Pick
        </Link>

        <div className={styles.headerActions}>
          {authUser ? (
            <div className={styles.userMenu} ref={accountMenuRef}>
              <button
                type="button"
                className={styles.userPill}
                onClick={() => setIsAccountMenuOpen((current) => !current)}
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
              >
                <span className={styles.userPillLabel}>{displayName}</span>
                <span className={styles.userPillChevron} aria-hidden="true">
                  {isAccountMenuOpen ? "˄" : "˅"}
                </span>
              </button>

              {isAccountMenuOpen && (
                <div className={styles.userDropdown} role="menu">
                  {profile?.isAppAdmin && (
                    <Link
                      className={styles.userDropdownLink}
                      to="/admin/official-draft"
                      role="menuitem"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      Draft Results
                    </Link>
                  )}
                  <button
                    type="button"
                    className={styles.userDropdownButton}
                    role="menuitem"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    Manage account
                  </button>
                  <button
                    type="button"
                    className={styles.userDropdownButton}
                    role="menuitem"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className={styles.headerCta}
              onClick={() => setActiveModal("auth")}
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Make Draft Night Competitive</p>
            <h1 className={styles.title}>Predict The Pick</h1>
            <p className={styles.description}>
              Build your board and compete with friends to see who really knows
              how draft night will break.
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => setActiveModal("create")}
              >
                Start your board
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => setActiveModal("rooms")}
              >
                See my rooms
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => setActiveModal("join")}
              >
                Join a room
              </button>
            </div>

            <p className={styles.disclaimer}>
              A draft prediction game for football fans. Not affiliated with any
              league or club.
            </p>
          </div>

          <aside
            className={styles.heroPanel}
            id={authUser ? "account-panel" : "auth-panel"}
          >
            {authUser ? (
              <>
                <p className={styles.panelLabel}>Account</p>
                <h2 className={styles.panelTitle}>{displayName}</h2>

                <div className={styles.statGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>{myLobbies.length}</span>
                    <span className={styles.statLabel}>Active rooms</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>{hostedLobbyCount}</span>
                    <span className={styles.statLabel}>Rooms hosted</span>
                  </div>
                </div>

                <div className={styles.accountRooms}>
                  <div className={styles.roomsHeader}>
                    <p className={styles.roomsHeading}>Available rooms</p>
                    {accountRoomPageCount > 1 && (
                      <div className={styles.roomsPagination}>
                        <button
                          type="button"
                          className={styles.roomsPageButton}
                          onClick={() =>
                            setAccountRoomPage((currentPage) =>
                              Math.max(0, currentPage - 1),
                            )
                          }
                          disabled={accountRoomPage === 0}
                          aria-label="Show previous rooms"
                        >
                          {"<"}
                        </button>
                        <span className={styles.roomsPageIndicator}>
                          {accountRoomPage + 1}/{accountRoomPageCount}
                        </span>
                        <button
                          type="button"
                          className={styles.roomsPageButton}
                          onClick={() =>
                            setAccountRoomPage((currentPage) =>
                              Math.min(
                                accountRoomPageCount - 1,
                                currentPage + 1,
                              ),
                            )
                          }
                          disabled={
                            accountRoomPage === accountRoomPageCount - 1
                          }
                          aria-label="Show next rooms"
                        >
                          {">"}
                        </button>
                      </div>
                    )}
                  </div>
                  {isLoadingLobbies ? (
                    <p className={styles.roomsEmpty}>Loading rooms...</p>
                  ) : myLobbies.length === 0 ? (
                    <p className={styles.roomsEmpty}>
                      Create or join a room to see it here.
                    </p>
                  ) : (
                    <div className={styles.roomList}>
                      {visibleAccountRooms.map(
                        ({ lobby, participantId, role }) => (
                          <Link
                            className={styles.roomListItem}
                            key={lobby.id}
                            to={`/lobby/${lobby.id}/${participantId}`}
                            state={{ viewerParticipantId: participantId }}
                          >
                            <span className={styles.roomMeta}>
                              <strong>{lobby.name}</strong>
                              <span className={styles.roomCode}>
                                {lobby.code}
                              </span>
                            </span>
                            <span className={styles.roomRole}>
                              {role === "host" ? "Host" : "Player"}
                            </span>
                          </Link>
                        ),
                      )}
                    </div>
                  )}
                </div>

                {authError && <p className={styles.panelError}>{authError}</p>}
              </>
            ) : (
              <>
                <p className={styles.panelLabel}>Get Started</p>
                <h2 className={styles.panelTitle}>
                  Make your board in minutes.
                </h2>
                <p className={styles.panelText}>
                  Create rooms, invite friends, and lock in your picks before
                  draft night. When you are ready, sign in from the button up
                  top and jump in.
                </p>
                <div className={styles.statGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>3</span>
                    <span className={styles.statLabel}>Ways to jump in</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>7</span>
                    <span className={styles.statLabel}>Rounds supported</span>
                  </div>
                </div>
                {authError && <p className={styles.panelError}>{authError}</p>}
              </>
            )}
          </aside>
        </section>

        <section className={styles.hubGrid} id="game-sections">
          <article className={`card ${styles.hubCard}`}>
            <p className={styles.cardEyebrow}>Create a room</p>
            <h2>Start a new board</h2>
            <p className={styles.cardText}>
              Choose your rounds, share a room code, and run the board with your
              group.
            </p>
            <div className={styles.infoList}>
              <p>
                Great for draft parties, friend groups, and side competitions.
              </p>
            </div>
          </article>

          <article className={`card ${styles.hubCard}`}>
            <p className={styles.cardEyebrow}>Join a room</p>
            <h2>Jump into the action</h2>
            <p className={styles.cardText}>
              Enter a room code to join an existing group in seconds.
            </p>
            <div className={styles.infoList}>
              <p>
                Perfect when someone else is running the board and you just want
                in.
              </p>
            </div>
          </article>

          <article className={`card ${styles.hubCard}`}>
            <p className={styles.cardEyebrow}>Coming soon</p>
            <h2>More ways to play</h2>
            <p className={styles.cardText}>
              Placeholder for whatever our third lane becomes. Maybe public
              leaderboards.
            </p>
            <div className={styles.infoList}>
              <p>
                Public pools, featured rooms, or a seasonal leaderboard could
                all fit here.
              </p>
            </div>
          </article>
        </section>
      </main>

      <Modal
        title={modalTitle}
        description={modalDescription}
        isOpen={isModalOpen}
        onClose={() => setActiveModal(null)}
      >
        {activeModal === "auth" && (
          <>
            <AuthPanel user={authUser} onAuthChange={handleAuthChange} />
            {authError && <p className={styles.modalError}>{authError}</p>}
          </>
        )}

        {showAuthGate && (
          <>
            <p className={styles.modalHelper}>
              Sign in first, then we will drop you right back into this flow.
            </p>
            <AuthPanel user={authUser} onAuthChange={handleAuthChange} />
            {authError && <p className={styles.modalError}>{authError}</p>}
          </>
        )}

        {activeModal === "create" && authUser && (
          <div className={styles.modalCard}>
            <label htmlFor="room-name">Room name</label>
            <input
              id="room-name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="2026 Draft Party"
            />
            <label htmlFor="host-name">Your name</label>
            <input
              id="host-name"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
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
            {createError && <p className={styles.modalError}>{createError}</p>}
            <button type="button" onClick={handleCreateLobby}>
              Create Room
            </button>
          </div>
        )}

        {activeModal === "join" && authUser && (
          <div className={styles.modalCard}>
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
            {joinError && <p className={styles.modalError}>{joinError}</p>}
            <button type="button" onClick={handleJoinLobby}>
              Join Room
            </button>
          </div>
        )}

        {activeModal === "rooms" && authUser && (
          <div className={styles.roomsModal}>
            {isLoadingLobbies ? (
              <p>Loading rooms...</p>
            ) : myLobbies.length === 0 ? (
              <p>Create or join a room to see it here.</p>
            ) : (
              <div className={styles.roomList}>
                {myLobbies.map(({ lobby, participantId, role }) => (
                  <Link
                    className={styles.roomListItem}
                    key={lobby.id}
                    to={`/lobby/${lobby.id}/${participantId}`}
                    state={{ viewerParticipantId: participantId }}
                    onClick={() => setActiveModal(null)}
                  >
                    <span className={styles.roomMeta}>
                      <strong>{lobby.name}</strong>
                      <span className={styles.roomCode}>{lobby.code}</span>
                    </span>
                    <span className={styles.roomRole}>
                      {role === "host" ? "Host" : "Player"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
