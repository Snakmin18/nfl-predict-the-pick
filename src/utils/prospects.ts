import type { Prospect } from "../types/prospect";

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.'’-]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ");
}

export function normalizeSchool(school: string) {
  const normalized = normalizeText(school);

  const aliases: Record<string, string> = {
    "miami fl": "miami",
    miami: "miami",
    "ole miss": "mississippi",
    usc: "usc",
    "ohio state": "ohio state",
    "penn state": "penn state",
  };

  return aliases[normalized] ?? normalized;
}

export function buildProspectMatchKey(name: string, school: string) {
  return `${normalizeText(name)}::${normalizeSchool(school)}`;
}

export function sortProspectsByRanking(prospects: Prospect[]) {
  return [...prospects].sort((a, b) => a.ranking - b.ranking);
}
