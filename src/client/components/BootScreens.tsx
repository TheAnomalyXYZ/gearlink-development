/** What shows before the profile lands, and what shows if it never does. */

const shellStyle = {
  minHeight: '100vh',
  background: '#0B1020',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  fontFamily: 'Volter,ui-monospace,monospace',
} as const;

const titleFont = 'VolterTitle,Volter,monospace';

export const Booting = () => (
  <div style={shellStyle}>
    <div style={{ fontFamily: titleFont, fontSize: 16, color: '#FFF2B0' }}>
      LOADING THE FORGE...
    </div>
  </div>
);

export const Fatal = ({ message }: { message: string }) => (
  <div style={shellStyle}>
    <div
      style={{
        maxWidth: '36ch',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontFamily: titleFont, fontSize: 16, color: '#FF9EA1' }}>
        CANNOT OPEN THE FORGE
      </div>
      <div style={{ fontSize: 12, color: '#CBD9EC', lineHeight: 1.6 }}>
        {message}
      </div>
    </div>
  </div>
);
