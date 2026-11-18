"use client";

import { useState } from "react";

type Day = { date: string; count: number };

const CHART_HEIGHT = 140;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Formatted by hand (not toLocaleDateString) so server and browser render identical text.
function dayLabel(date: string, withWeekday = false) {
  const [y, m, d] = date.split("-").map(Number);
  const label = `${MONTHS[m - 1]} ${d}`;
  return withWeekday ? `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}, ${label}` : label;
}

export default function JoinsChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((n, d) => n + d.count, 0);
  const tickIdx = [0, Math.floor((days.length - 1) / 2), days.length - 1];

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">{total}</span>
        <span className="text-sm text-ink-3">new member{total === 1 ? "" : "s"} joined your groups</span>
      </div>

      <div className="relative" style={{ height: CHART_HEIGHT }} onMouseLeave={() => setHover(null)}>
        {/* Recessive gridlines at 50% and 100% of the max. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
        <span className="pointer-events-none absolute -top-2 right-0 bg-white pl-1 text-[11px] tabular-nums text-ink-3">{max}</span>

        <div className="absolute inset-0 flex items-end gap-[2px] border-b border-line">
          {days.map((d, i) => {
            const h = d.count === 0 ? 0 : Math.max(4, (d.count / max) * CHART_HEIGHT);
            return (
              <div
                key={d.date}
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                tabIndex={0}
                aria-label={`${dayLabel(d.date)}: ${d.count} joined`}
              >
                <div
                  className={`w-full max-w-7 rounded-t-[4px] transition-colors ${hover === i ? "bg-brand-600" : "bg-brand-500"}`}
                  style={{ height: h }}
                />
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lift">
                    <p className="text-white/60">{dayLabel(d.date, true)}</p>
                    <p className="font-semibold tabular-nums">
                      {d.count} joined
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-ink-3">
        {tickIdx.map((i) => (
          <span key={i}>{days[i] ? dayLabel(days[i].date) : ""}</span>
        ))}
      </div>

      <table className="sr-only">
        <caption>New members per day, last 14 days</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
