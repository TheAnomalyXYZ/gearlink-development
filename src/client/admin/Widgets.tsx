/**
 * The admin dashboard's small pieces: the range and tab toggles, KPI and stat
 * tiles, section headings and the plain data table. Their own module so they
 * can be drawn without the dashboard's API and Devvit calls.
 */
import type { Range } from '../../shared/admin.js';
import { RANGES } from '../../shared/admin.js';

const fmt = (n: number) => n.toLocaleString();

export const RangeSelector = ({
  range,
  onChange,
}: {
  range: Range;
  onChange: (r: Range) => void;
}) => (
  <div className="flex gap-1">
    {RANGES.map((r) => (
      <button
        key={r}
        onClick={() => onChange(r)}
        className={
          'rounded px-3 py-1 text-xs font-medium ' +
          (range === r
            ? 'bg-amber-600 text-white'
            : 'bg-zinc-800 text-zinc-400 hover:text-white')
        }
      >
        {r}d
      </button>
    ))}
  </div>
);

export const KpiCard = ({
  label,
  value,
  prev,
  suffix = '',
}: {
  label: string;
  value: number;
  prev?: number | undefined;
  suffix?: string;
}) => {
  const d = prev === undefined ? 0 : value - prev;
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/60 p-3">
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="font-mono text-xl font-semibold">
          {fmt(value)}
          {suffix}
        </span>
        {d !== 0 && (
          <span
            className={
              'text-xs font-medium ' +
              (d > 0 ? 'text-emerald-400' : 'text-red-400')
            }
          >
            {d > 0 ? '▲' : '▼'} {Math.abs(d)}
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

export const MiniStat = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1.5">
    <div className="text-[10px] text-zinc-500">{label}</div>
    <div className="font-mono text-sm">{value}</div>
  </div>
);

export const SectionTitle = ({ children }: { children: string }) => (
  <div className="pt-2 text-xs font-bold tracking-wider text-amber-400/80 uppercase">
    {children}
  </div>
);

export const Table = ({
  head,
  rows,
}: {
  head: string[];
  rows: (string | number)[][];
}) => (
  <div className="overflow-x-auto rounded-lg border border-zinc-800">
    <table className="w-full text-xs">
      <thead className="bg-zinc-900 text-zinc-400">
        <tr>
          {head.map((h, i) => (
            <th
              key={h}
              className={
                'px-2 py-1.5 font-medium ' + (i ? 'text-right' : 'text-left')
              }
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={head.length}
              className="px-2 py-3 text-center text-zinc-600"
            >
              Nothing in this window
            </td>
          </tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i} className="border-t border-zinc-800">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className={
                    'px-2 py-1.5 ' + (j ? 'text-right font-mono' : 'text-left')
                  }
                >
                  {typeof cell === 'number' ? fmt(cell) : cell}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export const Toggle = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) => (
  <div className="flex gap-1">
    {options.map(([v, label]) => (
      <button
        key={v}
        onClick={() => onChange(v)}
        className={
          'rounded px-3 py-1 text-xs font-medium ' +
          (value === v
            ? 'bg-blue-600 text-white'
            : 'bg-zinc-800 text-zinc-400 hover:text-white')
        }
      >
        {label}
      </button>
    ))}
  </div>
);
