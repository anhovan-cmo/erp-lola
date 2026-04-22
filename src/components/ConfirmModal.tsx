import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  onConfirm,
  onCancel,
  isDangerous = true
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-[4px] w-full max-w-[420px] shadow-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 flex gap-4">
          <div className="flex-shrink-0 mt-0.5">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDangerous ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              <AlertTriangle strokeWidth={2.5} size={20} />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-[16px] font-semibold text-gray-900 mb-1">{title}</h2>
            <div className="text-[14px] text-gray-600 mb-6 leading-relaxed">
              {message}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded transition-colors text-[14px]"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 font-medium rounded transition-colors text-[14px] text-white ${
                  isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0052cc] hover:bg-[#0047b3]'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
