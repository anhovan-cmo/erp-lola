import React, { useState } from 'react';
import { X, Save, ShieldCheck } from 'lucide-react';
import { UserProfile, UserPermissions, AppPermission, DEFAULT_PERMISSIONS } from '../context/AppContext';

const MODULES = [
  { id: 'dashboard', label: 'Tổng Quan Dashboard' },
  { id: 'products', label: 'Quản Lý Tồn Kho' },
  { id: 'transactions', label: 'Nhập / Xuất Kho' },
  { id: 'debts', label: 'Công Nợ Thu Trả' },
  { id: 'partners', label: 'Khách Hàng & NCC' },
  { id: 'users', label: 'Quản Lý Nhân Viên' },
  { id: 'logs', label: 'Nhật Ký Hoạt Động' },
];

const ACTIONS: Array<{ key: keyof AppPermission; label: string }> = [
  { key: 'view', label: 'Xem' },
  { key: 'create', label: 'Thêm' },
  { key: 'edit', label: 'Sửa' },
  { key: 'delete', label: 'Xóa' },
];

export function UserPermissionModal({ user, onClose, onSave }: { user: UserProfile, onClose: () => void, onSave: (perms: UserPermissions) => void }) {
  const initialPerms = user.permissions || DEFAULT_PERMISSIONS[user.role] || DEFAULT_PERMISSIONS['PENDING'];
  const [permissions, setPermissions] = useState<UserPermissions>(JSON.parse(JSON.stringify(initialPerms)));

  const handleToggle = (module: string, action: keyof AppPermission) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...(prev[module] || { view: false, create: false, edit: false, delete: false }),
        [action]: !prev[module]?.[action]
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[4px] shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-brand-border">
          <h2 className="text-[20px] font-bold text-brand-text flex items-center gap-2">
            <ShieldCheck size={24} className="text-brand-primary" /> Phân Quyền Chi Tiết: {user.name}
          </h2>
          <button onClick={onClose} className="text-brand-text-sub hover:text-brand-text">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-0 overflow-auto flex-1 bg-[#f8f9fa]">
          <table className="w-full text-left text-[14px] border-collapse bg-white">
            <thead>
              <tr className="bg-[#f8f9fa]">
                <th className="p-4 border-b-2 border-brand-border font-semibold text-brand-text-sub">Chức Năng Hệ Thống</th>
                {ACTIONS.map(a => (
                  <th key={a.key} className="p-4 border-b-2 border-brand-border font-semibold text-brand-text-sub text-center w-[120px]">
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map(mod => (
                <tr key={mod.id} className="border-b border-brand-border hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-brand-text">{mod.label}</td>
                  {ACTIONS.map(act => (
                    <td key={act.key} className="p-4 text-center">
                      <input
                        type="checkbox"
                        className="w-[18px] h-[18px] text-brand-primary rounded-[3px] border-gray-300 focus:ring-brand-primary cursor-pointer"
                        checked={!!permissions[mod.id]?.[act.key]}
                        onChange={() => handleToggle(mod.id, act.key)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-5 border-t border-brand-border flex justify-end gap-3 bg-white">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 font-semibold text-brand-text hover:bg-slate-100 rounded-[3px] text-[14px] transition"
          >
            Hủy Bỏ
          </button>
          <button 
            onClick={() => onSave(permissions)} 
            className="px-5 py-2.5 bg-brand-primary text-white font-semibold rounded-[3px] text-[14px] hover:bg-blue-700 flex items-center gap-2 transition"
          >
            <Save size={18} /> Lưu Phân Quyền
          </button>
        </div>
      </div>
    </div>
  );
}
