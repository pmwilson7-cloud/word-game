import { create } from 'zustand';

export interface UiStore {
  showExchangeModal: boolean;
  showBlankModal: boolean;
  blankTileId: string | null;
  showTurnTransition: boolean;
  turnTransitionPlayer: string;
  selectedRackTiles: Set<string>;
  showPauseOverlay: boolean;
  showExitConfirm: boolean;

  openExchangeModal: () => void;
  closeExchangeModal: () => void;
  openBlankModal: (tileId: string) => void;
  closeBlankModal: () => void;
  showTransition: (playerName: string) => void;
  hideTransition: () => void;
  toggleRackTileSelection: (tileId: string) => void;
  clearRackSelection: () => void;
  openPauseOverlay: () => void;
  closePauseOverlay: () => void;
  openExitConfirm: () => void;
  closeExitConfirm: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  showExchangeModal: false,
  showBlankModal: false,
  blankTileId: null,
  showTurnTransition: false,
  turnTransitionPlayer: '',
  selectedRackTiles: new Set(),
  showPauseOverlay: false,
  showExitConfirm: false,

  openExchangeModal: () => set({ showExchangeModal: true }),
  closeExchangeModal: () => set({ showExchangeModal: false, selectedRackTiles: new Set() }),
  openBlankModal: (tileId) => set({ showBlankModal: true, blankTileId: tileId }),
  closeBlankModal: () => set({ showBlankModal: false, blankTileId: null }),
  showTransition: (playerName) => set({ showTurnTransition: true, turnTransitionPlayer: playerName }),
  hideTransition: () => set({ showTurnTransition: false }),
  toggleRackTileSelection: (tileId) => set(state => {
    const newSet = new Set(state.selectedRackTiles);
    if (newSet.has(tileId)) {
      newSet.delete(tileId);
    } else {
      newSet.add(tileId);
    }
    return { selectedRackTiles: newSet };
  }),
  clearRackSelection: () => set({ selectedRackTiles: new Set() }),
  openPauseOverlay: () => set({ showPauseOverlay: true }),
  closePauseOverlay: () => set({ showPauseOverlay: false }),
  openExitConfirm: () => set({ showExitConfirm: true }),
  closeExitConfirm: () => set({ showExitConfirm: false }),
}));
