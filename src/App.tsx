import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DndContext, DragOverlay, type DragStartEvent, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useGame } from './hooks/useGame.ts';
import { useScorePreview } from './hooks/useScorePreview.ts';
import { useOnlineStore } from './store/onlineStore.ts';
import { Setup } from './components/Setup/Setup.tsx';
import { Board } from './components/Board/Board.tsx';
import { Rack } from './components/Rack/Rack.tsx';
import { Scoreboard } from './components/Scoreboard/Scoreboard.tsx';
import { Controls } from './components/Controls/Controls.tsx';
import { History } from './components/History/History.tsx';
import { EndGame } from './components/EndGame/EndGame.tsx';
import { ExchangeModal } from './components/Controls/ExchangeModal.tsx';
import { BlankTileModal } from './components/Controls/BlankTileModal.tsx';
import { TurnTransition } from './components/Controls/TurnTransition.tsx';
import { PauseOverlay } from './components/Controls/PauseOverlay.tsx';
import { ExitConfirmModal } from './components/Controls/ExitConfirmModal.tsx';
import { Rules } from './components/Rules/Rules.tsx';
import { Tile } from './components/Tile/Tile.tsx';
import { Lobby } from './components/Lobby/Lobby.tsx';
import { WaitingRoom } from './components/Lobby/WaitingRoom.tsx';
import { OnlineApp } from './OnlineApp.tsx';
import { useSocketListeners } from './hooks/useSocketListeners.ts';
import { connectSocket } from './hooks/useSocket.ts';
import type { Tile as TileType, TimerConfig, PlayerConfig } from './types/index.ts';
import './styles/variables.css';
import styles from './App.module.css';

type AppMode = 'menu' | 'local' | 'online';

function App() {
  const [mode, setMode] = useState<AppMode>(() => {
    // Check for saved online session to rejoin
    const savedRoom = sessionStorage.getItem('wg-room');
    const savedPlayer = sessionStorage.getItem('wg-player');
    if (savedRoom && savedPlayer) return 'online';
    return 'menu';
  });
  const rejoinAttempted = useRef(false);

  // Auto-rejoin on page refresh
  useEffect(() => {
    if (mode === 'online' && !rejoinAttempted.current) {
      rejoinAttempted.current = true;
      const savedRoom = sessionStorage.getItem('wg-room');
      const savedPlayer = sessionStorage.getItem('wg-player');
      if (savedRoom && savedPlayer) {
        const socket = connectSocket();
        socket.emit('room:rejoin', { roomCode: savedRoom, playerId: savedPlayer }, (response) => {
          if (response.ok) {
            useOnlineStore.getState().setRoom(savedRoom, savedPlayer);
          } else {
            sessionStorage.removeItem('wg-room');
            sessionStorage.removeItem('wg-player');
            setMode('menu');
          }
        });
      }
    }
  }, [mode]);

  if (mode === 'online') {
    return <OnlineWrapper onExit={() => setMode('menu')} />;
  }

  // Local mode or menu
  return <LocalApp mode={mode} setMode={setMode} />;
}

// Wrapper that stays mounted across all online phases so socket listeners persist
function OnlineWrapper({ onExit }: { onExit: () => void }) {
  useSocketListeners();
  const onlinePhase = useOnlineStore(s => s.phase);

  if (onlinePhase === 'idle' || onlinePhase === 'lobby') {
    return <Lobby onBack={() => { useOnlineStore.getState().reset(); onExit(); }} />;
  }
  if (onlinePhase === 'waiting') {
    return <WaitingRoom />;
  }
  return <OnlineApp onExit={onExit} />;
}

