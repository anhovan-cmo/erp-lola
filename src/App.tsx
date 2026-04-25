import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProductList } from './pages/ProductList';
import { Transactions } from './pages/Transactions';
import { Debts } from './pages/Debts';
import { PartnersPage } from './pages/PartnersPage';
import { UsersPage } from './pages/Users';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppProvider, useAppContext } from './context/AppContext';
import { LogIn, UserPlus } from 'lucide-react';
import { auth } from './lib/firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

function AppContent() {
  const { user, userProfile, loading, login } = useAppContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  useEffect(() => {
    if (['CSKH', 'WAREHOUSE'].includes(userProfile?.role || '') && ['dashboard', 'debts'].includes(activeTab)) {
      setActiveTab('products');
    }
  }, [userProfile?.role]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoadingAuth(true);
    try {
      if (authMode === 'register') {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        // User profile will be auto-created and auto-verified as CSKH role in AppContext
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setAuthError('Email này đã được sử dụng.');
      else if (err.code === 'auth/wrong-password') setAuthError('Sai mật khẩu.');
      else if (err.code === 'auth/user-not-found') setAuthError('Không tìm thấy tài khoản.');
      else if (err.code === 'auth/weak-password') setAuthError('Mật khẩu quá yếu (cần tối thiểu 6 ký tự).');
      else setAuthError('Đã xảy ra lỗi hệ thống: ' + err.message);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="text-brand-text-sub font-medium">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f4f5f7]">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-brand-text mb-2">LOLA ERP</h1>
            <p className="text-sm text-brand-text-sub mb-6">Đăng nhập để quản lý kho và công nợ</p>
          </div>
          
          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            <div>
              <label className="block text-[13px] font-medium text-brand-text mb-1">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-[14px] focus:outline-none focus:border-brand-primary"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-brand-text mb-1">Mật khẩu</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-[14px] focus:outline-none focus:border-brand-primary"
                placeholder="••••••••"
              />
            </div>
            
            {authError && <p className="text-red-600 text-[13px] font-medium">{authError}</p>}
            
            <button 
              type="submit"
              disabled={isLoadingAuth}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-2.5 rounded hover:bg-slate-900 transition font-semibold disabled:opacity-50"
            >
              {isLoadingAuth ? 'Đang xử lý...' : (authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')}
            </button>
            <div className="text-center text-[13px] text-brand-text-sub mt-2">
              {authMode === 'login' ? (
                <>Chưa có tài khoản? <span onClick={() => setAuthMode('register')} className="text-brand-primary font-medium cursor-pointer hover:underline">Đăng ký ngay</span> (nhận quyền CSKH tự động)</>
              ) : (
                <>Đã có tài khoản? <span onClick={() => setAuthMode('login')} className="text-brand-primary font-medium cursor-pointer hover:underline">Đăng nhập</span></>
              )}
            </div>
          </form>

          <div className="flex items-center gap-3 mb-6">
            <hr className="flex-1 border-slate-200" />
            <span className="text-[12px] text-slate-400 font-medium">HOẶC DÙNG</span>
            <hr className="flex-1 border-slate-200" />
          </div>

          <button 
            onClick={login}
            type="button"
            className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 py-2.5 rounded hover:bg-slate-50 transition font-semibold"
          >
            <LogIn size={18} />
            Tiếp tục với Google
          </button>
        </div>
      </div>
    );
  }

  if (userProfile && userProfile.role === 'PENDING') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f4f5f7]">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold text-brand-text mb-2 border-b pb-4">LOLA ERP</h1>
          <p className="text-[15px] text-brand-text-sub mt-4 my-2 font-medium">Tài khoản của bạn đang chờ phê duyệt.</p>
          <p className="text-[13px] text-brand-text-sub mb-6">Vui lòng liên hệ Admin hệ thống để được cấp quyền truy cập.</p>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className={activeTab === 'dashboard' ? 'h-full flex flex-col' : 'hidden'}><Dashboard /></div>
      <div className={activeTab === 'products' ? 'h-full flex flex-col' : 'hidden'}><ProductList isActive={activeTab === 'products'} /></div>
      <div className={activeTab === 'imports' ? 'h-full flex flex-col' : 'hidden'}><Transactions type="IMPORT" /></div>
      <div className={activeTab === 'exports' ? 'h-full flex flex-col' : 'hidden'}><Transactions type="EXPORT" /></div>
      <div className={activeTab === 'receivables' ? 'h-full flex flex-col' : 'hidden'}><Debts type="RECEIVABLE" /></div>
      <div className={activeTab === 'payables' ? 'h-full flex flex-col' : 'hidden'}><Debts type="PAYABLE" /></div>
      <div className={activeTab === 'partners' ? 'h-full flex flex-col' : 'hidden'}><PartnersPage /></div>
      <div className={activeTab === 'users' ? 'h-full flex flex-col' : 'hidden'}><UsersPage /></div>
      <div className={activeTab === 'logs' ? 'h-full flex flex-col' : 'hidden'}><ActivityLogsPage /></div>
      <div className={activeTab === 'settings' ? 'h-full flex flex-col' : 'hidden'}><SettingsPage /></div>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
