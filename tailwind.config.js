/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        hero: '-0.025em',
        tight: '-0.015em',
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        violet: {
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        accent: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        semantic: {
          success: '#10b981',
          'success-light': '#ecfdf5',
          warning: '#f59e0b',
          'warning-light': '#fffbeb',
          danger: '#ef4444',
          'danger-light': '#fef2f2',
          info: '#3b82f6',
          'info-light': '#eff6ff',
        },
      },
      boxShadow: {
        'soft-xs': '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'soft-sm': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'soft-md': '0 4px 8px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        'soft-lg': '0 12px 24px -6px rgba(15, 23, 42, 0.08), 0 4px 8px -4px rgba(15, 23, 42, 0.03)',
        'brand-btn': '0 4px 14px 0 rgba(79, 70, 229, 0.32)',
        'brand-btn-hover': '0 6px 20px 0 rgba(79, 70, 229, 0.42)',
        'glass-card': '0 20px 40px -15px rgba(2, 6, 23, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        'dropdown': '0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
      },
      animation: {
        'slide-in-left': 'slideInLeft 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'slide-in-right': 'slideInRight 350ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'slide-in-left-fast': 'slideInLeftFast 350ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'slide-out-right': 'slideOutRight 300ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'float-card': 'float 6s ease-in-out infinite',
        'drift-1': 'drift1 20s ease-in-out infinite alternate',
        'drift-2': 'drift2 22s ease-in-out infinite alternate',
        'shake': 'shake 380ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'pulse-ring': 'pulseRing 2.4s cubic-bezier(0.4, 0, 0.6, 1) 1 forwards',
        'grow-bar': 'growBar 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'page-enter': 'pageEnter 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-in': 'modalIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'drawer-in': 'drawerIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        slideInLeft: {
          '0%': { transform: 'translateX(-40px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(40px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeftFast: {
          '0%': { transform: 'translateX(-40px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(40px)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        drift1: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '100%': { transform: 'translate(30px, 40px) scale(1.08)' },
        },
        drift2: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '100%': { transform: 'translate(-35px, -25px) scale(1.1)' },
        },
        shake: {
          '10%, 90%': { transform: 'translateX(-2px)' },
          '20%, 80%': { transform: 'translateX(4px)' },
          '30%, 50%, 70%': { transform: 'translateX(-4px)' },
          '40%, 60%': { transform: 'translateX(4px)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '50%': { transform: 'scale(1.25)', opacity: '0.2' },
          '100%': { transform: 'scale(1.35)', opacity: '0' },
        },
        growBar: {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        pageEnter: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        modalIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        drawerIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
