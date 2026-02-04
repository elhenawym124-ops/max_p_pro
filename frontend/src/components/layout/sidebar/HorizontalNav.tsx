import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { SidebarSection } from '../../../types/layout';
import { buildStoreUrl } from '../../../utils/storeUrl';
import { useAuth } from '../../../hooks/useAuthSimple';

interface HorizontalNavProps {
    sections: SidebarSection[];
    currentPath: string;
    t: (key: string) => string;
}

const HorizontalNav: React.FC<HorizontalNavProps> = ({
    sections,
    currentPath,
}) => {
    const { user } = useAuth();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

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
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-right"
                >
                    <span className="text-gray-400 mr-2">
                        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement, {
                            className: "h-4 w-4"
                        })}
                    </span>
                    <span className="flex-1 truncate">{children}</span>
                    {badge && (
                        <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                            {badge}
                        </span>
                    )}
                </a>
            );
        }

        return (
            <Link
                to={to}
                className={`flex items-center px-4 py-2 text-sm text-right w-full transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
            >
                <span className={`${isActive ? 'text-blue-500' : 'text-gray-400'} mr-2`}>
                    {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement, {
                        className: "h-4 w-4"
                    })}
                </span>
                <span className="flex-1 truncate">{children}</span>
                {badge && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                        {badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm w-full z-20">
            <div className="container mx-auto px-4">
                <div className="flex items-center h-14 overflow-x-auto no-scrollbar gap-1">
                    {/* Brand / Home */}
                    <div className="flex-shrink-0 ml-4 flex items-center">
                        <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            {user?.company?.name?.charAt(0) || 'M'}
                        </div>
                    </div>

                    {/* Navigation Items */}
                    {sections.filter(s => !s.hidden).map(section => {
                        const isActive = section.items.some(item => item.to === currentPath);
                        const isOpen = openDropdown === section.id;

                        return (
                            <div
                                key={section.id}
                                className="relative group"
                                onMouseEnter={() => setOpenDropdown(section.id)}
                                onMouseLeave={() => setOpenDropdown(null)}
                            >
                                <button
                                    className={`flex items-center space-x-1 space-x-reverse px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive || isOpen
                                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    {React.isValidElement(section.icon) && React.cloneElement(section.icon as React.ReactElement, {
                                        className: "h-5 w-5 ml-1"
                                    })}
                                    <span className="whitespace-nowrap">{section.title}</span>
                                    <ChevronDownIcon className={`h-3 w-3 mr-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                            <span className="text-xs font-semibold text-gray-500 uppercase">{section.title}</span>
                                        </div>
                                        {section.items.filter(i => !i.hidden).map(item => (
                                            <div key={item.to} className="space-y-0.5">
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
                                                    <div className="mr-8 py-1 space-y-0.5 border-r border-gray-100 dark:border-gray-700/50">
                                                        {item.children.filter(c => !c.hidden).map(child => {
                                                            const isChildActive = currentPath === child.to;
                                                            return (
                                                                <Link
                                                                    key={child.to}
                                                                    to={child.to}
                                                                    className={`block px-4 py-1.5 text-[11px] font-medium transition-colors text-right ${isChildActive
                                                                        ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                                                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                                        }`}
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
                                )}
                            </div>
                        );
                    })}

                    {/* Spacer */}
                    <div className="flex-1"></div>
                </div>
            </div>
        </div>
    );
};

export default HorizontalNav;
