import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// --- AUDIO SYSTEM ---
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playTone = (freq: number, type: OscillatorType, duration: number, startTimeOffset: number = 0) => {
  if (!audioCtx) return;
  const startTime = audioCtx.currentTime + startTimeOffset;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  gain.gain.setValueAtTime(0.1, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
};

const playPop = (count: number) => {
  const baseFreq = 300 + Math.min(count * 40, 400);
  playTone(baseFreq, 'sine', 0.15);
  playTone(baseFreq * 1.5, 'sine', 0.15, 0.05);
};

const playBonus = () => {
  playTone(440, 'square', 0.1, 0);
  playTone(554, 'square', 0.1, 0.1);
  playTone(659, 'square', 0.1, 0.2);
  playTone(880, 'square', 0.3, 0.3);
};

const playLevelUp = () => {
  playTone(523.25, 'triangle', 0.15, 0);
  playTone(659.25, 'triangle', 0.15, 0.15);
  playTone(783.99, 'triangle', 0.15, 0.3);
  playTone(1046.50, 'triangle', 0.4, 0.45);
};

const playGameOver = () => {
  playTone(300, 'sawtooth', 0.3, 0);
  playTone(280, 'sawtooth', 0.3, 0.3);
  playTone(260, 'sawtooth', 0.3, 0.6);
  playTone(200, 'sawtooth', 0.6, 0.9);
};

const playWin = () => {
  playTone(523.25, 'square', 0.2, 0);
  playTone(523.25, 'square', 0.2, 0.2);
  playTone(523.25, 'square', 0.2, 0.4);
  playTone(659.25, 'square', 0.4, 0.6);
  playTone(783.99, 'square', 0.4, 1.0);
};
// --- END AUDIO SYSTEM ---

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
  isBonus?: boolean;
}

interface LevelConfig {
  moves: number;
  targets: Partial<Record<BallColor, number>>;
}

const ROWS = 8;
const COLS = 5;
const MIN_MATCH = 3;

const LEVELS: LevelConfig[] = [
  { moves: 20, targets: { yellow: 10, red: 10 } },
  { moves: 18, targets: { yellow: 15, red: 10, blue: 5 } },
  { moves: 15, targets: { yellow: 20, red: 15, blue: 10, green: 5 } },
  { moves: 15, targets: { yellow: 25, red: 20, blue: 15, green: 10, purple: 5 } },
  { moves: 12, targets: { yellow: 30, red: 25, blue: 20, green: 15, purple: 10 } },
];

const COLOR_CLASSES: Record<BallColor, string> = {
  red: 'bg-[#ff3366]',
  blue: 'bg-[#33ccff]',
  yellow: 'bg-[#ffcc00]',
  green: 'bg-[#33ff33]',
  purple: 'bg-[#cc33ff]',
};

