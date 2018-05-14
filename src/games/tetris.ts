import chalk from 'chalk';
import { clearScreen, hideCursor, showCursor, setCursor, writeAt, drawBox, onKeyPress, waitForKey, getTerminalSize, centerText } from '../utils/terminal';
import { saveHighScore, displayLeaderboard } from '../utils/score';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const INITIAL_DROP_SPEED = 500; // ms
const SPEED_DECREMENT_PER_LEVEL = 40;
const LINES_PER_LEVEL = 10;
const MIN_SPEED = 80;

// Scoring: 1 line = 100, 2 = 300, 3 = 500, 4 = 800
const LINE_SCORES = [0, 100, 300, 500, 800];

type CellColor = string | null;

// Each tetromino is defined as a set of rotation states (array of [row, col] offsets)
const TETROMINOES: { shape: number[][][]; color: string }[] = [
  { shape: [[[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]]], color: 'cyan' },    // I
  { shape: [[[0,0],[0,1],[1,0],[1,1]], [[0,0],[0,1],[1,0],[1,1]], [[0,0],[0,1],[1,0],[1,1]], [[0,0],[0,1],[1,0],[1,1]]], color: 'yellow' },  // O
  { shape: [[[0,1],[1,0],[1,1],[1,2]], [[0,0],[1,0],[1,1],[2,0]], [[0,0],[0,1],[0,2],[1,1]], [[0,1],[1,0],[1,1],[2,1]]], color: 'magenta' }, // T
  { shape: [[[0,0],[0,1],[1,1],[1,2]], [[0,1],[1,0],[1,1],[2,0]], [[0,0],[0,1],[1,1],[1,2]], [[0,1],[1,0],[1,1],[2,0]]], color: 'green' },   // S
  { shape: [[[0,1],[0,2],[1,0],[1,1]], [[0,0],[1,0],[1,1],[2,1]], [[0,1],[0,2],[1,0],[1,1]], [[0,0],[1,0],[1,1],[2,1]]], color: 'red' },     // Z
  { shape: [[[0,0],[1,0],[1,1],[1,2]], [[0,0],[0,1],[1,0],[2,0]], [[0,0],[0,1],[0,2],[1,2]], [[0,0],[1,0],[2,0],[2,-1]]], color: 'blue' },   // L  (corrected: last rotation adjusted)
  { shape: [[[0,2],[1,0],[1,1],[1,2]], [[0,0],[1,0],[2,0],[2,1]], [[0,0],[0,1],[0,2],[1,0]], [[0,0],[0,1],[1,1],[2,1]]], color: 'white' },   // J
];

interface Piece {
  type: number;
  rotation: number;
  x: number;
  y: number;
}

interface GameState {
  board: CellColor[][];
  current: Piece;
  next: Piece;
  score: number;
  level: number;
  linesCleared: number;
  dropSpeed: number;
  gameOver: boolean;
}

function colorize(text: string, color: string): string {
  switch (color) {
    case 'cyan':    return chalk.cyan(text);
    case 'yellow':  return chalk.yellow(text);
    case 'magenta': return chalk.magenta(text);
    case 'green':   return chalk.green(text);
    case 'red':     return chalk.red(text);
    case 'blue':    return chalk.blue(text);
    case 'white':   return chalk.white(text);
    default:        return text;
  }
}

function randomPiece(): Piece {
  return {
    type: Math.floor(Math.random() * TETROMINOES.length),
    rotation: 0,
    x: Math.floor(BOARD_WIDTH / 2) - 1,
    y: 0,
  };
}

function getCells(piece: Piece): number[][] {
  const shape = TETROMINOES[piece.type].shape[piece.rotation];
  return shape.map(([r, c]) => [piece.y + r, piece.x + c]);
}

