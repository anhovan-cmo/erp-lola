import React, { useState } from 'react';
import { X } from 'lucide-react';
import { updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase/config';

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Users can't change password if they logged in with Google (unless they know what they are doing, but we show error if it's missing)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (!auth.currentUser) return;

    setIsLoading(true);
    try {
      await updatePassword(auth.currentUser, newPassword);
      setSuccess('Đổi mật khẩu thành công!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Phiên đăng nhập quá cũ. Vui lòng đăng xuất và đăng nhập lại trước khi đổi mật khẩu.');
      } else {
        setError('Gặp lỗi khi đổi mật khẩu: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!auth.currentUser?.email) return;
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setSuccess(`Đã gửi email khôi phục mật khẩu tới: ${auth.currentUser.email}. Vui lòng kiểm tra hộp thư.`);
    } catch (err: any) {
      setError('Lỗi gửi email: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between bg-slate-50">
          <h3 className="font-semibold text-brand-text">Thiết lập mật khẩu</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
              {success}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-brand-text mb-1">Mật khẩu mới</label>
              <input 
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-brand-border rounded text-[14px]"
                placeholder="Ít nhất 6 ký tự"
              />
            </div>
            
            <div>
              <label className="block text-[13px] font-medium text-brand-text mb-1">Xác nhận mật khẩu</label>
              <input 
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-brand-border rounded text-[14px]"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading || !!success}
              className="w-full py-2 bg-brand-primary text-white rounded text-[14px] font-medium hover:bg-[#005bb5] transition-colors disabled:opacity-50"
            >
              Cập nhật mật khẩu
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-brand-border text-center">
            <p className="text-[12px] text-slate-500 mb-2">Hoặc đặt lại mật khẩu qua email</p>
            <button 
              onClick={handleSendResetEmail}
              type="button"
              disabled={isLoading}
              className="text-[13px] font-medium text-brand-primary hover:underline"
            >
              Gửi email đặt lại mật khẩu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
