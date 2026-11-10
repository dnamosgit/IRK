import { Skeleton } from '@/components/ui/primitives';

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="container-x py-14">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-10 w-2/3 max-w-xl" />
      <Skeleton className="mt-4 h-4 w-1/2 max-w-md" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white">
            <Skeleton className="aspect-[2/1] rounded-none" />
            <div className="space-y-3 p-5"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
