import chalk from 'chalk';
import { clearScreen, hideCursor, showCursor, setCursor, writeAt, drawBox, onKeyPress, waitForKey, getTerminalSize, centerText } from '../utils/terminal';
import { saveHighScore, displayLeaderboard } from '../utils/score';

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const INITIAL_SPEED = 150; // ms per tick
const SPEED_INCREMENT = 5; // ms faster every 5 food eaten
const FOOD_FOR_SPEED_UP = 5;

interface Point {
  x: number;
  y: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';

interface GameState {
  snake: Point[];
  food: Point;
  direction: Direction;
  nextDirection: Direction;
  score: number;
  speed: number;
  alive: boolean;
  foodEaten: number;
}

function spawnFood(snake: Point[]): Point {
  const occupied = new Set(snake.map(p => `${p.x},${p.y}`));
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_WIDTH),
      y: Math.floor(Math.random() * GRID_HEIGHT),
    };
  } while (occupied.has(`${pos.x},${pos.y}`));
  return pos;
}

function initGame(): GameState {
  const midX = Math.floor(GRID_WIDTH / 2);
  const midY = Math.floor(GRID_HEIGHT / 2);
  const snake: Point[] = [
    { x: midX, y: midY },
    { x: midX - 1, y: midY },
    { x: midX - 2, y: midY },
  ];
  return {
    snake,
    food: spawnFood(snake),
    direction: 'right',
    nextDirection: 'right',
    score: 0,
    speed: INITIAL_SPEED,
    alive: true,
    foodEaten: 0,
  };
}

function render(state: GameState, offsetX: number, offsetY: number): void {
  // Draw border
  drawBox(offsetX - 1, offsetY - 1, GRID_WIDTH * 2 + 2, GRID_HEIGHT + 2, 'SNAKE');

  // Clear grid interior
  for (let y = 0; y < GRID_HEIGHT; y++) {
    setCursor(offsetX, offsetY + y);
    process.stdout.write(' '.repeat(GRID_WIDTH * 2));
  }

  // Draw food
  writeAt(offsetX + state.food.x * 2, offsetY + state.food.y, chalk.red.bold('\u2666 '));

  // Draw snake
  for (let i = 0; i < state.snake.length; i++) {
    const p = state.snake[i];
    if (i === 0) {
      writeAt(offsetX + p.x * 2, offsetY + p.y, chalk.green.bold('\u2588\u2588'));
    } else {
      writeAt(offsetX + p.x * 2, offsetY + p.y, chalk.green('\u2593\u2593'));
    }
  }

  // Draw score and info
  const infoX = offsetX + GRID_WIDTH * 2 + 4;
  writeAt(infoX, offsetY, chalk.bold.white('Score'));
  writeAt(infoX, offsetY + 1, chalk.yellow.bold(String(state.score)));
  writeAt(infoX, offsetY + 3, chalk.bold.white('Speed'));
  writeAt(infoX, offsetY + 4, chalk.cyan(String(Math.round(1000 / state.speed)) + ' tps'));
  writeAt(infoX, offsetY + 6, chalk.bold.white('Length'));
  writeAt(infoX, offsetY + 7, chalk.magenta(String(state.snake.length)));
  writeAt(infoX, offsetY + 9, chalk.dim('WASD/Arrows'));
  writeAt(infoX, offsetY + 10, chalk.dim('to move'));
  writeAt(infoX, offsetY + 12, chalk.dim('Q to quit'));
}

function update(state: GameState): void {
  state.direction = state.nextDirection;

  const head = { ...state.snake[0] };
  switch (state.direction) {
    case 'up':    head.y -= 1; break;
    case 'down':  head.y += 1; break;
    case 'left':  head.x -= 1; break;
    case 'right': head.x += 1; break;
  }

  // Wall collision
  if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
    state.alive = false;
    return;
  }

  // Self collision
  if (state.snake.some(p => p.x === head.x && p.y === head.y)) {
    state.alive = false;
    return;
  }

  state.snake.unshift(head);

  // Food collision
  if (head.x === state.food.x && head.y === state.food.y) {
    state.score += 10;
    state.foodEaten += 1;

    // Speed up every N food eaten
    if (state.foodEaten % FOOD_FOR_SPEED_UP === 0 && state.speed > 50) {
      state.speed -= SPEED_INCREMENT;
    }

    state.food = spawnFood(state.snake);
  } else {
    state.snake.pop();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function playSnake(): Promise<void> {
  clearScreen();
  hideCursor();

  const state = initGame();
  const offsetX = 3;
  const offsetY = 2;

  let quit = false;
  const removeKeyListener = onKeyPress((key: string) => {
    switch (key) {
      case 'w': case 'up':
        if (state.direction !== 'down') state.nextDirection = 'up';
        break;
      case 's': case 'down':
        if (state.direction !== 'up') state.nextDirection = 'down';
        break;
      case 'a': case 'left':
        if (state.direction !== 'right') state.nextDirection = 'left';
        break;
      case 'd': case 'right':
        if (state.direction !== 'left') state.nextDirection = 'right';
        break;
      case 'q': case 'escape':
        quit = true;
        state.alive = false;
        break;
    }
  });

  // Game loop
  while (state.alive && !quit) {
    render(state, offsetX, offsetY);
    await sleep(state.speed);
    update(state);
  }

  removeKeyListener();

  if (!quit) {
    // Game over screen
    render(state, offsetX, offsetY);
    const { width } = getTerminalSize();
    const gameOverY = offsetY + GRID_HEIGHT + 3;

    setCursor(0, gameOverY);
    console.log(centerText(chalk.red.bold('GAME OVER!'), width));
    console.log(centerText(chalk.white(`Final Score: ${chalk.yellow.bold(String(state.score))}  |  Length: ${chalk.magenta.bold(String(state.snake.length))}`), width));
    console.log('');

    saveHighScore('snake', 'Player', state.score);
    const leaderboard = displayLeaderboard('snake');
    for (const line of leaderboard) {
      console.log(line);
    }

    console.log(centerText(chalk.dim('Press any key to return to menu...'), width));
    showCursor();
    await waitForKey();
  }

  showCursor();
}
