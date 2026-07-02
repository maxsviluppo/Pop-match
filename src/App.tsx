import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Logo from './components/Logo';

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

interface Splash {
  id: string;
  dx: number;
  dy: number;
  size: number;
  rotation: number;
  color: string;
}

interface PopParticle {
  id: string;
  dx: number;
  dy: number;
  size: number;
  color: string;
  shape: 'circle' | 'star' | 'bubble';
}

interface JuicePopEffect {
  id: string;
  x: number;
  y: number;
  scoreText: string;
  color: string;
  rotation: number;
  scale: number;
  splashes: Splash[];
  particles: PopParticle[];
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
  red: 'bg-[#ff3366]',
  blue: 'bg-[#33ccff]',
  yellow: 'bg-[#ffcc00]',
  green: 'bg-[#33ff33]',
  purple: 'bg-[#cc33ff]',
  rainbow: 'bg-gradient-to-tr from-red-500 via-green-500 to-blue-500',
  special: 'bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 border-yellow-700',
};

const EFFECT_COLORS: Record<BallColor, string> = {
  red: '#ff3366',
  blue: '#33ccff',
  yellow: '#ffcc00',
  green: '#33ff33',
  purple: '#cc33ff',
  rainbow: '#ffffff',
  special: '#ffcc00',
};

const COMIC_WORDS = ['POP!', 'ZAP!', 'BAM!', 'WHAM!', 'SNAP!', 'PLOP!', 'Biff!', 'Clonk!', 'Thwack!', 'SPLAT!', 'CRACK!', 'FIZZ!', 'ZIP!', 'BOING!', 'KAPOW!', 'WHIZZ!', 'POOF!', 'BOP!', 'DING!', 'PING!'];
const BONUS_WORDS = ['POW-WOW!', 'POW!', 'WOW!', 'BOOM!', 'BANG!', 'SMASH!', 'CRUNCH!', 'KRAK!', 'WHACK!', 'ZONK!', 'THUMP!', 'KRUNCH!', 'VROOOM!', 'CLANG!', 'KRAKOOM!', 'WHAMMO!', 'ZOWIE!'];
const SUPER_WORDS = ['KABOOM!', 'INCREDIBLE!', 'UNSTOPPABLE!', 'MEGA POP!', 'HOLY COW!', 'ULTRA!', 'SUPREME!', 'MONSTER!', 'GODLIKE!', 'EPIC!', 'LEGENDARY!', 'INSANE!', 'COSMIC!', 'ASTONISHING!', 'SPECTACULAR!', 'MIND-BLOWING!'];

