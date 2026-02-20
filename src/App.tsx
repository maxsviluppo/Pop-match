import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type BallColor = 'red' | 'blue' | 'yellow' | 'green' | 'purple';

interface Ball {
  id: string;
  color: BallColor;
}

const ROWS = 8;
const COLS = 5;

const COLOR_REQS: Record<BallColor, number> = {
  red: 4,
  blue: 2,
  yellow: 7,
  green: 3,
  purple: 5,
};

const COLOR_CLASSES: Record<BallColor, string> = {
  red: 'bg-[#ff3366]',
  blue: 'bg-[#33ccff]',
  yellow: 'bg-[#ffcc00]',
  green: 'bg-[#33ff33]',
  purple: 'bg-[#cc33ff]',
};

const generateGrid = (rows: number, cols: number): (Ball | null)[][] => {
  const grid: (Ball | null)[][] = [];
  const colors = Object.keys(COLOR_REQS) as BallColor[];
  for (let r = 0; r < rows; r++) {
    const row: (Ball | null)[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        id: `${r}-${c}-${Math.random()}`,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    grid.push(row);
  }
  return grid;
};

export default function App() {
  const [grid, setGrid] = useState<(Ball | null)[][]>(() => generateGrid(ROWS, COLS));
  const [selection, setSelection] = useState<{ r: number; c: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [score, setScore] = useState(0);
  const [targets, setTargets] = useState<Partial<Record<BallColor, number>>>({
    yellow: 7,
    red: 4,
    blue: 2
  });

  const gridRef = useRef<HTMLDivElement>(null);

  const handleCellEnter = useCallback((r: number, c: number) => {
    setSelection((prev) => {
      if (prev.length === 0) return prev;

      const last = prev[prev.length - 1];
      
      // Check if we are backtracking to the previous cell
      if (prev.length > 1) {
        const secondLast = prev[prev.length - 2];
        if (secondLast.r === r && secondLast.c === c) {
          return prev.slice(0, -1); // Remove last
        }
      }

      // Check if already in selection
      if (prev.some((s) => s.r === r && s.c === c)) {
        return prev;
      }

      // Check adjacency (allow diagonal)
      const isAdjacent = Math.abs(last.r - r) <= 1 && Math.abs(last.c - c) <= 1 && !(last.r === r && last.c === c);

      if (isAdjacent) {
        const ball = grid[r][c];
        const firstBall = grid[prev[0].r][prev[0].c];

        if (ball && firstBall && ball.color === firstBall.color) {
          return [...prev, { r, c }];
        }
      }

      return prev;
    });
  }, [grid]);

  const handlePointerDown = (r: number, c: number, e: React.PointerEvent) => {
    if (!grid[r][c]) return;
    setIsDragging(true);
    setSelection([{ r, c }]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest('[data-row]');
    if (cell) {
      const r = parseInt(cell.getAttribute('data-row')!, 10);
      const c = parseInt(cell.getAttribute('data-col')!, 10);
      handleCellEnter(r, c);
    }
  };

  const applyGravity = (currentGrid: (Ball | null)[][]) => {
    const newGrid = currentGrid.map((row) => [...row]);
    const colors = Object.keys(COLOR_REQS) as BallColor[];

    for (let c = 0; c < COLS; c++) {
      let emptySpaces = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (newGrid[r][c] === null) {
          emptySpaces++;
        } else if (emptySpaces > 0) {
          newGrid[r + emptySpaces][c] = newGrid[r][c];
          newGrid[r][c] = null;
        }
      }
      // Fill top with new balls
      for (let r = 0; r < emptySpaces; r++) {
        newGrid[r][c] = {
          id: `new-${Date.now()}-${r}-${c}-${Math.random()}`,
          color: colors[Math.floor(Math.random() * colors.length)],
        };
      }
    }
    return newGrid;
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (selection.length > 0) {
      const firstBall = grid[selection[0].r][selection[0].c];
      if (firstBall) {
        const color = firstBall.color;
        const req = COLOR_REQS[color];

        if (selection.length >= req) {
          // Valid match!
          let newGrid = grid.map((row) => [...row]);
          selection.forEach(({ r, c }) => {
            newGrid[r][c] = null;
          });

          newGrid = applyGravity(newGrid);
          setGrid(newGrid);
          
          setScore((s) => s + selection.length * 10);

          setTargets((prev) => {
            const newTargets = { ...prev };
            if (newTargets[color] !== undefined) {
              newTargets[color] = Math.max(0, newTargets[color]! - selection.length);
            }
            return newTargets;
          });
        }
      }
    }
    setSelection([]);
  };

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging) {
        handlePointerUp();
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [isDragging, selection, grid]);

  const isSelected = (r: number, c: number) => {
    return selection.some((s) => s.r === r && s.c === c);
  };

  const getSelectionIndex = (r: number, c: number) => {
    return selection.findIndex((s) => s.r === r && s.c === c);
  };

  const selectedColor = selection.length > 0 ? grid[selection[0].r][selection[0].c]?.color : null;
  const isValidSelection = selectedColor ? selection.length >= COLOR_REQS[selectedColor] : false;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans select-none overflow-hidden">
      
      {/* Header */}
      <div className="w-full max-w-md mb-6 flex justify-between items-end z-10">
        <div className="flex flex-col">
          <h1 className="font-comic text-5xl text-[#ffcc00] comic-text tracking-wider transform -rotate-2">
            POP MATCH!
          </h1>
          <div className="font-comic text-2xl text-white comic-text mt-1">
            SCORE: {score}
          </div>
        </div>

        {/* Targets */}
        <div className="flex gap-3 bg-white p-3 comic-border rounded-xl transform rotate-1">
          {Object.entries(targets).map(([color, count]) => {
            if (count === 0) return null;
            return (
              <div key={color} className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full border-2 border-black ${COLOR_CLASSES[color as BallColor]}`} />
                <span className="font-comic text-xl leading-none mt-1">{count}</span>
              </div>
            );
          })}
          {Object.values(targets).every(c => c === 0) && (
            <span className="font-comic text-2xl text-green-500 animate-bounce">WIN!</span>
          )}
        </div>
      </div>

      {/* Game Board */}
      <div 
        className="bg-white p-3 comic-border rounded-2xl relative touch-none z-10"
        ref={gridRef}
        onPointerMove={handlePointerMove}
      >
        <div 
          className="grid gap-2"
          style={{ 
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`
          }}
        >
          {grid.map((row, r) => 
            row.map((ball, c) => (
              <div 
                key={`${r}-${c}`}
                data-row={r}
                data-col={c}
                onPointerDown={(e) => handlePointerDown(r, c, e)}
                className="w-12 h-12 sm:w-14 sm:h-14 relative flex items-center justify-center touch-none"
              >
                {/* Cell Background */}
                <div className="absolute inset-0 bg-gray-100 rounded-lg border-2 border-gray-200 opacity-50 pointer-events-none" />
                
                <AnimatePresence mode="popLayout">
                  {ball && (
                    <motion.div
                      key={ball.id}
                      layout
                      initial={{ scale: 0, y: -50 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className={`
                        absolute inset-1 rounded-full border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                        ${COLOR_CLASSES[ball.color]}
                        ${isSelected(r, c) ? 'scale-110 z-10 brightness-110' : 'hover:brightness-110'}
                        cursor-pointer transition-all duration-100 pointer-events-none
                      `}
                    >
                      {/* Highlight reflection */}
                      <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full opacity-50" />
                      
                      {/* Selection Number */}
                      {isSelected(r, c) && (
                        <div className="absolute inset-0 flex items-center justify-center font-comic text-white text-xl comic-text">
                          {getSelectionIndex(r, c) + 1}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* Selection Status Overlay */}
        {isDragging && selectedColor && (
          <div className="absolute -bottom-14 left-0 right-0 flex justify-center pointer-events-none">
            <motion.div 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`
                px-4 py-1 rounded-full comic-border font-comic text-xl text-white comic-text
                ${isValidSelection ? 'bg-green-500' : 'bg-red-500'}
              `}
            >
              {selection.length} / {COLOR_REQS[selectedColor]} {isValidSelection ? '✓' : '✗'}
            </motion.div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="w-full max-w-md mt-10 grid grid-cols-5 gap-2 z-10">
        {(Object.entries(COLOR_REQS) as [BallColor, number][]).map(([color, req]) => (
          <div key={color} className="flex flex-col items-center bg-white p-2 comic-border rounded-xl transform hover:-translate-y-1 transition-transform">
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${COLOR_CLASSES[color as BallColor]}`}>
              <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full opacity-50" />
            </div>
            <span className="font-comic text-sm sm:text-lg mt-1">{req}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
