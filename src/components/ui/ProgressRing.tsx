'use client';

interface ProgressRingProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  gradientStart?: string;
  gradientEnd?: string;
  id: string; // unique ID for SVG gradient
}

export default function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  gradientStart = '#8b5cf6',
  gradientEnd = '#06b6d4',
  id,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - safeProgress * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
        </defs>

        {/* Background Circle */}
        <circle
          className="text-dark-800"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />

        {/* Foreground (Progress) Circle */}
        <circle
          stroke={`url(#grad-${id})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* Center Label (Optional - user can overlay text) */}
    </div>
  );
}
