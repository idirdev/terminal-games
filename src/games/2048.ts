import chalk from 'chalk';
import { clearScreen, hideCursor, showCursor, setCursor, writeAt, drawBox, waitForKey, getTerminalSize, centerText } from '../utils/terminal';
import { saveHighScore, displayLeaderboard } from '../utils/score';

const GRID_SIZE = 4;
const WIN_TILE = 2048;
const CELL_WIDTH = 7;

type Grid = number[][];

interface GameState {
  grid: Grid;
  score: number;
  won: boolean;
  gameOver: boolean;
  keepPlaying: boolean;
}

function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function getEmptyCells(grid: Grid): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) cells.push([r, c]);
    }
  }
  return cells;
}

function spawnTile(grid: Grid): boolean {
  const empty = getEmptyCells(grid);
  if (empty.length === 0) return false;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

function gridsEqual(a: Grid, b: Grid): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

/**
 * Slide a single row to the left, merging tiles.
 * Returns [newRow, mergeScore].
 */
function slideRow(row: number[]): [number[], number] {
  // Remove zeros
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

  // Pad with zeros
  while (result.length < GRID_SIZE) {
    result.push(0);
  }

  return [result, score];
}

function moveLeft(state: GameState): boolean {
  const prev = cloneGrid(state.grid);
  for (let r = 0; r < GRID_SIZE; r++) {
    const [newRow, score] = slideRow(state.grid[r]);
    state.grid[r] = newRow;
    state.score += score;
  }
  return !gridsEqual(prev, state.grid);
}

function moveRight(state: GameState): boolean {
  const prev = cloneGrid(state.grid);
  for (let r = 0; r < GRID_SIZE; r++) {
    const reversed = [...state.grid[r]].reverse();
    const [newRow, score] = slideRow(reversed);
    state.grid[r] = newRow.reverse();
    state.score += score;
  }
  return !gridsEqual(prev, state.grid);
}

function moveUp(state: GameState): boolean {
  const prev = cloneGrid(state.grid);
  for (let c = 0; c < GRID_SIZE; c++) {
    const col = state.grid.map(row => row[c]);
    const [newCol, score] = slideRow(col);
    for (let r = 0; r < GRID_SIZE; r++) {
      state.grid[r][c] = newCol[r];
    }
    state.score += score;
  }
  return !gridsEqual(prev, state.grid);
}

function moveDown(state: GameState): boolean {
  const prev = cloneGrid(state.grid);
  for (let c = 0; c < GRID_SIZE; c++) {
    const col = state.grid.map(row => row[c]).reverse();
    const [newCol, score] = slideRow(col);
    const unreversed = newCol.reverse();
    for (let r = 0; r < GRID_SIZE; r++) {
      state.grid[r][c] = unreversed[r];
    }
    state.score += score;
  }
  return !gridsEqual(prev, state.grid);
}

function hasMovesLeft(grid: Grid): boolean {
  // Check for empty cells
  if (getEmptyCells(grid).length > 0) return true;
  // Check for possible merges
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = grid[r][c];
      if (c + 1 < GRID_SIZE && grid[r][c + 1] === val) return true;
      if (r + 1 < GRID_SIZE && grid[r + 1][c] === val) return true;
    }
  }
  return false;
}

function hasWinTile(grid: Grid): boolean {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] >= WIN_TILE) return true;
    }
  }
  return false;
}

function tileColor(value: number): (text: string) => string {
  switch (value) {
    case 2:    return chalk.white;
    case 4:    return chalk.cyan;
    case 8:    return chalk.yellow;
    case 16:   return chalk.magenta;
    case 32:   return chalk.red;
    case 64:   return chalk.redBright;
    case 128:  return chalk.green;
    case 256:  return chalk.greenBright;
    case 512:  return chalk.blue;
    case 1024: return chalk.blueBright;
    case 2048: return chalk.yellowBright;
    default:   return chalk.whiteBright;
  }
}

