import React, { useState } from 'react';
import { X, Save, User as UserIcon } from 'lucide-react';
import { db, secondaryAuth } from '../lib/firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Role, DEFAULT_PERMISSIONS } from '../context/AppContext';

interface UserCreateModalProps {
  onClose: () => void;
}

export function UserCreateModal({ onClose }: UserCreateModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('CSKH');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Create user using secondaryAuth to avoid replacing current admin session
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCred.user.uid;
      
      // 2. Add profile to Firestore
      const profileRef = doc(db, 'users', newUid);
      await setDoc(profileRef, {
        email: email,
        name: name,
        role: role,
        permissions: DEFAULT_PERMISSIONS[role],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Force logout of secondary instance to clear state just in case
      await secondaryAuth.signOut();
      
      alert('Tạo tài khoản nhân viên thành công!');
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError('Email này đã được sử dụng.');
      else if (err.code === 'auth/weak-password') setError('Mật khẩu quá yếu (cần tối thiểu 6 ký tự).');
      else setError('Lỗi khi tạo tài khoản: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[4px] w-full max-w-[450px] shadow-xl flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-brand-border bg-[#f8f9fa]">
          <h2 className="text-[16px] font-semibold text-brand-text flex items-center gap-2">
            <UserIcon size={18} className="text-brand-primary" /> 
            Tạo tài khoản Nhân viên
          </h2>
          <button onClick={onClose} className="text-brand-text-sub hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleCreate} className="p-4 sm:p-5 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-[13px] border border-red-100">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1">Họ tên nhân viên <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-brand-border rounded-[3px] text-[13px] focus:outline-none focus:border-brand-primary"
              placeholder="Nhập họ tên"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1">Email đăng nhập <span className="text-red-500">*</span></label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-brand-border rounded-[3px] text-[13px] focus:outline-none focus:border-brand-primary"
              placeholder="email@congty.com"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1">Mật khẩu <span className="text-red-500">*</span></label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-brand-border rounded-[3px] text-[13px] focus:outline-none focus:border-brand-primary"
              placeholder="Tối thiểu 6 ký tự"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1">Phân quyền ban đầu</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 border border-brand-border rounded-[3px] text-[13px] focus:outline-none focus:border-brand-primary"
            >
              <option value="CSKH">Chăm Sóc Khách Hàng</option>
              <option value="ACCOUNTANT">Kế Toán</option>
              <option value="WAREHOUSE">Nhân Viên Kho</option>
              <option value="ADMIN">Quản Trị Viên (Admin)</option>
              <option value="PENDING">Chờ Duyệt (PENDING)</option>
            </select>
          </div>
          
          <div className="pt-2 flex justify-end gap-3 mt-2 border-t border-brand-border pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-brand-text hover:bg-slate-100 rounded-[3px] font-medium text-[13px] transition"
              disabled={loading}
            >
              Hủy
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-brand-primary text-white rounded-[3px] font-semibold text-[13px] hover:bg-blue-700 transition flex items-center justify-center min-w-[120px]"
            >
              {loading ? 'Đang tạo...' : <><Save size={16} className="mr-2" /> Tạo tài khoản</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
