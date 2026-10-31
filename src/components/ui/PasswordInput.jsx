import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, Lock, ArrowBigUp } from 'lucide-react';
import Input from './Input';

const PasswordInput = forwardRef(function PasswordInput(
  {
    label = 'Password',
    placeholder = '••••••••••••',
    autoComplete = 'current-password',
    showLeftIcon = true,
    labelRightSlot = null,
    onKeyDown,
    onKeyUp,
    onBlur,
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleKeyEvent = (e) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        label={label}
        placeholder={placeholder}
        autoComplete={autoComplete}
        labelRightSlot={labelRightSlot}
        leftIcon={showLeftIcon ? <Lock className="w-4 h-4" /> : null}
        onKeyDown={(e) => {
          handleKeyEvent(e);
          onKeyDown?.(e);
        }}
        onKeyUp={(e) => {
          handleKeyEvent(e);
          onKeyUp?.(e);
        }}
        onBlur={(e) => {
          setCapsLockActive(false);
          onBlur?.(e);
        }}
        rightSlot={
          <div className="flex items-center gap-1.5">
            {capsLockActive && (
              <span
                title="Caps Lock is on"
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 select-none animate-fade-in"
              >
                <ArrowBigUp className="w-3 h-3 fill-current" />
                <span>CAPS</span>
              </span>
            )}
            <button
              type="button"
              onClick={toggleVisibility}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={0}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        }
        {...props}
      />
    </div>
  );
});

export default PasswordInput;