function LocalApp({ setMode }: { mode: AppMode; setMode: (m: AppMode) => void }) {
  const game = useGame();
  const dragTileRef = useRef<TileType | null>(null);
  const prevPlayerIndex = useRef(game.currentPlayerIndex);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Show turn transition on player change during playing phase (skip for AI)
  useEffect(() => {
    if (game.phase === 'playing' && prevPlayerIndex.current !== game.currentPlayerIndex) {
      const nextPlayer = game.players[game.currentPlayerIndex];
      if (game.moveHistory.length > 0 && !nextPlayer?.isAI) {
        game.ui.showTransition(nextPlayer.name);
      }
      prevPlayerIndex.current = game.currentPlayerIndex;
    }
  }, [game.currentPlayerIndex, game.phase, game.moveHistory.length, game.ui, game.players]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (game.players[game.currentPlayerIndex]?.isAI) return;
    const tile = event.active.data.current?.tile as TileType | undefined;
    if (tile) dragTileRef.current = tile;
  }, [game.players, game.currentPlayerIndex]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    dragTileRef.current = null;
    if (game.players[game.currentPlayerIndex]?.isAI) return;
    const { active, over } = event;
    if (!over) return;

    const tile = active.data.current?.tile as TileType | undefined;
    const dropData = over.data.current as { row?: number; col?: number } | undefined;

    if (tile && dropData?.row !== undefined && dropData?.col !== undefined) {
      const source = active.data.current?.source;
      if (source === 'rack') {
        if (tile.isBlank && !tile.designatedLetter) {
          game.placeTileOnBoard(tile, dropData.row, dropData.col);
          game.ui.openBlankModal(tile.id);
        } else {
          game.placeTileOnBoard(tile, dropData.row, dropData.col);
        }
      } else if (source === 'board') {
        const sourceRow = active.data.current?.sourceRow as number;
        const sourceCol = active.data.current?.sourceCol as number;
        if (sourceRow !== dropData.row || sourceCol !== dropData.col) {
          game.moveTileOnBoard(sourceRow, sourceCol, dropData.row, dropData.col);
        }
      }
    }
  }, [game]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (game.players[game.currentPlayerIndex]?.isAI) return;
    game.removeTileFromBoard(row, col);
  }, [game]);

  const pendingPositions = new Set(
    game.pendingPlacements.map(p => `${p.position.row},${p.position.col}`)
  );

  const scorePreview = useScorePreview(game.board, game.pendingPlacements);

  const validWordPositions = useMemo(() => {
    if (!scorePreview?.valid || scorePreview.words.length === 0) return undefined;
    const positions = new Set<string>();
    for (const word of scorePreview.words) {
      for (const pos of word.positions) {
        positions.add(`${pos.row},${pos.col}`);
      }
    }
    return positions;
  }, [scorePreview]);

  const currentPlayer = game.players[game.currentPlayerIndex];

  // Setup screen
  if (game.phase === 'setup') {
    return (
      <>
        <Setup
          onStart={(configs: PlayerConfig[], config: TimerConfig) => { setMode('local'); game.startGame(configs, config); }}
          hasSavedGame={game.hasSavedGame}
          onResumeSavedGame={() => { setMode('local'); game.resumeSavedGame(); }}
          onPlayOnline={() => setMode('online')}
        />
        {game.ui.showRules && <Rules onClose={() => game.ui.closeRules()} />}
      </>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={styles.game}>
        <div className={styles.scoreboard}>
          <Scoreboard players={game.players} currentPlayerIndex={game.currentPlayerIndex} />
        </div>

        <div className={styles.boardArea}>
          <Board board={game.board} pendingPositions={pendingPositions} validWordPositions={validWordPositions} onCellClick={handleCellClick} />
        </div>

        <div className={styles.playerArea}>
          {currentPlayer && (
            <>
              <div className={styles.turnLabel}>
                {currentPlayer.name}'s turn
              </div>
              {currentPlayer.isAI ? (
                game.ui.isAIThinking && (
                  <div className={styles.aiThinking}>Thinking...</div>
                )
              ) : (
                <Rack tiles={currentPlayer.rack} />
              )}
            </>
          )}
        </div>

        {(!currentPlayer?.isAI) && (
          <div className={styles.controlsArea}>
            <Controls
              onPlay={() => game.commitMove()}
              onPass={() => {
                game.recallTiles();
                game.passTurn();
              }}
              onExchange={() => {
                game.recallTiles();
                game.ui.openExchangeModal();
              }}
              onRecall={() => game.recallTiles()}
              onShuffle={() => game.shuffleRack()}
              onPause={() => game.pauseGame()}
              onExit={() => game.ui.openExitConfirm()}
              hasPendingTiles={game.pendingPlacements.length > 0}
              canExchange={game.tileBag.length >= 7}
              error={game.lastError}
              tilesInBag={game.tileBag.length}
              scorePreview={scorePreview}
            />
          </div>
        )}

        <div className={styles.sidebar}>
          <History moves={game.moveHistory} players={game.players} />
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {dragTileRef.current && (
          <div style={{ width: 'var(--rack-tile-size)', height: 'var(--rack-tile-size)' }}>
            <Tile tile={dragTileRef.current} isRackTile />
          </div>
        )}
      </DragOverlay>

      {/* Modals */}
      {game.ui.showExchangeModal && currentPlayer && (
        <ExchangeModal
          rack={currentPlayer.rack}
          onConfirm={(tiles) => game.exchangeTiles(tiles)}
          onCancel={() => game.ui.closeExchangeModal()}
        />
      )}

      {game.ui.showBlankModal && game.ui.blankTileId && (
        <BlankTileModal
          onSelect={(letter) => {
            game.setBlankLetter(game.ui.blankTileId!, letter);
            game.ui.closeBlankModal();
          }}
        />
      )}

      {game.ui.showTurnTransition && (
        <TurnTransition
          playerName={game.ui.turnTransitionPlayer}
          onReady={() => game.ui.hideTransition()}
        />
      )}

      {game.ui.showPauseOverlay && (
        <PauseOverlay
          onResume={() => game.resumeGame()}
          onSaveAndQuit={() => game.saveAndQuit()}
          onExit={() => game.ui.openExitConfirm()}
        />
      )}

      {game.ui.showRules && <Rules onClose={() => game.ui.closeRules()} />}

      {game.ui.showExitConfirm && (
        <ExitConfirmModal
          onConfirm={() => { game.exitGame(); setMode('menu'); }}
          onCancel={() => game.ui.closeExitConfirm()}
        />
      )}

      {game.phase === 'ended' && (
        <EndGame
          players={game.players}
          reason={game.endReason}
          onPlayAgain={() => {
            game.startGame(
              game.players.map(p => ({
                name: p.name,
                isAI: p.isAI,
                aiDifficulty: p.aiDifficulty,
              })),
              game.timerConfig
            );
          }}
        />
      )}
    </DndContext>
  );
}

export default App;
