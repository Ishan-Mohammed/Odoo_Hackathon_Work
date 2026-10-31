import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../ui/Logo';
import {
  LayoutDashboard,
  Users,
  Package,
  CalendarClock,
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  BarChart3,
  Tag,
  Percent,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

import { FEATURES } from '../../config/features';

export default function Sidebar({ mobileOpen = false, setMobileOpen = () => {} }) {
  const { role } = useAuth();

  // Persist desktop collapsed state in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('brightloop_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('brightloop_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const mainNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'Products', path: '/products', icon: Package },
    { label: 'Plans', path: '/plans', icon: CalendarClock },
    ...(FEATURES.quotationTemplates
      ? [{ label: 'Quotation Templates', path: '/quotation-templates', icon: FileText }]
      : []),
    ...(FEATURES.subscriptionsAdmin
      ? [{ label: 'Subscriptions', path: '/subscriptions', icon: Repeat }]
      : []),
    { label: 'Invoices', path: '/invoices', icon: Receipt },
    { label: 'Payments', path: '/payments', icon: CreditCard },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  const adminNavItems = [
    { label: 'Discounts', path: '/discounts', icon: Tag },
    { label: 'Taxes', path: '/taxes', icon: Percent },
    { label: 'Staff', path: '/staff', icon: ShieldCheck },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const renderNavList = (items) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.path}>
            <NavLink
              to={item.path}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 select-none ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                } ${collapsed ? 'justify-center px-2' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Left accent indicator bar when active */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-brand-600"
                      aria-hidden="true"
                    />
                  )}

                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />

                  {!collapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Top Header & Navigation */}
      <div className="p-4 space-y-6">
        {/* Logo row */}
        <div className={`flex items-center justify-between ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed ? (
            <Logo size="md" theme="dark" asLink={false} />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-400 flex items-center justify-center text-white font-bold text-sm shadow-soft-xs">
              B
            </div>
          )}

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Nav Group */}
        <nav className="space-y-6">
          <div>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                Platform
              </p>
            )}
            {renderNavList(mainNavItems)}
          </div>

          {/* Admin Group (Admin only) */}
          {role === 'admin' && (
            <div>
              {!collapsed && (
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                  Admin & Config
                </p>
              )}
              {renderNavList(adminNavItems)}
            </div>
          )}
        </nav>
      </div>

      {/* Desktop Collapse Toggle at Bottom */}
      <div className="hidden lg:block p-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors select-none ${
            collapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          {!collapsed && <span>Collapse sidebar</span>}
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200/90 h-screen sticky top-0 transition-all duration-200 z-20 ${
          collapsed ? 'w-18' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 shadow-soft-lg animate-drawer-in flex flex-col z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
