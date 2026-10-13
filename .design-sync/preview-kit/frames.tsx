/**
 * Preview-only frames. Not part of the bundle.
 *
 * The feed cards and full-screen views size themselves to their viewport
 * (`h-screen`, `vh`), because on Reddit they ARE the viewport: a Devvit
 * webview. So a template story renders the real component inside an iframe
 * of the exact slot size - the card page reloads itself with `?story=<name>`
 * in a frame named `gl-frame`, and inside that frame the wrappers below
 * render only their children.
 */
import type { ReactNode } from 'react';

const NAME = 'gl-frame';
const inner = typeof window !== 'undefined' && window.name === NAME;

if (inner) {
  // The framed page is the webview itself: no gutter, no page colour.
  for (const el of [document.documentElement, document.body]) {
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('background', 'transparent', 'important');
  }
}

const storyUrl = (story: string): string => {
  const u = new URL(window.location.href);
  u.searchParams.set('story', story);
  return u.toString();
};

/** The webview: an iframe of exactly `w` x `h` running `story`. */
const Webview = ({
  story,
  w,
  h,
  radius = 0,
}: {
  story: string;
  w: number | string;
  h: number;
  radius?: number;
}) => (
  <iframe
    name={NAME}
    title={story}
    src={storyUrl(story)}
    style={{
      display: 'block',
      width: w,
      height: h,
      border: 0,
      borderRadius: radius,
      background: '#0B1020',
    }}
  />
);

const SUB = { name: 'r/Gearlink', icon: '/icons/BattlePassIcon.svg' };

const PostHeader = ({ title, pad }: { title: string; pad: number }) => (
  <div style={{ padding: `0 ${pad}px`, fontFamily: 'system-ui,sans-serif' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8BA2AD' }}>
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: `#1D2956 url(${SUB.icon}) center/16px no-repeat`,
        }}
      />
      <span style={{ color: '#F2F4F5', fontWeight: 600 }}>{SUB.name}</span>
      <span>· 2h</span>
    </div>
    <div style={{ margin: '8px 0 10px', fontSize: 17, fontWeight: 600, color: '#F2F4F5', lineHeight: 1.3 }}>
      {title}
    </div>
  </div>
);

/** A feed post on desktop: header, then the inline webview at post width. */
export const DesktopPost = ({
  story,
  title,
  children,
}: {
  story: string;
  title: string;
  children: ReactNode;
}) =>
  inner ? (
    <>{children}</>
  ) : (
    <div style={{ width: 720, margin: '0 auto' }}>
      <PostHeader title={title} pad={0} />
      <Webview story={story} w={720} h={512} radius={16} />
    </div>
  );

/** A phone: the Reddit app feed, post edge to edge. */
const Phone = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      width: 390 + 20,
      margin: '0 auto',
      padding: 10,
      borderRadius: 48,
      background: '#000',
      boxShadow: '0 0 0 2px #2A3236',
    }}
  >
    <div style={{ overflow: 'hidden', borderRadius: 38, background: '#0B1416', paddingTop: 18 }}>
      {children}
    </div>
  </div>
);

/** A feed post in the mobile app. */
export const MobilePost = ({
  story,
  title,
  children,
}: {
  story: string;
  title: string;
  children: ReactNode;
}) =>
  inner ? (
    <>{children}</>
  ) : (
    <Phone>
      <PostHeader title={title} pad={14} />
      <Webview story={story} w={390} h={512} />
      <div style={{ height: 18 }} />
    </Phone>
  );

/** The expanded game on desktop: a landscape webview. */
export const DesktopScreen = ({ story, children }: { story: string; children: ReactNode }) =>
  inner ? <>{children}</> : <Webview story={story} w="100%" h={600} radius={16} />;

/** The expanded game on a phone: the webview is the whole screen. */
export const MobileScreen = ({ story, children }: { story: string; children: ReactNode }) =>
  inner ? (
    <>{children}</>
  ) : (
    <Phone>
      <Webview story={story} w={390} h={780} />
    </Phone>
  );

/** Game pieces: centred on the game's stage, filling the cell. */
export const Stage = ({ children, w }: { children: ReactNode; w?: number }) => (
  <div
    style={{
      width: w,
      margin: '0 auto',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 16,
      padding: 16,
      fontFamily: 'Volter,ui-monospace,monospace',
      color: '#FFF',
    }}
  >
    {children}
  </div>
);

/** Admin pieces: the dashboard's text colours and font. */
export const AdminStage = ({ children }: { children: ReactNode }) => (
  <div className="font-sans text-zinc-100" style={{ padding: 4 }}>
    {children}
  </div>
);
