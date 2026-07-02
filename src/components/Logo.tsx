import React from 'react';

interface LogoProps {
  className?: string;
}

interface ExtrudedLetterProps {
  char: string;
  x: number;
  y: number;
  fontSize: number;
  fillColor: string;
  shadowX?: number;
  shadowY?: number;
}

const ExtrudedLetter: React.FC<ExtrudedLetterProps> = ({
  char,
  x,
  y,
  fontSize,
  fillColor,
  shadowX = 10,
  shadowY = 12
}) => {
  return (
    <g>
      {/* 1. Thick solid black drop shadow (crisp, no multiple overlapping steps) */}
      <text
        x={x + shadowX}
        y={y + shadowY}
        textAnchor="middle"
        fontFamily="'Bangers', 'Arial Black', sans-serif"
        fontSize={fontSize}
        fontWeight="900"
        fill="#000000"
        stroke="#000000"
        strokeWidth={14}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="select-none"
      >
        {char}
      </text>

      {/* 2. Main thick black outline on top */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fontFamily="'Bangers', 'Arial Black', sans-serif"
        fontSize={fontSize}
        fontWeight="900"
        fill="#000000"
        stroke="#000000"
        strokeWidth={12}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="select-none"
      >
        {char}
      </text>

      {/* 3. Pure, solid, super vibrant face layer */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fontFamily="'Bangers', 'Arial Black', sans-serif"
        fontSize={fontSize}
        fontWeight="900"
        fill={fillColor}
        className="select-none"
      >
        {char}
      </text>
    </g>
  );
};

export default function Logo({ className = "w-full h-auto" }: LogoProps) {
  // Traced points of the highly dynamic, asymmetrical starburst from the reference image
  const starburstPath = "M 250,40 L 270,110 L 340,50 L 330,130 L 410,80 L 380,160 L 460,150 L 400,200 L 470,240 L 390,270 L 430,360 L 350,330 L 390,420 L 310,370 L 270,450 L 240,380 L 180,460 L 170,380 L 100,430 L 120,350 L 40,370 L 90,300 L 20,240 L 100,210 L 50,140 L 120,150 L 100,70 L 160,120 L 180,50 L 210,110 Z";

  return (
    <div className={`relative select-none pointer-events-none ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 500 500"
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        {/* --- Comic explosion background debris (sparks & lines) --- */}
        <g id="debris">
          {/* Top-left black spikes */}
          <path d="M 60,60 L 95,95 L 80,110 Z" fill="#000000" />
          <path d="M 110,40 L 135,75 L 125,85 Z" fill="#000000" />
          {/* Top-left pink splash */}
          <path d="M 45,90 Q 60,95 65,110 Q 55,105 40,100 Z" fill="#ff007f" stroke="#000000" strokeWidth="4" strokeLinejoin="round" />

          {/* Top-right black spikes */}
          <path d="M 430,70 L 400,100 L 415,110 Z" fill="#000000" />
          <path d="M 470,120 L 435,140 L 445,150 Z" fill="#000000" />
          {/* Top-right yellow splash */}
          <path d="M 410,120 Q 430,115 440,100 Q 430,105 415,115 Z" fill="#ffea00" stroke="#000000" strokeWidth="4" strokeLinejoin="round" />

          {/* Bottom-right black spikes */}
          <path d="M 410,430 L 430,400 L 420,390 Z" fill="#000000" />
          <path d="M 380,460 L 395,430 L 385,420 Z" fill="#000000" />
          {/* Bottom-right pink splash */}
          <path d="M 440,380 Q 455,395 460,415 Q 450,405 435,395 Z" fill="#ff007f" stroke="#000000" strokeWidth="4" strokeLinejoin="round" />

          {/* Bottom-left black spikes */}
          <path d="M 80,450 L 110,420 L 100,410 Z" fill="#000000" />
          {/* Bottom-left pink splash */}
          <path d="M 115,440 Q 125,455 130,475 Q 120,460 110,450 Z" fill="#ff007f" stroke="#000000" strokeWidth="4" strokeLinejoin="round" />
        </g>

        {/* --- Backplate explosion / spiky starburst --- */}
        <g id="starburst">
          {/* Black block extrusion shadow of the starburst (offset bottom-right) */}
          <path
            d={starburstPath}
            fill="#000000"
            transform="translate(10, 10)"
          />
          
          {/* Main blue starburst body */}
          <path
            d={starburstPath}
            fill="#0088ff"
            stroke="#000000"
            strokeWidth="11"
            strokeLinejoin="miter"
            strokeLinecap="round"
          />
        </g>

        {/* --- POP Text Group (Colore fuxia super saturato, senza ombre duplicate, pulito e definito) --- */}
        <g id="pop-text" transform="translate(250, 205)">
          {/* Letter P (First) */}
          <g transform="translate(-82, 5) rotate(-11) scale(1.1)">
            <ExtrudedLetter
              char="P"
              x={0}
              y={0}
              fontSize={140}
              fillColor="#ff007f" /* Ultra saturated fuchsia */
            />
          </g>

          {/* Letter O */}
          <g transform="translate(-5, -6) rotate(-5) scale(1.06)">
            <ExtrudedLetter
              char="O"
              x={0}
              y={0}
              fontSize={135}
              fillColor="#ff007f" /* Ultra saturated fuchsia */
            />
          </g>

          {/* Letter P (Second) */}
          <g transform="translate(76, 5) rotate(7) scale(1.12)">
            <ExtrudedLetter
              char="P"
              x={0}
              y={0}
              fontSize={140}
              fillColor="#ff007f" /* Ultra saturated fuchsia */
            />
          </g>
        </g>

        {/* --- MATCH! Text Group (Colore giallo acceso, senza ombre duplicate) --- */}
        <g id="match-text" transform="translate(250, 335) rotate(-3)">
          {/* Letter M */}
          <g transform="translate(-142, 10) rotate(-6) scale(1.04)">
            <ExtrudedLetter
              char="M"
              x={0}
              y={0}
              fontSize={105}
              fillColor="#ffea00" /* Ultra vibrant yellow */
            />
          </g>

          {/* Letter A */}
          <g transform="translate(-82, -4) rotate(-3) scale(1.06)">
            <ExtrudedLetter
              char="A"
              x={0}
              y={0}
              fontSize={108}
              fillColor="#ffea00"
            />
          </g>

          {/* Letter T */}
          <g transform="translate(-22, -12) rotate(0) scale(1.08)">
            <ExtrudedLetter
              char="T"
              x={0}
              y={0}
              fontSize={110}
              fillColor="#ffea00"
            />
          </g>

          {/* Letter C */}
          <g transform="translate(38, -8) rotate(3) scale(1.08)">
            <ExtrudedLetter
              char="C"
              x={0}
              y={0}
              fontSize={110}
              fillColor="#ffea00"
            />
          </g>

          {/* Letter H */}
          <g transform="translate(93, 5) rotate(6) scale(1.06)">
            <ExtrudedLetter
              char="H"
              x={0}
              y={0}
              fontSize={108}
              fillColor="#ffea00"
            />
          </g>

          {/* Exclamation Mark ! */}
          <g transform="translate(148, 18) rotate(11) scale(1.22)">
            <ExtrudedLetter
              char="!"
              x={0}
              y={0}
              fontSize={122}
              fillColor="#ffea00"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
