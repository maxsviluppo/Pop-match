import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// --- AUDIO SYSTEM ---
let audioCtx: AudioContext | null = null;
let isMuted = false;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const toggleMute = () => {
  isMuted = !isMuted;
  return isMuted;
};

const playTone = (freq: number, type: OscillatorType, duration: number, startTimeOffset: number = 0) => {
  if (!audioCtx || isMuted) return;
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
  // Softer, smoother bonus sound using sine waves
  playTone(440, 'sine', 0.2, 0);
  playTone(554, 'sine', 0.2, 0.05);
  playTone(659, 'sine', 0.2, 0.1);
  playTone(880, 'sine', 0.4, 0.15);
};

const playClick = () => {
  playTone(600, 'sine', 0.05);
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

const playSelect = (index: number) => {
  if (!audioCtx) return;
  // Pentatonic scale for selection sounds
  const scale = [261.63, 293.66, 329.63, 392.00, 440.00];
  const freq = scale[index % scale.length] * Math.pow(2, Math.floor(index / scale.length));
  playTone(freq, 'sine', 0.1);
};

const playRainbow = () => {
  // Softer, shimmering rainbow sound
  for (let i = 0; i < 8; i++) {
    playTone(523.25 * Math.pow(1.1, i), 'sine', 0.2, i * 0.04);
  }
};
// --- END AUDIO SYSTEM ---

type BallColor = 'red' | 'blue' | 'yellow' | 'green' | 'purple' | 'rainbow' | 'special';
type PowerupType = 'moves' | 'multiplier' | 'bomb';

interface Ball {
  id: string;
  color: BallColor;
  powerup?: PowerupType;
}

interface Effect {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  isBonus?: boolean;
  rotation: number;
  scale: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  angle: number;
  distance: number;
  color: string;
  size: number;
  borderRadius: string;
}

interface Splash {
  id: string;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
}

interface LevelConfig {
  moves: number;
  targets: Partial<Record<Exclude<BallColor, 'rainbow' | 'special'>, number>>;
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

const generateLevelConfig = (levelIndex: number): LevelConfig => {
  if (levelIndex < LEVELS.length) {
    return LEVELS[levelIndex];
  }
  
  const baseTargets = 20 + Math.floor((levelIndex - LEVELS.length + 1) * 5);
  const numColors = Math.min(5, 3 + Math.floor(levelIndex / 3));
  
  const colors: (Exclude<BallColor, 'rainbow' | 'special'>)[] = ['red', 'blue', 'yellow', 'green', 'purple'];
  const shuffledColors = [...colors].sort(() => Math.random() - 0.5).slice(0, numColors);
  
  const targets: Partial<Record<Exclude<BallColor, 'rainbow' | 'special'>, number>> = {};
  
  let totalTargets = 0;
  shuffledColors.forEach((color) => {
    const count = Math.floor(baseTargets / numColors) + Math.floor(Math.random() * 5);
    targets[color] = count;
    totalTargets += count;
  });

  const moves = Math.max(12, Math.floor(totalTargets / 3) + 2);

  return { moves, targets };
};

const COLOR_CLASSES: Record<BallColor, string> = {
  red: 'bg-gradient-to-br from-[#FF0055] to-[#FF3300]',
  blue: 'bg-gradient-to-br from-[#00D2FF] to-[#0078FF]',
  yellow: 'bg-gradient-to-br from-[#FFFF00] to-[#FFCC00]',
  green: 'bg-gradient-to-br from-[#00FF00] to-[#00CC00]',
  purple: 'bg-gradient-to-br from-[#D400FF] to-[#8000FF]',
  rainbow: 'bg-gradient-to-tr from-red-500 via-green-500 to-blue-500',
  special: 'bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 border-yellow-700',
};

const EFFECT_COLORS: Record<BallColor, string> = {
  red: '#FF0055',
  blue: '#00D2FF',
  yellow: '#FFFF00',
  green: '#00FF00',
  purple: '#D400FF',
  rainbow: '#ffffff',
  special: '#FFFF00',
};

const NEON_GLOWS: Record<BallColor, string> = {
  red: '0 0 15px #FF0055, 0 0 30px rgba(255, 0, 85, 0.6)',
  blue: '0 0 15px #00D2FF, 0 0 30px rgba(0, 210, 255, 0.6)',
  yellow: '0 0 15px #FFFF00, 0 0 30px rgba(255, 255, 0, 0.6)',
  green: '0 0 15px #00FF00, 0 0 30px rgba(0, 255, 0, 0.6)',
  purple: '0 0 15px #D400FF, 0 0 30px rgba(212, 0, 255, 0.6)',
  rainbow: '0 0 15px #ffffff, 0 0 30px rgba(255, 255, 255, 0.6)',
  special: '0 0 15px #FFFF00, 0 0 30px rgba(255, 255, 0, 0.6)',
};

const COMIC_WORDS = ['POP!', 'ZAP!', 'BAM!', 'WHAM!', 'SNAP!', 'PLOP!', 'Biff!', 'Clonk!', 'Thwack!', 'SPLAT!', 'CRACK!', 'FIZZ!', 'ZIP!', 'BOING!', 'KAPOW!', 'WHIZZ!', 'POOF!', 'BOP!', 'DING!', 'PING!'];
const BONUS_WORDS = ['POW-WOW!', 'POW!', 'WOW!', 'BOOM!', 'BANG!', 'SMASH!', 'CRUNCH!', 'KRAK!', 'WHACK!', 'ZONK!', 'THUMP!', 'KRUNCH!', 'VROOOM!', 'CLANG!', 'KRAKOOM!', 'WHAMMO!', 'ZOWIE!'];
const SUPER_WORDS = ['KABOOM!', 'INCREDIBLE!', 'UNSTOPPABLE!', 'MEGA POP!', 'HOLY COW!', 'ULTRA!', 'SUPREME!', 'MONSTER!', 'GODLIKE!', 'EPIC!', 'LEGENDARY!', 'INSANE!', 'COSMIC!', 'ASTONISHING!', 'SPECTACULAR!', 'MIND-BLOWING!'];

const BG_COLORS = [
  '#4facfe', // Level 1 (Blue)
  '#ff4f81', // Level 2 (Pink)
  '#ffcc00', // Level 3 (Yellow)
  '#ff8800', // Level 4 (Orange)
  '#33ff33', // Level 5 (Green)
  '#cc33ff', // Level 6 (Purple)
];

const spawnPowerup = (): PowerupType | undefined => {
  if (Math.random() < 0.12) { // 12% chance for more frequent bonuses
    const r = Math.random();
    if (r < 0.33) return 'moves';
    if (r < 0.66) return 'multiplier';
    return 'bomb';
  }
  return undefined;
};

const generateGrid = (rows: number, cols: number): (Ball | null)[][] => {
  const grid: (Ball | null)[][] = [];
  const colors: BallColor[] = ['red', 'blue', 'yellow', 'green', 'purple'];
  for (let r = 0; r < rows; r++) {
    const row: (Ball | null)[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        id: `${r}-${c}-${Math.random()}`,
        color: colors[Math.floor(Math.random() * colors.length)],
        powerup: spawnPowerup(),
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
  const [moves, setMoves] = useState(generateLevelConfig(0).moves);
  const [targets, setTargets] = useState<Partial<Record<BallColor, number>>>(generateLevelConfig(0).targets);
  const [gameState, setGameState] = useState<'home' | 'playing' | 'won' | 'lost' | 'levelup'>('home');
  const [effects, setEffects] = useState<Effect[]>([]);
  const [shake, setShake] = useState(false);
  const [muted, setMuted] = useState(false);
  const [multiplierTurns, setMultiplierTurns] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboMeter, setComboMeter] = useState(0);
  const [frenzyTurns, setFrenzyTurns] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [splashes, setSplashes] = useState<Splash[]>([]);
  const [showFlash, setShowFlash] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bgColor = gameState === 'home' ? BG_COLORS[0] : BG_COLORS[level % BG_COLORS.length];
    document.body.style.setProperty('--bg-color', bgColor);
  }, [level, gameState]);

  useEffect(() => {
    if (gameState === 'levelup') playLevelUp();
    else if (gameState === 'won') playWin();
    else if (gameState === 'lost') playGameOver();
  }, [gameState]);

  useEffect(() => {
    if (isDragging && selection.length > 0) {
      playSelect(selection.length - 1);
    }
  }, [selection.length, isDragging]);

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
        if (!ball) return prev;

        // Find the target color of the current chain
        let targetColor: BallColor | null = null;
        for (const s of prev) {
          const b = grid[s.r][s.c];
          if (b && b.color !== 'rainbow' && b.color !== 'special') {
            targetColor = b.color;
            break;
          }
        }

        // Logic for connecting:
        // 1. Rainbow can connect to anything.
        // 2. Special can connect if chain length >= 4.
        // 3. If targetColor is null (only rainbows so far), anything can connect.
        // 4. Otherwise, must match targetColor or be rainbow.

        if (ball.color === 'rainbow' || ball.color === 'special') return [...prev, { r, c }];
        
        if (!targetColor || ball.color === targetColor) return [...prev, { r, c }];
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
    const colors: BallColor[] = ['red', 'blue', 'yellow', 'green', 'purple'];

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

  const triggerExplosion = (r: number, c: number, color: string, selection: {r: number, c: number}[], delay: number = 0, customText?: string) => {
    const isBonus = selection.length >= 5;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    setTimeout(() => {
      const cellWidth = rect.width / COLS;
      const cellHeight = rect.height / ROWS;
      const x = c * cellWidth + cellWidth / 2;
      const y = r * cellHeight + cellHeight / 2;

      let text = customText || '';
      if (!text) {
        const length = selection.length;
        
        if (length >= 10) {
          text = SUPER_WORDS[Math.floor(Math.random() * SUPER_WORDS.length)];
        } else if (length >= 5) {
          text = BONUS_WORDS[Math.floor(Math.random() * BONUS_WORDS.length)];
        } else {
          text = COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)];
        }
      }

      const effectColor = EFFECT_COLORS[color as BallColor] || '#ffffff';

      const newEffect: Effect = {
        id: Math.random().toString(),
        x,
        y,
        text,
        color: effectColor,
        isBonus,
        rotation: Math.random() * 40 - 20,
        scale: 0.8 + Math.random() * 0.4
      };

      setEffects(prev => [...prev, newEffect]);
      setTimeout(() => {
        setEffects(prev => prev.filter(e => e.id !== newEffect.id));
      }, isBonus ? 1500 : 800);
    }, delay);
  };

  const spawnParticles = (r: number, c: number, color: string) => {
    // Use percentages (0-100) relative to the grid container
    const px = ((c + 0.5) / COLS) * 100;
    const py = ((r + 0.5) / ROWS) * 100;

    const newParticles: Particle[] = Array.from({ length: 22 }).map(() => ({
      id: Math.random().toString(),
      x: px,
      y: py,
      angle: Math.random() * Math.PI * 2,
      distance: 40 + Math.random() * 80, // Meno esteso
      color: EFFECT_COLORS[color as BallColor] || '#ffffff',
      size: 8 + Math.random() * 25, 
      borderRadius: `${40 + Math.random() * 20}% ${30 + Math.random() * 40}% ${50 + Math.random() * 30}% ${40 + Math.random() * 20}%`
    }));

    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 2600);
  };

  const spawnSplash = (r: number, c: number, color: string) => {
    const px = ((c + 0.5) / COLS) * 100;
    const py = ((r + 0.5) / ROWS) * 100;
    const newSplash: Splash = {
      id: Math.random().toString(),
      x: px,
      y: py,
      color: EFFECT_COLORS[color as BallColor] || '#ffffff',
      rotation: Math.random() * 360,
      scale: 0.7 + Math.random() * 0.6
    };
    setSplashes(prev => [...prev, newSplash]);
    setTimeout(() => {
      setSplashes(prev => prev.filter(s => s.id !== newSplash.id));
    }, 2000);
  };

  const triggerFlash = () => {
    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 50);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (selection.length >= MIN_MATCH && gameState === 'playing') {
      const firstBall = grid[selection[0].r][selection[0].c];
      if (firstBall) {
        let chainColor: BallColor | null = null;
        for (const s of selection) {
          const b = grid[s.r][s.c];
          if (b && b.color !== 'rainbow' && b.color !== 'special') {
            chainColor = b.color;
            break;
          }
        }
        
        // Check powerups
        let addedMoves = 0;
        let activatedMultiplier = false;
        let activatedBomb = false;

        selection.forEach(({ r, c }) => {
          const ball = grid[r][c];
          if (ball?.powerup === 'moves') addedMoves += 3;
          if (ball?.powerup === 'multiplier') activatedMultiplier = true;
          if (ball?.powerup === 'bomb') activatedBomb = true;
        });

        let finalSelection = [...selection];
        if (activatedBomb && chainColor) {
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              const b = grid[r][c];
              if (b && b.color === chainColor && !finalSelection.some(s => s.r === r && s.c === c)) {
                finalSelection.push({ r, c });
              }
            }
          }
        }

        const color = firstBall.color;
        const isBonus = finalSelection.length >= 5;
        const isSuperBonus = finalSelection.length >= 10;

        // Combo logic
        setCombo(c => c + 1);
        let currentComboMeter = comboMeter;
        setComboMeter(prev => {
          const increment = Math.min(30, 8 + (finalSelection.length - 3) * 6);
          const newValue = prev + increment;
          if (newValue >= 100 && frenzyTurns === 0) {
            // FRENZY MODE!
            setFrenzyTurns(3);
            setMoves(m => m + 1);
            triggerExplosion(finalSelection[0].r, finalSelection[0].c, 'special', finalSelection, 600, "FRENZY MODE!");
            triggerExplosion(finalSelection[0].r, finalSelection[0].c, 'special', finalSelection, 800, "5X MULTIPLIER");
            playRainbow();
            return 100; 
          }
          currentComboMeter = Math.min(100, newValue);
          return currentComboMeter;
        });

        // Trigger multiple explosions for more "POW WOW" feel
        if (isSuperBonus) {
          addedMoves += 1; // Give +1 move for 10+ combo
          // Trigger 3 explosions for super bonus
          triggerExplosion(finalSelection[0].r, finalSelection[0].c, color, finalSelection, 0);
          triggerExplosion(finalSelection[Math.floor(finalSelection.length / 2)].r, finalSelection[Math.floor(finalSelection.length / 2)].c, color, finalSelection, 150);
          triggerExplosion(finalSelection[finalSelection.length - 1].r, finalSelection[finalSelection.length - 1].c, color, finalSelection, 300);
          // Show +1 MOVE effect
          triggerExplosion(finalSelection[Math.floor(finalSelection.length / 2)].r, finalSelection[Math.floor(finalSelection.length / 2)].c, 'special', finalSelection, 450, "+1 MOVE!");
        } else if (isBonus) {
          // Trigger 2 explosions for bonus
          triggerExplosion(finalSelection[0].r, finalSelection[0].c, color, finalSelection, 0);
          triggerExplosion(finalSelection[finalSelection.length - 1].r, finalSelection[finalSelection.length - 1].c, color, finalSelection, 200);
        } else {
          // Standard explosion at center
          const centerIdx = Math.floor(finalSelection.length / 2);
          const centerCell = finalSelection[centerIdx];
          triggerExplosion(centerCell.r, centerCell.c, color, finalSelection);
        }
        
        if (isSuperBonus) {
          playRainbow();
        } else if (isBonus) {
          playBonus();
        } else {
          playPop(finalSelection.length);
        }
        
        if (finalSelection.length >= 5) {
          setShake(true);
          setTimeout(() => setShake(false), 300);
        }

        let newGrid = grid.map((row) => [...row]);
        
        // Clear balls
        finalSelection.forEach(({ r, c }) => {
          const ball = grid[r][c];
          if (ball) {
            spawnParticles(r, c, ball.color);
            spawnSplash(r, c, ball.color);
          }
          newGrid[r][c] = null;
        });

        if (isBonus) triggerFlash();

        // Create special/rainbow at the end of ORIGINAL selection
        const lastSelected = selection[selection.length - 1];
        if (isSuperBonus) {
          newGrid[lastSelected.r][lastSelected.c] = { id: `rainbow-${Date.now()}`, color: 'rainbow' };
        } else if (isBonus) {
          newGrid[lastSelected.r][lastSelected.c] = { id: `special-${Date.now()}`, color: 'special' };
        }

        newGrid = applyGravity(newGrid);
        setGrid(newGrid);
        
        // Score calculation
        const baseScore = finalSelection.length * 10;
        
        // Dynamic Multiplier based on meter
        let meterMultiplier = 1 + (currentComboMeter / 50); // 1x to 3x
        if (frenzyTurns > 0) meterMultiplier = 5; // 5x in Frenzy
        
        let bonusMultiplier = isSuperBonus ? 4 : (isBonus ? 2 : 1);
        if (multiplierTurns > 0 || activatedMultiplier) {
          bonusMultiplier *= 2;
        }
        
        const totalMultiplier = meterMultiplier * bonusMultiplier;
        setScore((s) => s + Math.floor(baseScore * totalMultiplier));
        
        const newMoves = moves - 1 + addedMoves;
        setMoves(newMoves);

        if (activatedMultiplier) {
          setMultiplierTurns(3);
        } else if (multiplierTurns > 0) {
          setMultiplierTurns(m => m - 1);
        }

        if (frenzyTurns > 0) {
          setFrenzyTurns(f => {
            if (f === 1) {
              setComboMeter(0); // Reset meter after frenzy
              return 0;
            }
            return f - 1;
          });
        } else {
          // Slow decay if not in frenzy and not a big match
          if (finalSelection.length < 4) {
            setComboMeter(prev => Math.max(0, prev - 5));
          }
        }

        setTargets((prev) => {
          const newTargets = { ...prev };
          
          // Check if rainbow or special was used in the selection
          const usedRainbow = finalSelection.some(s => grid[s.r][s.c]?.color === 'rainbow');
          const usedSpecial = finalSelection.some(s => grid[s.r][s.c]?.color === 'special');

          if (usedRainbow) {
            // Rainbow contributes to ALL targets!
            Object.keys(newTargets).forEach(c => {
              newTargets[c as BallColor] = Math.max(0, newTargets[c as BallColor]! - finalSelection.length);
            });
          } else {
            if (chainColor && newTargets[chainColor] !== undefined) {
              // Special ball doubles the impact on the target!
              const multiplier = usedSpecial ? 2 : 1;
              newTargets[chainColor] = Math.max(0, newTargets[chainColor]! - (finalSelection.length * multiplier));
            }
          }
          
          const isWon = Object.values(newTargets).every(count => count === 0);
          if (isWon) {
            setGameState('levelup');
          } else if (newMoves <= 0) {
            setGameState('lost');
          }
          
          return newTargets;
        });
      } else if (selection.length > 0) {
        // Reset combo on invalid selection
        setCombo(0);
        setComboMeter(prev => Math.max(0, prev - 25));
        setShake(true);
        setTimeout(() => setShake(false), 200);
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
    playClick();
    setGameState('playing');
  };

  const startNextLevel = () => {
    initAudio();
    playClick();
    const nextLevel = level + 1;
    setLevel(nextLevel);
    setGrid(generateGrid(ROWS, COLS));
    const config = generateLevelConfig(nextLevel);
    setMoves(config.moves);
    setTargets(config.targets);
    setGameState('playing');
    setSelection([]);
    setEffects([]);
    setMultiplierTurns(0);
    setCombo(0);
    setComboMeter(0);
    setFrenzyTurns(0);
  };

  const resetGame = () => {
    initAudio();
    playClick();
    setLevel(0);
    setGrid(generateGrid(ROWS, COLS));
    setScore(0);
    const config = generateLevelConfig(0);
    setMoves(config.moves);
    setTargets(config.targets);
    setGameState('playing');
    setSelection([]);
    setEffects([]);
    setMultiplierTurns(0);
    setCombo(0);
    setComboMeter(0);
    setFrenzyTurns(0);
  };

  const goToHome = () => {
    initAudio();
    playClick();
    setGameState('home');
    setLevel(0);
    setScore(0);
    const config = generateLevelConfig(0);
    setMoves(config.moves);
    setTargets(config.targets);
    setGrid(generateGrid(ROWS, COLS));
    setMultiplierTurns(0);
    setCombo(0);
    setComboMeter(0);
    setFrenzyTurns(0);
  };

  const handleToggleMute = () => {
    initAudio();
    const newMuted = toggleMute();
    setMuted(newMuted);
    if (!newMuted) playClick();
  };

  const isSelected = (r: number, c: number) => {
    return selection.some((s) => s.r === r && s.c === c);
  };

  const getSelectionIndex = (r: number, c: number) => {
    return selection.findIndex((s) => s.r === r && s.c === c);
  };

  const isAdjacentToLast = (r: number, c: number) => {
    if (selection.length === 0) return false;
    const last = selection[selection.length - 1];
    return Math.abs(last.r - r) <= 1 && Math.abs(last.c - c) <= 1 && !(last.r === r && last.c === c);
  };

  const getChainColor = () => {
    for (const s of selection) {
      const b = grid[s.r][s.c];
      if (b && b.color !== 'rainbow' && b.color !== 'special') return b.color;
    }
    return null;
  };

  const chainColor = getChainColor();
  const isValidSelection = selection.length >= MIN_MATCH;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-start pt-2 sm:pt-4 p-4 font-sans select-none overflow-hidden relative">
      
      {/* Header Panel */}
      <div className={`w-full max-w-md ${gameState === 'home' ? 'mb-8' : 'mb-2'} z-10 flex flex-col items-center gap-2 transition-all duration-500`}>
        <div className="flex items-center justify-center w-full relative">
          <h1 className={`font-comic ${gameState === 'home' ? 'text-7xl sm:text-8xl' : 'text-5xl sm:text-6xl'} text-[#ffcc00] comic-text tracking-wider transform -rotate-2 transition-all duration-500 animate-float drop-shadow-[4px_4px_0_rgba(0,0,0,1)]`}>
            POP MATCH!
          </h1>
          {gameState !== 'home' && (
            <div className="absolute -top-1 -right-2 bg-white border-2 border-black px-2 py-0.5 rounded transform rotate-12 shadow-[2px_2px_0_0_#000]">
              <span className="font-comic text-sm sm:text-base">LVL {level + 1}</span>
            </div>
          )}
        </div>

        {gameState !== 'home' && (
          <>
            <div className="w-full grid grid-cols-2 gap-3 mt-2">
              {/* Score Panel */}
              <div className="bg-[#ffcc00] border-2 border-black p-1 px-3 transform -rotate-1 shadow-[3px_3px_0_0_#000] flex flex-col">
                <span className="font-comic text-[10px] uppercase text-black/60 leading-none">Score</span>
                <div className="flex items-center justify-between">
                  <span className="font-comic text-xl sm:text-2xl text-black">{score}</span>
                  {multiplierTurns > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1 rounded animate-pulse">2X!</span>
                  )}
                </div>
              </div>

              {/* Moves Panel */}
              <div className={`border-2 border-black p-1 px-3 transform rotate-1 shadow-[3px_3px_0_0_#000] flex flex-col ${moves <= 5 ? 'bg-red-500 animate-pulse' : 'bg-white'}`}>
                <span className="font-comic text-[10px] uppercase opacity-60 leading-none">Moves Left</span>
                <span className={`font-comic text-xl sm:text-2xl ${moves <= 5 ? 'text-white' : 'text-black'}`}>{moves}</span>
              </div>
            </div>

            <div className="flex flex-row gap-2 items-center w-full mt-2">
              {/* Combo Meter */}
              <div className="flex-1">
                <div className={`relative h-5 glass-card rounded-lg overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] ${frenzyTurns > 0 ? 'ring-2 ring-yellow-400' : ''}`}>
                  <motion.div 
                    className={`h-full ${frenzyTurns > 0 ? 'bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400' : 'bg-gradient-to-r from-[#FF0055] via-[#FFFF00] to-[#00FF00]'}`}
                    initial={{ width: 0 }}
                    animate={{ 
                      width: frenzyTurns > 0 ? '100%' : `${comboMeter}%`,
                    }}
                    transition={{ width: { type: 'spring', stiffness: 50, damping: 10 } }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="font-comic text-[8px] sm:text-[10px] text-black font-bold uppercase tracking-widest">
                      {frenzyTurns > 0 ? `FRENZY MODE!` : `COMBO`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Targets Mini Panel */}
              <div className="flex items-center gap-2 bg-white/90 p-1 px-2 border-2 border-black shadow-[2px_2px_0_0_#000] rounded transform rotate-1">
                <span className="font-comic text-[10px] uppercase mr-1">TGT:</span>
                {Object.entries(targets).map(([color, count]) => (
                  <div key={color} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full border border-black ${COLOR_CLASSES[color as BallColor]}`} />
                    <span className="font-comic text-xs">{count}</span>
                  </div>
                ))}
              </div>

              {/* Mute Button */}
              <button 
                onClick={handleToggleMute}
                className="p-1.5 bg-white border-2 border-black rounded shadow-[2px_2px_0_0_#000] active:translate-y-0.5 active:shadow-none transition-all"
              >
                {muted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-red-500"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-black"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Game Board or Home Screen */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {gameState === 'home' ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center flex flex-col items-center z-10"
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

          <div className="bg-red-500 text-white px-4 py-1 rounded-sm border-2 border-black shadow-[4px_4px_0_0_#000] mb-6 transform -rotate-2">
            <span className="font-comic text-xl uppercase tracking-widest">LEVEL {level + 1} START!</span>
          </div>
          
          <div className="space-y-4 mb-8 text-left w-full">
            <div className="bg-white border-2 border-black p-3 transform rotate-1 shadow-[4px_4px_0_0_#000] relative">
              <div className="absolute -top-3 -left-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 border-2 border-black font-comic uppercase">Mission</div>
              <p className="font-comic text-lg leading-tight">Connect 3+ same colors! Hit targets before moves end! 10+ combo for extra moves!</p>
            </div>
          </div>

          <button 
            onClick={startGame}
            className="relative group cursor-pointer"
          >
            <div className="absolute inset-0 bg-black rounded-full transform translate-x-1 translate-y-1" />
            <div className="bg-[#ffcc00] text-black font-comic text-4xl py-5 px-14 rounded-full border-4 border-black hover:-translate-y-1 hover:-translate-x-1 active:translate-y-1 active:translate-x-1 transition-all relative">
              START GAME
            </div>
            <div className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full border-2 border-black transform rotate-12 group-hover:scale-110 transition-transform">
              <span className="font-comic text-xl">GO!</span>
            </div>
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
                          scale: 0, 
                          rotate: 0,
                          opacity: 0,
                          boxShadow: ball ? NEON_GLOWS[ball.color] : 'none',
                          filter: 'brightness(1.5)',
                          transition: { duration: 0.3 }
                        }}
                        transition={{ 
                          type: 'spring', 
                          stiffness: 400, 
                          damping: 18,
                          mass: 0.8
                        }}
                        className={`
                          absolute inset-1 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                          ${ball.color === 'special' ? 'rounded-lg rotate-45 border-[3px]' : 'rounded-full border-[3px]'}
                          ${COLOR_CLASSES[ball.color]}
                          ${isSelected(r, c) ? 'scale-110 z-10 brightness-110 shadow-xl' : 'hover:brightness-110'}
                          cursor-pointer transition-all duration-100 pointer-events-none
                          ${(ball.color === 'rainbow' || ball.color === 'special') ? 'animate-pulse' : ''}
                          ${isDragging && isAdjacentToLast(r, c) && (ball.color === 'rainbow' || ball.color === 'special' || !chainColor || ball.color === chainColor) ? 'ring-4 ring-white ring-opacity-70 scale-105' : ''}
                        `}
                        style={{
                          boxShadow: isSelected(r, c) ? NEON_GLOWS[ball.color] : 'none'
                        }}
                      >
                        <motion.div 
                          className="absolute inset-0 rounded-full"
                          animate={isSelected(r, c) ? { scale: 1.1 } : { scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        />
                        {/* Glossy Reflection */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                        <div className="absolute top-[10%] left-[15%] w-[30%] h-[20%] bg-white/40 rounded-full blur-[1px] transform rotate-[-20deg]" />
                        <div className="absolute bottom-[5%] right-[10%] w-[40%] h-[40%] bg-black/10 rounded-full blur-[2px]" />
                        
                        {ball.color === 'special' && (
                          <div className="absolute inset-0 flex items-center justify-center -rotate-45">
                            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </div>
                        )}
                        {ball.color === 'rainbow' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3/4 h-3/4 border-2 border-white/50 rounded-full animate-spin-slow" />
                          </div>
                        )}
                        
                        {/* Powerup Indicators */}
                        {ball.powerup === 'moves' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-comic text-white text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">+3</span>
                          </div>
                        )}
                        {ball.powerup === 'multiplier' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-comic text-white text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">2x</span>
                          </div>
                        )}
                        {ball.powerup === 'bomb' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="black" className="w-6 h-6 drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
                              <path d="M11.25 2.25A.75.75 0 0 0 10.5 3v1.5a.75.75 0 0 0 1.5 0V3a.75.75 0 0 0-.75-.75ZM15.864 4.575a.75.75 0 0 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM7.076 5.635a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 0 0-1.06 1.06l1.06 1.06ZM11.25 7.5a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM9 12.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0Z" />
                            </svg>
                          </div>
                        )}

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
          <div className="absolute inset-0 pointer-events-none overflow-visible z-50">
            <AnimatePresence>
              {effects.map(effect => (
                <motion.div
                  key={effect.id}
                  initial={{ scale: 0, opacity: 0, rotate: effect.rotation - 20 }}
                  animate={{ 
                    scale: effect.isBonus ? [0, 2 * effect.scale, 1.5 * effect.scale] : [0, 1.5 * effect.scale, 1.2 * effect.scale], 
                    opacity: [0, 1, 1, 0], 
                    rotate: effect.isBonus ? [effect.rotation, effect.rotation + 15, effect.rotation - 15, effect.rotation] : effect.rotation 
                  }}
                  transition={{ duration: 0.6, times: [0, 0.2, 0.8, 1] }}
                  exit={{ opacity: 0 }}
                  style={{ 
                    position: 'absolute',
                    left: effect.x,
                    top: effect.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="flex items-center justify-center"
                >
                  <svg width={effect.isBonus ? "240" : "140"} height={effect.isBonus ? "240" : "140"} viewBox="0 0 100 100" className="absolute">
                    <path 
                      d="M50 5 L62 38 L95 30 L78 52 L98 78 L65 70 L52 95 L38 70 L5 78 L25 52 L5 30 L38 38 Z" 
                      fill={effect.color} 
                      stroke="black" 
                      strokeWidth="4"
                    />
                    {effect.isBonus && (
                      <path 
                        d="M50 15 L58 42 L85 35 L72 52 L88 72 L62 65 L50 85 L38 65 L12 72 L28 52 L15 35 L42 42 Z" 
                        fill="white" 
                        fillOpacity="0.3" 
                      />
                    )}
                  </svg>
                  <span className={`font-comic ${effect.isBonus ? 'text-4xl' : 'text-3xl'} text-white comic-text relative z-10 whitespace-nowrap`}>
                    {effect.text}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>


          {/* Screen Flash */}
          <AnimatePresence>
            {showFlash && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.05 }}
                className="absolute inset-0 bg-white z-[100] pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Selection Status Overlay */}
          {isDragging && (selection.length > 0) && (
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

          {/* Splashes Layer - Behind everything else */}
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
            <AnimatePresence>
              {splashes.map(s => (
                <motion.div
                  key={s.id}
                  initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%', rotate: s.rotation }}
                  animate={{ scale: s.scale, opacity: [0, 0.4, 0] }}
                  transition={{ 
                    duration: 1.8, 
                    times: [0, 0.1, 1],
                    ease: "easeOut" 
                  }}
                  style={{ 
                    position: 'absolute',
                    width: 120,
                    height: 120,
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    color: s.color,
                  }}
                >
                  <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full opacity-60">
                    <path d="M50,10 C65,5 85,15 90,35 C95,55 85,75 65,85 C45,95 15,90 5,70 C-5,50 15,20 35,10 C40,8 45,12 50,10 Z" />
                    <circle cx="20" cy="20" r="5" />
                    <circle cx="80" cy="15" r="4" />
                    <circle cx="90" cy="60" r="6" />
                    <circle cx="15" cy="85" r="5" />
                  </svg>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Particles Layer - Percentage Based */}
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-[110]">
            <AnimatePresence>
              {particles.map(p => (
                <motion.div
                  key={p.id}
                  initial={{ x: '-50%', y: '-50%', scale: 0.5, opacity: 1 }}
                  animate={{ 
                    x: `calc(-50% + ${Math.cos(p.angle) * p.distance}px)`,
                    y: `calc(-50% + ${Math.sin(p.angle) * p.distance + 120}px)`,
                    scale: [0.5, 1, 0],
                    opacity: [1, 1, 0]
                  }}
                  transition={{ 
                    duration: 3, 
                    ease: "circOut",
                    times: [0, 0.1, 1]
                  }}
                  style={{ 
                    position: 'absolute',
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    borderRadius: p.borderRadius,
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    boxShadow: `inset -2px -2px 6px rgba(0,0,0,0.2), inset 2px 2px 6px rgba(255,255,255,0.3)`,
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
      </div>

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
              initial={{ scale: 0.5, y: 100, rotate: -5 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
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
