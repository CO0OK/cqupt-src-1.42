import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  highlightText?: string;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  danger?: boolean;
}

export default function ConfirmModal({
  open,
  title,
  description,
  highlightText,
  confirmText = '确认',
  cancelText = '取消',
  confirmDisabled = false,
  onCancel,
  onConfirm,
  danger = false,
}: ConfirmModalProps) {
  const confirmBtnClass = danger
    ? 'flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all'
    : 'flex-1 py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800"
          >
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-900/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
              <button
                onClick={onCancel}
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm text-gray-600 dark:text-slate-300">{description}</p>
              {highlightText ? (
                <p className="text-sm font-bold text-gray-900 dark:text-white break-all">{highlightText}</p>
              ) : null}
            </div>
            <div className="p-6 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800 flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={confirmDisabled}
                className={`${confirmBtnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
