import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type BallColor = 'red' | 'blue' | 'yellow' | 'green' | 'purple';

interface Ball {
  id: string;
  color: BallColor;
}

interface Effect {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

const ROWS = 8;
const COLS = 5;
const MIN_MATCH = 3;
const INITIAL_MOVES = 20;

const INITIAL_TARGETS: Partial<Record<BallColor, number>> = {
  yellow: 15,
  red: 10,
  blue: 5
};

const COLOR_CLASSES: Record<BallColor, string> = {
  red: 'bg-[#ff3366]',
  blue: 'bg-[#33ccff]',
  yellow: 'bg-[#ffcc00]',
  green: 'bg-[#33ff33]',
  purple: 'bg-[#cc33ff]',
};

const COMIC_WORDS = ['POP!', 'POW!', 'BOOM!', 'ZAP!', 'BANG!', 'WOW!'];

const generateGrid = (rows: number, cols: number): (Ball | null)[][] => {
  const grid: (Ball | null)[][] = [];
  const colors = Object.keys(COLOR_CLASSES) as BallColor[];
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
  const [moves, setMoves] = useState(INITIAL_MOVES);
  const [targets, setTargets] = useState<Partial<Record<BallColor, number>>>(INITIAL_TARGETS);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [effects, setEffects] = useState<Effect[]>([]);
  const [shake, setShake] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  const handleCellEnter = useCallback((r: number, c: number) => {
    if (gameState !== 'playing') return;
    
    setSelection((prev) => {
      if (prev.length === 0) return prev;

      const last = prev[prev.length - 1];
      
      if (prev.length > 1) {
        const secondLast = prev[prev.length - 2];
        if (secondLast.r === r && secondLast.c === c) {
          return prev.slice(0, -1);
        }
      }

      if (prev.some((s) => s.r === r && s.c === c)) {
        return prev;
      }

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
  }, [grid, gameState]);

  const handlePointerDown = (r: number, c: number, e: React.PointerEvent) => {
    if (gameState !== 'playing' || !grid[r][c]) return;
    setIsDragging(true);
    setSelection([{ r, c }]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || gameState !== 'playing') return;
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
    const colors = Object.keys(COLOR_CLASSES) as BallColor[];

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
      for (let r = 0; r < emptySpaces; r++) {
        newGrid[r][c] = {
          id: `new-${Date.now()}-${r}-${c}-${Math.random()}`,
          color: colors[Math.floor(Math.random() * colors.length)],
        };
      }
    }
    return newGrid;
  };

  const triggerExplosion = (r: number, c: number, color: string) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Estimate position based on cell size
    const cellWidth = rect.width / COLS;
    const cellHeight = rect.height / ROWS;
    const x = c * cellWidth + cellWidth / 2;
    const y = r * cellHeight + cellHeight / 2;

    const newEffect: Effect = {
      id: Math.random().toString(),
      x,
      y,
      text: COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)],
      color: COLOR_CLASSES[color as BallColor].replace('bg-[', '').replace(']', ''),
    };

