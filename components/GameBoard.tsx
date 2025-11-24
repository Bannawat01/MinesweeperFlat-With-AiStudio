import React from 'react';
import { Cell } from './Cell';
import { CellData, GameStatus } from '../types';

interface GameBoardProps {
  grid: CellData[][];
  cols: number;
  onCellClick: (r: number, c: number) => void;
  onCellRightClick: (e: React.MouseEvent, r: number, c: number) => void;
  gameStatus: GameStatus;
}

export const GameBoard: React.FC<GameBoardProps> = ({ grid, cols, onCellClick, onCellRightClick, gameStatus }) => {
  return (
    <div 
      className="grid gap-[2px] bg-slate-300 p-[2px] rounded-sm no-context-menu shadow-inner"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {grid.map((row, rIndex) =>
        row.map((cell, cIndex) => (
          <Cell
            key={`${rIndex}-${cIndex}`}
            data={cell}
            onClick={onCellClick}
            onRightClick={onCellRightClick}
            disabled={gameStatus === 'won' || gameStatus === 'lost'}
          />
        ))
      )}
    </div>
  );
};