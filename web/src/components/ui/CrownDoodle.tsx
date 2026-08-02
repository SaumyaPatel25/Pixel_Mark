import React from 'react'

interface CrownDoodleProps {
  className?: string
}

export function CrownDoodle({ className = "w-5 h-5" }: CrownDoodleProps) {
  return (
    <span className="inline-flex items-center justify-center align-middle ml-1.5 transition-transform hover:scale-110" title="STAGE Paid Subscription Active">
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 17L5 7L9 11L12 4L15 11L19 7L21 17H3Z"
          fill="url(#stage_crown_gradient)"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="5" cy="7" r="1.25" fill="#FBBF24" />
        <circle cx="12" cy="4" r="1.5" fill="#F59E0B" />
        <circle cx="19" cy="7" r="1.25" fill="#FBBF24" />
        <path
          d="M5 20H19"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient
            id="stage_crown_gradient"
            x1="3"
            y1="4"
            x2="21"
            y2="20"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FBBF24" />
            <stop offset="0.5" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  )
}
