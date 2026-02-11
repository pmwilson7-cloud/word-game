import type { Player, Tile } from '../types/index.ts';

// Maximum consecutive scoreless turns before game ends (all players combined)
const MAX_SCORELESS_TURNS = 6;

export function getNextPlayerIndex(players: Player[], currentIndex: number): number {
  const count = players.length;
  let next = (currentIndex + 1) % count;

  // Skip eliminated players
  let attempts = 0;
  while (players[next].isEliminated && attempts < count) {
    next = (next + 1) % count;
    attempts++;
  }

  return next;
}

export function getActivePlayers(players: Player[]): Player[] {
  return players.filter(p => !p.isEliminated);
}

export function shouldGameEnd(
  players: Player[],
  tileBag: Tile[],
  consecutiveScorelessTurns: number
): { ended: boolean; reason?: string } {
  // A player used all their tiles and the bag is empty
  const bagEmpty = tileBag.length === 0;
  if (bagEmpty) {
    const playerWithNoTiles = players.find(p => !p.isEliminated && p.rack.length === 0);
    if (playerWithNoTiles) {
      return { ended: true, reason: `${playerWithNoTiles.name} used all their tiles!` };
    }
  }

  // Too many consecutive scoreless turns
  if (consecutiveScorelessTurns >= MAX_SCORELESS_TURNS) {
    return { ended: true, reason: 'Game ended: too many consecutive passes/zero-score turns' };
  }

  // Only one active player left
  const active = getActivePlayers(players);
  if (active.length <= 1 && players.length > 1) {
    return { ended: true, reason: `${active[0]?.name ?? 'No one'} wins by elimination!` };
  }

  return { ended: false };
}

// At game end, subtract remaining tile values from each player's score
// The player who went out gets the sum of all other players' remaining tiles added
export function calculateFinalScores(players: Player[]): Player[] {
  const playerWithNoTiles = players.find(p => !p.isEliminated && p.rack.length === 0);

  let totalRemainingPoints = 0;

  const adjusted = players.map(player => {
    if (player.isEliminated) return player;

    const rackValue = player.rack.reduce((sum, tile) => sum + tile.points, 0);
    totalRemainingPoints += rackValue;

    return {
      ...player,
      score: player.score - rackValue,
    };
  });

  // Give the player who went out the sum of everyone else's remaining tiles
  if (playerWithNoTiles) {
    return adjusted.map(p =>
      p.id === playerWithNoTiles.id
        ? { ...p, score: p.score + totalRemainingPoints }
        : p
    );
  }

  return adjusted;
}

export function getWinner(players: Player[]): Player | null {
  const active = players.filter(p => !p.isEliminated);
  if (active.length === 0) return null;
  return active.reduce((best, p) => (p.score > best.score ? p : best));
}
