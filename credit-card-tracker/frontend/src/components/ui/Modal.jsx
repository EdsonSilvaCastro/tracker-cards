import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white border-2 border-black shadow-[6px_6px_0_0_#000] max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b-2 border-black bg-(--color-primary)">
            <h2 className="font-head text-base font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 border-2 border-black bg-white hover:bg-(--color-accent) transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
