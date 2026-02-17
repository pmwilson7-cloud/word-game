import type { Board, Tile, PlacedTile, Position } from '../../types/index.ts';
import { BOARD_SIZE, CENTER } from '../../constants/board.ts';
import { TILE_DISTRIBUTION } from '../../constants/tiles.ts';

export interface AIMove {
  placements: PlacedTile[];
  score: number;
  words: string[];
}

// Build a map of letter -> points for scoring
const LETTER_POINTS: Record<string, number> = {};
for (const { letter, points } of TILE_DISTRIBUTION) {
  if (letter) LETTER_POINTS[letter] = points;
}

// Get the effective letter of a tile on the board
function effectiveLetter(tile: Tile): string {
  if (tile.isBlank) return tile.designatedLetter ?? '';
  return tile.letter;
}

// Precompute cross-check sets: for each empty cell, which letters A-Z can go there
// without creating an invalid perpendicular word
function computeCrossChecks(
  board: Board,
  dictionary: Set<string>
): Map<string, Set<string>> {
  const checks = new Map<string, Set<string>>();
  const allLetters = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c].tile) continue;

      // Check if there are perpendicular neighbors
      let above = '';
      let below = '';

      // Collect letters above
      let rr = r - 1;
      while (rr >= 0 && board[rr][c].tile) {
        above = effectiveLetter(board[rr][c].tile!) + above;
        rr--;
      }

      // Collect letters below
      rr = r + 1;
      while (rr < BOARD_SIZE && board[rr][c].tile) {
        below += effectiveLetter(board[rr][c].tile!);
        rr++;
      }

      // Collect letters left
      let left = '';
      let cc = c - 1;
      while (cc >= 0 && board[r][cc].tile) {
        left = effectiveLetter(board[r][cc].tile!) + left;
        cc--;
      }

      // Collect letters right
      let right = '';
      cc = c + 1;
      while (cc < BOARD_SIZE && board[r][cc].tile) {
        right += effectiveLetter(board[r][cc].tile!);
        cc++;
      }

      const hasVerticalNeighbor = above.length > 0 || below.length > 0;
      const hasHorizontalNeighbor = left.length > 0 || right.length > 0;

      // We store cross-checks per direction:
      // "H:r,c" = valid letters when placing horizontally (check vertical cross-word)
      // "V:r,c" = valid letters when placing vertically (check horizontal cross-word)

      // For horizontal placement, check vertical cross-words
      if (!hasVerticalNeighbor) {
        checks.set(`H:${r},${c}`, allLetters);
      } else {
        const valid = new Set<string>();
        for (const letter of allLetters) {
          const word = above + letter + below;
          if (dictionary.has(word)) valid.add(letter);
        }
        checks.set(`H:${r},${c}`, valid);
      }

      // For vertical placement, check horizontal cross-words
      if (!hasHorizontalNeighbor) {
        checks.set(`V:${r},${c}`, allLetters);
      } else {
        const valid = new Set<string>();
        for (const letter of allLetters) {
          const word = left + letter + right;
          if (dictionary.has(word)) valid.add(letter);
        }
        checks.set(`V:${r},${c}`, valid);
      }
    }
  }

  return checks;
}

// Find all anchor squares (empty cells adjacent to at least one tile)
function findAnchors(board: Board): Position[] {
  const anchors: Position[] = [];
  const offsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c].tile) continue;
      for (const [dr, dc] of offsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc].tile) {
          anchors.push({ row: r, col: c });
          break;
        }
      }
    }
  }

  return anchors;
}

function isBoardEmpty(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c].tile) return false;
    }
  }
  return true;
}

// Score a word placement on the board, accounting for premiums on newly placed tiles
function scoreWordOnBoard(
  board: Board,
  wordPositions: { pos: Position; letter: string; isNew: boolean; points: number }[]
): number {
  let wordScore = 0;
  let wordMultiplier = 1;

  for (const { pos, points, isNew } of wordPositions) {
    let letterScore = points;
    if (isNew) {
      const premium = board[pos.row][pos.col].premium;
      switch (premium) {
        case 'dl': letterScore *= 2; break;
        case 'tl': letterScore *= 3; break;
        case 'dw': case 'star': wordMultiplier *= 2; break;
        case 'tw': wordMultiplier *= 3; break;
      }
    }
    wordScore += letterScore;
  }

  return wordScore * wordMultiplier;
}

