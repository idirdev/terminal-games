import chalk from 'chalk';
import * as readline from 'readline';
import { clearScreen, showCursor, hideCursor, setCursor, writeAt, drawBox, waitForKey, getTerminalSize, centerText } from '../utils/terminal';
import { saveHighScore, displayLeaderboard } from '../utils/score';

interface Difficulty {
  name: string;
  width: number;
  height: number;
  mines: number;
}

const DIFFICULTIES: Difficulty[] = [
  { name: 'Easy',   width: 9,  height: 9,  mines: 10 },
  { name: 'Medium', width: 16, height: 16, mines: 40 },
  { name: 'Hard',   width: 20, height: 16, mines: 60 },
];

interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
}

interface GameState {
  grid: Cell[][];
  width: number;
  height: number;
  mineCount: number;
  cursorX: number;
  cursorY: number;
  alive: boolean;
  won: boolean;
  firstMove: boolean;
  revealedCount: number;
  flagCount: number;
  startTime: number;
}

function createGrid(width: number, height: number): Cell[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacentMines: 0,
    }))
  );
}

function placeMines(state: GameState, safeX: number, safeY: number): void {
  let placed = 0;
  while (placed < state.mineCount) {
    const x = Math.floor(Math.random() * state.width);
    const y = Math.floor(Math.random() * state.height);
    // Do not place mines on or adjacent to the first click
    if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue;
    if (state.grid[y][x].mine) continue;
    state.grid[y][x].mine = true;
    placed++;
  }
  // Calculate adjacent mine counts
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (state.grid[y][x].mine) continue;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < state.height && nx >= 0 && nx < state.width && state.grid[ny][nx].mine) {
            count++;
          }
        }
      }
      state.grid[y][x].adjacentMines = count;
    }
  }
}

function floodFillReveal(state: GameState, x: number, y: number): void {
  if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;
  const cell = state.grid[y][x];
  if (cell.revealed || cell.flagged || cell.mine) return;

  cell.revealed = true;
  state.revealedCount++;

  // Only flood-fill if this cell has 0 adjacent mines
  if (cell.adjacentMines === 0) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dy === 0 && dx === 0) continue;
        floodFillReveal(state, x + dx, y + dy);
      }
    }
  }
}

function checkWin(state: GameState): boolean {
  const totalSafe = state.width * state.height - state.mineCount;
  return state.revealedCount >= totalSafe;
}

function numberColor(n: number): string {
  switch (n) {
    case 1: return chalk.blue(String(n));
    case 2: return chalk.green(String(n));
    case 3: return chalk.red(String(n));
    case 4: return chalk.magenta(String(n));
    case 5: return chalk.yellow(String(n));
    case 6: return chalk.cyan(String(n));
    case 7: return chalk.white(String(n));
    case 8: return chalk.gray(String(n));
    default: return ' ';
  }
}

