/**
 * 💀 Skeleton Loaders for HR Pages
 * مكونات Loading محسّنة لصفحات الموارد البشرية
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const EmployeeCardSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
    <div className="w-12 h-12 bg-gray-200 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-1/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
    <div className="h-8 w-20 bg-gray-200 rounded" />
  </div>
);

export const EmployeeTableSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="flex items-center gap-4 p-4 border-b animate-pulse">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex-1 grid grid-cols-5 gap-4">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded" />
      </div>
    ))}
  </div>
);

export const AttendanceTableSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="flex items-center gap-4 p-4 border-b animate-pulse">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex-1 grid grid-cols-6 gap-4">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
      <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
    </CardContent>
  </Card>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Stats Cards */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>

    {/* Main Content */}
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export const FormSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="space-y-2 animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    ))}
  </div>
);