function render(state: GameState, offsetX: number, offsetY: number): void {
  const totalW = GRID_SIZE * CELL_WIDTH + GRID_SIZE + 1;
  const totalH = GRID_SIZE * 3 + GRID_SIZE + 1;
  drawBox(offsetX - 1, offsetY - 1, totalW + 2, totalH + 2, '2048');

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cellX = offsetX + c * (CELL_WIDTH + 1) + 1;
      const cellY = offsetY + r * 4 + 1;
      const value = state.grid[r][c];

      // Draw cell borders
      const hLine = '\u2500'.repeat(CELL_WIDTH);
      writeAt(cellX - 1, cellY - 1, '\u250C' + hLine + '\u2510');
      writeAt(cellX - 1, cellY,     '\u2502' + ' '.repeat(CELL_WIDTH) + '\u2502');
      writeAt(cellX - 1, cellY + 1, '\u2502' + ' '.repeat(CELL_WIDTH) + '\u2502');
      writeAt(cellX - 1, cellY + 2, '\u2514' + hLine + '\u2518');

      // Draw value centered in cell
      if (value > 0) {
        const text = String(value);
        const pad = Math.floor((CELL_WIDTH - text.length) / 2);
        const colorFn = tileColor(value);
        writeAt(cellX + pad, cellY + 1, colorFn(chalk.bold(text)));
      }
    }
  }

  // Info panel
  const infoX = offsetX + totalW + 3;
  writeAt(infoX, offsetY, chalk.bold.white('Score'));
  writeAt(infoX, offsetY + 1, chalk.yellow.bold(String(state.score) + '   '));

  writeAt(infoX, offsetY + 3, chalk.bold.white('Goal'));
  writeAt(infoX, offsetY + 4, chalk.cyan.bold(String(WIN_TILE)));

  writeAt(infoX, offsetY + 7, chalk.dim('WASD/Arrows'));
  writeAt(infoX, offsetY + 8, chalk.dim('to slide'));
  writeAt(infoX, offsetY + 10, chalk.dim('Q to quit'));

  if (state.won && !state.keepPlaying) {
    writeAt(infoX, offsetY + 12, chalk.green.bold('YOU WIN!'));
    writeAt(infoX, offsetY + 13, chalk.dim('C: Continue'));
  }
}

function initGame(): GameState {
  const grid = createEmptyGrid();
  spawnTile(grid);
  spawnTile(grid);
  return {
    grid,
    score: 0,
    won: false,
    gameOver: false,
    keepPlaying: false,
  };
}

export async function play2048(): Promise<void> {
  clearScreen();
  hideCursor();

  const state = initGame();
  const offsetX = 3;
  const offsetY = 2;

  let quit = false;

  while (!state.gameOver && !quit) {
    render(state, offsetX, offsetY);
    showCursor();
    const key = await waitForKey();
    hideCursor();

    let moved = false;

    switch (key) {
      case 'w': case 'up':    moved = moveUp(state); break;
      case 's': case 'down':  moved = moveDown(state); break;
      case 'a': case 'left':  moved = moveLeft(state); break;
      case 'd': case 'right': moved = moveRight(state); break;
      case 'c':
        if (state.won && !state.keepPlaying) {
          state.keepPlaying = true;
        }
        continue;
      case 'q': case 'escape':
        quit = true;
        continue;
      default:
        continue;
    }

    if (moved) {
      spawnTile(state.grid);

      // Check win
      if (!state.won && hasWinTile(state.grid)) {
        state.won = true;
      }

      // Check game over
      if (!hasMovesLeft(state.grid)) {
        state.gameOver = true;
      }
    }
  }

  if (!quit) {
    render(state, offsetX, offsetY);
    const { width } = getTerminalSize();
    const endY = offsetY + GRID_SIZE * 4 + 5;

    setCursor(0, endY);
    if (state.won) {
      console.log(centerText(chalk.green.bold('CONGRATULATIONS! You reached 2048!'), width));
    } else {
      console.log(centerText(chalk.red.bold('GAME OVER! No moves left.'), width));
    }
    console.log(centerText(chalk.white(`Final Score: ${chalk.yellow.bold(String(state.score))}`), width));
    console.log('');

    saveHighScore('2048', 'Player', state.score);
    const leaderboard = displayLeaderboard('2048');
    for (const line of leaderboard) {
      console.log(line);
    }

    console.log(centerText(chalk.dim('Press any key to return to menu...'), width));
    showCursor();
    await waitForKey();
  }

  showCursor();
}
