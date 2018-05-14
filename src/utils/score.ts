import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { centerText, getTerminalSize } from './terminal';

interface ScoreEntry {
  name: string;
  score: number;
  game: string;
  date: string;
}

interface ScoreData {
  scores: ScoreEntry[];
}

const SCORE_FILE = path.join(__dirname, '..', '..', 'scores.json');
const MAX_SCORES_PER_GAME = 10;

function loadScoreData(): ScoreData {
  try {
    if (fs.existsSync(SCORE_FILE)) {
      const raw = fs.readFileSync(SCORE_FILE, 'utf-8');
      return JSON.parse(raw) as ScoreData;
    }
  } catch {
    // Corrupted file, start fresh
  }
  return { scores: [] };
}

function saveScoreData(data: ScoreData): void {
  fs.writeFileSync(SCORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function saveHighScore(game: string, name: string, score: number): boolean {
  const data = loadScoreData();
  const entry: ScoreEntry = {
    name: name.substring(0, 12),
    score,
    game,
    date: new Date().toISOString().split('T')[0],
  };

  data.scores.push(entry);

  // Keep only top scores per game
  data.scores.sort((a, b) => b.score - a.score);
  const gameScores: Record<string, number> = {};
  data.scores = data.scores.filter((s) => {
    gameScores[s.game] = (gameScores[s.game] || 0) + 1;
    return gameScores[s.game] <= MAX_SCORES_PER_GAME;
  });

  saveScoreData(data);

  // Check if the entry made it into the leaderboard
  const topForGame = data.scores.filter((s) => s.game === game);
  return topForGame.some((s) => s.name === entry.name && s.score === entry.score && s.date === entry.date);
}

export function getHighScores(game: string): ScoreEntry[] {
  const data = loadScoreData();
  return data.scores
    .filter((s) => s.game === game)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SCORES_PER_GAME);
}

export function displayLeaderboard(game: string): string[] {
  const scores = getHighScores(game);
  const { width } = getTerminalSize();
  const lines: string[] = [];

  lines.push('');
  lines.push(centerText(chalk.bold.yellow(`=== ${game.toUpperCase()} LEADERBOARD ===`), width));
  lines.push('');

  if (scores.length === 0) {
    lines.push(centerText(chalk.dim('No scores yet. Be the first!'), width));
  } else {
    lines.push(centerText(chalk.dim('Rank  Name          Score       Date'), width));
    lines.push(centerText(chalk.dim('----  ----          -----       ----'), width));

    scores.forEach((entry, i) => {
      const rank = `#${(i + 1).toString().padStart(2, ' ')}`;
      const name = entry.name.padEnd(12, ' ');
      const score = entry.score.toString().padStart(8, ' ');
      const date = entry.date;
      const medal = i === 0 ? chalk.yellow(' *') : i === 1 ? chalk.gray(' *') : i === 2 ? chalk.red(' *') : '  ';
      lines.push(centerText(`${medal} ${chalk.white(rank)}  ${chalk.cyan(name)}  ${chalk.green(score)}    ${chalk.dim(date)}`, width));
    });
  }

  lines.push('');
  return lines;
}
