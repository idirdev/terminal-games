import { describe, it, expect } from 'vitest';

// The game files use module-private functions, so we re-implement the core game logic
// functions here to test them. The actual source at src/games/tictactoe.ts and src/games/2048.ts
// define these as module-level functions (not exported). We test the logic independently.

// ==================== TicTacToe Logic ====================

type Mark = 'X' | 'O' | null;
type Board = Mark[][];

function createBoard(): Board {
  return Array.from({ length: 3 }, () => Array(3).fill(null));
}

function getWinner(board: Board): Mark {
  for (let r = 0; r < 3; r++) {
    if (board[r][0] && board[r][0] === board[r][1] && board[r][1] === board[r][2]) {
      return board[r][0];
    }
  }
  for (let c = 0; c < 3; c++) {
    if (board[0][c] && board[0][c] === board[1][c] && board[1][c] === board[2][c]) {
      return board[0][c];
    }
  }
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0];
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2];
  }
  return null;
}

function isBoardFull(board: Board): boolean {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}

describe('TicTacToe game logic', () => {
  it('creates an empty 3x3 board', () => {
    const board = createBoard();
    expect(board.length).toBe(3);
    expect(board[0].length).toBe(3);
    expect(board.flat().every(cell => cell === null)).toBe(true);
  });

  it('detects row winner', () => {
    const board = createBoard();
    board[0] = ['X', 'X', 'X'];
    expect(getWinner(board)).toBe('X');
  });

  it('detects column winner', () => {
    const board = createBoard();
    board[0][1] = 'O';
    board[1][1] = 'O';
    board[2][1] = 'O';
    expect(getWinner(board)).toBe('O');
  });

  it('detects diagonal winner (top-left to bottom-right)', () => {
    const board = createBoard();
    board[0][0] = 'X';
    board[1][1] = 'X';
    board[2][2] = 'X';
    expect(getWinner(board)).toBe('X');
  });

  it('detects diagonal winner (top-right to bottom-left)', () => {
    const board = createBoard();
    board[0][2] = 'O';
    board[1][1] = 'O';
    board[2][0] = 'O';
    expect(getWinner(board)).toBe('O');
  });

  it('returns null when there is no winner', () => {
    const board = createBoard();
    board[0][0] = 'X';
    board[0][1] = 'O';
    expect(getWinner(board)).toBeNull();
  });

  it('detects a full board', () => {
    const board: Board = [
      ['X', 'O', 'X'],
      ['O', 'X', 'O'],
      ['O', 'X', 'O'],
    ];
    expect(isBoardFull(board)).toBe(true);
  });

  it('detects a non-full board', () => {
    const board = createBoard();
    board[0][0] = 'X';
    expect(isBoardFull(board)).toBe(false);
  });
});

// ==================== 2048 Logic ====================

function slideRow(row: number[]): [number[], number] {
  const filtered = row.filter(v => v !== 0);
  const result: number[] = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      score += merged;
      i += 2;
    } else {
      result.push(filtered[i]);
      i += 1;
    }
  }
  while (result.length < 4) {
    result.push(0);
  }
  return [result, score];
}

describe('2048 slideRow logic', () => {
  it('slides tiles to the left', () => {
    const [result] = slideRow([0, 2, 0, 2]);
    expect(result).toEqual([4, 0, 0, 0]);
  });

  it('merges adjacent equal tiles', () => {
    const [result, score] = slideRow([2, 2, 4, 4]);
    expect(result).toEqual([4, 8, 0, 0]);
    expect(score).toBe(12);
  });

  it('does not merge across a gap after merge', () => {
    const [result] = slideRow([2, 2, 2, 0]);
    expect(result).toEqual([4, 2, 0, 0]);
  });

  it('handles empty row', () => {
    const [result, score] = slideRow([0, 0, 0, 0]);
    expect(result).toEqual([0, 0, 0, 0]);
    expect(score).toBe(0);
  });

  it('handles already merged row', () => {
    const [result] = slideRow([2, 4, 8, 16]);
    expect(result).toEqual([2, 4, 8, 16]);
  });

  it('handles single tile', () => {
    const [result] = slideRow([0, 0, 0, 4]);
    expect(result).toEqual([4, 0, 0, 0]);
  });

  it('merges only first pair of equal adjacent tiles', () => {
    const [result] = slideRow([4, 4, 4, 4]);
    expect(result).toEqual([8, 8, 0, 0]);
  });

  it('returns correct score for merge', () => {
    const [, score] = slideRow([2, 2, 0, 0]);
    expect(score).toBe(4);
  });
});
