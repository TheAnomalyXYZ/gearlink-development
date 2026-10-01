/**
 * The dashboard tabs: Overview, Economy and Quests. All three read the same
 * dashboard response and sum whichever window the range toggle picks.
 */
import { useState } from 'react';
import { showToast } from '@devvit/web/client';
import type {
  AdminDashboardResponse,
  AdminDay,
  Counters,
  Range,
  RecentPurchase,
  SkuCurrency,
} from '../../shared/admin.js';
import {
  RANGES,
  dayLabel,
  locationRows,
  pct,
  skuRows,
  sumCounters,
  sumHashes,
} from '../../shared/admin.js';
import { LOCATIONS, MAP_LENGTH } from '../../shared/engine/campaign.js';
import { QUESTS, rewardLabel } from '../../shared/engine/quests.js';
import { adminApi } from '../api.js';
import { BarChart, ChartCard, LineChart, SegmentBar } from './Charts.js';

const fmt = (n: number) => n.toLocaleString();

const series = (days: AdminDay[], value: (d: AdminDay) => number) =>
  days.map((d) => ({ label: dayLabel(d.date), value: value(d) }));

/* ---------- shared bits ---------- */

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

const KpiCard = ({
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

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1.5">
    <div className="text-[10px] text-zinc-500">{label}</div>
    <div className="font-mono text-sm">{value}</div>
  </div>
);

const SectionTitle = ({ children }: { children: string }) => (
  <div className="pt-2 text-xs font-bold tracking-wider text-amber-400/80 uppercase">
    {children}
  </div>
);

const Table = ({
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

const HERO_COLORS: Record<string, string> = {
  Hero: 'bg-blue-600',
  Archer: 'bg-emerald-600',
  Mage: 'bg-purple-600',
};

/* ---------- Overview ---------- */

export const OverviewView = ({ data }: { data: AdminDashboardResponse }) => {
  const [range, setRange] = useState<Range>(30);
  const days = data.days.slice(-range);
  const today = days[days.length - 1];
  const yesterday = days[days.length - 2];
  if (!today) return null;
  const c = sumCounters(days.map((d) => d.counters));
  const heroes = sumHashes(days.map((d) => d.heroes));
  const locs = locationRows(
    LOCATIONS.map((l) => l.id),
    sumHashes(days.map((d) => d.locations))
  );
  const pop = data.population;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard label="DAU today" value={today.dau} prev={yesterday?.dau} />
        <KpiCard
          label="New players today"
          value={today.counters.new_players}
          prev={yesterday?.counters.new_players}
        />
        <KpiCard
          label="Runs today"
          value={today.counters.runs}
          prev={yesterday?.counters.runs}
        />
        <KpiCard
          label="Run win rate today"
          value={pct(today.counters.run_wins, today.counters.runs)}
          prev={
            yesterday
              ? pct(yesterday.counters.run_wins, yesterday.counters.runs)
              : undefined
          }
          suffix="%"
        />
      </div>

      <RangeSelector range={range} onChange={setRange} />

      <ChartCard label="Daily active users">
        <LineChart data={series(days, (d) => d.dau)} />
      </ChartCard>
      <ChartCard label="New players">
        <BarChart data={series(days, (d) => d.counters.new_players)} />
      </ChartCard>
      <ChartCard label="Runs: started (amber) and won (green)">
        <BarChart
          data={days.map((d) => ({
            label: dayLabel(d.date),
            value: d.counters.runs,
            inner: d.counters.run_wins,
          }))}
          color="#f59e0b"
          innerColor="#10b981"
        />
      </ChartCard>
      <ChartCard label="Run win rate (%)">
        <LineChart
          data={series(days, (d) => pct(d.counters.run_wins, d.counters.runs))}
          color="#06b6d4"
          suffix="%"
        />
      </ChartCard>
      <ChartCard label="Duels: all (purple) and ranked (pink)">
        <BarChart
          data={days.map((d) => ({
            label: dayLabel(d.date),
            value: d.counters.duels_ranked + d.counters.duels_friendly,
            inner: d.counters.duels_ranked,
          }))}
          color="#8b5cf6"
          innerColor="#ec4899"
        />
      </ChartCard>

      <SectionTitle>{'Totals (' + range + 'd)'}</SectionTitle>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Runs" value={fmt(c.runs)} />
        <MiniStat
          label="Run wins"
          value={fmt(c.run_wins) + ' · ' + pct(c.run_wins, c.runs) + '%'}
        />
        <MiniStat label="King kills" value={fmt(c.kings)} />
        <MiniStat label="Ascensions" value={fmt(c.ascensions)} />
        <MiniStat label="New players" value={fmt(c.new_players)} />
        <MiniStat label="FTUE finished" value={fmt(c.ftue_done)} />
        <MiniStat label="Hearts applied" value={fmt(c.hearts_applied)} />
        <MiniStat label="Packs opened" value={fmt(c.packs_opened)} />
        <MiniStat label="Ranked duels" value={fmt(c.duels_ranked)} />
        <MiniStat label="Friendly duels" value={fmt(c.duels_friendly)} />
        <MiniStat
          label="Duel win rate"
          value={pct(c.duel_wins, c.duels_ranked + c.duels_friendly) + '%'}
        />
        <MiniStat label="League entries" value={fmt(c.league_entries)} />
        <MiniStat label="Challenge posts" value={fmt(c.challenge_posts)} />
        <MiniStat label="Quests claimed" value={fmt(c.quests_claimed)} />
      </div>

      <SegmentBar
        label={'Hero picks for runs (' + range + 'd)'}
        segments={Object.keys(HERO_COLORS).map((h) => ({
          legend: h,
          value: heroes[h] ?? 0,
          color: HERO_COLORS[h] ?? 'bg-zinc-600',
        }))}
      />

      <div>
        <div className="mb-1 text-[11px] text-zinc-400">
          {'Runs by location (' + range + 'd) - where players fight and fall'}
        </div>
        <Table
          head={['Location', 'Runs', 'Wins', 'Win %']}
          rows={locs.map((l) => [
            LOCATIONS.find((x) => x.id === l.id)?.name ?? l.id,
            l.runs,
            l.wins,
            l.winRate + '%',
          ])}
        />
      </div>

      <SectionTitle>Players right now</SectionTitle>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Total players" value={fmt(pop.totalPlayers)} />
        <MiniStat
          label="FTUE finished"
          value={
            fmt(pop.ftueDone) +
            ' · ' +
            pct(pop.ftueDone, pop.totalPlayers) +
            '%'
          }
        />
        <MiniStat label="In this week's league" value={fmt(pop.leagueListed)} />
        <MiniStat
          label="Snapshot taken"
          value={new Date(pop.computedAt).toLocaleTimeString()}
        />
      </div>
      <div>
        <div className="mb-1 text-[11px] text-zinc-400">
          Map frontier - players by furthest open location (this ascension)
        </div>
        <Table
          head={['Frontier', 'Players', '%']}
          rows={pop.byProgress.map((n, i) => [
            i >= MAP_LENGTH
              ? 'Map finished'
              : (LOCATIONS[i]?.name ?? 'Location ' + i),
            n,
            pct(n, pop.totalPlayers) + '%',
          ])}
        />
      </div>
      <div>
        <div className="mb-1 text-[11px] text-zinc-400">
          Players by ascension
        </div>
        <Table
          head={['Ascension', 'Players']}
          rows={Object.entries(pop.byAscension)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([a, n]) => ['A' + a, n])}
        />
      </div>

      <ExportCard />
    </div>
  );
};

/**
 * The Reddit web view cannot save files, so the export is copied to the
 * clipboard. Fetching and copying are separate taps: a copy is only allowed
 * during a tap, not after a fetch resolves.
 */
const ExportCard = () => {
  const [json, setJson] = useState<{ text: string; days: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const prepare = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await adminApi.export();
      setJson({ text: JSON.stringify(res, null, 1), days: res.days.length });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json.text);
      showToast('Analytics copied to the clipboard');
    } catch {
      showToast('Copy was blocked - try again');
    }
  };
  return (
    <div className="space-y-2 rounded-lg border border-zinc-800 p-3">
      <div className="text-sm font-semibold text-zinc-200">
        Export all analytics
      </div>
      <div className="text-xs text-zinc-500">
        Every daily stats record still kept on the server (up to 180 days), as
        JSON. Counts only - no player names or ids.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          disabled={busy}
          onClick={() => void prepare()}
        >
          {busy ? 'Preparing...' : json ? 'Prepare again' : 'Prepare export'}
        </button>
        {json && (
          <>
            <button
              className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"
              onClick={() => void copy()}
            >
              Copy JSON
            </button>
            <span className="text-xs text-zinc-400">{json.days} days</span>
          </>
        )}
        {err && <span className="text-xs text-red-400">{err}</span>}
      </div>
    </div>
  );
};

