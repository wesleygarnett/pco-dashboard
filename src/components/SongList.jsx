import SongCard from './SongCard.jsx';

export default function SongList({ songs, onNoteChange, onDismissChanged, canEditShots, onEditShots }) {
  if (!songs.length) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-[16px] font-semibold text-[var(--dim)]">No songs in this plan</div>
      </div>
    );
  }

  return (
    // Below lg: a single-column grid whose auto-rows are 1fr, so every card is
    // sized to the tallest one and the list reads as a uniform stack. At lg the
    // cards go back to flex-filling the fixed-height wall layout.
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 [grid-auto-rows:1fr] lg:flex lg:flex-col lg:[grid-auto-rows:auto]">
      {songs.map((song, idx) => (
        <SongCard
          key={song.id}
          index={idx}
          animationDelay={idx * 0.07}
          onNoteChange={onNoteChange}
          onDismissChanged={() => onDismissChanged?.(song.id)}
          canEditShots={canEditShots}
          onEditShots={() => onEditShots?.(song)}
          {...song}
        />
      ))}
    </div>
  );
}
