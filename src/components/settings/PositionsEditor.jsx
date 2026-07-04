export default function PositionsEditor({ positions, updatePosition, addPosition, removePosition, resetPositions }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[12px] text-[var(--dim)]">
        Type each position name exactly as it appears in Planning Center. The app will match it automatically. Mark a
        slot as "Highlighted" to give it a distinct style (e.g. directors or leads).
      </div>
      <div className="flex flex-col gap-2">
        {positions.map((pos, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Position name (as it appears in Planning Center)"
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[14px] text-[var(--text)] outline-none"
              value={pos.label}
              onChange={(e) => updatePosition(i, { label: e.target.value })}
            />
            <label className="flex shrink-0 items-center gap-2 text-[13px] text-[var(--muted)]">
              <input
                type="checkbox"
                checked={!!pos.isDir}
                onChange={(e) => updatePosition(i, { isDir: e.target.checked })}
              />
              Highlighted
            </label>
            <button
              type="button"
              onClick={() => removePosition(i)}
              className="shrink-0 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1.5 text-[13px] font-semibold text-[var(--danger)]"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={addPosition}
          className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2 text-[13px] font-semibold text-[var(--text)]"
        >
          Add Position
        </button>
        <button
          type="button"
          onClick={resetPositions}
          className="rounded-lg border border-white/10 bg-white/[0.05] px-4 py-2 text-[13px] font-semibold text-[var(--text)]"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
