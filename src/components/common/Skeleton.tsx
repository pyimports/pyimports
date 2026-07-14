import React from "react";

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton = ({ className = "" }: SkeletonProps) => (
  <div className={`skeleton ${className}`} />
);

export const SkeletonText = ({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
      />
    ))}
  </div>
);

export const ProductCardSkeleton = () => (
  <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden p-4 space-y-4">
    <Skeleton className="h-48 w-full rounded-xl" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-6 w-1/2" />
    <Skeleton className="h-10 w-full rounded-xl" />
  </div>
);

export const TableRowSkeleton = ({ cols = 5 }: { cols?: number }) => (
  <tr className="border-b border-dark-border">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

export const StatCardSkeleton = () => (
  <div className="bg-dark-surface border border-dark-border rounded-2xl p-5 space-y-3">
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-8 w-2/3" />
    <Skeleton className="h-3 w-1/3" />
  </div>
);
