import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  isOpen = false,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone. Are you sure you want to proceed?',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false,
  variant = 'danger', // danger or warning
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center p-2">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3.5 ${
            variant === 'danger'
              ? 'bg-rose-100 text-rose-600 border border-rose-200'
              : 'bg-amber-100 text-amber-600 border border-amber-200'
          }`}
        >
          <AlertTriangle className="w-6 h-6 stroke-[2]" />
        </div>

        <h3 className="font-display font-bold text-base text-slate-900 mb-1.5">
          {title}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xs mb-6">
          {message}
        </p>

        <div className="grid grid-cols-2 gap-2.5 w-full">
          <Button
            variant="secondary"
            size="md"
            disabled={isLoading}
            onClick={onClose}
          >
            {cancelText}
          </Button>

          <Button
            variant="primary"
            size="md"
            isLoading={isLoading}
            onClick={onConfirm}
            className={
              variant === 'danger'
                ? '!bg-gradient-to-r !from-rose-600 !to-red-600 hover:!from-rose-700 hover:!to-red-700 !shadow-none'
                : ''
            }
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
