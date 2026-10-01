/**
 * Small hand-drawn SVG charts for the admin dashboard. No chart library: the
 * panel ships inside the game bundle, and these are three shapes.
 */
import type { ReactNode } from 'react';

const W = 600;
const H = 120;
const PAD = { t: 8, r: 8, b: 20, l: 38 };
const CW = W - PAD.l - PAD.r;
const CH = H - PAD.t - PAD.b;
const GRID = '#27272a';
const INK = '#71717a';

const labelStep = (n: number) => Math.max(1, Math.ceil(n / 7));

const YTicks = ({
  ticks,
  min,
  range,
  suffix = '',
}: {
  ticks: number[];
  min: number;
  range: number;
  suffix?: string;
}) => (
  <>
    {ticks.map((v, i) => {
      const y = PAD.t + CH - ((v - min) / range) * CH;
      return (
        <g key={i}>
          <line
            x1={PAD.l}
            y1={y}
            x2={W - PAD.r}
            y2={y}
            stroke={GRID}
            strokeWidth="0.5"
          />
          <text
            x={PAD.l - 4}
            y={y + 3}
            fill={INK}
            fontSize="8"
            textAnchor="end"
            fontFamily="monospace"
          >
            {v}
            {suffix}
          </text>
        </g>
      );
    })}
  </>
);

const XLabels = ({
  labels,
  xAt,
}: {
  labels: string[];
  xAt: (i: number) => number;
}) => {
  const step = labelStep(labels.length);
  return (
    <>
      {labels.map((l, i) =>
        i % step === 0 || i === labels.length - 1 ? (
          <text
            key={i}
            x={xAt(i)}
            y={H - 4}
            fill={INK}
            fontSize="8"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {l}
          </text>
        ) : null
      )}
    </>
  );
};

export const LineChart = ({
  data,
  color = '#10b981',
  suffix = '',
}: {
  data: { label: string; value: number }[];
  color?: string;
  suffix?: string;
}) => {
  if (data.length < 2) return <Empty />;
  const values = data.map((d) => d.value);
  const rawMax = Math.max(...values);
  const min = Math.min(...values, 0);
  const max = rawMax + (rawMax - min) * 0.05 || 1;
  const range = max - min || 1;
  const xAt = (i: number) => PAD.l + (i / (data.length - 1)) * CW;
  const pts = data.map((d, i) => ({
    x: xAt(i),
    y: PAD.t + CH - ((d.value - min) / range) * CH,
  }));
  const line = pts
    .map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ',' + p.y.toFixed(1))
    .join(' ');
  const base = (PAD.t + CH).toFixed(1);
  const area =
    line +
    ` L${pts[pts.length - 1]!.x.toFixed(1)},${base} L${pts[0]!.x.toFixed(1)},${base} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      <YTicks
        ticks={[min, min + range * 0.5, max].map(Math.round)}
        min={min}
        range={range}
        suffix={suffix}
      />
      <path d={area} fill={color} opacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <XLabels labels={data.map((d) => d.label)} xAt={xAt} />
    </svg>
  );
};

/** Bars, optionally with a second series drawn inside the first (e.g. runs
 *  started with runs won inside them). */
export const BarChart = ({
  data,
  color = '#3b82f6',
  innerColor,
}: {
  data: { label: string; value: number; inner?: number }[];
  color?: string;
  innerColor?: string;
}) => {
  if (!data.length) return <Empty />;
  const max = Math.max(...data.map((d) => d.value)) || 1;
  const slot = CW / data.length;
  const barW = Math.max(1, slot * 0.7);
  const gap = slot * 0.15;
  const h = (v: number) => (v / max) * CH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      <YTicks ticks={[0, Math.round(max / 2), max]} min={0} range={max} />
      {data.map((d, i) => {
        const x = PAD.l + i * slot + gap;
        return (
          <g key={i}>
            <rect
              x={x}
              y={PAD.t + CH - h(d.value)}
              width={barW}
              height={h(d.value)}
              fill={color}
              opacity={innerColor ? 0.35 : 0.8}
              rx="0.5"
            />
            {innerColor && d.inner !== undefined && (
              <rect
                x={x}
                y={PAD.t + CH - h(d.inner)}
                width={barW}
                height={h(d.inner)}
                fill={innerColor}
                opacity="0.85"
                rx="0.5"
              />
            )}
          </g>
        );
      })}
      <XLabels
        labels={data.map((d) => d.label)}
        xAt={(i) => PAD.l + i * slot + gap + barW / 2}
      />
    </svg>
  );
};

export type Segment = { value: number; color: string; legend: string };

/** One horizontal bar split into proportional segments, with a legend. */
export const SegmentBar = ({
  label,
  segments,
}: {
  label: string;
  segments: Segment[];
}) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <div className="mb-1 text-[11px] text-zinc-400">{label}</div>
      {total === 0 ? (
        <Empty />
      ) : (
        <>
          <div className="flex h-5 w-full overflow-hidden rounded">
            {segments.map((s) =>
              s.value > 0 ? (
                <div
                  key={s.legend}
                  className={
                    s.color +
                    ' flex items-center justify-center text-[10px] font-medium text-white'
                  }
                  style={{ width: (s.value / total) * 100 + '%' }}
                >
                  {s.value / total > 0.08
                    ? Math.round((s.value / total) * 100) + '%'
                    : ''}
                </div>
              ) : null
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400">
            {segments.map((s) => (
              <span key={s.legend} className="flex items-center gap-1">
                <span
                  className={s.color + ' inline-block h-2 w-2 rounded-sm'}
                />
                {s.legend} {s.value.toLocaleString()}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const ChartCard = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div>
    <div className="mb-1 text-[11px] text-zinc-400">{label}</div>
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
      {children}
    </div>
  </div>
);

const Empty = () => (
  <div className="py-4 text-center text-xs text-zinc-600">No data yet</div>
);
