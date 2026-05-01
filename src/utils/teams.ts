import { proTeams } from "../data/proTeams";

export function getTeamById(teamId: string) {
  return proTeams.find((team) => team.id === teamId) ?? null;
}

export function formatTeamLabel(teamId: string, originalOwnerTeamId?: string) {
  const team = getTeamById(teamId);

  if (!team) {
    return teamId;
  }

  if (originalOwnerTeamId && originalOwnerTeamId !== teamId) {
    const originalOwner = getTeamById(originalOwnerTeamId);

    if (originalOwner) {
      return `${team.label} (via ${originalOwner.shortLabel})`;
    }
  }

  return team.label;
}
