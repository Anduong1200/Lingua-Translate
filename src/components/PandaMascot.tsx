/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'framer-motion';

export default function PandaMascot() {
  return (
    <div className="relative w-48 h-48 md:w-56 md:h-56 mx-auto flex items-center justify-center">
      <svg
        id="panda-vector-illustration"
        viewBox="0 0 200 200"
        className="w-full h-full select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft background glow */}
        <circle id="glow" cx="100" cy="110" r="60" fill="rgba(20, 184, 166, 0.08)" filter="blur(8px)" />

        {/* Cardboard Box Background flap - Behind panda */}
        <g id="box-back-flaps">
          <path d="M50 115 L100 85 L150 115 L100 135 Z" fill="#1e293b" opacity="0.1" />
          {/* Back flap left */}
          <path d="M50 115 L35 85 L85 95 Z" fill="#6ba7a7" />
          {/* Back flap right */}
          <path d="M150 115 L165 85 L115 95 Z" fill="#6ba7a7" />
        </g>

        {/* Panda Body and Arms */}
        <g id="panda-elements">
          {/* Panda Head */}
          <ellipse cx="100" cy="98" rx="42" ry="36" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />

          {/* Panda Left Ear (Viewer's Left) */}
          <motion.ellipse
            cx="66"
            cy="70"
            rx="12"
            ry="11"
            fill="#1e293b"
            stroke="#1e293b"
            strokeWidth="2"
            animate={{ rotate: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          />

          {/* Panda Right Ear (Viewer's Right) */}
          <motion.ellipse
            cx="134"
            cy="70"
            rx="12"
            ry="11"
            fill="#1e293b"
            stroke="#1e293b"
            strokeWidth="2"
            animate={{ rotate: [4, -4, 4] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          />

          {/* Left Eye Black Patch */}
          <ellipse cx="84" cy="98" rx="8" ry="11" fill="#1e293b" transform="rotate(-15, 84, 98)" />
          {/* Right Eye Black Patch */}
          <ellipse cx="116" cy="98" rx="8" ry="11" fill="#1e293b" transform="rotate(15, 116, 98)" />

          {/* White Pupil highlights */}
          <circle cx="85" cy="96" r="3" fill="#ffffff" />
          <circle cx="115" cy="96" r="3" fill="#ffffff" />

          {/* Soft Cheeks */}
          <ellipse cx="72" cy="106" rx="6" ry="3" fill="#fda4af" opacity="0.6" />
          <ellipse cx="128" cy="106" rx="6" ry="3" fill="#fda4af" opacity="0.6" />

          {/* Nose */}
          <path d="M96 102 L104 102 L100 106 Z" fill="#1e293b" />

          {/* Smile Mouth */}
          <path d="M94 108 Q100 114 106 108" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />

          {/* Left Arm / Paw - Static or slight nudge */}
          <path d="M50 115 C45 105, 38 112, 45 125 C50 132, 58 128, 55 118" fill="#1e293b" stroke="#1e293b" strokeWidth="1" />

          {/* Right Arm / Paw - Waving Animation! */}
          <motion.g
            id="waving-paw"
            style={{ transformOrigin: "140px 115px" }}
            animate={{ rotate: [-8, 22, -8] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            {/* The Arm waving out */}
            <path
              d="M142 110 C154 98, 168 106, 160 120 C153 128, 140 125, 138 114"
              fill="#1e293b"
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />
            {/* Paw pads (adorable detailing) */}
            <circle cx="152" cy="111" r="3.5" fill="#fda4af" />
            <circle cx="146" cy="106" r="1.5" fill="#fda4af" />
            <circle cx="151" cy="104" r="1.5" fill="#fda4af" />
            <circle cx="156" cy="107" r="1.5" fill="#fda4af" />
          </motion.g>
        </g>

        {/* Wizard Pointy Hat with Yellow Star */}
        <g id="wizard-hat">
          {/* Main Cone */}
          <path d="M68 64 L100 24 L132 64 Z" fill="#005048" stroke="#1e293b" strokeWidth="2.5" />
          {/* Hat brim curved */}
          <path d="M62 62 Q100 52 138 62 L132 68 Q100 58 68 68 Z" fill="#006b5f" stroke="#1e293b" strokeWidth="2" />

          {/* Yellow Star on Point */}
          <motion.polygon
            points="100,14 103,20 109,20 104,24 106,30 100,26 94,30 96,24 91,20 97,20"
            fill="#facc15"
            stroke="#b45309"
            strokeWidth="1"
            animate={{ scale: [0.95, 1.15, 0.95], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          />
        </g>

        {/* Front Teal Cardboard Box Flaps (Panda is tucked behind them) */}
        <g id="box-front">
          {/* Inner shade */}
          <path d="M50 115 L100 135 L150 115 V155 L100 180 L50 155 Z" fill="#00201c" />

          {/* Box face left */}
          <path d="M50 115 L100 135 V178 L50 155 Z" fill="#006b5f" stroke="#005048" strokeWidth="2.5" />

          {/* Box face right */}
          <path d="M100 135 L150 115 V155 L100 178 Z" fill="#0060ac" stroke="#005048" strokeWidth="2.5" />

          {/* Lighter lid edges / highlights */}
          <line x1="100" y1="135" x2="100" y2="178" stroke="#005048" strokeWidth="2.5" />

          {/* Front Left Flap hanging down */}
          <path d="M50 115 L40 140 L90 150 L100 135 Z" fill="#005048" stroke="#005048" strokeWidth="1.5" />

          {/* Front Right Flap hanging down */}
          <path d="M150 115 L160 140 L110 150 L100 135 Z" fill="#006b5f" stroke="#005048" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}