// Score a complete move including main word + all cross words + bingo bonus
function scoreMoveComplete(
  board: Board,
  placements: { pos: Position; tile: Tile }[],
  direction: 'horizontal' | 'vertical',
  dictionary: Set<string>
): { score: number; words: string[] } | null {
  const placedSet = new Map<string, { tile: Tile }>();
  for (const p of placements) {
    placedSet.set(`${p.pos.row},${p.pos.col}`, { tile: p.tile });
  }

  function getTileAt(r: number, c: number): { letter: string; points: number; isNew: boolean } | null {
    const key = `${r},${c}`;
    const placed = placedSet.get(key);
    if (placed) {
      const t = placed.tile;
      return {
        letter: t.isBlank ? (t.designatedLetter ?? '') : t.letter,
        points: t.points,
        isNew: true,
      };
    }
    const existing = board[r][c].tile;
    if (existing) {
      return {
        letter: effectiveLetter(existing),
        points: existing.points,
        isNew: false,
      };
    }
    return null;
  }

  let totalScore = 0;
  const words: string[] = [];

  // Main word
  const dr = direction === 'vertical' ? 1 : 0;
  const dc = direction === 'horizontal' ? 1 : 0;

  // Find start of main word
  let sr = placements[0].pos.row;
  let sc = placements[0].pos.col;
  while (sr - dr >= 0 && sc - dc >= 0 && getTileAt(sr - dr, sc - dc)) {
    sr -= dr;
    sc -= dc;
  }

  // Collect main word
  const mainWord: { pos: Position; letter: string; isNew: boolean; points: number }[] = [];
  let cr = sr;
  let cc = sc;
  while (cr >= 0 && cr < BOARD_SIZE && cc >= 0 && cc < BOARD_SIZE) {
    const t = getTileAt(cr, cc);
    if (!t) break;
    mainWord.push({ pos: { row: cr, col: cc }, ...t });
    cr += dr;
    cc += dc;
  }

  if (mainWord.length > 1) {
    const word = mainWord.map(w => w.letter).join('');
    if (!dictionary.has(word)) return null;
    words.push(word);
    totalScore += scoreWordOnBoard(board, mainWord);
  }

  // Cross words for each placed tile
  const crossDr = direction === 'horizontal' ? 1 : 0;
  const crossDc = direction === 'vertical' ? 1 : 0;

  for (const p of placements) {
    // Find start of cross word
    let csr = p.pos.row - crossDr;
    let csc = p.pos.col - crossDc;
    while (csr >= 0 && csc >= 0 && getTileAt(csr, csc)) {
      csr -= crossDr;
      csc -= crossDc;
    }
    csr += crossDr;
    csc += crossDc;

    // Collect cross word
    const crossWord: { pos: Position; letter: string; isNew: boolean; points: number }[] = [];
    let xr = csr;
    let xc = csc;
    while (xr >= 0 && xr < BOARD_SIZE && xc >= 0 && xc < BOARD_SIZE) {
      const t = getTileAt(xr, xc);
      if (!t) break;
      crossWord.push({ pos: { row: xr, col: xc }, ...t });
      xr += crossDr;
      xc += crossDc;
    }

    if (crossWord.length > 1) {
      const word = crossWord.map(w => w.letter).join('');
      if (!dictionary.has(word)) return null;
      words.push(word);
      totalScore += scoreWordOnBoard(board, crossWord);
    }
  }

  if (words.length === 0) return null;

  // Bingo bonus
  if (placements.length === 7) {
    totalScore += 50;
  }

  return { score: totalScore, words };
}

