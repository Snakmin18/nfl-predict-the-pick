import { useEffect, useState } from "react";

type Props = {
  deadline: Date;
};

function getTimeRemaining(deadline: Date, now = new Date()) {
  return Math.max(0, deadline.getTime() - now.getTime());
}

function formatTimeRemaining(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}

function formatDeadline(deadline: Date) {
  return `${deadline.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  })} Central Time`;
}

export default function CountdownTimer({ deadline }: Props) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getTimeRemaining(deadline),
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimeRemaining(getTimeRemaining(deadline));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [deadline]);

  const isExpired = timeRemaining <= 0;

  return (
    <div className={`countdown ${isExpired ? "countdown--expired" : ""}`}>
      <div>
        <span className="countdown__label">Submission deadline</span>
        <strong>{formatDeadline(deadline)}</strong>
        <p>Drafts automatically lock at this time.</p>
      </div>
      <div>
        <span className="countdown__label">
          {isExpired ? "Status" : "Time remaining"}
        </span>
        <strong>{isExpired ? "Submissions closed" : formatTimeRemaining(timeRemaining)}</strong>
      </div>
    </div>
  );
}
