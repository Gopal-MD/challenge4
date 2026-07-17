import { useEffect, useState } from "react";
import type { Broadcast } from "./mock-data";

const KEY = "matchday.broadcasts";
const CHANNEL = "matchday-broadcasts";

function read(): Broadcast[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(list: Broadcast[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
}

export function pushBroadcast(b: Omit<Broadcast, "id" | "createdAt">): Broadcast {
  const full: Broadcast = {
    ...b,
    id: `bc-${Date.now()}`,
    createdAt: Date.now(),
  };
  const list = [full, ...read()];
  write(list);
  try {
    new BroadcastChannel(CHANNEL).postMessage(full);
  } catch {
    /* ignore */
  }
  // trigger storage event for same tab
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
  return full;
}

export function useBroadcasts(): Broadcast[] {
  const [list, setList] = useState<Broadcast[]>([]);
  useEffect(() => {
    setList(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) setList(read());
    };
    window.addEventListener("storage", onStorage);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = () => setList(read());
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener("storage", onStorage);
      bc?.close();
    };
  }, []);
  return list;
}

export function useLatestBroadcast(): Broadcast | null {
  const list = useBroadcasts();
  return list[0] ?? null;
}
