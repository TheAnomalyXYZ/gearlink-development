/**
 * Player lookup: browse by last seen or search by handle, then open one to see
 * their stored profile, gift them something, or reset their progress.
 */
import { useEffect, useState } from 'react';
import type { AdminUserResponse, AdminUserRow } from '../../shared/admin.js';
import { MAX_GIFT_AMOUNT } from '../../shared/admin.js';
import { PACKS } from '../../shared/engine/economy.js';
import { adminApi } from '../api.js';

const when = (ms: number | null) =>
  ms === null ? '-' : new Date(ms).toLocaleString();

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const PlayersView = () => {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Bumped on the way back from a player, so a gift or reset shows up.
  const [visit, setVisit] = useState(0);
  const key = (search ? 's:' + search : 'p:' + page) + ':' + visit;
  const [result, setResult] = useState<{
    key: string;
    list: { users: AdminUserRow[]; more: boolean } | null;
    err: string | null;
  } | null>(null);
  const fresh = result?.key === key ? result : null;
  const list = fresh?.list ?? null;
  const err = fresh?.err ?? null;

  useEffect(() => {
    let live = true;
    (search ? adminApi.search(search) : adminApi.users(page * 20))
      .then(
        (res) =>
          live &&
          setResult({
            key,
            list: { users: res.users, more: res.more },
            err: null,
          })
      )
      .catch(
        (e: unknown) => live && setResult({ key, list: null, err: errText(e) })
      );
    return () => {
      live = false;
    };
  }, [key, search, page]);

  if (selected)
    return (
      <PlayerDetail
        userId={selected}
        onBack={(msg) => {
          setSelected(null);
          setVisit((v) => v + 1);
          if (msg) setNotice(msg);
        }}
      />
    );

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query.trim().toLowerCase());
          setPage(0);
        }}
      >
        <input
          className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          placeholder="Search by username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-sm font-bold">
          Search
        </button>
        <button
          type="button"
          className="rounded bg-zinc-700 px-4 py-2 text-sm"
          onClick={() => {
            setQuery('');
            setSearch('');
            setPage(0);
          }}
        >
          All
        </button>
      </form>

      {notice && (
        <div className="flex items-center justify-between rounded border border-green-700 bg-green-950/60 px-3 py-2 text-sm text-green-300">
          <span>{notice}</span>
          <button className="text-xs underline" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}
      {err && <div className="text-sm text-red-400">{err}</div>}
      {!list && !err && <div className="text-sm text-zinc-400">Loading...</div>}

      {list && (
        <>
          <div className="text-[11px] text-zinc-500">
            {search
              ? 'Matches for "' + search + '"'
              : 'Most recently seen first'}
          </div>
          {list.users.length === 0 && (
            <div className="text-sm text-zinc-500">No players found.</div>
          )}
          <div className="space-y-1">
            {list.users.map((u) => (
              <button
                key={u.userId}
                className="flex w-full items-center justify-between rounded bg-zinc-800 p-2 text-left hover:bg-zinc-700"
                onClick={() => {
                  setNotice(null);
                  setSelected(u.userId);
                }}
              >
                <span className="text-sm">u/{u.username}</span>
                <span className="text-[11px] text-zinc-500">
                  seen {when(u.lastSeen)}
                </span>
              </button>
            ))}
          </div>
          {!search && (
            <div className="flex justify-center gap-2">
              <button
                className="rounded bg-zinc-700 px-3 py-1 text-sm disabled:opacity-30"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Prev
              </button>
              <span className="py-1 text-sm text-zinc-400">
                Page {page + 1}
              </span>
              <button
                className="rounded bg-zinc-700 px-3 py-1 text-sm disabled:opacity-30"
                disabled={!list.more}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/** The profile fields worth a glance before reading the raw hash. */
const SUMMARY: [string, string][] = [
  ['coins', 'Coins'],
  ['gems', 'Gems'],
  ['trophies', 'Trophies'],
  ['ascension', 'Ascension'],
  ['progress', 'Map progress'],
  ['heartPieces', 'Heart pieces'],
  ['duelCls', 'Duel class'],
  ['duelWeekDuels', 'Duels this week'],
];

const prettyField = (v: string) => {
  try {
    const parsed: unknown = JSON.parse(v);
    return typeof parsed === 'object' && parsed !== null
      ? JSON.stringify(parsed, null, 1)
      : v;
  } catch {
    return v;
  }
};

const PlayerDetail = ({
  userId,
  onBack,
}: {
  userId: string;
  onBack: (notice?: string) => void;
}) => {
  const [notice, setNotice] = useState<string | null>(null);
  // Bumped after a gift, to re-read the profile it changed.
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<{
    data: AdminUserResponse | null;
    err: string | null;
  }>({ data: null, err: null });
  const { data, err } = result;
  const load = () => setRequest((n) => n + 1);

  useEffect(() => {
    let live = true;
    adminApi
      .user(userId)
      .then((d) => live && setResult({ data: d, err: null }))
      .catch(
        (e: unknown) => live && setResult({ data: null, err: errText(e) })
      );
    return () => {
      live = false;
    };
  }, [userId, request]);

  return (
    <div className="space-y-3">
      <button
        className="text-sm text-blue-400 underline"
        onClick={() => onBack()}
      >
        &larr; Back to list
      </button>
      {err && <div className="text-sm text-red-400">{err}</div>}
      {!data && !err && <div className="text-sm text-zinc-400">Loading...</div>}
      {notice && (
        <div className="rounded border border-green-700 bg-green-950/60 px-3 py-2 text-sm text-green-300">
          {notice}
        </div>
      )}
      {data && (
        <>
          <div>
            <h3 className="text-lg font-bold">u/{data.user.username}</h3>
            <div className="font-mono text-[11px] text-zinc-500">
              {data.user.userId}
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              First seen {when(data.user.firstSeen)} · last seen{' '}
              {when(data.user.lastSeen)}
              {data.inPool ? ' · in the duel pool' : ''}
            </div>
          </div>

          {Object.keys(data.raw).length === 0 ? (
            <div className="text-sm text-zinc-500">
              No saved profile - a fresh account, or one that was reset.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SUMMARY.map(([k, label]) => (
                  <div
                    key={k}
                    className="rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1.5"
                  >
                    <div className="text-[10px] text-zinc-500">{label}</div>
                    <div className="font-mono text-sm">
                      {data.raw[k] || '-'}
                    </div>
                  </div>
                ))}
              </div>
              <details className="rounded border border-zinc-800">
                <summary className="cursor-pointer px-2 py-1.5 text-xs text-zinc-400">
                  Raw profile ({Object.keys(data.raw).length} fields)
                </summary>
                <div className="space-y-1 p-2">
                  {Object.entries(data.raw)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([k, v]) => (
                      <div key={k} className="text-xs">
                        <span className="text-zinc-400">{k}: </span>
                        <pre className="inline whitespace-pre-wrap break-all font-mono text-zinc-200">
                          {prettyField(v)}
                        </pre>
                      </div>
                    ))}
                </div>
              </details>
            </>
          )}

          <GiftForm
            userId={userId}
            onDone={(msg) => {
              setNotice(msg);
              load();
            }}
          />
          <ResetBox
            userId={userId}
            username={data.user.username}
            onDone={(msg) => onBack(msg)}
          />
        </>
      )}
    </div>
  );
};

const GIFT_FIELDS = [
  ['coins', 'Coins'],
  ['gems', 'Gems'],
  ['heartPieces', 'Heart pieces'],
] as const;

const GiftForm = ({
  userId,
  onDone,
}: {
  userId: string;
  onDone: (msg: string) => void;
}) => {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const n = (k: string) => {
    const v = Math.floor(Number(amounts[k] || 0));
    return Number.isFinite(v) && v > 0 ? v : 0;
  };

  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      const packs: Record<string, number> = {};
      for (const p of PACKS)
        if (n('pack:' + p.id)) packs[p.id] = n('pack:' + p.id);
      const res = await adminApi.gift(userId, {
        ...(n('coins') ? { coins: n('coins') } : {}),
        ...(n('gems') ? { gems: n('gems') } : {}),
        ...(n('heartPieces') ? { heartPieces: n('heartPieces') } : {}),
        ...(Object.keys(packs).length ? { packs } : {}),
      });
      setAmounts({});
      onDone(res.message);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const input = (key: string, label: string) => (
    <label key={key} className="flex flex-col gap-1 text-[11px] text-zinc-400">
      {label}
      <input
        type="number"
        min={0}
        max={MAX_GIFT_AMOUNT}
        inputMode="numeric"
        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white"
        value={amounts[key] ?? ''}
        onChange={(e) => setAmounts((a) => ({ ...a, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <div className="space-y-2 rounded border border-amber-800/60 p-3">
      <h4 className="text-sm text-amber-400">Gift</h4>
      <div className="grid grid-cols-3 gap-2">
        {GIFT_FIELDS.map(([k, label]) => input(k, label))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PACKS.map((p) => input('pack:' + p.id, p.name))}
      </div>
      {err && <div className="text-xs text-red-400">{err}</div>}
      <button
        className="rounded bg-amber-600 px-4 py-2 text-sm font-bold disabled:opacity-50"
        disabled={busy}
        onClick={() => void send()}
      >
        {busy ? 'Sending...' : 'Send gift'}
      </button>
    </div>
  );
};

const ResetBox = ({
  userId,
  username,
  onDone,
}: {
  userId: string;
  username: string;
  onDone: (msg: string) => void;
}) => {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const reset = async () => {
    setBusy(true);
    setErr(null);
    try {
      onDone((await adminApi.reset(userId)).message);
    } catch (e) {
      setErr(errText(e));
      setBusy(false);
    }
  };
  return (
    <div className="rounded border border-red-800 p-3">
      <h4 className="mb-2 text-sm text-red-400">Danger zone</h4>
      {!armed ? (
        <button
          className="rounded bg-red-700 px-4 py-2 text-sm font-bold hover:bg-red-600"
          onClick={() => setArmed(true)}
        >
          Reset progress
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-red-300">
            Permanently wipe <span className="font-bold">u/{username}</span>{' '}
            back to a fresh account? Coins, gems, gear, packs, map progress,
            trophies and this period's quests are deleted, and they leave the
            duel pool. Post ladder scores are kept.
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