const LEVEL_PALETTES = [
  { bg: '#a3f0ff', ray: '#52daff' }, // Level 1 (Sky Blue)
  { bg: '#ffb5d4', ray: '#ff66a3' }, // Level 2 (Pink)
  { bg: '#ffe89c', ray: '#ffcc00' }, // Level 3 (Retro Yellow)
  { bg: '#ffc39c', ray: '#ff7733' }, // Level 4 (Warm Orange)
  { bg: '#b8ffb8', ray: '#4ade80' }, // Level 5 (Bright Green)
  { bg: '#e5b8ff', ray: '#b35cff' }, // Level 6 (Lively Purple)
  { bg: '#ff9e9e', ray: '#ff3b3b' }, // Level 7 (Retro Red)
  { bg: '#b3ffe4', ray: '#2dd4bf' }, // Level 8 (Vibrant Teal)
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
  const [poppedBallIds, setPoppedBallIds] = useState<Set<string>>(() => new Set());
  const [juicePops, setJuicePops] = useState<JuicePopEffect[]>([]);

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const palette = LEVEL_PALETTES[(gameState === 'home' ? 0 : level) % LEVEL_PALETTES.length];
    document.body.style.setProperty('--bg-color', palette.bg);
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
        
        // Find and store the IDs of the cleared balls so we only apply Squash & Stretch on them
        const poppedIds = finalSelection
          .map(({ r, c }) => grid[r][c]?.id)
          .filter(Boolean) as string[];

        setPoppedBallIds(prev => {
          const next = new Set(prev);
          poppedIds.forEach(id => next.add(id));
          return next;
        });

        // Clear balls
        finalSelection.forEach(({ r, c }) => {
          newGrid[r][c] = null;
        });

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
        const totalPointsEarned = Math.floor(baseScore * totalMultiplier);
        setScore((s) => s + totalPointsEarned);

        // Spawn beautiful and huge "Juice UI Pop" effects for each cleared bubble
        const rect = gridRef.current?.getBoundingClientRect();
        if (rect) {
          const cellWidth = rect.width / COLS;
          const cellHeight = rect.height / ROWS;
          // Distribute total points evenly across popped bubbles
          const pointsPerBubble = Math.max(10, Math.floor(totalPointsEarned / finalSelection.length));

          const newJuicePops = finalSelection.map(({ r, c }) => {
            const ball = grid[r][c];
            const ballColor = ball ? ball.color : 'yellow';
            const effectColor = EFFECT_COLORS[ballColor] || '#ffffff';
            const x = c * cellWidth + cellWidth / 2;
            const y = r * cellHeight + cellHeight / 2;

            // Generate 5 to 7 extremely large comic droplets ("colliri") radiating outwards
            const splashesCount = 5 + Math.floor(Math.random() * 3);
            const splashes = Array.from({ length: splashesCount }).map((_, i) => {
              const angle = (i * (360 / splashesCount)) + (Math.random() * 30 - 15);
              const angleRad = (angle * Math.PI) / 180;
              // Very large sizes: 32px to 54px for spectacular juiciness!
              const size = 32 + Math.random() * 22;
              const distance = 80 + Math.random() * 90;
              const dx = Math.cos(angleRad) * distance;
              const dy = Math.sin(angleRad) * distance;

              return {
                id: `splash-${r}-${c}-${i}-${Math.random()}`,
                dx,
                dy,
                size,
                rotation: Math.random() * 360,
                color: effectColor,
              };
            });

            // Generate 12 to 16 beautiful lingering micro-particles (sparkles, circles, mini-bubbles)
            const particlesCount = 12 + Math.floor(Math.random() * 5);
            const particles = Array.from({ length: particlesCount }).map((_, i) => {
              const angle = Math.random() * 360;
              const angleRad = (angle * Math.PI) / 180;
              // Reduced travel distance so particles form a lovely, dense burst rather than flying off too fast
              const distance = 45 + Math.random() * 65;
              const dx = Math.cos(angleRad) * distance;
              const dy = Math.sin(angleRad) * distance;
              const size = 11 + Math.random() * 11; // sizes from 11px to 22px
              const shapes: ('circle' | 'star' | 'bubble')[] = ['circle', 'star', 'bubble'];
              const shape = shapes[Math.floor(Math.random() * shapes.length)];
              const colorRand = Math.random();
              // Varied colors: 40% white sparkle, 40% primary bubble juice color, 20% golden energy
              const color = colorRand < 0.4 ? '#ffffff' : (colorRand < 0.8 ? effectColor : '#ffe033');

              return {
                id: `particle-${r}-${c}-${i}-${Math.random()}`,
                dx,
                dy,
                size,
                color,
                shape,
              };
            });

            return {
              id: `juice-${r}-${c}-${Math.random()}`,
              x,
              y,
              scoreText: `+${pointsPerBubble}`,
              color: effectColor,
              rotation: Math.random() * 30 - 15,
              scale: 1.0 + Math.random() * 0.3,
              splashes,
              particles,
            };
          });

          setJuicePops(prev => [...prev, ...newJuicePops]);

          // Auto cleanup after the animation finishes
          setTimeout(() => {
            const idsToRemove = new Set(newJuicePops.map(p => p.id));
            setJuicePops(prev => prev.filter(p => !idsToRemove.has(p.id)));
          }, 2200);
        }
        
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
    setPoppedBallIds(new Set());
    setJuicePops([]);
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
    setPoppedBallIds(new Set());
    setJuicePops([]);
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
    setPoppedBallIds(new Set());
    setJuicePops([]);
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
    setPoppedBallIds(new Set());
    setJuicePops([]);
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
  const currentPalette = LEVEL_PALETTES[(gameState === 'home' ? 0 : level) % LEVEL_PALETTES.length];

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-start pt-2 sm:pt-4 p-4 font-sans select-none overflow-hidden relative">
      
      {/* 70s Retro spinning sunburst background rays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0" style={{ backgroundColor: currentPalette.bg }} />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220vmax] h-[220vmax] origin-center animate-spin-slow"
          style={{
            animationDuration: gameState === 'levelup' ? '0.6s' : '24s',
            transition: 'animation-duration 2.5s cubic-bezier(0.25, 1, 0.5, 1)'
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full opacity-55">
            <g fill={currentPalette.ray}>
              {Array.from({ length: 18 }).map((_, i) => {
                const angle1 = (i * 360) / 18;
                const angle2 = ((i + 0.5) * 360) / 18;
                const r = 100;
                const x1 = 50 + r * Math.cos((angle1 * Math.PI) / 180);
                const y1 = 50 + r * Math.sin((angle1 * Math.PI) / 180);
                const x2 = 50 + r * Math.cos((angle2 * Math.PI) / 180);
                const y2 = 50 + r * Math.sin((angle2 * Math.PI) / 180);
                return (
                  <path
                    key={i}
                    d={`M 50,50 L ${x1},${y1} L ${x2},${y2} Z`}
                  />
                );
              })}
            </g>
          </svg>
        </div>
        {/* Subtle comic dot grid overlay */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(rgba(0,0,0,0.15) 1.5px, transparent 1.5px)',
            backgroundSize: '16px 16px'
          }}
        />
      </div>

      {/* Header */}
      {gameState === 'home' ? (
        <div className="w-full max-w-md mb-4 sm:mb-6 flex flex-col items-center text-center z-10 transition-all duration-500">
          <div className="flex flex-col items-center w-full">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-36 sm:w-40 my-2"
                whileHover={{ scale: 1.05, rotate: -4 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  y: [0, -6, 0],
                }}
                transition={{
                  y: {
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut"
                  }
                }}
              >
                <Logo />
              </motion.div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md mb-2 sm:mb-3 flex flex-col z-10 transition-all duration-500">
          {/* Row 1: Logo, level, targets & controls */}
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <motion.div
                className="w-14 sm:w-18 cursor-pointer"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: -2 }}
                whileHover={{ scale: 1.15, rotate: -8 }}
                whileTap={{ scale: 0.85, rotate: 4 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 12,
                  mass: 0.8
                }}
                onClick={goToHome}
              >
                <Logo />
              </motion.div>
              <div className="transform rotate-2 shrink-0 flex items-center gap-2 select-none">
                <div className="flex items-baseline font-comic font-black tracking-wide">
                  <span 
                    className="text-[#52daff] text-base sm:text-lg uppercase"
                    style={{
                      textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 2px 2px 0 #000'
                    }}
                  >
                    LIV.
                  </span>
                  <span 
                    className="text-[#ffe270] text-3xl sm:text-4xl ml-1"
                    style={{
                      textShadow: '1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 3.5px 3.5px 0 #000'
                    }}
                  >
                    {level + 1}
                  </span>
                </div>
                <AnimatePresence>
                  {isDragging && selection.length > 0 && (
                    <motion.div 
                      initial={{ scale: 0, width: 0 }}
                      animate={{ scale: 1, width: 'auto' }}
                      exit={{ scale: 0, width: 0 }}
                      className={`px-1 sm:px-1.5 py-0.5 rounded-md text-white font-comic text-[10px] sm:text-xs font-bold border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 shrink-0 ${
                        isValidSelection ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                      }`}
                    >
                      <span>{selection.length}</span>
                      <span className="text-[8px] leading-none">{isValidSelection ? '✓' : `MIN3`}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Controls (Cartoon icons, no button background, 3D cartoon style with vivid colors and black borders, no separator) */}
            <div className="flex items-center gap-2 transform -rotate-1">
              <button 
                onClick={goToHome}
                className="bg-transparent hover:scale-110 active:scale-95 transition-transform duration-150 p-1"
                title="Home"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                  {/* 3D depth offset layer */}
                  <g transform="translate(2, 2.5)">
                    <polygon points="16,2 3,13 6,13 6,26 26,26 26,13 29,13" fill="#1e1e24" stroke="#1e1e24" strokeWidth="1.5" strokeLinejoin="round" />
                    <rect x="15" y="4" width="4" height="6" fill="#1e1e24" stroke="#1e1e24" strokeWidth="1.5" strokeLinejoin="round" />
                  </g>
                  {/* Main Foreground Cartoon House */}
                  {/* Chimney */}
                  <rect x="15" y="4" width="4" height="6" fill="#ff5c8a" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
                  <ellipse cx="17" cy="4" rx="2" ry="0.75" fill="#333" stroke="#000" strokeWidth="1.5" />
                  {/* House Body */}
                  <rect x="6" y="13" width="20" height="13" fill="#ffe270" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
                  {/* Roof */}
                  <polygon points="16,2 2,13 30,13" fill="#ff3b6f" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
                  {/* Roof highlight */}
                  <polygon points="16,4 5,12 8,12 16,5" fill="#ff80a4" />
                  {/* Door */}
                  <rect x="13" y="18" width="6" height="8" fill="#42cbf5" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
                  <circle cx="15" cy="22" r="1" fill="#fff" stroke="#000" strokeWidth="1.5" />
                </svg>
              </button>
              <button 
                onClick={handleToggleMute}
                className="bg-transparent hover:scale-110 active:scale-95 transition-transform duration-150 p-1"
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                    {/* 3D depth offset layer */}
                    <g transform="translate(2, 2.5)">
                      <path d="M4 11h6l7-5v20l-7-5H4V11z" fill="#1e1e24" stroke="#1e1e24" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M21 11 L 28 18 M 28 11 L 21 18" stroke="#1e1e24" strokeWidth="5.5" strokeLinecap="round" />
                    </g>
                    {/* Front Speaker Box (Muted / Red-Pink) */}
                    <path d="M4 11h6l7-5v20l-7-5H4V11z" fill="#ff4f81" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
                    {/* Gloss highlight */}
                    <path d="M5 12h4l4.5-3v1" fill="#ffaec3" />
                    {/* Front Mute Cross (X) */}
                    <path d="M21 11 L 28 18" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />
                    <path d="M21 11 L 28 18" stroke="#ffcc00" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M28 11 L 21 18" stroke="#000" strokeWidth="4.5" strokeLinecap="round" />
                    <path d="M28 11 L 21 18" stroke="#ffcc00" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                    {/* 3D depth offset layer */}
                    <g transform="translate(2, 2.5)">
                      <path d="M4 11h6l7-5v20l-7-5H4V11z" fill="#1e1e24" stroke="#1e1e24" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M21 11 A 7 7 0 0 1 21 21" stroke="#1e1e24" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                      <path d="M26 7 A 13 13 0 0 1 26 25" stroke="#1e1e24" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                    </g>
                    {/* Front Speaker Box */}
                    <path d="M4 11h6l7-5v20l-7-5H4V11z" fill="#4ade80" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
                    {/* Gloss highlight */}
                    <path d="M5 12h4l4.5-3v1" fill="#9effc1" />
                    {/* Wave 1 (Inner) */}
                    <path d="M21 11 A 7 7 0 0 1 21 21" stroke="#000" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                    <path d="M21 11 A 7 7 0 0 1 21 21" stroke="#ffcc00" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    {/* Wave 2 (Outer) */}
                    <path d="M26 7 A 13 13 0 0 1 26 25" stroke="#000" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                    <path d="M26 7 A 13 13 0 0 1 26 25" stroke="#ff3366" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Score & Moves (Enlarged, labeled-free 3D cartoon styled numbers, centered 2X spiky bubble) */}
          <div className="flex justify-between items-center w-full -mt-2 sm:-mt-3 px-1 relative min-h-[50px]">
            {/* Score (Left) */}
            <motion.div 
              animate={multiplierTurns > 0 ? {
                textShadow: [
                  '1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 3px 3px 0 #000',
                  '1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 3px 3px 10px rgba(255,204,0,1)',
                  '1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 3px 3px 0 #000'
                ]
              } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
              className="font-comic text-3xl sm:text-4xl flex items-center select-none"
              style={{
                color: '#ffe270',
                textShadow: '1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 3px 3px 0 #000'
              }}
            >
              <motion.span
                key={score}
                initial={{ scale: 1.35 }}
                animate={{ 
                  scale: [1.35, 0.82, 1.18, 0.92, 1.05, 0.98, 1] 
                }}
                transition={{ 
                  duration: 0.5,
                  ease: "easeOut"
                }}
              >
                {score}
              </motion.span>
            </motion.div>

            {/* Active Multiplier Spiky Speech Bubble (Center) */}
            <div className="flex-1 flex justify-center items-center px-2 min-w-0">
              <AnimatePresence>
                {multiplierTurns > 0 && (
                  <motion.div
                    key="multiplier-badge"
                    initial={{ scale: 0, opacity: 0, rotate: -15 }}
                    animate={{ 
                      scale: [1, 1.1, 0.98, 1.05, 1],
                      rotate: [-3, 3, -2, 2, -3]
                    }}
                    exit={{ scale: 0, opacity: 0, rotate: 15 }}
                    transition={{
                      scale: { 
                        type: "tween", 
                        ease: "easeInOut", 
                        repeat: Infinity, 
                        duration: 1.4 
                      },
                      rotate: { 
                        type: "tween", 
                        ease: "easeInOut", 
                        repeat: Infinity, 
                        duration: 2.2 
                      },
                      opacity: { 
                        type: "spring", 
                        stiffness: 350, 
                        damping: 15 
                      }
                    }}
                    className="relative select-none transform hover:scale-110 active:scale-95 transition-transform duration-150"
                  >
                    {/* Spiky 3D Cartoon Speech Bubble */}
                    <svg 
                      viewBox="0 0 160 70" 
                      className="w-32 h-14 sm:w-40 sm:h-17 overflow-visible filter drop-shadow-[1px_2px_0px_rgba(0,0,0,1)]"
                    >
                      {/* 3D shadow depth layer */}
                      <path 
                        d="M 80,5 L 98,18 L 125,8 L 118,28 L 152,18 L 135,38 L 155,54 L 122,50 L 110,67 L 92,52 L 72,67 L 60,49 L 28,60 L 40,36 L 8,32 L 38,22 L 20,6 L 58,18 Z" 
                        fill="#1e1e24" 
                        transform="translate(3, 3.5)"
                      />
                      {/* Foreground starburst with vivid orange-yellow cartoon color */}
                      <path 
                        d="M 80,5 L 98,18 L 125,8 L 118,28 L 152,18 L 135,38 L 155,54 L 122,50 L 110,67 L 92,52 L 72,67 L 60,49 L 28,60 L 40,36 L 8,32 L 38,22 L 20,6 L 58,18 Z" 
                        fill="#ff3b6f" 
                        stroke="#000" 
                        strokeWidth="3.5" 
                        strokeLinejoin="round"
                      />
                      {/* Inner gold highlight spike layer for extra 3D pop */}
                      <path 
                        d="M 80,9 L 95,20 L 118,12 L 112,30 L 140,21 L 127,38 L 142,50 L 116,46 L 106,59 L 90,47 L 74,59 L 63,44 L 34,53 L 44,33 L 17,30 L 42,21 L 27,10 L 59,20 Z" 
                        fill="#ffcc00" 
                        stroke="#000" 
                        strokeWidth="1.5" 
                        strokeLinejoin="round"
                      />
                      {/* Glossy top highlight */}
                      <path 
                        d="M 30,12 Q 50,5 80,7 Q 110,5 130,12" 
                        stroke="#fff" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        fill="none" 
                        opacity="0.65"
                      />
                      {/* Double Score Warning Label */}
                      <text 
                        x="80" 
                        y="41" 
                        textAnchor="middle" 
                        className="font-comic font-black fill-white text-[15px] select-none tracking-tight"
                        style={{
                          stroke: '#000000',
                          strokeWidth: '4px',
                          paintOrder: 'stroke fill'
                        }}
                      >
                        2X ACTIVE
                      </text>
                    </svg>
                    {/* Tiny animated sparkles */}
                    <div className="absolute top-0 right-1 w-2.5 h-2.5 bg-white border-2 border-black rounded-full animate-ping" />
                    <div className="absolute -bottom-1 left-2 w-2 h-2 bg-yellow-300 border-2 border-black rounded-full animate-bounce" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Moves (Right) */}
            <motion.div 
              key={moves}
              initial={{ scale: 1.35 }}
              animate={{ 
                scale: [1.35, 0.82, 1.18, 0.92, 1.05, 0.98, 1] 
              }}
              transition={{ 
                duration: 0.5,
                ease: "easeOut"
              }}
              className={`font-comic text-3xl sm:text-4xl select-none ${moves <= 5 ? 'animate-pulse' : ''}`}
              style={{
                color: moves <= 5 ? '#ff3b3b' : '#52daff',
                textShadow: '1.5px 1.5px 0 #000, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 3px 3px 0 #000'
              }}
            >
              {moves}
            </motion.div>
          </div>



          {/* Row 4: Targets (no background plate, same size as grid bubble balls, with count inside) */}
          <div className="w-full flex justify-center items-center gap-3.5 mt-2.5 px-1 min-h-[44px]">
            <AnimatePresence mode="popLayout">
              {(Object.entries(targets) as [BallColor, number][])
                .filter(([_, count]) => count > 0)
                .map(([color, count], index) => (
                  <motion.div
                    key={color}
                    layout
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      y: [0, -6, 0, 6, 0],
                      rotate: [0, 2.5, 0, -2.5, 0],
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ 
                      scale: { type: 'spring', stiffness: 300, damping: 20 },
                      opacity: { type: 'spring', stiffness: 300, damping: 20 },
                      layout: { type: 'spring', stiffness: 300, damping: 20 },
                      y: {
                        duration: 2.2 + (index * 0.4) % 1.5,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeInOut",
                        delay: index * 0.15,
                      },
                      rotate: {
                        duration: 2.2 + (index * 0.4) % 1.5,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeInOut",
                        delay: index * 0.15,
                      }
                    }}
                    className={`
                      w-11 h-11 sm:w-13 sm:h-13 rounded-full border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                      relative flex items-center justify-center ${COLOR_CLASSES[color as BallColor]}
                    `}
                  >
                    {/* Retro bubble highlights */}
                    <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-white rounded-full opacity-55 pointer-events-none" />
                    <motion.div
                      key={count}
                      initial={{ scale: 1.35 }}
                      animate={{ 
                        scale: [1.35, 0.82, 1.18, 0.92, 1.05, 0.98, 1] 
                      }}
                      transition={{ 
                        duration: 0.5,
                        ease: "easeOut"
                      }}
                      className="flex items-center justify-center"
                    >
                      <span className="font-comic text-base sm:text-lg font-bold text-white drop-shadow-[0_2px_2.5px_rgba(0,0,0,0.85)] leading-none select-none">
                        {count}
                      </span>
                    </motion.div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Game Board or Home Screen */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {gameState === 'home' ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-4 sm:p-6 rounded-2xl comic-border max-w-sm w-full text-center flex flex-col items-center z-10"
          >
            <div className="relative mb-6">
              <div className="absolute -top-6 -left-6 w-14 h-14 bg-[#ff3366] rounded-full comic-border transform -rotate-12 flex items-center justify-center">
                <span className="font-comic text-white text-base comic-text">POP!</span>
              </div>
              <div className="absolute -bottom-6 -right-6 w-16 h-16 bg-[#ffcc00] rounded-full comic-border transform rotate-12 flex items-center justify-center">
                <span className="font-comic text-white text-base comic-text">MATCH!</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-3 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                {['red', 'blue', 'yellow', 'green', 'purple', 'red'].map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-black ${COLOR_CLASSES[c as BallColor]} shadow-md`} />
                ))}
              </div>
            </div>

            <h2 className="font-comic text-2xl sm:text-3xl mb-1 comic-text text-black uppercase">READY TO POP?</h2>
            <div className="bg-gray-100 px-4 py-0.5 rounded-full comic-border mb-3">
              <span className="font-comic text-lg text-gray-600">CURRENT LEVEL: {level + 1}</span>
            </div>
            
            <div className="space-y-2 mb-4 text-left w-full">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs shrink-0">1</div>
                <p className="font-comic text-base">Connect 3+ same colors</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs shrink-0">2</div>
                <p className="font-comic text-base">Reach targets before moves end</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-xs shrink-0">3</div>
                <p className="font-comic text-base">Connect 6+ for BIG BONUS!</p>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="bg-[#ffcc00] text-black font-comic text-2xl sm:text-3xl py-2 sm:py-3 px-8 rounded-full comic-border hover:bg-[#ffe066] hover:-translate-y-0.5 active:translate-y-0.5 transition-all w-full"
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
            {/* Frenzy Overlay Text */}
            <AnimatePresence>
              {frenzyTurns > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                  animate={{ opacity: 0.2, scale: 1.2, rotate: 10 }}
                  exit={{ opacity: 0, scale: 2 }}
                  transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
                >
                  <span className="font-comic text-8xl text-yellow-400 comic-text opacity-30 select-none">
                    FRENZY!
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

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
                        exit={poppedBallIds.has(ball.id) ? { 
                          scaleX: [1, 1.45, 0.5, 1.8, 0],
                          scaleY: [1, 0.5, 1.45, 1.8, 0],
                          rotate: [0, -15, 15, -5, 0],
                          filter: [
                            'brightness(1)',
                            'brightness(1.25)',
                            'brightness(1.75)',
                            'brightness(3.4) drop-shadow(0 0 16px rgba(255,255,255,1))',
                            'brightness(3.4)'
                          ],
                          opacity: [1, 1, 1, 1, 0],
                          transition: { 
                            type: 'keyframes',
                            duration: 0.9,
                            times: [0, 0.25, 0.5, 0.8, 1],
                            ease: "easeInOut"
                          }
                        } : {
                          scale: 0,
                          opacity: 0,
                          transition: { duration: 0.12 }
                        }}
                        transition={{ 
                          type: 'spring', 
                          stiffness: 300, 
                          damping: 25
                        }}
                        className={`
                          absolute inset-1 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                          ${ball.color === 'special' ? 'rounded-lg rotate-45 border-[3px]' : 'rounded-full border-[3px]'}
                          ${COLOR_CLASSES[ball.color]}
                          ${isSelected(r, c) ? 'scale-110 z-10 brightness-110' : 'hover:brightness-110'}
                          cursor-pointer transition-all duration-100 pointer-events-none
                          ${(ball.color === 'rainbow' || ball.color === 'special') ? 'animate-pulse' : ''}
                          ${isDragging && isAdjacentToLast(r, c) && (ball.color === 'rainbow' || ball.color === 'special' || !chainColor || ball.color === chainColor) ? 'ring-4 ring-white ring-opacity-70 scale-105' : ''}
                        `}
                      >
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
                        {ball.powerup === 'bomb' ? (
                          <>
                            {/* 3D Metal collar/cap */}
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4.5 h-3 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-500 border-2 border-black rounded-t-md z-10" />
                            
                            {/* Curved fuse with burning/sparkling star effect */}
                            <div className="absolute -top-6 left-1/2 w-10 h-7 overflow-visible pointer-events-none z-0">
                              <svg viewBox="0 0 40 28" className="w-full h-full overflow-visible">
                                {/* Fuse line shadow */}
                                <path 
                                  d="M 12,24 C 14,14 24,10 28,6" 
                                  stroke="#000" 
                                  strokeWidth="4" 
                                  strokeLinecap="round" 
                                  fill="none" 
                                />
                                {/* Fuse line */}
                                <path 
                                  d="M 12,24 C 14,14 24,10 28,6" 
                                  stroke="#e5c158" 
                                  strokeWidth="2.5" 
                                  strokeLinecap="round" 
                                  fill="none" 
                                />
                                {/* Fuse segment pattern */}
                                <path 
                                  d="M 12,24 C 14,14 24,10 28,6" 
                                  stroke="#8c6239" 
                                  strokeWidth="2.5" 
                                  strokeDasharray="2,2" 
                                  strokeLinecap="round" 
                                  fill="none" 
                                />
                                
                                {/* Animated burning spark at tip of fuse (28,6) */}
                                <motion.g
                                  animate={{
                                    scale: [1, 1.4, 0.9, 1.3, 1],
                                    rotate: [0, 45, 90, 135, 180]
                                  }}
                                  transition={{ repeat: Infinity, duration: 0.35 }}
                                  style={{ transformOrigin: '28px 6px' }}
                                >
                                  {/* Outer blazing red-pink sparks */}
                                  <path d="M 28,6 L 28,-2 M 28,6 L 28,14 M 28,6 L 20,6 M 28,6 L 36,6 M 28,6 L 22,0 M 28,6 L 34,12 M 28,6 L 22,12 M 28,6 L 34,0" stroke="#ff3b6f" strokeWidth="2.5" strokeLinecap="round" />
                                  {/* Inner blazing yellow-white sparks */}
                                  <path d="M 28,6 L 28,0 M 28,6 L 28,12 M 28,6 L 22,6 M 28,6 L 34,6 M 28,6 L 23,1 M 28,6 L 33,11 M 28,6 L 23,11 M 28,6 L 33,1" stroke="#ffe270" strokeWidth="1.5" strokeLinecap="round" />
                                  <circle cx="28" cy="6" r="3" fill="#ffffff" />
                                </motion.g>
                              </svg>
                            </div>

                            {/* 3D bomb bubble highlight overlay inside */}
                            <div className="absolute inset-0.5 rounded-full bg-gradient-to-tr from-transparent via-transparent to-white/45 pointer-events-none" />
                            <div className="absolute top-1 left-2 w-3.5 h-1.5 bg-white rounded-full rotate-[-15deg] opacity-80 pointer-events-none" />
                          </>
                        ) : (
                          <div className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full opacity-50" />
                        )}
                        
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

              {juicePops.map(pop => (
                <div
                  key={pop.id}
                  style={{
                    position: 'absolute',
                    left: pop.x,
                    top: pop.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute pointer-events-none overflow-visible z-50 flex items-center justify-center"
                >
                  {/* Exploding Particles (Sparkles, Circles, Mini-Bubbles) */}
                  {pop.particles && pop.particles.map(particle => {
                    // Significantly slower animation duration: 1.2 to 1.8 seconds
                    const duration = 1.2 + Math.random() * 0.6;
                    return (
                      <motion.div
                        key={particle.id}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                        animate={{
                          x: particle.dx,
                          y: particle.dy,
                          // Grow instantly, float gracefully at high size, then shrink and fade out slowly at the end
                          scale: [0, 2.3, 1.6, 0],
                          opacity: [1, 1, 0.9, 0],
                          rotate: [0, Math.random() * 540 - 270],
                        }}
                        transition={{
                          duration: duration,
                          ease: [0.16, 1, 0.3, 1], // Custom ultra-premium cubic-bezier ease-out curve
                          times: [0, 0.15, 0.75, 1],
                        }}
                        className="absolute"
                        style={{ transformOrigin: 'center' }}
                      >
                        {particle.shape === 'star' && (
                          <svg width={particle.size} height={particle.size} viewBox="0 0 24 24" className="overflow-visible drop-shadow-[0_2px_1px_rgba(0,0,0,0.5)]">
                            <polygon
                              points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"
                              fill={particle.color}
                              stroke="black"
                              strokeWidth="2.5"
                              strokeLinejoin="round"
                            />
                            {/* Inner glow/highlight dot */}
                            <circle cx="12" cy="12" r="1.5" fill="white" opacity="0.8" />
                          </svg>
                        )}
                        {particle.shape === 'bubble' && (
                          <svg width={particle.size} height={particle.size} viewBox="0 0 24 24" className="overflow-visible drop-shadow-[0_2px_1px_rgba(0,0,0,0.4)]">
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                              fill={particle.color}
                              fillOpacity="0.45"
                              stroke="black"
                              strokeWidth="2"
                            />
                            {/* Accent ring / bubble glare */}
                            <path
                              d="M6 12A6 6 0 0 1 12 6"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              fill="none"
                            />
                            <circle cx="15" cy="15" r="1.5" fill="white" opacity="0.7" />
                          </svg>
                        )}
                        {particle.shape === 'circle' && (
                          <svg width={particle.size} height={particle.size} viewBox="0 0 24 24" className="overflow-visible drop-shadow-[0_2px_1px_rgba(0,0,0,0.5)]">
                            <circle
                              cx="12"
                              cy="12"
                              r="8"
                              fill={particle.color}
                              stroke="black"
                              strokeWidth="2.5"
                            />
                            {/* Bubble-like glass highlight */}
                            <circle cx="9.5" cy="9.5" r="2.5" fill="white" opacity="0.9" />
                          </svg>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* Splashes / Droplets ("gocce di succo") */}
                  {pop.splashes.map(splash => (
                    <motion.div
                      key={splash.id}
                      initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
                      animate={{
                        x: splash.dx,
                        y: splash.dy,
                        // Highly evident Juice UI squash & stretch scale bounce!
                        scale: [0, 2.2, 1.4, 1.8, 0],
                        rotate: [0, splash.rotation],
                      }}
                      transition={{
                        duration: 0.8,
                        ease: "easeOut",
                        times: [0, 0.2, 0.4, 0.75, 1],
                      }}
                      className="absolute"
                      style={{ transformOrigin: 'center' }}
                    >
                      <svg width={splash.size} height={splash.size} viewBox="0 0 24 24" className="overflow-visible drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]">
                        <path
                          d="M12 2C12 2 4 10 4 14C4 18.4 7.6 22 12 22C16.4 22 20 18.4 20 14C20 10 12 2 12 2Z"
                          fill={splash.color}
                          stroke="black"
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                        />
                        {/* Highlights for 3D look */}
                        <path
                          d="M12 5C12 5 7 11 7 14"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          fill="none"
                          opacity="0.8"
                        />
                      </svg>
                    </motion.div>
                  ))}

                  {/* Floating Score Popup (+Points) with highly responsive scale overshoot */}
                  <motion.div
                    initial={{ y: 15, scale: 0, rotate: pop.rotation - 10 }}
                    animate={{
                      y: [-10, -95],
                      scale: [0, 2.4, 1.3, 1.8, 1.5, 0],
                      rotate: [pop.rotation - 10, pop.rotation + 15, pop.rotation],
                      opacity: [0, 1, 1, 1, 1, 0],
                    }}
                    transition={{
                      duration: 1.0,
                      times: [0, 0.18, 0.32, 0.55, 0.8, 1],
                      ease: "easeOut"
                    }}
                    className="absolute z-50 pointer-events-none select-none whitespace-nowrap"
                  >
                    <span 
                      className="font-comic font-black text-4xl leading-none"
                      style={{
                        color: '#ffffff',
                        WebkitTextStroke: '2.5px #000000',
                        textShadow: `3px 4px 0px #000000, 0 0 16px ${pop.color}`,
                        display: 'inline-block'
                      }}
                    >
                      {pop.scoreText}
                    </span>
                  </motion.div>
                </div>
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
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white p-8 rounded-3xl comic-border max-w-sm w-full text-center flex flex-col items-center"
            >
              {gameState === 'levelup' ? (
                <>
                  <h2 className="font-sans font-extrabold text-5xl mb-4 text-blue-600 uppercase tracking-tight">
                    Level Up!
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
                  <h2 className={`font-sans font-extrabold text-5xl mb-4 uppercase tracking-tight ${gameState === 'won' ? 'text-green-600' : 'text-red-600'}`}>
                    {gameState === 'won' ? 'You Win!' : 'Game Over'}
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