function isValid(board: CellColor[][], piece: Piece): boolean {
  const cells = getCells(piece);
  for (const [r, c] of cells) {
    if (r < 0 || r >= BOARD_HEIGHT || c < 0 || c >= BOARD_WIDTH) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

function createBoard(): CellColor[][] {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
}

function lockPiece(board: CellColor[][], piece: Piece): void {
  const color = TETROMINOES[piece.type].color;
  const cells = getCells(piece);
  for (const [r, c] of cells) {
    if (r >= 0 && r < BOARD_HEIGHT && c >= 0 && c < BOARD_WIDTH) {
      board[r][c] = color;
    }
  }
}

function clearLines(board: CellColor[][]): number {
  let cleared = 0;
  for (let r = BOARD_HEIGHT - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1);
      board.unshift(Array(BOARD_WIDTH).fill(null));
      cleared++;
      r++; // re-check this row since a new row dropped in
    }
  }
  return cleared;
}

function initGame(): GameState {
  return {
    board: createBoard(),
    current: randomPiece(),
    next: randomPiece(),
    score: 0,
    level: 1,
    linesCleared: 0,
    dropSpeed: INITIAL_DROP_SPEED,
    gameOver: false,
  };
}

function render(state: GameState, offsetX: number, offsetY: number): void {
  // Draw main board border
  drawBox(offsetX - 1, offsetY - 1, BOARD_WIDTH * 2 + 2, BOARD_HEIGHT + 2, 'TETRIS');

  // Draw board contents
  for (let r = 0; r < BOARD_HEIGHT; r++) {
    setCursor(offsetX, offsetY + r);
    let line = '';
    for (let c = 0; c < BOARD_WIDTH; c++) {
      const cell = state.board[r][c];
      if (cell) {
        line += colorize('\u2588\u2588', cell);
      } else {
        line += chalk.dim('\u00B7 ');
      }
    }
    process.stdout.write(line);
  }

  // Draw current piece
  const cells = getCells(state.current);
  const currentColor = TETROMINOES[state.current.type].color;
  for (const [r, c] of cells) {
    if (r >= 0 && r < BOARD_HEIGHT && c >= 0 && c < BOARD_WIDTH) {
      writeAt(offsetX + c * 2, offsetY + r, colorize('\u2588\u2588', currentColor));
    }
  }

  // Info panel
  const infoX = offsetX + BOARD_WIDTH * 2 + 4;

  writeAt(infoX, offsetY, chalk.bold.white('Score'));
  writeAt(infoX, offsetY + 1, chalk.yellow.bold(String(state.score)));

  writeAt(infoX, offsetY + 3, chalk.bold.white('Level'));
  writeAt(infoX, offsetY + 4, chalk.cyan.bold(String(state.level)));

  writeAt(infoX, offsetY + 6, chalk.bold.white('Lines'));
  writeAt(infoX, offsetY + 7, chalk.green(String(state.linesCleared)));

  // Next piece preview
  writeAt(infoX, offsetY + 9, chalk.bold.white('Next'));
  drawBox(infoX - 1, offsetY + 10, 10, 6);
  // Clear inside
  for (let i = 0; i < 4; i++) {
    writeAt(infoX, offsetY + 11 + i, '        ');
  }
  const nextShape = TETROMINOES[state.next.type].shape[0];
  const nextColor = TETROMINOES[state.next.type].color;
  for (const [r, c] of nextShape) {
    writeAt(infoX + c * 2, offsetY + 11 + r, colorize('\u2588\u2588', nextColor));
  }

  // Controls
  writeAt(infoX, offsetY + 17, chalk.dim('A/D: Move'));
  writeAt(infoX, offsetY + 18, chalk.dim('W: Rotate'));
  writeAt(infoX, offsetY + 19, chalk.dim('S: Soft drop'));
  writeAt(infoX, offsetY + 20, chalk.dim('Space: Hard drop'));
  writeAt(infoX, offsetY + 21, chalk.dim('Q: Quit'));
}

