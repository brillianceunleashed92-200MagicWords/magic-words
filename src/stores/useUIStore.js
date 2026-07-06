import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Client-only UI state — anything server-backed lives in a TanStack Query
// hook instead (see src/lib/queries/). Persisted slice covers settings that
// should survive a refresh without a dedicated Supabase table: Phase 1 has
// no explicit schema for session-time-limit, so it's a local parent setting
// for now (flagged in the build report — fine for a single-device/browser
// Grown-Ups setting, would need a table if parents expect it to sync
// across devices).
export const useUIStore = create(
  persist(
    (set) => ({
      // Bottom nav: 'home' | 'play' | 'galaxy' | 'grownups'
      navTab: 'home',
      setNavTab: (navTab) => set({ navTab }),

      // The child profile currently active in the app (Phase 2 multi-child
      // — see src/lib/queries/childProfiles.js). Persisted so a parent
      // doesn't have to re-pick a child every refresh; HomeScreen falls
      // back to the first child if this id doesn't match any of theirs
      // (e.g. after switching accounts).
      activeChildId: null,
      setActiveChildId: (activeChildId) => set({ activeChildId }),

      // Grown-Ups gate — resets to locked on every app load/refresh, not persisted.
      grownUpsUnlocked: false,
      unlockGrownUps: () => set({ grownUpsUnlocked: true }),
      lockGrownUps: () => set({ grownUpsUnlocked: false }),

      // Parent-set session time limit, in minutes. null = no limit.
      sessionTimeLimitMinutes: null,
      setSessionTimeLimitMinutes: (mins) => set({ sessionTimeLimitMinutes: mins }),

      // Placement Adventure (Prompt 8): 'choice' | 'adventure' | null, plus
      // which child it's for. Lives in the global store (not local
      // component state) specifically so SettingsTab's "Retake placement"
      // button — nested inside GrownUpsScreen's generic tab renderer,
      // which passes no props to its ActiveComponent — can trigger the
      // same flow CandyGalaxyShell renders, without prop-drilling a
      // callback through every tab component's signature. Not persisted:
      // resets on refresh like grownUpsUnlocked, since a half-finished
      // placement is never meant to resume anyway.
      placementFlow: null,
      placementChildId: null,
      startPlacementFlow: (childId, flow = 'choice') => set({ placementFlow: flow, placementChildId: childId }),
      clearPlacementFlow: () => set({ placementFlow: null, placementChildId: null }),

      // Celebration queue — the 5 ranked moments are pushed here and drained
      // one at a time so two celebrations never overlap (e.g. a word
      // mastered mid-quest that also happens to complete the quest).
      celebrationQueue: [],
      queueCelebration: (celebration) => set((s) => ({ celebrationQueue: [...s.celebrationQueue, celebration] })),
      dequeueCelebration: () => set((s) => ({ celebrationQueue: s.celebrationQueue.slice(1) })),
    }),
    {
      name: 'candy-galaxy-ui',
      partialize: (state) => ({
        sessionTimeLimitMinutes: state.sessionTimeLimitMinutes,
        activeChildId: state.activeChildId,
      }),
    }
  )
);
