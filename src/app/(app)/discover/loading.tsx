export default function Loading() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-5" aria-busy="true" aria-label="Loading discovery">
      <div className="skeleton h-9 w-36 rounded-lg" />
      <div className="skeleton h-11 rounded-xl" />
      <div className="flex gap-2 overflow-hidden">
        {[64, 88, 72, 80].map((width) => <div key={width} className="skeleton h-9 shrink-0 rounded-full" style={{ width }} />)}
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="skeleton h-[74px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
