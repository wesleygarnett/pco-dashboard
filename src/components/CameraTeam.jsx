import CameraSlot from './CameraSlot.jsx';

export default function CameraTeam({ positions }) {
  return (
    <div className="flex shrink-0 justify-center overflow-x-auto">
      {/* Slots are fixed-width below lg (see CameraSlot), so wrapped rows form
          aligned columns and each row stays centered — the previous ragged
          layout came from slots sizing to their label text. At lg it returns to
          the single-row pill with dividers. */}
      <div
        className="glass-dock mx-auto flex max-w-full flex-wrap items-start justify-center gap-x-4 gap-y-4 px-5 py-4 sm:px-7 lg:w-max lg:flex-nowrap lg:items-center lg:gap-x-5 lg:gap-y-0 lg:px-8 lg:py-3"
        style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' }}
      >
        {positions.map((pos, i) => (
          <div key={i} className="flex items-center justify-center lg:gap-x-5">
            {i > 0 && <div className="hidden h-9 w-px bg-white/[0.12] lg:block" />}
            <CameraSlot {...pos} />
          </div>
        ))}
      </div>
    </div>
  );
}
