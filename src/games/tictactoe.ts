import chalk from 'chalk';
import { clearScreen, hideCursor, showCursor, setCursor, writeAt, drawBox, waitForKey, getTerminalSize, centerText } from '../utils/terminal';
import { saveHighScore, displayLeaderboard } from '../utils/score';

const BOARD_SIZE = 3;
const CELL_WIDTH = 7;
const CELL_HEIGHT = 3;

type Mark = 'X' | 'O' | null;
type Board = Mark[][];

interface GameState {
  board: Board;
  currentPlayer: 'X' | 'O';
  cursorR: number;
  cursorC: number;
  winner: Mark;
  isDraw: boolean;
  playerMark: 'X' | 'O';
  aiMark: 'X' | 'O';
  playerScore: number;
  aiScore: number;
  draws: number;
}

function createBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

function getWinner(board: Board): Mark {
  // Check rows
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r][0] && board[r][0] === board[r][1] && board[r][1] === board[r][2]) {
      return board[r][0];
    }
  }
  // Check columns
  for (let c = 0; c < BOARD_SIZE; c++) {
    if (board[0][c] && board[0][c] === board[1][c] && board[1][c] === board[2][c]) {
      return board[0][c];
    }
  }
  // Check diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0];
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2];
  }
  return null;
}

function isBoardFull(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}

function getAvailableMoves(board: Board): [number, number][] {
  const moves: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) moves.push([r, c]);
    }
  }
  return moves;
}

/**
 * Minimax algorithm with alpha-beta pruning.
 * Returns the best score for the given player.
 */
