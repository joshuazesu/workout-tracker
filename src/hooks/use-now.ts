import { useEffect, useState } from 'react';

/** The current time, refreshed every `intervalMs`, so render stays pure and dates roll over at midnight. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