// Main entry point
export function findAllMoves(
  board: Board,
  rack: Tile[],
  dictionary: Set<string>
): AIMove[] {
  const moves: AIMove[] = [];
  const seen = new Set<string>();

  const empty = isBoardEmpty(board);

  if (empty) {
    // First move: generate words through center
    findFirstMoves(board, rack, dictionary, moves, seen);
    return moves;
  }

  const crossChecks = computeCrossChecks(board, dictionary);
  const anchors = findAnchors(board);

  for (const anchor of anchors) {
    // Try horizontal
    generateMovesFromAnchor(board, rack, dictionary, crossChecks, anchor, 'horizontal', moves, seen);
    // Try vertical
    generateMovesFromAnchor(board, rack, dictionary, crossChecks, anchor, 'vertical', moves, seen);
  }

  return moves;
}

function generateMovesFromAnchor(
  board: Board,
  rack: Tile[],
  dictionary: Set<string>,
  crossChecks: Map<string, Set<string>>,
  anchor: Position,
  direction: 'horizontal' | 'vertical',
  moves: AIMove[],
  seen: Set<string>
): void {
  const dr = direction === 'vertical' ? 1 : 0;
  const dc = direction === 'horizontal' ? 1 : 0;

  // How far left/up can we extend from the anchor?
  let leftLimit = 0;
  let pr = anchor.row - dr;
  let pc = anchor.col - dc;

  while (pr >= 0 && pc >= 0 && !board[pr][pc].tile) {
    // Don't extend through another anchor that has existing tiles adjacent
    // (to avoid generating the same word from multiple anchors)
    leftLimit++;
    pr -= dr;
    pc -= dc;
  }

  // If there are existing tiles before the anchor, use them as prefix
  if (pr >= 0 && pc >= 0 && board[pr][pc].tile) {
    // Collect the prefix
    const prefix: string[] = [];
    let tr = pr;
    let tc = pc;
    while (tr >= 0 && tc >= 0 && board[tr][tc].tile) {
      prefix.unshift(effectiveLetter(board[tr][tc].tile!));
      tr -= dr;
      tc -= dc;
    }
    // Extend right from anchor with existing prefix
    extendRight(
      board, rack, dictionary, crossChecks, direction,
      anchor.row, anchor.col,
      prefix.join(''),
      [],
      rack.map((_, i) => i), // available rack indices
      moves, seen
    );
  } else {
    // Generate left parts of length 0..leftLimit, then extend right
    leftLimit = Math.min(leftLimit, rack.length);
    generateLeftPart(
      board, rack, dictionary, crossChecks, direction,
      anchor, '', [],
      rack.map((_, i) => i),
      leftLimit, 0,
      moves, seen
    );
  }
}

function generateLeftPart(
  board: Board,
  rack: Tile[],
  dictionary: Set<string>,
  crossChecks: Map<string, Set<string>>,
  direction: 'horizontal' | 'vertical',
  anchor: Position,
  partial: string,
  placedSoFar: { pos: Position; tile: Tile }[],
  availableIndices: number[],
  maxLeft: number,
  currentLeft: number,
  moves: AIMove[],
  seen: Set<string>
): void {
  // Try extending right with current partial (including empty partial)
  extendRight(
    board, rack, dictionary, crossChecks, direction,
    anchor.row, anchor.col,
    partial, placedSoFar, availableIndices,
    moves, seen
  );

  if (currentLeft >= maxLeft) return;

  const dr = direction === 'vertical' ? 1 : 0;
  const dc = direction === 'horizontal' ? 1 : 0;
  const leftDist = currentLeft + 1;
  const pos: Position = {
    row: anchor.row - dr * leftDist,
    col: anchor.col - dc * leftDist,
  };

  if (pos.row < 0 || pos.col < 0) return;

  const crossKey = direction === 'horizontal' ? `H:${pos.row},${pos.col}` : `V:${pos.row},${pos.col}`;
  const crossSet = crossChecks.get(crossKey);
  if (!crossSet) return;

  for (let i = 0; i < availableIndices.length; i++) {
    const idx = availableIndices[i];
    const tile = rack[idx];
    const remaining = availableIndices.filter((_, j) => j !== i);

    if (tile.isBlank) {
      // Try each letter from cross-check set
      for (const letter of crossSet) {
        const blankTile: Tile = { ...tile, designatedLetter: letter };
        generateLeftPart(
          board, rack, dictionary, crossChecks, direction,
          anchor, letter + partial,
          [{ pos, tile: blankTile }, ...placedSoFar],
          remaining, maxLeft, currentLeft + 1,
          moves, seen
        );
      }
    } else {
      if (!crossSet.has(tile.letter)) continue;
      generateLeftPart(
        board, rack, dictionary, crossChecks, direction,
        anchor, tile.letter + partial,
        [{ pos, tile }, ...placedSoFar],
        remaining, maxLeft, currentLeft + 1,
        moves, seen
      );
    }
  }
}

