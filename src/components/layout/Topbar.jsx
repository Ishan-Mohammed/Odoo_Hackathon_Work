import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, LogOut, Menu, UserCheck, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '../ui/ConfirmDialog';
import { resetStore } from '../../api/mock/store';

export default function Topbar({ onToggleMobile = () => {} }) {
  const { user, role, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Ctrl+K / Cmd+K focuses search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResetConfirm = () => {
    try {
      resetStore();
      toast.success('Demo data restored to initial state');
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (err) {
      toast.error('Failed to reset demo data');
    }
  };

  const roleStyles = {
    admin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    staff: 'bg-teal-50 text-teal-700 border-teal-200',
    customer: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const badgeClass = roleStyles[role] || roleStyles.staff;

  return (
    <>
      <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between sticky top-0 z-10 select-none">
        {/* Left: Mobile Hamburger & Search Input */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            type="button"
            onClick={onToggleMobile}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Search Input with Ctrl+K shortcut badge */}
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search subscriptions, invoices, customers..."
              className="w-full h-9 pl-9 pr-14 text-xs rounded-xl bg-slate-50 border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 transition-all duration-150"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center">
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded">
                Ctrl K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: Notifications & User Menu */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-600" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" aria-hidden="true" />

          {/* User Profile Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              className="flex items-center gap-2.5 p-1.5 pr-2 rounded-xl hover:bg-slate-100/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-soft-xs">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                  {user?.name || 'User'}
                </span>
                <span className={`block text-[10px] uppercase tracking-wider font-semibold ${role === 'staff' ? 'text-teal-600' : 'text-slate-400'}`}>
                  {role === 'staff' ? 'Staff' : role}
                </span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-dropdown p-2 text-xs z-30 animate-modal-in">
                {/* User details header */}
                <div className="p-2 border-b border-slate-100 mb-1 space-y-1">
                  <p className="font-bold text-slate-900 text-sm truncate">{user?.name || 'User'}</p>
                  <p className="text-slate-500 text-[11px] truncate">{user?.email}</p>
                  <div className="pt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${badgeClass}`}
                    >
                      {role === 'staff' ? 'Staff' : `${role} access`}
                    </span>
                  </div>
                </div>

                {role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setIsResetDialogOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-amber-700 hover:bg-amber-50 font-medium transition-colors text-left"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Reset demo data</span>
                  </button>
                )}

                {/* Logout Option */}
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-medium transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Admin Reset Demo Data Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetConfirm}
        title="Reset Demo Data?"
        message="This will reset all subscriptions, customers, catalog items, and invoices to the initial seed state. This cannot be undone."
        confirmText="Reset All Data"
        variant="warning"
      />
    </>
  );
}
