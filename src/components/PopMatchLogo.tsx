import React from 'react';
import { motion } from 'motion/react';

interface PopMatchLogoProps {
  className?: string;
  isCompact?: boolean;
}

export default function PopMatchLogo({ className = '', isCompact = false }: PopMatchLogoProps) {
  // Center of the burst
  const cx = 250;
  const cy = 205;

  // Generate a dynamic jagged comic-book starburst path - tighter radii
  const burstPoints = [
    { r: 175, a: 0 },
    { r: 110, a: 15 },
    { r: 160, a: 30 },
    { r: 115, a: 45 },
    { r: 180, a: 60 },
    { r: 115, a: 75 },
    { r: 170, a: 90 },
    { r: 110, a: 105 },
    { r: 165, a: 120 },
    { r: 115, a: 135 },
    { r: 185, a: 150 },
    { r: 110, a: 165 },
    { r: 175, a: 180 },
    { r: 105, a: 195 },
    { r: 160, a: 210 },
    { r: 120, a: 225 },
    { r: 180, a: 240 },
    { r: 115, a: 255 },
    { r: 170, a: 270 },
    { r: 110, a: 285 },
    { r: 165, a: 300 },
    { r: 115, a: 315 },
    { r: 180, a: 330 },
    { r: 110, a: 345 }
  ].map(p => {
    // Tilt by -12 degrees for dynamic comic layout
    const angleRad = ((p.a - 12) * Math.PI) / 180;
    const x = cx + p.r * Math.cos(angleRad);
    const y = cy + p.r * Math.sin(angleRad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' L ');

  const burstPath = `M ${burstPoints} Z`;

  // Letter configurations for "POP" (Fuchsia/Pink bubbly style) - much closer together for tight overlap
  const popLetters = [
    { char: 'P', tx: 170, ty: 160, rotate: -12, scale: 1.25 },
    { char: 'O', tx: 238, ty: 148, rotate: -2, scale: 1.15 },
    { char: 'P', tx: 305, ty: 154, rotate: 10, scale: 1.25 }
  ];

  // Letter configurations for "MATCH!" (Yellow bold comic style) - much closer together for tight overlap
  const matchLetters = [
    { char: 'M', tx: 135, ty: 285, rotate: -10, scale: 1.15 },
    { char: 'A', tx: 181, ty: 272, rotate: -5, scale: 1.2 },
    { char: 'T', tx: 227, ty: 265, rotate: -1, scale: 1.25 },
    { char: 'C', tx: 273, ty: 262, rotate: 3, scale: 1.25 },
    { char: 'H', tx: 319, ty: 265, rotate: 8, scale: 1.3 },
    { char: '!', tx: 365, ty: 270, rotate: 14, scale: 1.4 }
  ];

  return (
    <motion.div
      id="pop-match-logo-container"
      className={`inline-block select-none ${className}`}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ 
        scale: 1.04, 
        rotate: [0, -1, 1, -1, 0],
        transition: { duration: 0.4, ease: 'easeInOut' }
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 260, 
        damping: 20 
      }}
    >
      <svg
        id="pop-match-logo-svg"
        viewBox="0 0 500 410"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]"
      >
        <defs>
          {/* Halftone Dot Pattern for Retro Comic shading */}
          <pattern
            id="halftone-pattern"
            x="0"
            y="0"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <circle cx="6" cy="6" r="2.2" fill="#0052cc" opacity="0.35" />
          </pattern>

          {/* Gradients */}
          <radialGradient id="burst-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#33ccff" />
            <stop offset="100%" stopColor="#0077ff" />
          </radialGradient>

          {/* Crisp, solid fuchsia gradient */}
          <linearGradient id="pop-text-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff00cc" />
            <stop offset="100%" stopColor="#d6007a" />
          </linearGradient>

          {/* Crisp, solid yellow gradient */}
          <linearGradient id="match-text-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffea00" />
            <stop offset="100%" stopColor="#ffb300" />
          </linearGradient>
        </defs>

        {/* 1. Behind-burst decorative flying speed lines / sparks */}
        <g opacity="0.85">
          {/* Top-left black shard */}
          <path d="M 70 80 L 110 110 L 95 125 Z" fill="black" />
          {/* Top-right yellow shard */}
          <path d="M 400 110 L 365 135 L 385 145 Z" fill="#ffcc00" />
          {/* Bottom-left pink shard */}
          <path d="M 115 340 L 135 315 L 148 335 Z" fill="#ff3366" />
          {/* Bottom-right black shard */}
          <path d="M 370 340 L 345 315 L 358 305 Z" fill="black" />
          {/* Extra random explosive spikes */}
          <line x1="90" y1="180" x2="55" y2="190" stroke="black" strokeWidth="4" strokeLinecap="round" />
          <line x1="400" y1="170" x2="435" y2="160" stroke="black" strokeWidth="4" strokeLinecap="round" />
          <line x1="250" y1="35" x2="250" y2="15" stroke="black" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* 2. Blue Burst Shadow / Offset 3D Boarder */}
        <path
          d={burstPath}
          fill="black"
          transform="translate(8, 10)"
          opacity="0.9"
        />

        {/* 3. Main Jagged Blue Burst */}
        <path
          d={burstPath}
          fill="url(#burst-grad)"
          stroke="black"
          strokeWidth="11"
          strokeLinejoin="miter"
        />

        {/* 4. Halftone Overlay over the burst */}
        <path
          d={burstPath}
          fill="url(#halftone-pattern)"
          pointerEvents="none"
        />

        {/* ================== POP TEXT LAYER ================== */}
        {/* Deep 3D Shadow layer for POP */}
        <g transform="translate(10, 10)">
          {popLetters.map((l, i) => (
            <text
              key={`pop-shadow-${i}`}
              x={l.tx}
              y={l.ty}
              transform={`rotate(${l.rotate} ${l.tx} ${l.ty}) scale(${l.scale})`}
              transformOrigin={`${l.tx}px ${l.ty}px`}
              fontFamily="Bangers, system-ui, sans-serif"
              fontSize="125"
              fill="black"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {l.char}
            </text>
          ))}
        </g>

        {/* Thick Outer Outline for POP */}
        {popLetters.map((l, i) => (
          <text
            key={`pop-outline-thick-${i}`}
            x={l.tx}
            y={l.ty}
            transform={`rotate(${l.rotate} ${l.tx} ${l.ty}) scale(${l.scale})`}
            transformOrigin={`${l.tx}px ${l.ty}px`}
            fontFamily="Bangers, system-ui, sans-serif"
            fontSize="125"
            fill="black"
            stroke="black"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {l.char}
          </text>
        ))}

        {/* Inline white/yellow glow outline for POP */}
        {popLetters.map((l, i) => (
          <text
            key={`pop-outline-glow-${i}`}
            x={l.tx}
            y={l.ty}
            transform={`rotate(${l.rotate} ${l.tx} ${l.ty}) scale(${l.scale})`}
            transformOrigin={`${l.tx}px ${l.ty}px`}
            fontFamily="Bangers, system-ui, sans-serif"
            fontSize="125"
            fill="#ffffff"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {l.char}
          </text>
        ))}

        {/* Pink Letter Fills for POP */}
        {popLetters.map((l, i) => (
          <text
            key={`pop-fill-${i}`}
            x={l.tx}
            y={l.ty}
            transform={`rotate(${l.rotate} ${l.tx} ${l.ty}) scale(${l.scale})`}
            transformOrigin={`${l.tx}px ${l.ty}px`}
            fontFamily="Bangers, system-ui, sans-serif"
            fontSize="125"
            fill="url(#pop-text-grad)"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {l.char}
          </text>
        ))}


        {/* ================== MATCH! TEXT LAYER ================== */}
        {/* Deep 3D Shadow layer for MATCH! */}
        <g transform="translate(8, 8)">
          {matchLetters.map((l, i) => (
            <text
              key={`match-shadow-${i}`}
              x={l.tx}
              y={l.ty}
              transform={`rotate(${l.rotate} ${l.tx} ${l.ty}) scale(${l.scale})`}
              transformOrigin={`${l.tx}px ${l.ty}px`}
              fontFamily="Bangers, system-ui, sans-serif"
              fontSize="105"
              fill="black"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {l.char}
            </text>
          ))}
        </g>

        {/* Thick Outer Outline for MATCH! */}
        {matchLetters.map((l, i) => (
          <text
            key={`match-outline-thick-${i}`}
            x={l.tx}
            y={l.ty}
            transform={`rotate(${l.rotate} ${l.tx} ${l.ty}) scale(${l.scale})`}
            transformOrigin={`${l.tx}px ${l.ty}px`}
            fontFamily="Bangers, system-ui, sans-serif"
            fontSize="105"
            fill="black"
            stroke="black"
            strokeWidth="15"
            strokeLinecap="round"
            strokeLinejoin="round"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {l.char}
          </text>
        ))}

        {/* Main Yellow Letter Fills for MATCH! */}
        {matchLetters.map((l, i) => (
          <text
            key={`match-fill-${i}`}
            x={l.tx}
            y={l.ty}
            transform={`rotate(${l.rotate} ${l.tx} ${l.ty}) scale(${l.scale})`}
            transformOrigin={`${l.tx}px ${l.ty}px`}
            fontFamily="Bangers, system-ui, sans-serif"
            fontSize="105"
            fill="url(#match-text-grad)"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {l.char}
          </text>
        ))}

        {/* Accent Details: Shimmering white stars / highlights */}
        <path
          d="M 150 120 L 153 126 L 159 126 L 154 130 L 156 136 L 150 132 L 144 136 L 146 130 L 141 126 L 147 126 Z"
          fill="white"
          opacity="0.9"
        />
        <path
          d="M 330 310 L 333 316 L 339 316 L 334 320 L 336 326 L 330 322 L 324 326 L 326 320 L 321 316 L 327 316 Z"
          fill="white"
          opacity="0.85"
        />
      </svg>
    </motion.div>
  );
}
