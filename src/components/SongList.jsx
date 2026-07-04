import SongCard from './SongCard.jsx';

export default function SongList({ songs, onNoteChange, onDismissChanged }) {
  if (!songs.length) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-[16px] font-semibold text-[var(--dim)]">No songs in this plan</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {songs.map((song, idx) => (
        <SongCard
          key={song.id}
          index={idx}
          animationDelay={idx * 0.07}
          onNoteChange={onNoteChange}
          onDismissChanged={() => onDismissChanged?.(song.id)}
          {...song}
        />
      ))}
    </div>
  );
}