const COMIC_WORDS = ['POP!', 'POW!', 'BOOM!', 'ZAP!', 'BANG!', 'WOW!'];
const BONUS_WORDS = ['AMAZING!', 'SUPER!', 'FANTASTIC!', 'UNBELIEVABLE!', 'KABOOM!'];

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
  const [level, setLevel] = useState(0);
  const [grid, setGrid] = useState<(Ball | null)[][]>(() => generateGrid(ROWS, COLS));
  const [selection, setSelection] = useState<{ r: number; c: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(LEVELS[0].moves);
  const [targets, setTargets] = useState<Partial<Record<BallColor, number>>>(LEVELS[0].targets);
  const [gameState, setGameState] = useState<'home' | 'playing' | 'won' | 'lost' | 'levelup'>('home');
  const [effects, setEffects] = useState<Effect[]>([]);
  const [shake, setShake] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState === 'levelup') playLevelUp();
    else if (gameState === 'won') playWin();
    else if (gameState === 'lost') playGameOver();
  }, [gameState]);

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
    initAudio();
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

  const triggerExplosion = (r: number, c: number, color: string, isBonus: boolean) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cellWidth = rect.width / COLS;
    const cellHeight = rect.height / ROWS;
    const x = c * cellWidth + cellWidth / 2;
    const y = r * cellHeight + cellHeight / 2;

    const text = isBonus 
      ? BONUS_WORDS[Math.floor(Math.random() * BONUS_WORDS.length)]
      : COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)];

    const newEffect: Effect = {
      id: Math.random().toString(),
      x,
      y,
      text,
      color: COLOR_CLASSES[color as BallColor].replace('bg-[', '').replace(']', ''),
      isBonus
    };

    setEffects(prev => [...prev, newEffect]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== newEffect.id));
    }, isBonus ? 1500 : 800);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (selection.length >= MIN_MATCH && gameState === 'playing') {
      const firstBall = grid[selection[0].r][selection[0].c];
      if (firstBall) {
        const color = firstBall.color;
        const isBonus = selection.length > 5;

        const centerIdx = Math.floor(selection.length / 2);
        const centerCell = selection[centerIdx];
        triggerExplosion(centerCell.r, centerCell.c, color, isBonus);
        
        if (isBonus) {
          playBonus();
        } else {
          playPop(selection.length);
        }
        
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
        
        // Bonus score
        const baseScore = selection.length * 10;
        const bonusMultiplier = isBonus ? 2 : 1;
        setScore((s) => s + baseScore * bonusMultiplier);
        
        const newMoves = moves - 1;
        setMoves(newMoves);

        setTargets((prev) => {
          const newTargets = { ...prev };
          if (newTargets[color] !== undefined) {
            newTargets[color] = Math.max(0, newTargets[color]! - selection.length);
          }
          
          const isWon = Object.values(newTargets).every(count => count === 0);
          if (isWon) {
            if (level < LEVELS.length - 1) {
              setGameState('levelup');
            } else {
              setGameState('won');
            }
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
  }, [isDragging, selection, grid, moves, gameState, level]);

  const startGame = () => {
    initAudio();
    setGameState('playing');
  };

  const startNextLevel = () => {
    initAudio();
    const nextLevel = level + 1;
    setLevel(nextLevel);
    setGrid(generateGrid(ROWS, COLS));
    setMoves(LEVELS[nextLevel].moves);
    setTargets(LEVELS[nextLevel].targets);
    setGameState('playing');
    setSelection([]);
    setEffects([]);
  };

  const resetGame = () => {
    initAudio();
    setLevel(0);
    setGrid(generateGrid(ROWS, COLS));
    setScore(0);
    setMoves(LEVELS[0].moves);
    setTargets(LEVELS[0].targets);
    setGameState('playing');
    setSelection([]);
    setEffects([]);
  };

  const goToHome = () => {
    initAudio();
    setGameState('home');
    setLevel(0);
    setScore(0);
    setMoves(LEVELS[0].moves);
    setTargets(LEVELS[0].targets);
    setGrid(generateGrid(ROWS, COLS));
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
      
      {/* Home Button (Top Right) */}
      {gameState !== 'home' && (
        <button 
          onClick={goToHome}
          className="absolute top-4 right-4 z-50 bg-white p-2 rounded-xl comic-border hover:bg-gray-100 transition-all hover:scale-110 active:scale-95 shadow-lg"
          title="Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </button>
      )}

      {/* Header */}
      <div className="w-full max-w-md mb-4 flex justify-between items-end z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-comic text-4xl sm:text-5xl text-[#ffcc00] comic-text tracking-wider transform -rotate-2">
              POP MATCH!
            </h1>
            {gameState !== 'home' && (
              <div className="bg-white px-3 py-1 comic-border rounded-lg transform rotate-3">
                <span className="font-comic text-xl">LVL {level + 1}</span>
              </div>
            )}
          </div>
          {gameState !== 'home' && (
            <div className="flex gap-4 mt-2 items-center">
              <div className="font-comic text-xl sm:text-2xl text-white comic-text">
                SCORE: {score}
              </div>
              <div className={`font-comic text-xl sm:text-2xl comic-text ${moves <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                MOVES: {moves}
              </div>
            </div>
          )}
        </div>

        {gameState !== 'home' && (
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
        )}
      </div>

      {/* Game Board or Home Screen */}
      {gameState === 'home' ? (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-3xl comic-border max-w-sm w-full text-center flex flex-col items-center z-10"
        >
          <div className="relative mb-8">
            <div className="absolute -top-10 -left-10 w-20 h-20 bg-[#ff3366] rounded-full comic-border transform -rotate-12 flex items-center justify-center">
              <span className="font-comic text-white text-2xl comic-text">POP!</span>
            </div>
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-[#ffcc00] rounded-full comic-border transform rotate-12 flex items-center justify-center">
              <span className="font-comic text-white text-2xl comic-text">MATCH!</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
              {['red', 'blue', 'yellow', 'green', 'purple', 'red'].map((c, i) => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-black ${COLOR_CLASSES[c as BallColor]} shadow-md`} />
              ))}
            </div>
          </div>

          <h2 className="font-comic text-4xl mb-6 comic-text text-black">READY TO POP?</h2>
          
          <div className="space-y-4 mb-8 text-left w-full">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs">1</div>
              <p className="font-comic text-lg">Connect 3+ same colors</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs">2</div>
              <p className="font-comic text-lg">Reach targets before moves end</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs">3</div>
              <p className="font-comic text-lg">Connect 6+ for BIG BONUS!</p>
            </div>
          </div>

          <button 
            onClick={startGame}
            className="bg-[#ffcc00] text-black font-comic text-4xl py-4 px-12 rounded-full comic-border hover:bg-[#ffe066] hover:-translate-y-1 active:translate-y-1 transition-all w-full"
          >
            START GAME
          </button>
        </motion.div>
      ) : (
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
                          opacity: [1, 1, 0],
                          transition: { type: 'keyframes', duration: 0.3 }
                        }}
                        transition={{ 
                          type: 'spring', 
                          stiffness: 300, 
                          damping: 25
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
                  animate={{ 
                    scale: effect.isBonus ? [0, 2, 1.5] : [0, 1.5, 1.2], 
                    opacity: [0, 1, 1, 0], 
                    rotate: effect.isBonus ? [0, 15, -15, 0] : 10 
                  }}
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
                  <svg width={effect.isBonus ? "200" : "120"} height={effect.isBonus ? "200" : "120"} viewBox="0 0 100 100" className="absolute">
                    <path 
                      d="M50 0 L60 35 L95 25 L75 50 L100 75 L65 65 L50 100 L35 65 L0 75 L25 50 L5 25 L40 35 Z" 
                      fill={effect.color} 
                      stroke="black" 
                      strokeWidth="3"
                    />
                    {effect.isBonus && (
                      <circle cx="50" cy="50" r="30" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
                    )}
                  </svg>
                  <span className={`font-comic ${effect.isBonus ? 'text-4xl' : 'text-3xl'} text-white comic-text relative z-10 whitespace-nowrap`}>
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
      )}

      {/* Overlay Screens */}
      <AnimatePresence>
        {gameState !== 'playing' && gameState !== 'home' && (
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
              {gameState === 'levelup' ? (
                <>
                  <h2 className="font-comic text-6xl comic-text mb-4 transform -rotate-2 text-blue-500">
                    LEVEL UP!
                  </h2>
                  <div className="font-comic text-2xl mb-6">
                    Level {level + 1} Complete!
                  </div>
                  <button 
                    onClick={startNextLevel}
                    className="bg-blue-500 text-white font-comic text-3xl py-3 px-8 rounded-full comic-border hover:bg-blue-600 hover:-translate-y-1 active:translate-y-1 transition-all"
                  >
                    NEXT LEVEL
                  </button>
                </>
              ) : (
                <>
                  <h2 className={`font-comic text-6xl comic-text mb-4 transform -rotate-2 ${gameState === 'won' ? 'text-green-500' : 'text-red-500'}`}>
                    {gameState === 'won' ? 'YOU WIN!' : 'GAME OVER'}
                  </h2>
                  <div className="font-comic text-2xl mb-6">
                    Final Score: <span className="text-[#ffcc00] comic-text">{score}</span>
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                    <button 
                      onClick={resetGame}
                      className="bg-[#ff3366] text-white font-comic text-3xl py-3 px-8 rounded-full comic-border hover:bg-[#ff6688] hover:-translate-y-1 active:translate-y-1 transition-all"
                    >
                      PLAY AGAIN
                    </button>
                    <button 
                      onClick={goToHome}
                      className="bg-gray-200 text-black font-comic text-2xl py-2 px-8 rounded-full comic-border hover:bg-gray-300 transition-all"
                    >
                      HOME
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
