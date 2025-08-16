import { Skeleton } from '@/components/ui/skeleton';

export default function TableLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-[1600px]">
      <div className="mb-8">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="space-y-4">
        {/* Toolbar skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Table skeleton */}
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="border-b bg-gray-50 dark:bg-gray-800 p-4">
            <div className="grid grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          </div>

          {/* Rows */}
          {Array.from({ length: 10 }).map((_, rowIndex) => (
            <div key={rowIndex} className="border-b p-4">
              <div className="grid grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, colIndex) => (
                  <Skeleton key={colIndex} className="h-5 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-10" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}