/* ---------- Economy ---------- */

const CURRENCY_LABEL: Record<SkuCurrency, string> = {
  gold: 'gems granted',
  gems: 'gems',
  coins: 'coins',
};

const skuName = (sku: string) => sku.replace(/^(pack|coins|gold):/, '$1 ');

export const EconomyView = ({ data }: { data: AdminDashboardResponse }) => {
  const [range, setRange] = useState<Range>(30);
  const [stream, setStream] = useState<'players' | 'testers'>('players');
  const [log, setLog] = useState<'gold' | 'gems'>('gold');
  const days = data.days.slice(-range);
  const test = stream === 'testers';
  const pick = (d: AdminDay): Counters => (test ? d.testCounters : d.counters);
  const c = sumCounters(days.map(pick));
  const rows = skuRows(
    sumHashes(days.map((d) => (test ? d.testSkus : d.skus))),
    sumHashes(days.map((d) => (test ? d.testSkuSpend : d.skuSpend)))
  );
  const recent: RecentPurchase[] = data.recentPurchases[log];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <RangeSelector range={range} onChange={setRange} />
        <Toggle
          value={stream}
          options={[
            ['players', 'Players'],
            ['testers', 'Mods / testers'],
          ]}
          onChange={setStream}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="Gold orders" value={fmt(c.gold_orders)} />
        <MiniStat label="Gems purchased" value={fmt(c.gems_purchased)} />
        <MiniStat label="Refunds" value={fmt(c.refunds)} />
        <MiniStat
          label="Gold buyers' gems / order"
          value={
            c.gold_orders
              ? fmt(Math.round(c.gems_purchased / c.gold_orders))
              : '-'
          }
        />
        <MiniStat label="Gem spends" value={fmt(c.gem_spends)} />
        <MiniStat label="Gems spent" value={fmt(c.gems_spent)} />
        <MiniStat label="Coin spends" value={fmt(c.coin_spends)} />
        <MiniStat label="Coins spent" value={fmt(c.coins_spent)} />
      </div>

      <ChartCard label="Reddit Gold orders">
        <BarChart
          data={series(days, (d) => pick(d).gold_orders)}
          color="#eab308"
        />
      </ChartCard>
      <ChartCard label="Gems: purchased (yellow) and spent (blue)">
        <BarChart
          data={days.map((d) => ({
            label: dayLabel(d.date),
            value: Math.max(pick(d).gems_purchased, pick(d).gems_spent),
            inner: pick(d).gems_spent,
          }))}
          color="#eab308"
          innerColor="#3b82f6"
        />
      </ChartCard>

      <div>
        <div className="mb-1 text-[11px] text-zinc-400">
          {'What was bought (' + range + 'd)'}
        </div>
        <Table
          head={['Item', 'Bought', 'Spend']}
          rows={rows.map((r) => [
            skuName(r.sku),
            r.count,
            fmt(r.spend) + ' ' + CURRENCY_LABEL[r.currency],
          ])}
        />
      </div>

      <SectionTitle>Recent purchases (players only)</SectionTitle>
      <Toggle
        value={log}
        options={[
          ['gold', 'Reddit Gold'],
          ['gems', 'Gem spends'],
        ]}
        onChange={setLog}
      />
      <Table
        head={[
          'Player',
          'Item',
          log === 'gold' ? 'Gems granted' : 'Gems',
          'When',
        ]}
        rows={recent.map((p) => [
          'u/' + p.username,
          skuName(p.sku),
          p.amount,
          new Date(p.ts).toLocaleString(),
        ])}
      />
    </div>
  );
};

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

/* ---------- Quests ---------- */

export const QuestsView = ({ data }: { data: AdminDashboardResponse }) => {
  const [range, setRange] = useState<Range>(30);
  const days = data.days.slice(-range);
  const claims = sumHashes(days.map((d) => d.quests));
  const active = days.reduce((s, d) => s + d.dau, 0);
  return (
    <div className="space-y-4">
      <RangeSelector range={range} onChange={setRange} />
      <ChartCard label="Quests claimed per day">
        <BarChart
          data={series(days, (d) => d.counters.quests_claimed)}
          color="#22c55e"
        />
      </ChartCard>
      <div>
        <div className="mb-1 text-[11px] text-zinc-400">
          {'Claims per quest (' +
            range +
            'd). Per 100 DAU sums each day’s active players, so it reads as a daily claim rate.'}
        </div>
        <Table
          head={['Quest', 'Period', 'Reward', 'Claims', 'Per 100 DAU']}
          rows={QUESTS.map((q) => {
            const n = claims[q.id] ?? 0;
            return [
              q.title,
              q.period,
              rewardLabel(q.reward),
              n,
              active ? ((n / active) * 100).toFixed(1) : '-',
            ];
          })}
        />
      </div>
    </div>
  );
};
