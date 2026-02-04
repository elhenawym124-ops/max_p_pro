export type SidebarLayoutType = 'classic' | 'three-tier' | 'horizontal' | 'floating' | 'minimal';

export interface SidebarItem {
    to: string;
    icon?: any; // ReactNode or componentsdsdsdsed
    label: string;
    external?: boolean;
    badge?: string;
    children?: { to: string; label: string; hidden?: boolean }[];
    hidden?: boolean;
}

export interface SidebarSection {
    id: string;
    title: string;
    icon?: any;
    items: SidebarItem[];
    hidden?: boolean;
}
