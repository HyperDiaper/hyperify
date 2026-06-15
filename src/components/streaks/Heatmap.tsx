'use client';

import { useMemo, useState } from 'react';
import { Completion, HabitType } from '@/types';
import { formatDate, calculateStreakHistory, parseDate } from '@/lib/utils';

interface HeatmapProps {
  completions: Completion[];
  habitType: HabitType;
  targetValue?: number;
  gradient: string;
}

const gradientRgbMap: Record<string, { start: string; end: string }> = {
  'gradient-volt-blue': { start: '163, 230, 53', end: '37, 99, 235' },
  'gradient-lime-emerald': { start: '163, 230, 53', end: '5, 150, 105' },
  'gradient-gold-rose': { start: '245, 158, 11', end: '236, 72, 153' },
  'gradient-cyan-blue': { start: '0, 242, 254', end: '37, 99, 235' },
  'gradient-sunset-orange': { start: '249, 115, 22', end: '225, 29, 72' },
  'gradient-electric-purple': { start: '124, 58, 237', end: '219, 39, 119' },
  'gradient-aurora-teal': { start: '13, 148, 136', end: '52, 211, 153' },
  'gradient-cyberpunk': { start: '244, 63, 94', end: '6, 182, 212' },
  'gradient-lavender-indigo': { start: '165, 180, 252', end: '79, 70, 229' },
  'gradient-monochrome': { start: '51, 65, 85', end: '248, 250, 252' },
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Heatmap({ completions, habitType, targetValue, gradient }: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ dateStr: string; completed: boolean; streak: number } | null>(null);

  const streakHistory = useMemo(() => {
    return calculateStreakHistory(completions, habitType, targetValue);
  }, [completions, habitType, targetValue]);

  const completionsMap = useMemo(() => {
    const map: Record<string, Completion> = {};
    completions.forEach((c) => {
      let isCompleted = c.completed;
      if (habitType === 'quantitative' && targetValue !== undefined) {
        isCompleted = (c.value || 0) >= targetValue;
      } else if (habitType === 'duration' && targetValue !== undefined) {
        isCompleted = (c.duration || 0) >= targetValue;
      }
      if (isCompleted) {
        map[c.date] = c;
      }
    });
    return map;
  }, [completions, habitType, targetValue]);

  const { grid, monthLabels } = useMemo(() => {
    const result: Date[][] = [];
    const labels: { text: string; colIndex: number }[] = [];

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 52 * 7);
    const startDay = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDay);

    for (let w = 0; w < 53; w++) {
      const week: Date[] = [];
      const firstDayOfWeek = new Date(startDate);

      if (w === 0 || firstDayOfWeek.getDate() <= 7) {
        const monthText = monthNames[firstDayOfWeek.getMonth()];
        if (labels.length === 0 || labels[labels.length - 1].text !== monthText) {
          labels.push({ text: monthText, colIndex: w });
        }
      }

      for (let d = 0; d < 7; d++) {
        week.push(new Date(startDate));
        startDate.setDate(startDate.getDate() + 1);
      }
      result.push(week);
    }

    return { grid: result, monthLabels: labels };
  }, []);

  const getStyle = (dateStr: string) => {
    const isCompleted = !!completionsMap[dateStr];
    if (!isCompleted) {
      return { backgroundColor: 'rgba(255, 255, 255, 0.02)' }; // Cleaner, darker background cells
    }

    const streak = streakHistory[dateStr] || 0;
    let opacity = 0.2;
    if (streak >= 30) opacity = 1.0;
    else if (streak >= 15) opacity = 0.8;
    else if (streak >= 8) opacity = 0.6;
    else if (streak >= 4) opacity = 0.4;
    else opacity = 0.2;

    const rgb = gradientRgbMap[gradient] || gradientRgbMap['gradient-volt-blue'];
    return {
      background: `linear-gradient(135deg, rgba(${rgb.start}, ${opacity}), rgba(${rgb.end}, ${opacity}))`,
      boxShadow: opacity >= 0.8 ? `0 0 12px rgba(${rgb.start}, 0.25)` : undefined,
    };
  };

  const currentRgb = gradientRgbMap[gradient] || gradientRgbMap['gradient-volt-blue'];

  return (
    <div className="flex flex-col gap-2">
      <div className="h-6 text-xs text-dark-500 font-medium">
        {hoveredCell ? (
          <span>
            <strong className="text-gray-300">{hoveredCell.dateStr}</strong>: {hoveredCell.completed ? `Completed (${hoveredCell.streak} day streak)` : 'No completion'}
          </span>
        ) : (
          <span>Hover over a cell to view daily progress details</span>
        )}
      </div>

      <div className="flex gap-2 items-start overflow-x-auto pb-2 scrollbar-thin">
        <div className="grid grid-rows-7 gap-1 text-[10px] text-dark-500 font-bold pr-1 pt-6 select-none">
          <div className="h-3.5 flex items-center">Sun</div>
          <div className="h-3.5 flex items-center">Mon</div>
          <div className="h-3.5 flex items-center">Tue</div>
          <div className="h-3.5 flex items-center">Wed</div>
          <div className="h-3.5 flex items-center">Thu</div>
          <div className="h-3.5 flex items-center">Fri</div>
          <div className="h-3.5 flex items-center">Sat</div>
        </div>

        <div className="flex flex-col relative">
          <div className="h-5 relative text-[10px] text-dark-500 font-bold select-none mb-1">
            {monthLabels.map((lbl, idx) => (
              <span
                key={idx}
                className="absolute"
                style={{ left: `${lbl.colIndex * 18}px` }}
              >
                {lbl.text}
              </span>
            ))}
          </div>

          <div className="flex gap-1">
            {grid.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-rows-7 gap-1">
                {week.map((day, dIdx) => {
                  const dateStr = formatDate(day);
                  const isCompleted = !!completionsMap[dateStr];
                  const streak = streakHistory[dateStr] || 0;
                  const isToday = dateStr === formatDate(new Date());

                  return (
                    <div
                      key={dIdx}
                      style={getStyle(dateStr)}
                      className={`w-3.5 h-3.5 rounded-sm transition-all duration-200 cursor-pointer hover:scale-125 hover:z-10
                        ${isToday ? 'ring-1 ring-white ring-offset-1 ring-offset-dark-950' : ''}
                      `}
                      onMouseEnter={() => setHoveredCell({ dateStr, completed: isCompleted, streak })}
                      onMouseLeave={() => setHoveredCell(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-dark-500 font-bold pt-2 select-none">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-white/[0.02]" />
        <div
          style={{ background: `linear-gradient(135deg, rgba(${currentRgb.start}, 0.2), rgba(${currentRgb.end}, 0.2))` }}
          className="w-3 h-3 rounded-sm"
        />
        <div
          style={{ background: `linear-gradient(135deg, rgba(${currentRgb.start}, 0.5), rgba(${currentRgb.end}, 0.5))` }}
          className="w-3 h-3 rounded-sm"
        />
        <div
          style={{ background: `linear-gradient(135deg, rgba(${currentRgb.start}, 0.8), rgba(${currentRgb.end}, 0.8))` }}
          className="w-3 h-3 rounded-sm"
        />
        <div
          style={{ background: `linear-gradient(135deg, rgb(${currentRgb.start}), rgb(${currentRgb.end}))` }}
          className="w-3 h-3 rounded-sm"
        />
        <span>More</span>
      </div>
    </div>
  );
}
