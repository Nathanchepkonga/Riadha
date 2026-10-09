/** Shown while a screen's data loads: a branded skeleton with the diagonal sheen. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-4" aria-busy="true" aria-label="Loading">
      <div className="skeleton-dark skeleton h-40 rounded-[28px]" />
      <div className="skeleton h-11 rounded-lg" />
      <div className="flex gap-2">
        {[64, 88, 72, 80].map((w) => (
          <div key={w} className="skeleton h-9 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="skeleton aspect-[4/5] rounded-3xl" />
      <div className="skeleton h-24 rounded-2xl" />
    </div>
  );
}
