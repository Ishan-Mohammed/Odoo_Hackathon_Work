/**
 * PaymentMethodPicker — 4 selectable card buttons: Cash, Card, UPI, Bank
 * Icons: Banknote, CreditCard, Smartphone, Building2
 */

import React from 'react';
import { Banknote, CreditCard, Smartphone, Building2 } from 'lucide-react';

const METHODS = [
  { key: 'Cash',  label: 'Cash',        Icon: Banknote    },
  { key: 'Card',  label: 'Card',        Icon: CreditCard  },
  { key: 'UPI',   label: 'UPI',         Icon: Smartphone  },
  { key: 'Bank',  label: 'Bank',        Icon: Building2   },
];

export default function PaymentMethodPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {METHODS.map(({ key, label, Icon }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={selected}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
              selected
                ? 'bg-brand-50 border-brand-400 text-brand-700 shadow-soft-xs ring-1 ring-brand-300'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Icon
              className={`w-5 h-5 transition-colors ${
                selected ? 'text-brand-600' : 'text-slate-400'
              }`}
              aria-hidden="true"
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Return icon component + label string for a given method key */
export function methodMeta(method) {
  return METHODS.find((m) => m.key === method) || { key: method, label: method, Icon: Banknote };
}
