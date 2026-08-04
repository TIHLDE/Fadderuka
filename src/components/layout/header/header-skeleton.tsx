import { Skeleton } from "~/components/ui/skeleton";

/**
 * Speiler oppsettet i HeaderButtonsWrapper — logo, nav (bare fra md) og
 * høyreklyngen — så headeren ikke hopper når sesjonen lander.
 */
const HeaderSkeleton = () => {
  return (
    <>
      <Skeleton className="h-8 w-40 shrink-0" />

      <div className="hidden items-center gap-1 md:flex">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-32" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="size-8 rounded-full" />
      </div>
    </>
  );
};

export default HeaderSkeleton;
