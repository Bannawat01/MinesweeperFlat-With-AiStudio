import React, { useState, useEffect, useCallback } from 'react';
import { Settings, RefreshCw, Trophy, AlertTriangle, Clock, Flag, Bomb } from 'lucide-react';
import { Cell } from './components/Cell';
import { GameBoard } from './components/GameBoard';
import { DifficultySelector } from './components/DifficultySelector';
import { GameStatus, DifficultyLevel, CellData } from './types';
import { DIRECTIONS, DIFFICULTY_LEVELS } from './constants';

const App: React.FC = () => {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DIFFICULTY_LEVELS.EASY);
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('idle');
  const [timer, setTimer] = useState(0);
  const [flagsUsed, setFlagsUsed] = useState(0);
  const [isFirstClick, setIsFirstClick] = useState(true);

  // Initialize Board
  const initializeBoard = useCallback(() => {
    const newGrid: CellData[][] = [];
    for (let r = 0; r < difficulty.rows; r++) {
      const row: CellData[] = [];
      for (let c = 0; c < difficulty.cols; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
        });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    setGameStatus('idle');
    setTimer(0);
    setFlagsUsed(0);
    setIsFirstClick(true);
  }, [difficulty]);

  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  // Timer Logic
  useEffect(() => {
    let interval: number | undefined;
    if (gameStatus === 'playing') {
      interval = window.setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStatus]);

  // Core Game Logic: Reveal Cell
  const revealCell = (r: number, c: number, currentGrid: CellData[][]) => {
    // Bounds check
    if (r < 0 || r >= difficulty.rows || c < 0 || c >= difficulty.cols) return;
    
    const cell = currentGrid[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;

    if (cell.neighborMines === 0 && !cell.isMine) {
      // Flood fill
      for (const [dr, dc] of DIRECTIONS) {
        revealCell(r + dr, c + dc, currentGrid);
      }
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (gameStatus === 'won' || gameStatus === 'lost' || grid[row][col].isFlagged) return;

    let newGrid = [...grid.map((r) => [...r.map(cell => ({ ...cell }))])]; // Deep copy

    // Generate Mines on First Click
    if (isFirstClick) {
      setGameStatus('playing');
      setIsFirstClick(false);
      
      // Place mines, avoiding the clicked cell
      let minesPlaced = 0;
      while (minesPlaced < difficulty.mines) {
        const r = Math.floor(Math.random() * difficulty.rows);
        const c = Math.floor(Math.random() * difficulty.cols);

        // Don't place mine at start location or if already a mine
        if ((r !== row || c !== col) && !newGrid[r][c].isMine) {
          newGrid[r][c].isMine = true;
          minesPlaced++;
        }
      }

      // Calculate numbers
      for (let r = 0; r < difficulty.rows; r++) {
        for (let c = 0; c < difficulty.cols; c++) {
          if (!newGrid[r][c].isMine) {
            let count = 0;
            for (const [dr, dc] of DIRECTIONS) {
              const nr = r + dr;
              const nc = c + dc;
              if (
                nr >= 0 &&
                nr < difficulty.rows &&
                nc >= 0 &&
                nc < difficulty.cols &&
                newGrid[nr][nc].isMine
              ) {
                count++;
              }
            }
            newGrid[r][c].neighborMines = count;
          }
        }
      }
    }

    const cell = newGrid[row][col];

    if (cell.isMine) {
      // Game Over Logic
      cell.isRevealed = true;
      setGameStatus('lost');
      // Reveal all mines
      newGrid.forEach(r => r.forEach(c => {
        if (c.isMine) c.isRevealed = true;
      }));
    } else {
      revealCell(row, col, newGrid);
      
      // Win Check
      let nonMinesUnrevealed = 0;
      newGrid.forEach(r => r.forEach(c => {
        if (!c.isMine && !c.isRevealed) nonMinesUnrevealed++;
      }));
      
      if (nonMinesUnrevealed === 0) {
        setGameStatus('won');
        // Flag remaining mines visually
        newGrid.forEach(r => r.forEach(c => {
            if (c.isMine) c.isFlagged = true;
        }));
        setFlagsUsed(difficulty.mines); 
      }
    }

    setGrid(newGrid);
  };

  const handleRightClick = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    if (gameStatus === 'won' || gameStatus === 'lost' || isFirstClick) return; // Can't flag before start or after end
    if (grid[row][col].isRevealed) return;

    const newGrid = [...grid.map((r) => [...r.map(cell => ({ ...cell }))])];
    const cell = newGrid[row][col];

    if (!cell.isFlagged && flagsUsed >= difficulty.mines) return; // Optional: Cap flags at mine count

    if (cell.isFlagged) {
      cell.isFlagged = false;
      setFlagsUsed(prev => prev - 1);
    } else {
      cell.isFlagged = true;
      setFlagsUsed(prev => prev + 1);
    }

    setGrid(newGrid);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header Dashboard */}
        <div className="bg-slate-800 p-6 text-white shadow-md z-10 relative">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Bomb className="text-red-400 w-6 h-6" />
              <h1 className="text-2xl font-bold tracking-tight">Minesweeper<span className="font-light text-slate-400">Flat</span></h1>
            </div>

            <div className="flex items-center gap-4 bg-slate-700/50 p-2 rounded-lg">
               {/* Timer */}
               <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-md min-w-[100px] justify-between border border-slate-600">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-xl font-bold text-blue-50">{String(timer).padStart(3, '0')}</span>
              </div>

              {/* Mine Counter */}
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-md min-w-[100px] justify-between border border-slate-600">
                <Flag className="w-4 h-4 text-yellow-400" />
                <span className="font-mono text-xl font-bold text-yellow-50">{difficulty.mines - flagsUsed}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DifficultySelector 
                current={difficulty} 
                onChange={setDifficulty} 
                disabled={gameStatus === 'playing'}
              />
              <button 
                onClick={initializeBoard}
                className="p-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-500/20 text-white"
                title="Reset Game"
              >
                <RefreshCw className={`w-5 h-5 ${gameStatus === 'playing' ? '' : 'hover:rotate-180 transition-transform duration-500'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="p-6 md:p-8 bg-slate-50 flex flex-col items-center justify-center min-h-[400px] overflow-auto">
          <div className="relative">
             <GameBoard 
                grid={grid}
                cols={difficulty.cols}
                onCellClick={handleCellClick}
                onCellRightClick={handleRightClick}
                gameStatus={gameStatus}
             />

             {/* Overlay for Win/Loss */}
             {(gameStatus === 'won' || gameStatus === 'lost') && (
               <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] rounded-lg animate-in fade-in duration-300">
                 <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300 max-w-sm text-center border-4 border-white">
                    {gameStatus === 'won' ? (
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <Trophy className="w-8 h-8 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                      </div>
                    )}
                    
                    <h2 className="text-3xl font-bold text-slate-800">
                      {gameStatus === 'won' ? 'Victory!' : 'Game Over'}
                    </h2>
                    <p className="text-slate-500">
                      {gameStatus === 'won' 
                        ? `You cleared the field in ${timer} seconds.` 
                        : 'Better luck next time!'}
                    </p>
                    
                    <button 
                      onClick={initializeBoard}
                      className="mt-2 px-6 py-2 bg-slate-900 text-white font-medium rounded-full hover:bg-slate-700 transition-colors shadow-lg hover:shadow-xl w-full"
                    >
                      Play Again
                    </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;