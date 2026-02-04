import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ChevronRightIcon,
    MagnifyingGlassIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { SidebarSection } from '../../../types/layout';
import { buildStoreUrl } from '../../../utils/storeUrl';
import { useAuth } from '../../../hooks/useAuthSimple';
import { envConfig } from '../../../config/environment';

interface ThreeTierSidebarProps {
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

const ThreeTierSidebar: React.FC<ThreeTierSidebarProps> = ({
    isCollapsed,
    toggleSidebar,
    sections,
    currentPath,
    searchQuery,
    setSearchQuery
}) => {
    const { user } = useAuth();

    // Find which section is active based on current path
    const findActiveSection = () => {
        return sections.find(section =>
            section.items.some(item => currentPath === item.to)
        )?.id || sections[0]?.id || '';
    };

    const [activeSectionId, setActiveSectionId] = useState<string>(findActiveSection());

    // Update active section when path changes, but only if we are not manually exploring
    useEffect(() => {
        const section = sections.find(s => s.items.some(i => i.to === currentPath));
        if (section) {
            setActiveSectionId(section.id);
        }
    }, [currentPath, sections]);

    const activeSection = sections.find(s => s.id === activeSectionId);

    // Helper for navigation links
    const NavLink: React.FC<{
        to: string;
        icon: React.ReactNode;
        children: React.ReactNode;
        external?: boolean;
        badge?: string;
    }> = ({ to, icon, children, external, badge }) => {
        const isActive = !external && currentPath === to;

        if (external) {
            const slug = user?.company?.slug;
            const customDomain = user?.company?.customDomain;
            let shopUrl = to;

            if (slug && slug.trim().length > 0) {
                shopUrl = buildStoreUrl(slug, to, customDomain || undefined);
            }

            return (
                <a
                    href={shopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-3 py-2 rounded-md transition-all duration-200 group text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 mx-2"
                >
                    <span className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mr-3">
                        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement, {
                            className: "h-4 w-4"
                        })}
                    </span>
                    <span className="text-sm font-medium truncate flex-1">
                        {children}
                    </span>
                </a>
            );
        }

        return (
            <Link
                to={to}
                className={`flex items-center px-3 py-2 rounded-md transition-all duration-200 group mx-2 ${isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } `}
            >
                <span className={`${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'} mr-3`}>
                    {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement, {
                        className: "h-4 w-4"
                    })}
                </span>
                <span className="text-sm font-medium truncate flex-1">{children}</span>
                {badge && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                        {badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <div className="flex h-full shadow-xl">
            {/* 1st Tier: Icon Rail */}
            <div className="w-20 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col items-center py-4 z-20">
                <div className="mb-6">
                    {/* Company Logo */}
                    {user?.company?.logo ? (
                        <img
                            src={`${envConfig.backendUrl}${user.company.logo}`}
                            alt={user?.company?.name}
                            className="h-12 w-12 rounded-xl object-cover shadow-lg border-2 border-gray-200 dark:border-gray-600"
                            title={user?.company?.name}
                        />
                    ) : (
                        <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg" title={user?.company?.name}>
                            {user?.company?.name?.charAt(0) || 'M'}
                        </div>
                    )}
                </div>

                <div className="flex-1 w-full space-y-2 px-2 overflow-y-auto no-scrollbar">
                    {sections.filter(s => !s.hidden).map(section => {
                        const isActive = activeSectionId === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => {
                                    setActiveSectionId(section.id);
                                    if (isCollapsed) toggleSidebar(); // Auto-expand if clicking rail
                                }}
                                className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 group relative ${isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                title={section.title}
                            >
                                {React.isValidElement(section.icon) && React.cloneElement(section.icon as React.ReactElement, {
                                    className: `h-6 w-6 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`
                                })}
                                <span className="text-[10px] mt-1 font-medium truncate max-w-full px-1">{section.title.split(' ')[0]}</span>

                                {/* Active Indicator */}
                                {isActive && (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-l-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

            </div>

            {/* 2nd Tier: Submenu Panel */}
            <div
                className={`${isCollapsed ? 'w-0 opacity-0' : 'w-64 opacity-100'} bg-gray-50 dark:bg-gray-800/50 border-l border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}
            >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-3">
                        {/* Company Logo */}
                        {user?.company?.logo ? (
                            <img
                                src={`${envConfig.backendUrl}${user.company.logo}`}
                                alt={user?.company?.name}
                                className="h-10 w-10 rounded-lg object-cover shadow border border-gray-200 dark:border-gray-600"
                            />
                        ) : (
                            <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow">
                                {user?.company?.name?.charAt(0) || 'M'}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h2 className="font-extrabold text-gray-900 dark:text-white truncate text-base leading-tight">
                                {user?.company?.name || 'الشركة'}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {activeSection?.title}
                            </p>
                        </div>
                        <button onClick={toggleSidebar} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Search Bar - Only in 2nd Tier */}
                <div className="px-3 mt-3 relative">
                    <MagnifyingGlassIcon className="absolute right-6 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="بحث..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-9 pl-8 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                        >
                            <XMarkIcon className="h-3 w-3 text-gray-400" />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    {activeSection?.items.filter(i => !i.hidden).map((item) => (
                        <div key={item.to} className="space-y-1">
                            <NavLink
                                to={item.to}
                                icon={item.icon}
                                external={!!item.external}
                                {...(item.badge ? { badge: item.badge } : {})}
                            >
                                {item.label}
                            </NavLink>

                            {/* Sub-items (Children) */}
                            {item.children && (
                                <div className="mr-9 mt-1 space-y-1 border-r-2 border-gray-100 dark:border-gray-700/50 pr-2">
                                    {item.children.filter(c => !c.hidden).map((child) => {
                                        const isChildActive = currentPath === child.to;
                                        return (
                                            <Link
                                                key={child.to}
                                                to={child.to}
                                                className={`block px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${isChildActive
                                                    ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                    } `}
                                            >
                                                {child.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default ThreeTierSidebar;
