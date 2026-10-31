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

  // Segment colors
  const getSegmentColor = (index) => {
    if (index >= passedCount) return 'bg-slate-200';
    if (passedCount <= 1) return 'bg-rose-500';
    if (passedCount <= 3) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStrengthLabel = () => {
    if (passedCount === 0) return { text: 'Empty', color: 'text-slate-400' };
    if (passedCount <= 1) return { text: 'Weak', color: 'text-rose-600' };
    if (passedCount <= 3) return { text: 'Fair', color: 'text-amber-600' };
    return { text: 'Strong', color: 'text-emerald-600' };
  };

  const strength = getStrengthLabel();

  const rules = [
    { key: 'minLength', label: 'At least 9 characters', satisfied: criteria.minLength },
    { key: 'hasUpper', label: 'One uppercase letter', satisfied: criteria.hasUpper },
    { key: 'hasLower', label: 'One lowercase letter', satisfied: criteria.hasLower },
    { key: 'hasSpecial', label: 'One special character', satisfied: criteria.hasSpecial },
  ];

  return (
    <div className={`space-y-2 pt-1 ${className}`}>
      {/* Slim 4-segment strength meter bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span className="text-slate-500">Password strength</span>
          <span className={`font-semibold transition-colors duration-200 ${strength.color}`}>
            {strength.text}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 h-1">
          {[0, 1, 2, 3].map((segmentIndex) => (
            <div
              key={segmentIndex}
              className={`h-full rounded-full transition-all duration-300 ${getSegmentColor(
                segmentIndex
              )}`}
            />
          ))}
        </div>
      </div>

      {/* Compact 2-column rule grid */}
      <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
        {rules.map((rule) => (
          <li
            key={rule.key}
            className={`flex items-center gap-1.5 text-xs transition-colors duration-200 select-none ${
              rule.satisfied ? 'text-slate-700 font-medium' : 'text-slate-400'
            }`}
          >
            <span
              className={`flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] transition-all duration-200 shrink-0 ${
                rule.satisfied
                  ? 'bg-emerald-500 text-white scale-100 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-200 text-transparent scale-90'
              }`}
              aria-hidden="true"
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </span>
            <span className="truncate">{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
