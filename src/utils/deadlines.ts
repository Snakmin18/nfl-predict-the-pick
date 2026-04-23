export const DRAFT_SUBMISSION_DEADLINE = new Date("2026-04-23T18:45:00-05:00");

export function isPastDraftSubmissionDeadline(now = new Date()) {
  return now.getTime() >= DRAFT_SUBMISSION_DEADLINE.getTime();
}