    setEffects(prev => [...prev, newEffect]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== newEffect.id));
    }, 800);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (selection.length >= MIN_MATCH && gameState === 'playing') {
      const firstBall = grid[selection[0].r][selection[0].c];
      if (firstBall) {
        const color = firstBall.color;

        // Trigger effects
        const centerIdx = Math.floor(selection.length / 2);
        const centerCell = selection[centerIdx];
        triggerExplosion(centerCell.r, centerCell.c, color);
        
        if (selection.length >= 5) {
          setShake(true);
          setTimeout(() => setShake(false), 300);
        }

        let newGrid = grid.map((row) => [...row]);
        selection.forEach(({ r, c }) => {
          newGrid[r][c] = null;
        });

        newGrid = applyGravity(newGrid);
        setGrid(newGrid);
        
        setScore((s) => s + selection.length * 10);
        
        const newMoves = moves - 1;
        setMoves(newMoves);

        setTargets((prev) => {
          const newTargets = { ...prev };
          if (newTargets[color] !== undefined) {
            newTargets[color] = Math.max(0, newTargets[color]! - selection.length);
          }
          
          const isWon = Object.values(newTargets).every(count => count === 0);
          if (isWon) {
            setGameState('won');
          } else if (newMoves <= 0) {
            setGameState('lost');
          }
          
          return newTargets;
        });
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
  }, [isDragging, selection, grid, moves, gameState]);

  const resetGame = () => {
    setGrid(generateGrid(ROWS, COLS));
    setScore(0);
    setMoves(INITIAL_MOVES);
    setTargets(INITIAL_TARGETS);
    setGameState('playing');
    setSelection([]);
    setEffects([]);
  };

  const isSelected = (r: number, c: number) => {
    return selection.some((s) => s.r === r && s.c === c);
  };

  const getSelectionIndex = (r: number, c: number) => {
    return selection.findIndex((s) => s.r === r && s.c === c);
  };

  const selectedColor = selection.length > 0 ? grid[selection[0].r][selection[0].c]?.color : null;
  const isValidSelection = selection.length >= MIN_MATCH;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans select-none overflow-hidden relative">
      
      {/* Header */}
      <div className="w-full max-w-md mb-4 flex justify-between items-end z-10">
        <div className="flex flex-col">
          <h1 className="font-comic text-4xl sm:text-5xl text-[#ffcc00] comic-text tracking-wider transform -rotate-2">
            POP MATCH!
          </h1>
          <div className="flex gap-4 mt-2">
            <div className="font-comic text-xl sm:text-2xl text-white comic-text">
              SCORE: {score}
            </div>
            <div className={`font-comic text-xl sm:text-2xl comic-text ${moves <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              MOVES: {moves}
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 bg-white p-2 sm:p-3 comic-border rounded-xl transform rotate-1">
          {Object.entries(targets).map(([color, count]) => {
            const isCompleted = count === 0;
            return (
              <div key={color} className="flex flex-col items-center relative">
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-black ${COLOR_CLASSES[color as BallColor]} ${isCompleted ? 'opacity-50' : ''}`} />
                <span className={`font-comic text-lg sm:text-xl leading-none mt-1 ${isCompleted ? 'text-green-500' : 'text-black'}`}>
                  {isCompleted ? '✓' : count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Game Board */}
      <motion.div 
        animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
        transition={{ duration: 0.3 }}
        className="bg-white p-2 sm:p-3 comic-border rounded-2xl relative touch-none z-10"
        ref={gridRef}
        onPointerMove={handlePointerMove}
      >
        <div 
          className="grid gap-1 sm:gap-2"
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
                <div className="absolute inset-0 bg-gray-100 rounded-lg border-2 border-gray-200 opacity-50 pointer-events-none" />
                
                <AnimatePresence mode="popLayout">
                  {ball && (
                    <motion.div
                      key={ball.id}
                      layout
                      initial={{ scale: 0, y: -50 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ 
                        scale: [1, 1.2, 0], 
                        rotate: [0, 15, -15, 0],
                        opacity: [1, 1, 0]
                      }}
                      transition={{ 
                        type: 'spring', 
                        stiffness: 300, 
                        damping: 25,
                        exit: { duration: 0.3 }
                      }}
                      className={`
                        absolute inset-1 rounded-full border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                        ${COLOR_CLASSES[ball.color]}
                        ${isSelected(r, c) ? 'scale-110 z-10 brightness-110' : 'hover:brightness-110'}
                        cursor-pointer transition-all duration-100 pointer-events-none
                      `}
                    >
                      <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full opacity-50" />
                      
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

        {/* Effects Layer */}
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          <AnimatePresence>
            {effects.map(effect => (
              <motion.div
                key={effect.id}
                initial={{ scale: 0, opacity: 0, rotate: -20 }}
                animate={{ scale: [0, 1.5, 1.2], opacity: [0, 1, 1, 0], rotate: 10 }}
                exit={{ opacity: 0 }}
                style={{ 
                  position: 'absolute',
                  left: effect.x,
                  top: effect.y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 100
                }}
                className="flex items-center justify-center"
              >
                {/* Comic Starburst */}
                <svg width="120" height="120" viewBox="0 0 100 100" className="absolute">
                  <path 
                    d="M50 0 L60 35 L95 25 L75 50 L100 75 L65 65 L50 100 L35 65 L0 75 L25 50 L5 25 L40 35 Z" 
                    fill={effect.color} 
                    stroke="black" 
                    strokeWidth="3"
                  />
                </svg>
                <span className="font-comic text-3xl text-white comic-text relative z-10">
                  {effect.text}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Selection Status Overlay */}
        {isDragging && selectedColor && (
          <div className="absolute -bottom-12 left-0 right-0 flex justify-center pointer-events-none z-20">
            <motion.div 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`
                px-4 py-1 rounded-full comic-border font-comic text-xl text-white comic-text shadow-lg
                ${isValidSelection ? 'bg-green-500' : 'bg-red-500'}
              `}
            >
              {selection.length} {isValidSelection ? '✓' : `(Min ${MIN_MATCH})`}
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Game Over / Victory Overlay */}
      <AnimatePresence>
        {gameState !== 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl comic-border max-w-sm w-full text-center flex flex-col items-center"
            >
              <h2 className={`font-comic text-6xl comic-text mb-4 transform -rotate-2 ${gameState === 'won' ? 'text-green-500' : 'text-red-500'}`}>
                {gameState === 'won' ? 'YOU WIN!' : 'GAME OVER'}
              </h2>
              
              <div className="font-comic text-2xl mb-6">
                Final Score: <span className="text-[#ffcc00] comic-text">{score}</span>
              </div>

              <button 
                onClick={resetGame}
                className="bg-[#ff3366] text-white font-comic text-3xl py-3 px-8 rounded-full comic-border hover:bg-[#ff6688] hover:-translate-y-1 active:translate-y-1 transition-all"
              >
                PLAY AGAIN
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
