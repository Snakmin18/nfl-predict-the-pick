import { nflTeams } from "../data/nflTeams";

export function getTeamById(teamId: string) {
  return nflTeams.find((team) => team.id === teamId) ?? null;
}

export function formatTeamLabel(teamId: string, originalOwnerTeamId?: string) {
  const team = getTeamById(teamId);

  if (!team) {
    return teamId;
  }

  if (originalOwnerTeamId && originalOwnerTeamId !== teamId) {
    const originalOwner = getTeamById(originalOwnerTeamId);

    if (originalOwner) {
      return `${team.city} ${team.name} (via ${originalOwner.abbreviation})`;
    }
  }

  return `${team.city} ${team.name}`;
}
