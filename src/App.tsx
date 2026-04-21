import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProductList } from './pages/ProductList';
import { Transactions } from './pages/Transactions';
import { Debts } from './pages/Debts';
import { PartnersPage } from './pages/PartnersPage';
import { UsersPage } from './pages/Users';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { AppProvider, useAppContext } from './context/AppContext';
import { LogIn } from 'lucide-react';

function AppContent() {
  const { user, userProfile, loading, login } = useAppContext();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (['CSKH', 'WAREHOUSE'].includes(userProfile?.role || '') && ['dashboard', 'debts'].includes(activeTab)) {
      setActiveTab('products');
    }
  }, [userProfile?.role]);

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
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold text-brand-text mb-2">LOLA ERP</h1>
          <p className="text-sm text-brand-text-sub mb-6">Đăng nhập để quản lý kho và công nợ</p>
          <button 
            onClick={login}
            className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white py-2.5 rounded hover:bg-blue-700 transition font-semibold"
          >
            <LogIn size={18} />
            Đăng nhập với Google
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'products': return <ProductList />;
      case 'transactions': return <Transactions />;
      case 'debts': return <Debts />;
      case 'partners': return <PartnersPage />;
      case 'users': return <UsersPage />;
      case 'logs': return <ActivityLogsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
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
