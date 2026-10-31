import React, { useState, forwardRef } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import Input from './Input';

const PasswordInput = forwardRef(function PasswordInput(
  {
    label = 'Password',
    placeholder = '••••••••••••',
    autoComplete = 'current-password',
    showLeftIcon = true,
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <Input
      ref={ref}
      type={showPassword ? 'text' : 'password'}
      label={label}
      placeholder={placeholder}
      autoComplete={autoComplete}
      leftIcon={showLeftIcon ? <Lock className="w-4 h-4" /> : null}
      rightSlot={
        <button
          type="button"
          onClick={toggleVisibility}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={0}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      }
      {...props}
    />
  );
});

export default PasswordInput;
