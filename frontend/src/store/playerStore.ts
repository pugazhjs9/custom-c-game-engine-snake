import { create } from "zustand";

interface PlayerStore {
  playerName: string;
  setPlayerName: (name: string) => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  playerName: typeof window !== "undefined" ? localStorage.getItem("snakeos_player") || "" : "",
  setPlayerName: (name: string) => {
    if (typeof window !== "undefined") localStorage.setItem("snakeos_player", name);
    set({ playerName: name });
  },
}));