function minimax(board: Board, depth: number, isMaximizing: boolean, aiMark: Mark, playerMark: Mark, alpha: number, beta: number): number {
  const winner = getWinner(board);
  if (winner === aiMark) return 10 - depth;
  if (winner === playerMark) return depth - 10;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (const [r, c] of getAvailableMoves(board)) {
      board[r][c] = aiMark;
      const score = minimax(board, depth + 1, false, aiMark, playerMark, alpha, beta);
      board[r][c] = null;
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of getAvailableMoves(board)) {
      board[r][c] = playerMark;
      const score = minimax(board, depth + 1, true, aiMark, playerMark, alpha, beta);
      board[r][c] = null;
      best = Math.min(best, score);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function findBestMove(board: Board, aiMark: 'X' | 'O', playerMark: 'X' | 'O'): [number, number] {
  let bestScore = -Infinity;
  let bestMove: [number, number] = [0, 0];

  for (const [r, c] of getAvailableMoves(board)) {
    board[r][c] = aiMark;
    const score = minimax(board, 0, false, aiMark, playerMark, -Infinity, Infinity);
    board[r][c] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }

  return bestMove;
}

function markDisplay(mark: Mark, isCursor: boolean): string {
  if (mark === 'X') return chalk.blue.bold('X');
  if (mark === 'O') return chalk.red.bold('O');
  if (isCursor) return chalk.bgWhite.black('\u00B7');
  return chalk.dim('\u00B7');
}

function render(state: GameState, offsetX: number, offsetY: number): void {
  const totalW = BOARD_SIZE * (CELL_WIDTH + 1) + 1;
  const totalH = BOARD_SIZE * (CELL_HEIGHT + 1) + 1;
  drawBox(offsetX - 1, offsetY - 1, totalW + 2, totalH + 2, 'TIC-TAC-TOE');

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cellX = offsetX + c * (CELL_WIDTH + 1);
      const cellY = offsetY + r * (CELL_HEIGHT + 1);
      const isCursor = r === state.cursorR && c === state.cursorC;

      // Draw cell borders
      const hLine = '\u2500'.repeat(CELL_WIDTH);
      writeAt(cellX, cellY, '\u250C' + hLine + '\u2510');
      for (let i = 1; i <= CELL_HEIGHT; i++) {
        writeAt(cellX, cellY + i, '\u2502' + ' '.repeat(CELL_WIDTH) + '\u2502');
      }
      writeAt(cellX, cellY + CELL_HEIGHT + 1, '\u2514' + hLine + '\u2518');

      // Highlight cursor cell
      if (isCursor && !state.winner && !state.isDraw) {
        writeAt(cellX, cellY, chalk.yellow('\u250C' + hLine + '\u2510'));
        for (let i = 1; i <= CELL_HEIGHT; i++) {
          writeAt(cellX, cellY + i, chalk.yellow('\u2502') + ' '.repeat(CELL_WIDTH) + chalk.yellow('\u2502'));
        }
        writeAt(cellX, cellY + CELL_HEIGHT + 1, chalk.yellow('\u2514' + hLine + '\u2518'));
      }

      // Draw mark centered
      const markX = cellX + Math.floor(CELL_WIDTH / 2) + 1;
      const markY = cellY + Math.floor(CELL_HEIGHT / 2) + 1;
      writeAt(markX, markY, markDisplay(state.board[r][c], isCursor));
    }
  }

  // Info panel
  const infoX = offsetX + totalW + 3;
  writeAt(infoX, offsetY, chalk.bold.white('You'));
  writeAt(infoX, offsetY + 1, chalk.blue.bold(`${state.playerMark} : ${state.playerScore}`));

  writeAt(infoX, offsetY + 3, chalk.bold.white('AI'));
  writeAt(infoX, offsetY + 4, chalk.red.bold(`${state.aiMark} : ${state.aiScore}`));

  writeAt(infoX, offsetY + 6, chalk.bold.white('Draws'));
  writeAt(infoX, offsetY + 7, chalk.dim(String(state.draws)));

  writeAt(infoX, offsetY + 9, chalk.bold.white('Turn'));
  if (!state.winner && !state.isDraw) {
    const turnMark = state.currentPlayer === state.playerMark ? 'Your turn' : 'AI thinking...';
    writeAt(infoX, offsetY + 10, chalk.cyan(turnMark + '   '));
  }

  writeAt(infoX, offsetY + 12, chalk.dim('WASD: Move'));
  writeAt(infoX, offsetY + 13, chalk.dim('Space: Place'));
  writeAt(infoX, offsetY + 14, chalk.dim('Q: Quit'));

  if (state.winner) {
    const msg = state.winner === state.playerMark ? chalk.green.bold('You win!') : chalk.red.bold('AI wins!');
    writeAt(infoX, offsetY + 16, msg);
    writeAt(infoX, offsetY + 17, chalk.dim('R: Rematch'));
  } else if (state.isDraw) {
    writeAt(infoX, offsetY + 16, chalk.yellow.bold('Draw!'));
    writeAt(infoX, offsetY + 17, chalk.dim('R: Rematch'));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function initState(): GameState {
  return {
    board: createBoard(),
    currentPlayer: 'X', // X always goes first
    cursorR: 1,
    cursorC: 1,
    winner: null,
    isDraw: false,
    playerMark: 'X',
    aiMark: 'O',
    playerScore: 0,
    aiScore: 0,
    draws: 0,
  };
}

export async function playTicTacToe(): Promise<void> {
  clearScreen();
  hideCursor();

  const state = initState();
  const offsetX = 3;
  const offsetY = 2;

  let quit = false;

  while (!quit) {
    render(state, offsetX, offsetY);

    // If it is AI's turn and game is not over
    if (state.currentPlayer === state.aiMark && !state.winner && !state.isDraw) {
      await sleep(400); // Small delay to simulate "thinking"
      const [r, c] = findBestMove(state.board, state.aiMark, state.playerMark);
      state.board[r][c] = state.aiMark;

      const winner = getWinner(state.board);
      if (winner) {
        state.winner = winner;
        state.aiScore++;
      } else if (isBoardFull(state.board)) {
        state.isDraw = true;
        state.draws++;
      } else {
        state.currentPlayer = state.playerMark;
      }
      continue;
    }

    showCursor();
    const key = await waitForKey();
    hideCursor();

    // Handle game-over state keys
    if (state.winner || state.isDraw) {
      if (key === 'r') {
        // Rematch: reset board but keep scores
        state.board = createBoard();
        state.winner = null;
        state.isDraw = false;
        state.currentPlayer = 'X';
        state.cursorR = 1;
        state.cursorC = 1;
        continue;
      }
      if (key === 'q' || key === 'escape') {
        quit = true;
        continue;
      }
      continue;
    }

    switch (key) {
      case 'w': case 'up':
        state.cursorR = Math.max(0, state.cursorR - 1);
        break;
      case 's': case 'down':
        state.cursorR = Math.min(BOARD_SIZE - 1, state.cursorR + 1);
        break;
      case 'a': case 'left':
        state.cursorC = Math.max(0, state.cursorC - 1);
        break;
      case 'd': case 'right':
        state.cursorC = Math.min(BOARD_SIZE - 1, state.cursorC + 1);
        break;
      case 'space': case 'return': {
        if (state.board[state.cursorR][state.cursorC] !== null) break;

        state.board[state.cursorR][state.cursorC] = state.playerMark;

        const winner = getWinner(state.board);
        if (winner) {
          state.winner = winner;
          state.playerScore++;
        } else if (isBoardFull(state.board)) {
          state.isDraw = true;
          state.draws++;
        } else {
          state.currentPlayer = state.aiMark;
        }
        break;
      }
      case 'q': case 'escape':
        quit = true;
        break;
    }
  }

  // Save cumulative player score
  if (state.playerScore > 0) {
    saveHighScore('tictactoe', 'Player', state.playerScore * 100);
  }

  showCursor();
}
