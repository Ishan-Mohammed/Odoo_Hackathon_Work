import React from 'react';
import { Check } from 'lucide-react';

export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
export const FULL_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{9,}$/;

export function checkPasswordCriteria(password = '') {
  return {
    minLength: password.length >= 9,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: SPECIAL_CHAR_REGEX.test(password),
  };
}

export function isPasswordValid(password = '') {
  const c = checkPasswordCriteria(password);
  return c.minLength && c.hasUpper && c.hasLower && c.hasSpecial;
}

export default function PasswordChecklist({ password = '', className = '' }) {
  const criteria = checkPasswordCriteria(password);
  const passedCount = Object.values(criteria).filter(Boolean).length;

  // Strength label & color
  let strengthLabel = 'Too weak';
  let strengthColor = 'bg-rose-500';
  let strengthWidth = 'w-1/4';
  let textColor = 'text-rose-600';

  if (passedCount === 0) {
    strengthLabel = 'Enter password';
    strengthColor = 'bg-slate-200';
    strengthWidth = 'w-0';
    textColor = 'text-slate-400';
  } else if (passedCount <= 2) {
    strengthLabel = 'Weak';
    strengthColor = 'bg-rose-500';
    strengthWidth = 'w-1/3';
    textColor = 'text-rose-600';
  } else if (passedCount === 3) {
    strengthLabel = 'Fair';
    strengthColor = 'bg-amber-500';
    strengthWidth = 'w-2/3';
    textColor = 'text-amber-600';
  } else if (passedCount === 4) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500';
    strengthWidth = 'w-full';
    textColor = 'text-emerald-600';
  }

  const rules = [
    { key: 'minLength', label: 'At least 9 characters', satisfied: criteria.minLength },
    { key: 'hasUpper', label: 'One uppercase letter', satisfied: criteria.hasUpper },
    { key: 'hasLower', label: 'One lowercase letter', satisfied: criteria.hasLower },
    { key: 'hasSpecial', label: 'One special character', satisfied: criteria.hasSpecial },
  ];

  return (
    <div className={`space-y-2.5 pt-1 ${className}`}>
      {/* Strength meter bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span className="text-slate-500">Password strength</span>
          <span className={`font-semibold transition-colors duration-200 ${textColor}`}>
            {strengthLabel}
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${strengthColor} ${strengthWidth}`}
          />
        </div>
      </div>

      {/* Rules list */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
        {rules.map((rule) => (
          <li
            key={rule.key}
            className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
              rule.satisfied ? 'text-slate-800 font-medium' : 'text-slate-400'
            }`}
          >
            <span
              className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] transition-all duration-200 shrink-0 ${
                rule.satisfied
                  ? 'bg-emerald-500 text-white scale-100 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-200 text-transparent scale-90'
              }`}
              aria-hidden="true"
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
