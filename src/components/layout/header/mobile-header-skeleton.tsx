import { Skeleton } from "~/components/ui/skeleton";

const MobileHeaderSkeleton = () => {
  return (
    <div className="flex w-full items-center justify-between">
      <Skeleton className="h-9 w-9 rounded-md" />
      <Skeleton className="h-8 w-24" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>
  );
};

export default MobileHeaderSkeleton;
