import React from 'react';
import { Check } from 'lucide-react';

export default function StatusStepper({
  steps = ['Draft', 'Quotation', 'Confirmed', 'Active'],
  currentStep = 0, // index or step name
  className = '',
}) {
  const currentIndex =
    typeof currentStep === 'number'
      ? currentStep
      : steps.findIndex((s) => s.toLowerCase() === String(currentStep).toLowerCase());

  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop Horizontal View */}
      <div className="hidden sm:flex items-center justify-between w-full">
        {steps.map((step, idx) => {
          const isDone = idx < activeIdx;
          const isCurrent = idx === activeIdx;

          return (
            <React.Fragment key={step}>
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors duration-200 ${
                    isDone
                      ? 'bg-emerald-500 text-white shadow-soft-xs'
                      : isCurrent
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100 shadow-soft-xs'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-medium select-none ${
                    isCurrent
                      ? 'text-slate-900 font-semibold'
                      : isDone
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {step}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 rounded transition-colors duration-200 ${
                    idx < activeIdx ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile Compact View */}
      <div className="sm:hidden flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold">
            {activeIdx + 1}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">{steps[activeIdx]}</p>
            <p className="text-[10px] text-slate-400">
              Step {activeIdx + 1} of {steps.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full ${
                idx === activeIdx
                  ? 'bg-brand-600'
                  : idx < activeIdx
                  ? 'bg-emerald-500'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
