import { useCallback, useRef, useMemo } from 'react';
import { DndContext, DragOverlay, type DragStartEvent, type DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useOnlineGame } from './hooks/useOnlineGame.ts';
import { useScorePreview } from './hooks/useScorePreview.ts';
import { Board } from './components/Board/Board.tsx';
import { Rack } from './components/Rack/Rack.tsx';
import { Scoreboard } from './components/Scoreboard/Scoreboard.tsx';
import { Controls } from './components/Controls/Controls.tsx';
import { History } from './components/History/History.tsx';
import { EndGame } from './components/EndGame/EndGame.tsx';
import { ExchangeModal } from './components/Controls/ExchangeModal.tsx';
import { BlankTileModal } from './components/Controls/BlankTileModal.tsx';
import { ExitConfirmModal } from './components/Controls/ExitConfirmModal.tsx';
import { Rules } from './components/Rules/Rules.tsx';
import { Tile } from './components/Tile/Tile.tsx';
import type { Tile as TileType, Player } from './types/index.ts';
import type { PublicPlayer } from './types/online.ts';
import styles from './App.module.css';

// Adapt PublicPlayer to Player for components that expect Player[]
function toPlayers(publicPlayers: PublicPlayer[]): Player[] {
  return publicPlayers.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    rack: Array(p.rackCount).fill(null) as unknown as TileType[],
    isEliminated: p.isEliminated,
    consecutivePasses: p.consecutivePasses,
    isAI: p.isAI,
    aiDifficulty: p.aiDifficulty,
  }));
}

interface OnlineAppProps {
  onExit: () => void;
}

export function OnlineApp({ onExit }: OnlineAppProps) {
  const game = useOnlineGame();
  const dragTileRef = useRef<TileType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const isMyTurn = game.currentPlayerIndex === game.myPlayerIndex;
  const adaptedPlayers = useMemo(() => toPlayers(game.players), [game.players]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (!isMyTurn) return;
    const tile = event.active.data.current?.tile as TileType | undefined;
    if (tile) dragTileRef.current = tile;
  }, [isMyTurn]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    dragTileRef.current = null;
    if (!isMyTurn) return;
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
  }, [game, isMyTurn]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!isMyTurn) return;
    game.removeTileFromBoard(row, col);
  }, [game, isMyTurn]);

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

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={styles.game}>
        <div className={styles.scoreboard}>
          <Scoreboard players={adaptedPlayers} currentPlayerIndex={game.currentPlayerIndex} />
        </div>

        <div className={styles.boardArea}>
          <Board board={game.board} pendingPositions={pendingPositions} validWordPositions={validWordPositions} onCellClick={handleCellClick} />
        </div>

        <div className={styles.playerArea}>
          {currentPlayer && (
            <div className={styles.turnLabel}>
              {isMyTurn ? 'Your turn' : `${currentPlayer.name}'s turn`}
              {currentPlayer.isAI && ' (AI thinking...)'}
            </div>
          )}
          {game.myRack.length > 0 && (
            <Rack tiles={game.myRack} />
          )}
        </div>

        {isMyTurn && !currentPlayer?.isAI && (
          <div className={styles.controlsArea}>
            <Controls
              onPlay={() => game.commitMove()}
              onPass={() => game.passTurn()}
              onExchange={() => {
                game.recallTiles();
                game.ui.openExchangeModal();
              }}
              onRecall={() => game.recallTiles()}
              onShuffle={() => game.shuffleRack()}
              onExit={() => game.ui.openExitConfirm()}
              hasPendingTiles={game.pendingPlacements.length > 0}
              canExchange={game.tileBagCount >= 7}
              error={game.lastError}
              tilesInBag={game.tileBagCount}
              scorePreview={scorePreview}
            />
          </div>
        )}

        {!isMyTurn && (
          <div className={styles.controlsArea}>
            <Controls
              onPlay={() => {}}
              onPass={() => {}}
              onExchange={() => {}}
              onRecall={() => {}}
              onShuffle={() => game.shuffleRack()}
              onExit={() => game.ui.openExitConfirm()}
              hasPendingTiles={false}
              canExchange={false}
              error={null}
              tilesInBag={game.tileBagCount}
            />
          </div>
        )}

        <div className={styles.sidebar}>
          <History moves={game.moveHistory} players={adaptedPlayers} />
        </div>

        {game.disconnectedPlayer && (
          <div className={styles.turnLabel} style={{ color: 'var(--color-timer-warning)', textAlign: 'center', padding: '8px' }}>
            {game.disconnectedPlayer} disconnected...
          </div>
        )}
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
      {game.ui.showExchangeModal && (
        <ExchangeModal
          rack={game.myRack}
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

      {game.ui.showRules && <Rules onClose={() => game.ui.closeRules()} />}

      {game.ui.showExitConfirm && (
        <ExitConfirmModal
          onConfirm={() => {
            game.exitGame();
            onExit();
          }}
          onCancel={() => game.ui.closeExitConfirm()}
        />
      )}

      {game.phase === 'ended' && (
        <EndGame
          players={adaptedPlayers}
          reason={game.endReason}
          onPlayAgain={() => {
            game.exitGame();
            onExit();
          }}
        />
      )}
    </DndContext>
  );
}
