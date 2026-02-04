import React from 'react';
import ClassicSidebar from './ClassicSidebar';
import { SidebarSection } from '../../../types/layout';

interface FloatingSidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    sections: SidebarSection[];
    collapsedSections: Record<string, boolean>;
    toggleSection: (id: string) => void;
    currentPath: string;
    t: (key: string) => string;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const FloatingSidebar: React.FC<FloatingSidebarProps> = (props) => {
    return (
        <div className="h-full py-6 px-4 bg-transparent">
            <div className="h-full rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <ClassicSidebar {...props} />
            </div>
        </div>
    );
};

export default FloatingSidebar;
