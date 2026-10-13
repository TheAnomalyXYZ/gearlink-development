import './index.css';

import { StrictMode, Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api.js';
import type { ChallengeResponse, WarChestPost } from '../shared/api.js';
import { requestExpandedMode, showToast } from '@devvit/web/client';
import { Challenge } from './splash-card.js';
import { Chest } from './splash-chest.js';
import { Daily } from './splash-daily.js';
import { Enter as ClaimButton } from './splash-enter.js';
import { General } from './splash-general.js';
import { SHELL } from './splash-style.js';

/** The general post is a playable battle for a signed-in reader. The game is
 *  its own chunk, fetched only here, so the other post types stay light. */
const PostGame = lazy(() =>
  import('./postGame.js').then((m) => ({ default: m.PostGame }))
);

/** The claim button, wired to open the post: that is a host call, so it
 *  lives with the entry point rather than with the button. */
const Enter = (p: { label: string; sparkle?: boolean }) => (
  <ClaimButton
    {...p}
    onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
  />
);

const toast = (msg: string) => {
  try {
    showToast(msg);
  } catch {
    /* a toast is a nicety; the card itself shows the new tally */
  }
};

/**
 * A War Chest post, with giving wired up. The donation goes to the server and
 * the card adopts the chest and wallet that come back, so the bar moves the
 * moment the coins land - the reader's own gift is the first thing they see.
 */
const GiveableChest = ({
  initial,
  signedIn,
}: {
  initial: WarChestPost;
  signedIn: boolean;
}) => {
  const [post, setPost] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);

  const give = (amount: number) => {
    if (busy !== null) return;
    setBusy(amount);
    void api
      .donate(amount)
      .then((r) => {
        setPost((p) =>
          // A gift that lands after Monday's reset went to the new week's
          // chest; this post keeps its own week and simply reads as sealed.
          r.chest.week === p.chest.week
            ? { chest: r.chest, ended: false, coins: r.profile.coins }
            : { ...p, ended: true, coins: r.profile.coins }
        );
        toast(r.message);
      })
      .catch((e: unknown) =>
        toast(e instanceof Error ? e.message : 'Could not give right now.')
      )
      .finally(() => setBusy(null));
  };

  return (
    <Chest
      post={post}
      signedIn={signedIn}
      busy={busy}
      onGive={give}
      cta={<Enter label="PLAY" />}
    />
  );
};

/**
 * The inline view, as it appears in the feed.
 *
 * Deliberately tiny up front: no engine, no profile fetch, no card table. It
 * asks the server one question - what should this post draw? - and the server
 * answers with finished image paths, so nothing here has to know what a rank
 * or a piece of gear looks like.
 *
 * Four answers. A CHALLENGE post gets the duellist who made it. A Daily
 * Battle post gets the day's poster - its foe, its region and the top of its
 * own ladder. A War Chest post gets the subreddit's chest, with giving right
 * there in the feed. Every other post is a playable battle: the game chunk is
 * fetched only then, with the general splash shown while it loads and to a
 * logged-out reader. Until the answer lands the card is a bare dark shell, so
 * a challenge or daily post never flashes the general splash first; if the
 * lookup fails, the general splash is drawn.
 */
export const Splash = () => {
  const [res, setRes] = useState<ChallengeResponse | null>(null);

  useEffect(() => {
    let live = true;
    void api
      .challengeCard()
      .then((r) => {
        if (live) setRes(r);
      })
      .catch(() => {
        if (live)
          setRes({
            type: 'challengeCard',
            card: null,
            poster: null,
            chest: null,
            viewer: null,
          });
      });
    return () => {
      live = false;
    };
  }, []);

  if (!res) return <div className="h-screen w-full" style={SHELL} />;
  if (res.card)
    return (
      <Challenge
        card={res.card}
        viewer={res.viewer}
        cta={<Enter label="ACCEPT THE CHALLENGE" sparkle />}
      />
    );
  if (res.chest)
    return <GiveableChest initial={res.chest} signedIn={!!res.viewer} />;
  if (res.poster)
    return (
      <Daily
        poster={res.poster}
        cta={<Enter label="PLAY TODAY'S BATTLE" sparkle />}
        endedCta={<Enter label="PLAY" />}
      />
    );
  const general = <General cta={<Enter label="PLAY NOW" sparkle />} />;
  // A logged-out reader has no profile to play with: they get the splash.
  if (!res.viewer) return general;
  return (
    <Suspense fallback={general}>
      <PostGame />
    </Suspense>
  );
};

/* Mounting is guarded so the module can also be imported for a render test,
   where there is no document to mount into. */
const root =
  typeof document === 'undefined' ? null : document.getElementById('root');
if (root)
  createRoot(root).render(
    <StrictMode>
      <Splash />
    </StrictMode>
  );