function hardDrop(state: GameState): void {
  while (true) {
    const moved: Piece = { ...state.current, y: state.current.y + 1 };
    if (!isValid(state.board, moved)) break;
    state.current = moved;
    state.score += 2; // bonus per dropped row
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function playTetris(): Promise<void> {
  clearScreen();
  hideCursor();

  const state = initGame();
  const offsetX = 3;
  const offsetY = 2;

  let quit = false;
  let moveLeft = false;
  let moveRight = false;
  let softDrop = false;
  let doHardDrop = false;
  let doRotate = false;

  const removeKeyListener = onKeyPress((key: string) => {
    switch (key) {
      case 'a': case 'left':  moveLeft = true; break;
      case 'd': case 'right': moveRight = true; break;
      case 'w': case 'up':    doRotate = true; break;
      case 's': case 'down':  softDrop = true; break;
      case 'space':            doHardDrop = true; break;
      case 'q': case 'escape': quit = true; break;
    }
  });

  let lastDrop = Date.now();

  while (!state.gameOver && !quit) {
    // Process inputs
    if (moveLeft) {
      const moved: Piece = { ...state.current, x: state.current.x - 1 };
      if (isValid(state.board, moved)) state.current = moved;
      moveLeft = false;
    }
    if (moveRight) {
      const moved: Piece = { ...state.current, x: state.current.x + 1 };
      if (isValid(state.board, moved)) state.current = moved;
      moveRight = false;
    }
    if (doRotate) {
      const rotated: Piece = { ...state.current, rotation: (state.current.rotation + 1) % 4 };
      if (isValid(state.board, rotated)) {
        state.current = rotated;
      } else {
        // Wall kick: try shifting left/right
        const kickLeft: Piece = { ...rotated, x: rotated.x - 1 };
        const kickRight: Piece = { ...rotated, x: rotated.x + 1 };
        if (isValid(state.board, kickLeft)) state.current = kickLeft;
        else if (isValid(state.board, kickRight)) state.current = kickRight;
      }
      doRotate = false;
    }
    if (doHardDrop) {
      hardDrop(state);
      doHardDrop = false;
      lastDrop = 0; // Force lock on next tick
    }

    // Gravity / soft drop
    const now = Date.now();
    const dropDelay = softDrop ? Math.floor(state.dropSpeed / 5) : state.dropSpeed;
    softDrop = false;

    if (now - lastDrop >= dropDelay) {
      const moved: Piece = { ...state.current, y: state.current.y + 1 };
      if (isValid(state.board, moved)) {
        state.current = moved;
      } else {
        // Lock the piece
        lockPiece(state.board, state.current);
        const lines = clearLines(state.board);
        if (lines > 0) {
          state.linesCleared += lines;
          state.score += LINE_SCORES[Math.min(lines, 4)] * state.level;
          const newLevel = Math.floor(state.linesCleared / LINES_PER_LEVEL) + 1;
          if (newLevel > state.level) {
            state.level = newLevel;
            state.dropSpeed = Math.max(MIN_SPEED, INITIAL_DROP_SPEED - (state.level - 1) * SPEED_DECREMENT_PER_LEVEL);
          }
        }

        // Spawn next piece
        state.current = state.next;
        state.next = randomPiece();

        // Check game over
        if (!isValid(state.board, state.current)) {
          state.gameOver = true;
        }
      }
      lastDrop = now;
    }

    render(state, offsetX, offsetY);
    await sleep(30); // ~33 FPS render loop
  }

  removeKeyListener();

  if (!quit) {
    const { width } = getTerminalSize();
    const gameOverY = offsetY + BOARD_HEIGHT + 3;

    setCursor(0, gameOverY);
    console.log(centerText(chalk.red.bold('GAME OVER!'), width));
    console.log(centerText(chalk.white(`Score: ${chalk.yellow.bold(String(state.score))}  |  Level: ${chalk.cyan.bold(String(state.level))}  |  Lines: ${chalk.green.bold(String(state.linesCleared))}`), width));
    console.log('');

    saveHighScore('tetris', 'Player', state.score);
    const leaderboard = displayLeaderboard('tetris');
    for (const line of leaderboard) {
      console.log(line);
    }

    console.log(centerText(chalk.dim('Press any key to return to menu...'), width));
    showCursor();
    await waitForKey();
  }

  showCursor();
}
