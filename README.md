# Terminal Games

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Games](https://img.shields.io/badge/games-5-blue)

A collection of classic terminal-based games built with TypeScript and Node.js. Play Snake, Tetris, Minesweeper, 2048, and Tic-Tac-Toe directly in your terminal with colorful graphics rendered using box-drawing characters and chalk.

## Games

| # | Game | Description |
|---|------|-------------|
| 1 | **Snake** | Navigate the snake to eat food and grow. Avoid walls and your own tail. Speed increases every 5 food eaten. |
| 2 | **Tetris** | Stack tetrominoes, clear lines, and chase high scores. Features all 7 pieces (I, O, T, S, Z, L, J), rotation with wall kick, line-clear combos (100/300/500/800), and increasing speed per level. |
| 3 | **Minesweeper** | Uncover tiles without hitting mines. Three difficulty levels (Easy 9x9, Medium 16x16, Hard 20x16). Features flood-fill reveal, flagging, and timed scoring. |
| 4 | **2048** | Slide tiles on a 4x4 grid to merge matching numbers. Reach the 2048 tile to win, then keep going for a higher score. |
| 5 | **Tic-Tac-Toe** | Challenge an unbeatable AI powered by the minimax algorithm with alpha-beta pruning. Track wins, losses, and draws across rematches. |

## Controls

| Key | Action |
|-----|--------|
| `W` / `Up Arrow` | Move up |
| `A` / `Left Arrow` | Move left |
| `S` / `Down Arrow` | Move down |
| `D` / `Right Arrow` | Move right |
| `Space` / `Enter` | Confirm / Place / Reveal |
| `F` | Flag (Minesweeper) |
| `R` | Rematch (Tic-Tac-Toe) |
| `C` | Continue after win (2048) |
| `Q` / `Escape` | Quit to menu |
| `Ctrl+C` | Force exit |

## How to Play

### Prerequisites

- Node.js 18+ and npm
- A terminal that supports ANSI escape codes and Unicode box-drawing characters

### Installation

```bash
git clone <repo-url> terminal-games
cd terminal-games
npm install
```

### Run

```bash
npm run dev
```

Or build and start separately:

```bash
npm run build
npm start
```

The game menu will appear in your terminal. Press a number key (1-5) to start a game, or Q to quit.

### High Scores

Scores are automatically saved to `scores.json` in the project root. Each game keeps a leaderboard of the top 10 scores, displayed at the end of each round.

## Project Structure

```
terminal-games/
├── src/
│   ├── index.ts               # Main menu and game launcher
│   ├── games/
│   │   ├── snake.ts           # Snake game (20x20 grid, WASD controls)
│   │   ├── tetris.ts          # Tetris (10x20 board, 7 tetrominoes)
│   │   ├── minesweeper.ts     # Minesweeper (3 difficulties, flood-fill)
│   │   ├── 2048.ts            # 2048 (4x4 grid, slide & merge)
│   │   └── tictactoe.ts       # Tic-Tac-Toe (minimax AI)
│   └── utils/
│       ├── terminal.ts        # Terminal helpers (cursor, colors, input)
│       └── score.ts           # High score persistence
├── package.json
├── tsconfig.json
└── scores.json                # Auto-generated leaderboard data
```

## License

MIT
