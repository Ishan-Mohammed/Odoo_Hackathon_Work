import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../ui/Logo';
import { LogOut } from 'lucide-react';

export default function PortalShell() {
  const { user, role, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Friendly Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-8">
          <Logo theme="dark" asLink={false} />

          <nav className="hidden sm:flex items-center gap-1">
            <NavLink
              to="/portal"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              My Subscriptions
            </NavLink>

            <NavLink
              to="/portal/invoices"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              My Invoices
            </NavLink>
          </nav>
        </div>

        {/* User Menu */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2.5 p-1.5 pr-2 rounded-xl hover:bg-slate-100/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-500 to-teal-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-soft-xs">
              {user?.name?.[0] || 'C'}
            </div>
            <div className="text-left hidden sm:block">
              <span className="block text-xs font-semibold text-slate-800 leading-tight">
                {user?.name || 'Customer'}
              </span>
              <span className="block text-[10px] text-teal-600 font-semibold uppercase">
                Customer Portal
              </span>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-dropdown p-2 text-xs z-30 animate-modal-in">
              <div className="p-2 border-b border-slate-100 mb-1 space-y-0.5">
                <p className="font-bold text-slate-900 text-sm truncate">{user?.name || 'Customer'}</p>
                <p className="text-slate-500 text-[11px] truncate">{user?.email}</p>
              </div>

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
      </header>

      {/* Main Container max-w 1100px */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-[1100px] mx-auto animate-page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
