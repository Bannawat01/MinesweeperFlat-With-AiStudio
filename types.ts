export type DifficultyName = 'Easy' | 'Medium' | 'Hard';

export interface DifficultyLevel {
  name: DifficultyName;
  rows: number;
  cols: number;
  mines: number;
}

export interface CellData {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';