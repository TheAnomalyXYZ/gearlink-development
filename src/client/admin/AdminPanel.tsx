/**
 * The moderator admin panel, opened from settings. A full-screen overlay over
 * the game; closing it hands back to the settings sheet.
 *
 * Loaded lazily, so players who never open it never download it.
 */
import { useEffect, useState } from 'react';
import type { AdminDashboardResponse } from '../../shared/admin.js';
import { adminApi } from '../api.js';
import { EconomyView, OverviewView, QuestsView } from './AnalyticsView.js';
import { PlayersView } from './PlayersView.js';

type Tab = 'overview' | 'economy' | 'quests' | 'players';

const TABS: [Tab, string][] = [
  ['overview', 'Overview'],
  ['economy', 'Economy'],
  ['quests', 'Quests'],
  ['players', 'Players'],
];

export const AdminPanel = ({ onClose }: { onClose: () => void }) => {
  const [tab, setTab] = useState<Tab>('overview');
  // Bumped by REFRESH. A result remembers which request it answers, so the
  // last data stays on screen while a newer read is in flight.
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<{
    request: number;
    data: AdminDashboardResponse | null;
    err: string | null;
  }>({ request: -1, data: null, err: null });
  const loading = result.request !== request;
  const { data, err } = result;
  const load = () => setRequest((n) => n + 1);

  useEffect(() => {
    let live = true;
    adminApi
      .dashboard()
      .then((d) => live && setResult({ request, data: d, err: null }))
      .catch(
        (e: unknown) =>
          live &&
          setResult((r) => ({
            request,
            data: r.data,
            err: e instanceof Error ? e.message : String(e),
          }))
      );
    return () => {
      live = false;
    };
  }, [request]);

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto bg-zinc-950 font-sans text-zinc-100">
      <div className="mx-auto w-full max-w-3xl p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold">GearLink Admin</h2>
          <div className="flex gap-2">
            {tab !== 'players' && (
              <button
                className="rounded bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700 disabled:opacity-50"
                disabled={loading}
                onClick={load}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            )}
            <button
              className="rounded bg-zinc-700 px-3 py-1 text-sm hover:bg-zinc-600"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-1">
          {TABS.map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                'rounded px-4 py-1.5 text-sm font-bold ' +
                (tab === t ? 'bg-blue-600' : 'bg-zinc-800 hover:bg-zinc-700')
              }
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'players' ? (
          <PlayersView />
        ) : err ? (
          <div className="text-sm text-red-400">{err}</div>
        ) : !data ? (
          <div className="text-sm text-zinc-400">Loading...</div>
        ) : tab === 'overview' ? (
          <OverviewView data={data} />
        ) : tab === 'economy' ? (
          <EconomyView data={data} />
        ) : (
          <QuestsView data={data} />
        )}

        <div className="pt-6 text-center text-[11px] text-zinc-600">
          Days are UTC. Stats start from when this panel shipped; older activity
          was never recorded.
        </div>
      </div>
    </div>
  );
};
