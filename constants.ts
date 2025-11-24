import { DifficultyLevel } from './types';

export const DIFFICULTY_LEVELS: Record<string, DifficultyLevel> = {
  EASY: { name: 'Easy', rows: 9, cols: 9, mines: 10 },
  MEDIUM: { name: 'Medium', rows: 16, cols: 16, mines: 40 },
  HARD: { name: 'Hard', rows: 16, cols: 30, mines: 99 },
};

export const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export const NUMBER_COLORS = [
  '', // 0
  'text-blue-500', // 1
  'text-green-600', // 2
  'text-red-500', // 3
  'text-indigo-800', // 4
  'text-red-800', // 5
  'text-teal-600', // 6
  'text-black', // 7
  'text-gray-600', // 8
];