import React from 'react';
import { Flag, Bomb } from 'lucide-react';
import { CellData } from '../types';
import { NUMBER_COLORS } from '../constants';

interface CellProps {
  data: CellData;
  onClick: (r: number, c: number) => void;
  onRightClick: (e: React.MouseEvent, r: number, c: number) => void;
  disabled: boolean;
}

export const Cell: React.FC<CellProps> = React.memo(({ data, onClick, onRightClick, disabled }) => {
  const { row, col, isMine, isRevealed, isFlagged, neighborMines } = data;

  const getCellContent = () => {
    if (isFlagged) {
      return <Flag className="w-4 h-4 text-red-500 fill-red-500" />;
    }
    if (isRevealed) {
      if (isMine) {
        return <Bomb className="w-5 h-5 text-slate-800 animate-pulse" />;
      }
      if (neighborMines > 0) {
        return <span className={`font-bold text-lg ${NUMBER_COLORS[neighborMines]}`}>{neighborMines}</span>;
      }
    }
    return null;
  };

  const getBaseClasses = () => {
    if (isRevealed) {
      if (isMine) return 'bg-red-500 border-red-400';
      return 'bg-slate-100 border-slate-200';
    }
    return 'bg-slate-300 border-b-4 border-r-4 border-slate-400 hover:bg-slate-200 active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1 transition-all';
  };

  return (
    <div
      onClick={() => !disabled && onClick(row, col)}
      onContextMenu={(e) => onRightClick(e, row, col)}
      className={`
        w-8 h-8 md:w-9 md:h-9 
        flex items-center justify-center 
        cursor-pointer select-none rounded-sm
        ${getBaseClasses()}
      `}
      role="button"
      aria-label={`Cell at row ${row}, column ${col}`}
    >
      {getCellContent()}
    </div>
  );
});