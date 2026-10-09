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

export const AdminPanel = ({
  onClose,
  onResetSelf,
}: {
  onClose: () => void;
  /** Called once the moderator's own account is wiped; the game re-boots. */
  onResetSelf: (message: string) => void;
}) => {
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
          <h2 className="text-xl font-bold">Gearlink Admin</h2>
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

        <ResetSelfBox onDone={onResetSelf} />

        <div className="pt-6 text-center text-[11px] text-zinc-600">
          Days are UTC. Stats start from when this panel shipped; older activity
          was never recorded.
        </div>
      </div>
    </div>
  );
};

/** Wipe the moderator's own account and replay the game from the first run -
 *  for reviewing the FTUE as a brand new player sees it. */
const ResetSelfBox = ({ onDone }: { onDone: (message: string) => void }) => {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reset = async () => {
    setBusy(true);
    setErr(null);
    try {
      onDone((await adminApi.resetMe()).message);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };
  return (
    <div className="mt-8 rounded border border-red-800 p-3">
      <h4 className="mb-1 text-sm text-red-400">Your account</h4>
      <p className="mb-2 text-xs text-zinc-400">
        Start over as a brand new player, first-run tutorial included.
      </p>
      {!armed ? (
        <button
          className="rounded bg-red-700 px-4 py-2 text-sm font-bold hover:bg-red-600"
          onClick={() => setArmed(true)}
        >
          Reset my account
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-red-300">
            Permanently wipe your own account back to day one? Coins, gems,
            gear, packs, map progress, trophies and this period's quests are
            deleted, and you leave the duel pool. Post ladder scores are kept.
          </p>
          <div className="flex gap-2">
            <button
              className="rounded bg-red-700 px-4 py-2 text-sm font-bold hover:bg-red-600 disabled:opacity-50"
              disabled={busy}
              onClick={() => void reset()}
            >
              {busy ? 'Resetting...' : 'Confirm reset'}
            </button>
            <button
              className="rounded bg-zinc-700 px-4 py-2 text-sm"
              disabled={busy}
              onClick={() => setArmed(false)}
            >
              Cancel
            </button>
          </div>
          {err && <div className="text-xs text-red-400">{err}</div>}
        </div>
      )}
    </div>
  );
};
