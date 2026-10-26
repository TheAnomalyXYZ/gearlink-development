import './index.css';

import { StrictMode, Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api.js';
import type {
  ChallengeResponse,
  DailyPoster,
  WarChestPost,
} from '../shared/api.js';
import { requestExpandedMode, showToast } from '@devvit/web/client';
import { Booting } from './components/BootScreens.js';
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
 * A Daily Battle post. While the day is live, a signed-in reader is dropped
 * straight into its battle - the game in post mode boots into the fight - and
 * when the battle is over the post turns back into the poster, re-read so the
 * ladder carries the run just played, with PLAY AGAIN on it. A logged-out
 * reader, or a post whose day is over, gets the poster and opens the full
 * game from it.
 */
const PlayableDaily = ({
  poster: initial,
  signedIn,
}: {
  poster: DailyPoster;
  signedIn: boolean;
}) => {
  const [poster, setPoster] = useState(initial);
  const [playing, setPlaying] = useState(
    () => signedIn && Date.now() < initial.endsAt
  );
  // Bumped per battle, so PLAY AGAIN boots a fresh game.
  const [round, setRound] = useState(0);

  const done = () => {
    setPlaying(false);
    void api
      .challengeCard()
      .then((r) => {
        if (r.poster) setPoster(r.poster);
      })
      .catch(() => {
        /* the poster as it was still shows the day */
      });
  };
  const play = () => {
    setRound((n) => n + 1);
    setPlaying(true);
  };

  if (playing)
    return (
      <Suspense fallback={<Booting />}>
        <PostGame key={round} onDailyDone={done} />
      </Suspense>
    );
  return (
    <Daily
      poster={poster}
      cta={
        signedIn ? (
          <ClaimButton label="PLAY AGAIN" sparkle onClick={play} />
        ) : (
          <Enter label="PLAY TODAY'S BATTLE" sparkle />
        )
      }
      endedCta={<Enter label="PLAY" />}
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
 * Battle post opens straight into the day's battle, and turns into its
 * poster - its foe, its region and the top of its own ladder - once the
 * battle is done. A War Chest post gets the subreddit's chest, with giving
 * right there in the feed. Every other post is the game itself: the chunk is
 * fetched only then, behind the game's own loading screen; only a logged-out
 * reader gets the general splash. Until the answer lands the card is a bare
 * dark shell, so a challenge or daily post never flashes the general splash
 * first; if the lookup fails, the general splash is drawn.
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
    return <PlayableDaily poster={res.poster} signedIn={!!res.viewer} />;
  // A logged-out reader has no profile to play with: they get the splash.
  if (!res.viewer) return <General cta={<Enter label="PLAY NOW" sparkle />} />;
  // Everyone else goes straight into the game, with its own loading screen
  // while the chunk lands rather than the logo and a PLAY button.
  return (
    <Suspense fallback={<Booting />}>
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
