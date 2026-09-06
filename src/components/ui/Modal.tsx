"use client";

import { Fragment, type ReactNode, useEffect, useCallback } from "react";
import { motion, AnimatePresence, type MotionProps } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = "",
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen && closeOnEscape) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, closeOnEscape, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Fragment>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${sizeClasses[size]}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          aria-describedby={description ? "modal-description" : undefined}
        >
          <div
            className={`glass-strong w-full max-h-[90vh] flex flex-col shadow-2xl ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-4 p-6 pb-4 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h3 id="modal-title" className="text-lg font-semibold text-foreground">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p id="modal-description" className="text-sm text-foreground-muted mt-1">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground-muted transition-colors flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6 pt-0">
              {children}
            </div>
          </div>
        </motion.div>
      </Fragment>
    </AnimatePresence>
  );
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  isLoading?: boolean;
}

const variantStyles = {
  danger: "bg-red-500 hover:bg-red-600 text-white",
  primary: "btn-primary",
  warning: "bg-amber-500 hover:bg-amber-600 text-white",
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-foreground-muted">{message}</p>
        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-foreground/5 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${variantStyles[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? "Confirming..." : confirmText}
          </motion.button>
        </div>
      </div>
    </Modal>
  );
}