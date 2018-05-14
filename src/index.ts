import chalk from 'chalk';
import { clearScreen, showCursor, hideCursor, waitForKey, centerText, getTerminalSize } from './utils/terminal';
import { playSnake } from './games/snake';
import { playTetris } from './games/tetris';
import { playMinesweeper } from './games/minesweeper';
import { play2048 } from './games/2048';
import { playTicTacToe } from './games/tictactoe';

const BANNER = [
  ' _____                   _             _    ____                           ',
  '|_   _|__ _ __ _ __ ___ (_)_ __   __ _| |  / ___| __ _ _ __ ___   ___  ___ ',
  '  | |/ _ \\ \'__| \'_ ` _ \\| | \'_ \\ / _` | | | |  _ / _` | \'_ ` _ \\ / _ \\/ __|',
  '  | |  __/ |  | | | | | | | | | | (_| | | | |_| | (_| | | | | | |  __/\\__ \\',
  '  |_|\\___|_|  |_| |_| |_|_|_| |_|\\__,_|_|  \\____|\\__,_|_| |_| |_|\\___||___/',
];

interface GameOption {
  key: string;
  name: string;
  description: string;
  play: () => Promise<void>;
}

const games: GameOption[] = [
  { key: '1', name: 'Snake',       description: 'Classic snake - eat, grow, survive',   play: playSnake },
  { key: '2', name: 'Tetris',      description: 'Stack blocks, clear lines, high score', play: playTetris },
  { key: '3', name: 'Minesweeper', description: 'Find the mines without blowing up',     play: playMinesweeper },
  { key: '4', name: '2048',        description: 'Slide and merge tiles to reach 2048',   play: play2048 },
  { key: '5', name: 'Tic-Tac-Toe', description: 'Beat the unbeatable minimax AI',        play: playTicTacToe },
];

function renderMenu(): void {
  clearScreen();
  const { width } = getTerminalSize();

  console.log('');
  for (const line of BANNER) {
    console.log(centerText(chalk.cyan(line), width));
  }
  console.log('');
  console.log(centerText(chalk.dim('v1.0.0 - A collection of classic games for your terminal'), width));
  console.log('');
  console.log(centerText(chalk.yellow('=== SELECT A GAME ==='), width));
  console.log('');

  for (const game of games) {
    const line = `  ${chalk.bold.green(`[${game.key}]`)} ${chalk.white(game.name.padEnd(14))} ${chalk.dim(game.description)}`;
    console.log(centerText(line, width));
  }

  console.log('');
  console.log(centerText(chalk.dim(`[Q] Quit`), width));
  console.log('');
  console.log(centerText(chalk.dim('Press a number key to start...'), width));
}

async function main(): Promise<void> {
  process.on('exit', () => showCursor());

  while (true) {
    renderMenu();
    hideCursor();

    const key = await waitForKey();

    if (key === 'q' || key === 'escape') {
      clearScreen();
      showCursor();
      console.log(chalk.cyan('\nThanks for playing! See you next time.\n'));
      process.exit(0);
    }

    const selected = games.find((g) => g.key === key);
    if (selected) {
      clearScreen();
      showCursor();
      await selected.play();
    }
  }
}

main().catch((err) => {
  showCursor();
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});
