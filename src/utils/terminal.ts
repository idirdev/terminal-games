import * as readline from 'readline';
import chalk from 'chalk';

export function clearScreen(): void {
  process.stdout.write('\x1B[2J\x1B[0;0H');
}

export function setCursor(x: number, y: number): void {
  process.stdout.write(`\x1B[${y + 1};${x + 1}H`);
}

export function hideCursor(): void {
  process.stdout.write('\x1B[?25l');
}

export function showCursor(): void {
  process.stdout.write('\x1B[?25h');
}

export function getTerminalSize(): { width: number; height: number } {
  return {
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
  };
}

export function drawBox(x: number, y: number, w: number, h: number, title?: string): void {
  const topLeft = '\u250C';
  const topRight = '\u2510';
  const bottomLeft = '\u2514';
  const bottomRight = '\u2518';
  const horizontal = '\u2500';
  const vertical = '\u2502';

  let topBar = topLeft + horizontal.repeat(w - 2) + topRight;
  if (title) {
    const titleStr = ` ${title} `;
    const insertAt = Math.floor((w - 2 - titleStr.length) / 2) + 1;
    topBar = topBar.substring(0, insertAt) + chalk.bold.cyan(titleStr) + topBar.substring(insertAt + titleStr.length);
  }

  setCursor(x, y);
  process.stdout.write(topBar);

  for (let i = 1; i < h - 1; i++) {
    setCursor(x, y + i);
    process.stdout.write(vertical + ' '.repeat(w - 2) + vertical);
  }

  setCursor(x, y + h - 1);
  process.stdout.write(bottomLeft + horizontal.repeat(w - 2) + bottomRight);
}

export function writeAt(x: number, y: number, text: string): void {
  setCursor(x, y);
  process.stdout.write(text);
}

export function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - stripAnsi(text).length) / 2));
  return ' '.repeat(padding) + text;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

export async function waitForKey(): Promise<string> {
  return new Promise((resolve) => {
    const wasRaw = process.stdin.isRaw;
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);

    const handler = (_str: string, key: readline.Key) => {
      process.stdin.removeListener('keypress', handler);
      if (!wasRaw && process.stdin.isTTY) process.stdin.setRawMode(false);
      if (key.ctrl && key.name === 'c') {
        showCursor();
        process.exit(0);
      }
      resolve(key.name || key.sequence || '');
    };

    process.stdin.on('keypress', handler);
  });
}

export function onKeyPress(callback: (key: string, raw: readline.Key) => void): () => void {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  const handler = (_str: string, key: readline.Key) => {
    if (key.ctrl && key.name === 'c') {
      showCursor();
      process.exit(0);
    }
    callback(key.name || key.sequence || '', key);
  };

  process.stdin.on('keypress', handler);

  return () => {
    process.stdin.removeListener('keypress', handler);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
  };
}
