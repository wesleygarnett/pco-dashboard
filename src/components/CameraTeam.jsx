import CameraSlot from './CameraSlot.jsx';

export default function CameraTeam({ positions }) {
  return (
    <div className="flex shrink-0 items-center justify-center">
      <div
        className="glass-pill flex items-center"
        style={{
          gap: 18,
          padding: '12px 32px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        {positions.map((pos, i) => (
          <div key={i} className="flex items-center" style={{ gap: 18 }}>
            {i > 0 && <div className="h-9 w-px bg-white/[0.12]" />}
            <CameraSlot {...pos} />
          </div>
        ))}
      </div>
    </div>
  );
}
