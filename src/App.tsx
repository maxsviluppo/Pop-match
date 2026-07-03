import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PopMatchLogo from './components/PopMatchLogo';

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

  const [isAnimating, setIsAnimating] = useState(false);
  const [inflatingCells, setInflatingCells] = useState<{ r: number; c: number }[]>([]);
  const [invisibleCells, setInvisibleCells] = useState<{ r: number; c: number }[]>([]);
  const [explodingSprites, setExplodingSprites] = useState<{ id: string; x: number; y: number; color: string }[]>([]);
  const [particles, setParticles] = useState<{ id: string; x: number; y: number; tx: number; ty: number; color: string; size: number }[]>([]);
  const [floatingScores, setFloatingScores] = useState<{ id: string; x: number; y: number; text: string; color: string }[]>([]);

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
    if (gameState !== 'playing' || isAnimating || !grid[r][c]) return;
    setIsDragging(true);
    setSelection([{ r, c }]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isAnimating || gameState !== 'playing') return;
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
    if (!isDragging || isAnimating) return;
    setIsDragging(false);

    if (selection.length >= MIN_MATCH && gameState === 'playing') {
      const firstBall = grid[selection[0].r][selection[0].c];
      if (firstBall) {
        setIsAnimating(true);

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

        // Score calculation
        const baseScore = finalSelection.length * 10;
        
        // Combo calculations
        setCombo(c => c + 1);
        let currentComboMeter = comboMeter;
        const increment = Math.min(30, 8 + (finalSelection.length - 3) * 6);
        const nextComboMeter = Math.min(100, comboMeter + increment);
        currentComboMeter = nextComboMeter;

        let triggersFrenzy = false;
        if (nextComboMeter >= 100 && frenzyTurns === 0) {
          triggersFrenzy = true;
        }

        let meterMultiplier = 1 + (currentComboMeter / 50); // 1x to 3x
        if (frenzyTurns > 0 || triggersFrenzy) meterMultiplier = 5; // 5x in Frenzy
        
        let bonusMultiplier = isSuperBonus ? 4 : (isBonus ? 2 : 1);
        if (multiplierTurns > 0 || activatedMultiplier) {
          bonusMultiplier *= 2;
        }
        
        const totalMultiplier = meterMultiplier * bonusMultiplier;
        const gainedScore = Math.floor(baseScore * totalMultiplier);

        const newMoves = moves - 1 + addedMoves + (triggersFrenzy ? 1 : 0);

        // ==========================================
        // FASE 1: CODICE - Gonfia (OutBack) e trema
        // ==========================================
        setInflatingCells(finalSelection);
        setShake(true);

        if (isSuperBonus) {
          playRainbow();
        } else if (isBonus) {
          playBonus();
        } else {
          playPop(finalSelection.length);
        }

        setTimeout(() => {
          setShake(false);
        }, 350);

        // ==========================================
        // FASE 2: SPRITESHEET + PARTICELLE (400ms)
        // ==========================================
        setTimeout(() => {
          setInflatingCells([]);
          setInvisibleCells(finalSelection);

          // Genera spritesheet di esplosione e particelle
          const rect = gridRef.current?.getBoundingClientRect();
          if (rect) {
            const cellWidth = rect.width / COLS;
            const cellHeight = rect.height / ROWS;
            
            const newSprites: { id: string; x: number; y: number; color: string }[] = [];
            const newParticles: { id: string; x: number; y: number; tx: number; ty: number; color: string; size: number }[] = [];

            finalSelection.forEach(({ r, c }) => {
              const cx = c * cellWidth + cellWidth / 2;
              const cy = r * cellHeight + cellHeight / 2;
              const cellColor = grid[r][c]?.color || 'red';
              const hexColor = EFFECT_COLORS[cellColor as BallColor] || '#ffffff';

              newSprites.push({
                id: `sprite-${r}-${c}-${Math.random()}`,
                x: cx,
                y: cy,
                color: hexColor
              });

              // 8 particelle per cella
              for (let i = 0; i < 8; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 5;
                const tx = Math.cos(angle) * speed * 22;
                const ty = Math.sin(angle) * speed * 22 + 40; // gravity downward drift
                newParticles.push({
                  id: `particle-${r}-${c}-${i}-${Math.random()}`,
                  x: cx,
                  y: cy,
                  tx,
                  ty,
                  color: hexColor,
                  size: 6 + Math.random() * 8
                });
              }
            });

            setExplodingSprites(newSprites);
            setParticles(newParticles);
          }

          // Trigger standard explosions / comic text popups
          if (isSuperBonus) {
            triggerExplosion(finalSelection[0].r, finalSelection[0].c, color, finalSelection, 0);
            triggerExplosion(finalSelection[Math.floor(finalSelection.length / 2)].r, finalSelection[Math.floor(finalSelection.length / 2)].c, color, finalSelection, 100);
            triggerExplosion(finalSelection[finalSelection.length - 1].r, finalSelection[finalSelection.length - 1].c, color, finalSelection, 200);
            triggerExplosion(finalSelection[Math.floor(finalSelection.length / 2)].r, finalSelection[Math.floor(finalSelection.length / 2)].c, 'special', finalSelection, 300, "+1 MOVE!");
          } else if (isBonus) {
            triggerExplosion(finalSelection[0].r, finalSelection[0].c, color, finalSelection, 0);
            triggerExplosion(finalSelection[finalSelection.length - 1].r, finalSelection[finalSelection.length - 1].c, color, finalSelection, 150);
          } else {
            const centerIdx = Math.floor(finalSelection.length / 2);
            const centerCell = finalSelection[centerIdx];
            triggerExplosion(centerCell.r, centerCell.c, color, finalSelection);
          }

          if (triggersFrenzy) {
            triggerExplosion(finalSelection[0].r, finalSelection[0].c, 'special', finalSelection, 100, "FRENZY MODE!");
            triggerExplosion(finalSelection[0].r, finalSelection[0].c, 'special', finalSelection, 250, "5X MULTIPLIER");
            playRainbow();
          }
        }, 400);

        // ==========================================
        // FASE 3: CODICE - Punteggio fluttua e pezzi cadono (1000ms)
        // ==========================================
        setTimeout(() => {
          setExplodingSprites([]);
          setParticles([]);
          setInvisibleCells([]);

          // 1. Applica i punteggi e i bonus a livello di stato React
          setScore((s) => s + gainedScore);
          setMoves(newMoves);

          if (triggersFrenzy) {
            setFrenzyTurns(3);
            setComboMeter(100);
          } else {
            setComboMeter(nextComboMeter);
          }

          if (activatedMultiplier) {
            setMultiplierTurns(3);
          } else if (multiplierTurns > 0) {
            setMultiplierTurns(m => m - 1);
          }

          if (frenzyTurns > 0 && !triggersFrenzy) {
            setFrenzyTurns(f => {
              if (f === 1) {
                setComboMeter(0); // Reset meter after frenzy
                return 0;
              }
              return f - 1;
            });
          } else if (!triggersFrenzy) {
            if (finalSelection.length < 4) {
              setComboMeter(prev => Math.max(0, prev - 5));
            }
          }

          // 2. Spawn floating score popup al centro del match
          const rect = gridRef.current?.getBoundingClientRect();
          if (rect && finalSelection.length > 0) {
            const cellWidth = rect.width / COLS;
            const cellHeight = rect.height / ROWS;
            
            const sumR = finalSelection.reduce((acc, curr) => acc + curr.r, 0);
            const sumC = finalSelection.reduce((acc, curr) => acc + curr.c, 0);
            const avgR = sumR / finalSelection.length;
            const avgC = sumC / finalSelection.length;
            
            const popupX = avgC * cellWidth + cellWidth / 2;
            const popupY = avgR * cellHeight + cellHeight / 2;
            
            const matchedColorHex = EFFECT_COLORS[color as BallColor] || '#ffffff';

            const newFS = {
              id: Math.random().toString(),
              x: popupX,
              y: popupY,
              text: `+${gainedScore}`,
              color: matchedColorHex
            };

            setFloatingScores(prev => [...prev, newFS]);
            setTimeout(() => {
              setFloatingScores(prev => prev.filter(f => f.id !== newFS.id));
            }, 2200);
          }

          // 3. Rimuovi le caramelle abbinate e genera gli eventuali potenziamenti nel grid
          let newGrid = grid.map((row) => [...row]);
          finalSelection.forEach(({ r, c }) => {
            newGrid[r][c] = null;
          });

          const lastSelected = selection[selection.length - 1];
          if (isSuperBonus) {
            newGrid[lastSelected.r][lastSelected.c] = { id: `rainbow-${Date.now()}`, color: 'rainbow' };
          } else if (isBonus) {
            newGrid[lastSelected.r][lastSelected.c] = { id: `special-${Date.now()}`, color: 'special' };
          }

          // 4. Caduta dei pezzi sopra (apply gravity)
          newGrid = applyGravity(newGrid);
          setGrid(newGrid);

          // 5. Aggiorna i target di livello
          setTargets((prev) => {
            const newTargets = { ...prev };
            const usedRainbow = finalSelection.some(s => grid[s.r][s.c]?.color === 'rainbow');
            const usedSpecial = finalSelection.some(s => grid[s.r][s.c]?.color === 'special');

            if (usedRainbow) {
              Object.keys(newTargets).forEach(c => {
                newTargets[c as BallColor] = Math.max(0, newTargets[c as BallColor]! - finalSelection.length);
              });
            } else {
              if (chainColor && newTargets[chainColor] !== undefined) {
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

          // Finisci l'animazione di blocco
          setTimeout(() => {
            setIsAnimating(false);
          }, 350);

        }, 1000);
      }
    } else if (selection.length > 0) {
      // Reset combo on invalid selection
      setCombo(0);
      setComboMeter(prev => Math.max(0, prev - 25));
      setShake(true);
      setTimeout(() => setShake(false), 200);
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
      
      {/* Header */}
      <div className={`w-full max-w-md ${gameState === 'home' ? 'mb-4 flex-col items-center text-center' : 'mb-3 flex-col'} flex z-10 transition-all duration-500`}>
        {gameState === 'home' ? (
          <div className="flex flex-col items-center">
            <PopMatchLogo className="w-52 sm:w-56 md:w-60 -mt-2 -mb-2 transform -rotate-1" />
          </div>
        ) : (
          <div className="flex flex-col w-full gap-2">
            {/* Row 1: Logo/Level & Controls */}
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2">
                <PopMatchLogo className="w-22 sm:w-26 -mt-1 -mb-1 transform -rotate-2" />
                <div className="bg-white px-2 py-0.5 sm:px-3 sm:py-1 comic-border rounded-lg transform rotate-3 shadow-sm">
                  <span className="font-comic text-base sm:text-lg">LVL {level + 1}</span>
                </div>
              </div>
              
              {/* Moves Display (Moved to first row and enlarged by 40%) */}
              <div 
                className={`font-comic text-[34px] sm:text-[42px] flex items-baseline select-none transition-colors duration-300 ${
                  moves <= 5 ? 'text-[#ff3300] animate-pulse' : 'text-[#ffea00]'
                }`}
                style={{
                  WebkitTextStroke: '2px #000000',
                  textShadow: '4px 4px 0px #000000'
                }}
              >
                <span>{moves}</span>
                <span 
                  className="text-[14px] sm:text-[17px] text-white/95 font-normal ml-0.5 lowercase tracking-tight"
                  style={{
                    WebkitTextStroke: '1px #000000',
                    textShadow: '1.5px 1.5px 0px #000000'
                  }}
                >
                  mov.
                </span>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-2 bg-white/90 p-1.5 comic-border rounded-lg shadow-sm transform -rotate-1">
                <button 
                  onClick={goToHome}
                  className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  title="Home"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </button>
                <div className="w-px h-4 bg-gray-300 mx-0.5" />
                <button 
                  onClick={handleToggleMute}
                  className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                  title={muted ? "Unmute" : "Mute"}
                >
                  {muted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  )}
                </button>
              </div>
            </div>
 
            {/* Row 2: Score & Targets */}
            <div className="flex justify-between items-center w-full">
              {/* Score */}
              <div className="flex gap-4 items-center">
                {/* Score Display (Textless, giant neon-green number) */}
                <motion.div 
                  animate={multiplierTurns > 0 ? {
                    textShadow: [
                      '3px 3px 0px #000000, 0px 0px 4px rgba(51,255,51,0)',
                      '3px 3px 0px #000000, 0px 0px 10px rgba(51,255,51,1)',
                      '3px 3px 0px #000000, 0px 0px 4px rgba(51,255,51,0)'
                    ]
                  } : {}}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="font-comic text-2xl sm:text-3xl text-[#33ff33] flex items-center gap-1 select-none"
                  style={{
                    WebkitTextStroke: '1.5px #000000',
                    textShadow: '3px 3px 0px #000000'
                  }}
                >
                  <motion.span
                    key={score}
                    initial={{ scale: 1.4, y: -4 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 12 }}
                  >
                    {score}
                  </motion.span>
                  <AnimatePresence>
                    {multiplierTurns > 0 && (
                      <motion.span 
                        initial={{ scale: 0, opacity: 0, rotate: -10 }}
                        animate={{ scale: [1, 1.1, 1], opacity: 1, rotate: [-5, 5, -5] }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="bg-[#ffcc00] text-black px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[18px] sm:text-[24px] ml-2 tracking-wider font-comic normal-case font-extrabold"
                        style={{ WebkitTextStroke: '0px', textShadow: 'none' }}
                      >
                        2X
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Targets */}
              <div className="flex items-center gap-2.5 bg-white px-2.5 py-1 sm:px-3 sm:py-1.5 comic-border rounded-xl transform rotate-1 shadow-md min-w-[110px] justify-center relative">
                <div className="absolute -top-2 left-1 bg-black text-white text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded font-comic uppercase tracking-tighter">
                  Targets
                </div>
                {Object.entries(targets).map(([color, count]) => {
                  const isCompleted = count === 0;
                  return (
                    <div key={color} className="flex flex-col items-center relative mt-0.5">
                      <motion.div 
                        animate={isCompleted ? { scale: [1, 1.2, 1] } : {}}
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-black ${COLOR_CLASSES[color as BallColor]} ${isCompleted ? 'opacity-40' : 'shadow-sm'}`} 
                      />
                      <span className={`font-comic text-sm sm:text-base leading-none mt-0.5 ${isCompleted ? 'text-green-500 font-bold' : 'text-black'}`}>
                        {isCompleted ? '✓' : count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Combo Meter */}
            <div className="w-full mt-0.5">
              <div className={`relative h-5 bg-white comic-border rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] ${frenzyTurns > 0 ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
                <motion.div 
                  className={`h-full ${frenzyTurns > 0 ? 'bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400' : 'bg-gradient-to-r from-[#ff3366] via-[#ffcc00] to-[#33ff33]'}`}
                  initial={{ width: 0 }}
                  animate={{ 
                    width: frenzyTurns > 0 ? '100%' : `${comboMeter}%`,
                    filter: (comboMeter > 70 || frenzyTurns > 0) ? ['brightness(1)', 'brightness(1.3)', 'brightness(1)'] : 'brightness(1)'
                  }}
                  transition={{ 
                    width: { type: 'spring', stiffness: 50, damping: 10 },
                    filter: { repeat: Infinity, duration: 0.5 }
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="font-comic text-[9px] sm:text-[10px] text-black font-bold uppercase tracking-widest drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
                    {frenzyTurns > 0 ? `🔥 FRENZY MODE (${frenzyTurns}T) 🔥` : `COMBO METER ${comboMeter > 0 ? `(${(1 + comboMeter/50).toFixed(1)}X)` : ''}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Board or Home Screen */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {gameState === 'home' ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-4 sm:p-5 rounded-3xl comic-border max-w-sm w-full text-center flex flex-col items-center z-10"
          >
            <div className="relative mb-5 scale-90 sm:scale-100">
              <div className="absolute -top-6 -left-6 w-16 h-16 bg-[#ff3366] rounded-full comic-border transform -rotate-12 flex items-center justify-center">
                <span className="font-comic text-white text-lg comic-text">POP!</span>
              </div>
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-[#ffcc00] rounded-full comic-border transform rotate-12 flex items-center justify-center">
                <span className="font-comic text-white text-xl comic-text">MATCH!</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-3 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                {['red', 'blue', 'yellow', 'green', 'purple', 'red'].map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-black ${COLOR_CLASSES[c as BallColor]} shadow-md`} />
                ))}
              </div>
            </div>

            <h2 className="font-comic text-3xl mb-1.5 comic-text text-black uppercase">READY TO POP?</h2>
            <div className="bg-gray-100 px-3 py-0.5 rounded-full comic-border mb-4">
              <span className="font-comic text-lg text-gray-600">CURRENT LEVEL: {level + 1}</span>
            </div>
            
            <div className="space-y-1.5 mb-5 text-left w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-[10px]">1</div>
                <p className="font-comic text-base">Connect 3+ same colors</p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-[10px]">2</div>
                <p className="font-comic text-base">Reach targets before moves end</p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-[10px]">3</div>
                <p className="font-comic text-base">Connect 6+ for BIG BONUS!</p>
              </div>
            </div>

            <button 
              onClick={startGame}
              className="bg-[#ffcc00] text-black font-comic text-3xl py-2.5 px-8 rounded-full comic-border hover:bg-[#ffe066] hover:-translate-y-1 active:translate-y-1 transition-all w-full cursor-pointer"
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
                    {ball && !invisibleCells.some(cell => cell.r === r && cell.c === c) && (
                      <motion.div
                        key={ball.id}
                        layout
                        initial={{ scale: 0, y: -50 }}
                        animate={
                          inflatingCells.some(cell => cell.r === r && cell.c === c)
                            ? { scale: 1.6, y: 0, rotate: [0, 5, -5, 0] }
                            : { scale: 1, y: 0 }
                        }
                        exit={{ 
                          scale: [1, 1.2, 0], 
                          rotate: [0, 15, -15, 0],
                          opacity: [1, 1, 0],
                          transition: { type: 'keyframes', duration: 0.3 }
                        }}
                        transition={
                          inflatingCells.some(cell => cell.r === r && cell.c === c)
                            ? { type: 'tween', ease: [0.175, 0.885, 0.32, 1.275], duration: 0.4 }
                            : { 
                                type: 'spring', 
                                stiffness: 300, 
                                damping: 25
                              }
                        }
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

              {/* Exploding Spritesheet Animations (FASE 2) */}
              {explodingSprites.map(sprite => (
                <motion.div
                  key={sprite.id}
                  initial={{ scale: 0.1, opacity: 1, rotate: 0 }}
                  animate={{
                    scale: [0.1, 1.4, 1.8, 1.5, 0],
                    opacity: [1, 1, 1, 0.8, 0],
                    rotate: [0, 45, -45, 90],
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                  }}
                  style={{
                    position: 'absolute',
                    left: sprite.x,
                    top: sprite.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="w-16 h-16 flex items-center justify-center z-40 pointer-events-none"
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
                    <polygon 
                      points="50,15 58,35 78,25 70,45 90,50 70,55 78,75 58,65 50,85 42,65 22,75 30,55 10,50 30,45 22,25 42,35" 
                      fill={sprite.color} 
                      stroke="black" 
                      strokeWidth="5" 
                    />
                    <polygon 
                      points="50,25 55,40 70,32 63,47 78,50 63,53 70,68 55,60 50,75 45,60 30,68 37,53 22,50 37,47 30,32 45,40" 
                      fill="white" 
                      stroke="black" 
                      strokeWidth="3" 
                    />
                  </svg>
                </motion.div>
              ))}

              {/* Particle System (FASE 2) */}
              {particles.map(particle => (
                <motion.div
                  key={particle.id}
                  initial={{ x: particle.x, y: particle.y, scale: 1, opacity: 1 }}
                  animate={{
                    x: particle.x + particle.tx,
                    y: particle.y + particle.ty,
                    scale: [1, 1.2, 0],
                    opacity: [1, 1, 0],
                    rotate: [0, Math.random() * 360],
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut"
                  }}
                  style={{
                    position: 'absolute',
                    width: particle.size,
                    height: particle.size,
                    backgroundColor: particle.color,
                    borderRadius: Math.random() > 0.5 ? '50%' : '3px',
                    boxShadow: '1px 1px 0px 0px rgba(0,0,0,1)',
                    border: '1.5px solid black',
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="z-40 pointer-events-none"
                />
              ))}

              {/* Floating Scores Animation (FASE 3) */}
              {floatingScores.map(score => (
                <motion.div
                  key={score.id}
                  initial={{ scale: 0.4, opacity: 0, y: 0 }}
                  animate={{
                    scale: [0.4, 1.5, 1.3, 1.3, 0],
                    opacity: [0, 1, 1, 0.9, 0],
                    y: [0, -35, -80, -130, -180],
                  }}
                  transition={{
                    duration: 2.2,
                    times: [0, 0.15, 0.4, 0.85, 1],
                    ease: "easeOut"
                  }}
                  style={{
                    position: 'absolute',
                    left: score.x,
                    top: score.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="z-50 pointer-events-none flex items-center justify-center"
                >
                  <span 
                    style={{
                      color: score.color,
                      textShadow: '3px 3px 0px #000, -1.5px -1.5px 0px #000, 1.5px -1.5px 0px #000, -1.5px 1.5px 0px #000, 1.5px 1.5px 0px #000'
                    }}
                    className="font-comic text-4xl font-extrabold tracking-wide uppercase"
                  >
                    {score.text}
                  </span>
                </motion.div>
              ))}

            </AnimatePresence>
          </div>

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
