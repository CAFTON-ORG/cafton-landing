import { create } from "zustand";

interface HeroScrollState {
  progress: number;
  setProgress: (progress: number) => void;
}

export const useHeroScrollStore = create<HeroScrollState>((set) => ({
  progress: 0,
  setProgress: (progress) => set({ progress }),
}));