function render(state: GameState, offsetX: number, offsetY: number): void {
  const title = state.won ? 'YOU WIN!' : state.alive ? 'MINESWEEPER' : 'BOOM!';
  drawBox(offsetX - 1, offsetY - 1, state.width * 2 + 2, state.height + 2, title);

  for (let y = 0; y < state.height; y++) {
    setCursor(offsetX, offsetY + y);
    let line = '';
    for (let x = 0; x < state.width; x++) {
      const cell = state.grid[y][x];
      const isCursor = x === state.cursorX && y === state.cursorY;

      let display: string;
      if (cell.revealed) {
        if (cell.mine) {
          display = chalk.bgRed.white('\u2739 ');
        } else if (cell.adjacentMines > 0) {
          display = numberColor(cell.adjacentMines) + ' ';
        } else {
          display = chalk.dim('\u00B7 ');
        }
      } else if (cell.flagged) {
        display = chalk.yellow.bold('\u2691 ');
      } else {
        display = chalk.dim('\u2588\u2588');
      }

      if (isCursor && state.alive && !state.won) {
        display = chalk.bgWhite.black(display.replace(/\x1B\[[0-9;]*m/g, '').substring(0, 2));
      }

      line += display;
    }
    process.stdout.write(line);
  }

  // Info panel
  const infoX = offsetX + state.width * 2 + 4;
  const elapsed = state.startTime > 0 ? Math.floor((Date.now() - state.startTime) / 1000) : 0;

  writeAt(infoX, offsetY, chalk.bold.white('Mines'));
  writeAt(infoX, offsetY + 1, chalk.red.bold(`${state.mineCount - state.flagCount}   `));

  writeAt(infoX, offsetY + 3, chalk.bold.white('Flags'));
  writeAt(infoX, offsetY + 4, chalk.yellow.bold(`${state.flagCount}   `));

  writeAt(infoX, offsetY + 6, chalk.bold.white('Time'));
  writeAt(infoX, offsetY + 7, chalk.cyan(`${elapsed}s   `));

  writeAt(infoX, offsetY + 9, chalk.dim('WASD: Move'));
  writeAt(infoX, offsetY + 10, chalk.dim('Space: Reveal'));
  writeAt(infoX, offsetY + 11, chalk.dim('F: Flag'));
  writeAt(infoX, offsetY + 12, chalk.dim('Q: Quit'));
}

function initGame(diff: Difficulty): GameState {
  return {
    grid: createGrid(diff.width, diff.height),
    width: diff.width,
    height: diff.height,
    mineCount: diff.mines,
    cursorX: Math.floor(diff.width / 2),
    cursorY: Math.floor(diff.height / 2),
    alive: true,
    won: false,
    firstMove: true,
    revealedCount: 0,
    flagCount: 0,
    startTime: 0,
  };
}

async function selectDifficulty(): Promise<Difficulty | null> {
  clearScreen();
  const { width } = getTerminalSize();

  console.log('');
  console.log(centerText(chalk.bold.cyan('MINESWEEPER'), width));
  console.log('');
  console.log(centerText(chalk.yellow('Select Difficulty:'), width));
  console.log('');

  DIFFICULTIES.forEach((d, i) => {
    console.log(centerText(`  ${chalk.bold.green(`[${i + 1}]`)} ${chalk.white(d.name.padEnd(8))} ${chalk.dim(`${d.width}x${d.height}, ${d.mines} mines`)}`, width));
  });

  console.log('');
  console.log(centerText(chalk.dim('[Q] Back to menu'), width));
  console.log('');

  while (true) {
    const key = await waitForKey();
    if (key === '1') return DIFFICULTIES[0];
    if (key === '2') return DIFFICULTIES[1];
    if (key === '3') return DIFFICULTIES[2];
    if (key === 'q' || key === 'escape') return null;
  }
}

export async function playMinesweeper(): Promise<void> {
  const diff = await selectDifficulty();
  if (!diff) return;

  clearScreen();
  hideCursor();

  const state = initGame(diff);
  const offsetX = 3;
  const offsetY = 2;

  let quit = false;

  // Main game loop using key-by-key input
  while (state.alive && !state.won && !quit) {
    render(state, offsetX, offsetY);
    showCursor();
    const key = await waitForKey();
    hideCursor();

    switch (key) {
      case 'w': case 'up':
        state.cursorY = Math.max(0, state.cursorY - 1);
        break;
      case 's': case 'down':
        state.cursorY = Math.min(state.height - 1, state.cursorY + 1);
        break;
      case 'a': case 'left':
        state.cursorX = Math.max(0, state.cursorX - 1);
        break;
      case 'd': case 'right':
        state.cursorX = Math.min(state.width - 1, state.cursorX + 1);
        break;
      case 'space': case 'return': {
        const cell = state.grid[state.cursorY][state.cursorX];
        if (cell.flagged || cell.revealed) break;

        if (state.firstMove) {
          placeMines(state, state.cursorX, state.cursorY);
          state.firstMove = false;
          state.startTime = Date.now();
        }

        if (cell.mine) {
          cell.revealed = true;
          state.alive = false;
          // Reveal all mines
          for (let y = 0; y < state.height; y++) {
            for (let x = 0; x < state.width; x++) {
              if (state.grid[y][x].mine) state.grid[y][x].revealed = true;
            }
          }
        } else {
          floodFillReveal(state, state.cursorX, state.cursorY);
          if (checkWin(state)) state.won = true;
        }
        break;
      }
      case 'f': {
        const cell = state.grid[state.cursorY][state.cursorX];
        if (!cell.revealed) {
          cell.flagged = !cell.flagged;
          state.flagCount += cell.flagged ? 1 : -1;
        }
        break;
      }
      case 'q': case 'escape':
        quit = true;
        break;
    }
  }

  if (!quit) {
    render(state, offsetX, offsetY);
    const { width } = getTerminalSize();
    const endY = offsetY + state.height + 3;
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);

    setCursor(0, endY);
    if (state.won) {
      console.log(centerText(chalk.green.bold('CONGRATULATIONS! You cleared the field!'), width));
      console.log(centerText(chalk.white(`Time: ${chalk.cyan.bold(elapsed + 's')}  |  Difficulty: ${chalk.yellow.bold(diff.name)}`), width));
      const score = Math.max(1, Math.floor((state.mineCount * 1000) / Math.max(1, elapsed)));
      saveHighScore('minesweeper', 'Player', score);
    } else {
      console.log(centerText(chalk.red.bold('BOOM! You hit a mine!'), width));
      console.log(centerText(chalk.white(`Time: ${chalk.cyan(elapsed + 's')}`), width));
    }
    console.log('');

    const leaderboard = displayLeaderboard('minesweeper');
    for (const line of leaderboard) {
      console.log(line);
    }

    console.log(centerText(chalk.dim('Press any key to return to menu...'), width));
    showCursor();
    await waitForKey();
  }

  showCursor();
}