function extendRight(
  board: Board,
  rack: Tile[],
  dictionary: Set<string>,
  crossChecks: Map<string, Set<string>>,
  direction: 'horizontal' | 'vertical',
  row: number,
  col: number,
  partial: string,
  placedSoFar: { pos: Position; tile: Tile }[],
  availableIndices: number[],
  moves: AIMove[],
  seen: Set<string>
): void {
  if (row >= BOARD_SIZE || col >= BOARD_SIZE || row < 0 || col < 0) {
    // Word boundary — check if valid
    tryRecordMove(board, dictionary, partial, placedSoFar, direction, moves, seen);
    return;
  }

  const dr = direction === 'vertical' ? 1 : 0;
  const dc = direction === 'horizontal' ? 1 : 0;

  const cell = board[row][col];
  if (cell.tile) {
    // Existing tile — use it and continue
    const letter = effectiveLetter(cell.tile);
    extendRight(
      board, rack, dictionary, crossChecks, direction,
      row + dr, col + dc,
      partial + letter, placedSoFar, availableIndices,
      moves, seen
    );
  } else {
    // Empty cell — try each available rack tile
    // First, check for word boundary (we've placed at least something)
    if (placedSoFar.length > 0) {
      tryRecordMove(board, dictionary, partial, placedSoFar, direction, moves, seen);
    }

    if (availableIndices.length === 0) return;

    const crossKey = direction === 'horizontal' ? `H:${row},${col}` : `V:${row},${col}`;
    const crossSet = crossChecks.get(crossKey);
    if (!crossSet) return;

    for (let i = 0; i < availableIndices.length; i++) {
      const idx = availableIndices[i];
      const tile = rack[idx];
      const remaining = availableIndices.filter((_, j) => j !== i);
      const pos: Position = { row, col };

      if (tile.isBlank) {
        for (const letter of crossSet) {
          const blankTile: Tile = { ...tile, designatedLetter: letter };
          extendRight(
            board, rack, dictionary, crossChecks, direction,
            row + dr, col + dc,
            partial + letter,
            [...placedSoFar, { pos, tile: blankTile }],
            remaining,
            moves, seen
          );
        }
      } else {
        if (!crossSet.has(tile.letter)) continue;
        extendRight(
          board, rack, dictionary, crossChecks, direction,
          row + dr, col + dc,
          partial + tile.letter,
          [...placedSoFar, { pos, tile }],
          remaining,
          moves, seen
        );
      }
    }
  }
}

function tryRecordMove(
  board: Board,
  dictionary: Set<string>,
  word: string,
  placedSoFar: { pos: Position; tile: Tile }[],
  direction: 'horizontal' | 'vertical',
  moves: AIMove[],
  seen: Set<string>
): void {
  if (placedSoFar.length === 0) return;
  if (word.length < 2) return;

  // Create signature for dedup
  const sig = placedSoFar
    .map(p => `${p.pos.row},${p.pos.col}:${p.tile.isBlank ? '*' : ''}${p.tile.isBlank ? p.tile.designatedLetter : p.tile.letter}`)
    .sort()
    .join('|');
  if (seen.has(sig)) return;

  // Score the full move including cross-words
  const result = scoreMoveComplete(board, placedSoFar, direction, dictionary);
  if (!result) return;

  seen.add(sig);

  const placements: PlacedTile[] = placedSoFar.map(p => ({
    tile: p.tile,
    position: p.pos,
  }));

  moves.push({
    placements,
    score: result.score,
    words: result.words,
  });
}

