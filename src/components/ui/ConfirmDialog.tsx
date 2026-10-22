import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/ui';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible confirmation modal: focus-trapped, ESC/backdrop dismissible,
 * animated with Motion. Used before destructive actions such as deleting
 * history records.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    confirmRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-[#0B0D12]/85 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="panel relative w-full max-w-md p-6 bg-[#1B2230] border border-white/[0.12] rounded-xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85)]"
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={cn(
                  'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border',
                  destructive
                    ? 'bg-[#FF777F]/10 border-[#FF777F]/30 text-[#FF777F]'
                    : 'bg-[#79F2C0]/10 border-[#79F2C0]/30 text-[#79F2C0]'
                )}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-heading font-bold text-porcelain mb-1.5">{title}</h2>
                <div className="text-xs text-silver leading-relaxed">{message}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button type="button" onClick={onCancel} className="btn-ghost px-4 py-2 text-xs">
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                className={cn(
                  'px-4 py-2 text-xs font-semibold rounded-lg transition-all active:scale-[0.985] cursor-pointer',
                  destructive
                    ? 'bg-[#FF777F] text-[#0B0D12] hover:bg-[#FF8F96] shadow-[0_4px_16px_-4px_rgba(255,119,127,0.4)]'
                    : 'btn-primary'
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
