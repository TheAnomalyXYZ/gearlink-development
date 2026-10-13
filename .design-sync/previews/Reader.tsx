import { Reader } from 'gearlink-ds';
import '../preview-kit/game.module.css';

const Box = ({ children }: { children: React.ReactNode }) => (
  <div style={{ margin: '0 auto', width: 160, height: 220, background: '#101528' }}>{children}</div>
);

/** A signed-in reader takes the open seat, in cold light. */
export const SignedIn = () => (
  <Box>
    <Reader viewer={{ username: 'quietarrow', avatar: '' }} />
  </Box>
);

/** Logged out: the placeholder stands dimmed until someone takes it. */
export const LoggedOut = () => (
  <Box>
    <Reader viewer={null} />
  </Box>
);