function findFirstMoves(
  board: Board,
  rack: Tile[],
  dictionary: Set<string>,
  moves: AIMove[],
  seen: Set<string>
): void {
  // On empty board, generate words through center (7,7)
  // Try both directions
  for (const direction of ['horizontal', 'vertical'] as const) {
    const dr = direction === 'vertical' ? 1 : 0;
    const dc = direction === 'horizontal' ? 1 : 0;

    // Try starting positions that would pass through center
    for (let startOffset = 0; startOffset < Math.min(rack.length, 7); startOffset++) {
      const startRow = CENTER - dr * startOffset;
      const startCol = CENTER - dc * startOffset;
      if (startRow < 0 || startCol < 0) continue;

      generateFirstMoveWords(
        board, rack, dictionary, direction,
        startRow, startCol,
        '', [],
        rack.map((_, i) => i),
        startOffset,
        moves, seen
      );
    }
  }
}

function generateFirstMoveWords(
  board: Board,
  rack: Tile[],
  dictionary: Set<string>,
  direction: 'horizontal' | 'vertical',
  row: number,
  col: number,
  partial: string,
  placedSoFar: { pos: Position; tile: Tile }[],
  availableIndices: number[],
  centerOffset: number, // how many more tiles until we reach/pass center
  moves: AIMove[],
  seen: Set<string>
): void {
  if (row >= BOARD_SIZE || col >= BOARD_SIZE) return;

  const dr = direction === 'vertical' ? 1 : 0;
  const dc = direction === 'horizontal' ? 1 : 0;

  if (availableIndices.length === 0) {
    // Check if word is valid and passes through center
    if (partial.length >= 2 && centerOffset <= 0) {
      tryRecordFirstMove(board, dictionary, partial, placedSoFar, direction, moves, seen);
    }
    return;
  }

  const pos: Position = { row, col };

  for (let i = 0; i < availableIndices.length; i++) {
    const idx = availableIndices[i];
    const tile = rack[idx];
    const remaining = availableIndices.filter((_, j) => j !== i);

    const tryLetter = (letter: string, useTile: Tile) => {
      const newPartial = partial + letter;
      const newPlaced = [...placedSoFar, { pos, tile: useTile }];
      const newCenterOffset = centerOffset - 1;

      // If we've passed center, check for valid word
      if (newPartial.length >= 2 && newCenterOffset <= 0) {
        tryRecordFirstMove(board, dictionary, newPartial, newPlaced, direction, moves, seen);
      }

      // Continue extending
      if (remaining.length > 0) {
        generateFirstMoveWords(
          board, rack, dictionary, direction,
          row + dr, col + dc,
          newPartial, newPlaced, remaining,
          newCenterOffset, moves, seen
        );
      }
    };

    if (tile.isBlank) {
      for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        tryLetter(letter, { ...tile, designatedLetter: letter });
      }
    } else {
      tryLetter(tile.letter, tile);
    }
  }
}

function tryRecordFirstMove(
  board: Board,
  dictionary: Set<string>,
  word: string,
  placedSoFar: { pos: Position; tile: Tile }[],
  _direction: 'horizontal' | 'vertical',
  moves: AIMove[],
  seen: Set<string>
): void {
  if (!dictionary.has(word)) return;

  const sig = placedSoFar
    .map(p => `${p.pos.row},${p.pos.col}:${p.tile.isBlank ? '*' : ''}${p.tile.isBlank ? p.tile.designatedLetter : p.tile.letter}`)
    .sort()
    .join('|');
  if (seen.has(sig)) return;
  seen.add(sig);

  // Score
  let wordScore = 0;
  let wordMultiplier = 1;
  for (const p of placedSoFar) {
    let letterScore = p.tile.points;
    const premium = board[p.pos.row][p.pos.col].premium;
    switch (premium) {
      case 'dl': letterScore *= 2; break;
      case 'tl': letterScore *= 3; break;
      case 'dw': case 'star': wordMultiplier *= 2; break;
      case 'tw': wordMultiplier *= 3; break;
    }
    wordScore += letterScore;
  }
  wordScore *= wordMultiplier;

  if (placedSoFar.length === 7) wordScore += 50;

  const placements: PlacedTile[] = placedSoFar.map(p => ({
    tile: p.tile,
    position: p.pos,
  }));

  moves.push({ placements, score: wordScore, words: [word] });
}
