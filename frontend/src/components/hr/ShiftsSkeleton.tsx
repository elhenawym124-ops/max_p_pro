import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const ShiftsSkeleton: React.FC<{ viewMode?: 'grid' | 'table' }> = ({ viewMode = 'grid' }) => {
    if (viewMode === 'table') {
        return (
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-right">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                                    </th>
                                    <th className="px-6 py-3 text-right">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                                    </th>
                                    <th className="px-6 py-3 text-right">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                                    </th>
                                    <th className="px-6 py-3 text-right">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                                    </th>
                                    <th className="px-6 py-3 text-right">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                                    </th>
                                    <th className="px-6 py-3 text-right">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                                    </th>
                                    <th className="px-6 py-3 text-right">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                                    </th>
                                    <th className="px-6 py-3 text-right">
                                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...Array(5)].map((_, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-12 animate-pulse" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Grid view skeleton
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
                            </div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16 animate-pulse" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-12 animate-pulse" />
                            </div>
                            <div className="flex flex-col gap-2 mt-4">
                                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
                                <div className="flex gap-2">
                                    <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded flex-1 animate-pulse" />
                                    <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-9 animate-pulse" />
                                    <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-9 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default ShiftsSkeleton;
