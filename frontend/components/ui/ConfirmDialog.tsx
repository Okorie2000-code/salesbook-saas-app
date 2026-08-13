'use client';

import { AlertTriangle } from 'lucide-react';
import { Modal, ModalFooter } from './Modal';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            danger ? 'bg-danger-50 text-danger-600' : 'bg-brand-50 text-brand-600'
          }`}
        >
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-600">{description ?? 'Are you sure you want to continue?'}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <ModalFooter
          onCancel={onCancel}
          onConfirm={onConfirm}
          confirmText={confirmText}
          cancelText={cancelText}
          loading={loading}
          danger={danger}
        />
      </div>
    </Modal>
  );
}
