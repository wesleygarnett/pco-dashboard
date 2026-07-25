import CameraSlot from './CameraSlot.jsx';

export default function CameraTeam({ positions }) {
  return (
    <div className="flex shrink-0 justify-center overflow-x-auto">
      <div
        className="glass-dock mx-auto flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-3 px-5 py-3 sm:gap-x-[18px] sm:px-7 lg:w-max lg:flex-nowrap lg:px-8"
        style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' }}
      >
        {positions.map((pos, i) => (
          <div key={i} className="flex items-center gap-x-4 sm:gap-x-[18px]">
            {i > 0 && <div className="hidden h-9 w-px bg-white/[0.12] lg:block" />}
            <CameraSlot {...pos} />
          </div>
        ))}
      </div>
    </div>
  );
}
