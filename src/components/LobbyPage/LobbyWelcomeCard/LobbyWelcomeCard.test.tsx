import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { MockDraft } from "../../../types/draft";
import type { Lobby, Participant } from "../../../types/lobby";
import LobbyWelcomeCard from "./LobbyWelcomeCard";

const lobby: Lobby = {
  id: "lobby-1",
  code: "ABC123",
  name: "Draft Room",
  hostParticipantId: "participant-host",
  hostUserId: "user-host",
  year: 2026,
  roundLimit: 1,
  createdAt: "2026-04-01T00:00:00.000Z",
  status: "waiting",
};

function renderCard({
  participant,
  participantDraft,
}: {
  participant: Participant;
  participantDraft?: MockDraft;
}) {
  return render(
    <MemoryRouter>
      <LobbyWelcomeCard
        lobby={lobby}
        participant={participant}
        participantDraft={participantDraft}
        onCreateDraft={async () => {}}
        viewerParticipantId={participant.id}
      />
    </MemoryRouter>,
  );
}

describe("LobbyWelcomeCard", () => {
  it("shows host-specific messaging for the room host", () => {
    renderCard({
      participant: {
        id: "participant-host",
        lobbyId: lobby.id,
        userId: "user-host",
        name: "Jake",
        role: "host",
        joinedAt: "2026-04-01T00:00:00.000Z",
      },
    });

    expect(screen.getByText(/logged in as/i)).toHaveTextContent(
      "You are logged in as host.",
    );
    expect(screen.getByText(/As host, you can review room drafts/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Create Your Draft" })).toBeVisible();
  });

  it("links to an existing submitted draft for a player", () => {
    renderCard({
      participant: {
        id: "participant-player",
        lobbyId: lobby.id,
        userId: "user-player",
        name: "Taylor",
        role: "player",
        joinedAt: "2026-04-01T00:00:00.000Z",
      },
      participantDraft: {
        id: "draft-99",
        title: "Taylor's Draft",
        year: 2026,
        createdAt: "2026-04-01T00:00:00.000Z",
        submittedAt: "2026-04-01T03:00:00.000Z",
        picks: [],
      },
    });

    expect(screen.queryByText(/As host, you can review room drafts/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open your submitted draft" }),
    ).toHaveAttribute("href", "/draft/draft-99");
  });
});
