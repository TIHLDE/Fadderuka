import { Skeleton } from "~/components/ui/skeleton";

const HeaderSkeleton = () => {
  return (
    <div className="flex w-full items-center gap-3">
      <Skeleton className="h-12 w-[300px]" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-32" />

      <div className="flex w-full justify-end gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10" />
      </div>
    </div>
  );
};

export default HeaderSkeleton;
