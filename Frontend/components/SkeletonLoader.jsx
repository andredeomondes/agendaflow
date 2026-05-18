'use client';
import React from 'react';

function Skeleton({ className = '' }) {
    return (
        <div className={`animate-pulse rounded-lg bg-white/[0.04] ${className}`} />
    );
}

function CardSkeleton() {
    return (
        <div className="glass-card rounded-xl p-5 space-y-3">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-32" />
        </div>
    );
}

function TableSkeleton({ rows = 5, cols = 4 }) {
    return (
        <div className="space-y-3">
            <div className="flex gap-4 pb-3 border-b border-white/[0.06]">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 py-3 border-b border-white/[0.04]">
                    {Array.from({ length: cols }).map((_, c) => (
                        <Skeleton key={c} className={`h-4 ${c === 0 ? 'flex-[2]' : 'flex-1'}`} />
                    ))}
                </div>
            ))}
        </div>
    );
}

function ListSkeleton({ items = 3 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03]">
                    <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/5" />
                        <Skeleton className="h-3 w-2/5" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                </div>
            ))}
        </div>
    );
}

function CalendarSkeleton() {
    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 flex-1" />
                ))}
            </div>
            {Array.from({ length: 5 }).map((_, r) => (
                <div key={r} className="flex gap-2">
                    {Array.from({ length: 7 }).map((_, c) => (
                        <Skeleton key={c} className="h-20 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

function FormSkeleton({ fields = 4 }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: fields }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ))}
            <Skeleton className="h-10 w-32" />
        </div>
    );
}

export { Skeleton, CardSkeleton, TableSkeleton, ListSkeleton, CalendarSkeleton, FormSkeleton };
export default Skeleton;
