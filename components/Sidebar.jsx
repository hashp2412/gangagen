/**
 * Reusable Sidebar Component
 *
 * This is a navigation sidebar that appears on the left side of the application.
 * It can be used across different pages (Dashboard, ProteinDetails, etc.)
 *
 * Props:
 * - activeSection: The currently active menu item (string)
 * - onSectionChange: Function called when a menu item is clicked
 * - onLogout: Function called when logout button is clicked
 * - menuItems: Array of menu items to display (optional, uses default if not provided)
 */

'use client';

import {
  Search,
  Database,
  History,
  LogOut
} from 'lucide-react';

// Default menu items if none are provided
const defaultMenuItems = [
  { id: 'explore', label: 'Explore Database', icon: Database },
  { id: 'search', label: 'Search Sequence', icon: Search },
  { id: 'saved', label: 'Saved Queries', icon: History },
];

export default function Sidebar({
  activeSection,
  onSectionChange,
  onLogout,
  menuItems = defaultMenuItems
}) {
  return (
    <div className="w-80 sidebar-linear flex flex-col rounded-r-3xl shadow-4xl">
      <nav className="mt-8 px-6 flex flex-col gap-y-2">
        <div className="mb-6 px-2">
          <div className="text-xl gradient-text-modern font-semibold tracking-wide">
            GangaGen AI EctoLysin
          </div>
          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">
            Powered by Orbuculum
          </div>
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`menu-item-linear w-full flex items-center px-6 py-3 text-left text-sm font-normal tracking-wide rounded-xl transition-all ${activeSection === item.id
                  ? 'active'
                  : 'text-linear-text-secondary hover:text-linear-text-primary'
                }`}
            >
              <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={onLogout}
          className="menu-item-linear w-full flex items-center px-6 py-3 text-left text-sm font-normal tracking-wide text-red-500 hover:bg-red-50 rounded-xl transition-all mt-4"
        >
          <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
