import { ReactNode, useState, startTransition } from 'react';
import { 
  BarChart3, 
  PackageSearch,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  TrendingDown,
  UserCircle,
  Users,
  Menu,
  X,
  History,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';

export function Layout({ children, activeTab, setActiveTab }: { children: ReactNode, activeTab: string, setActiveTab: (t: string) => void }) {
  const { userProfile, hasPermission } = useAppContext();
  const role = userProfile?.role || 'PENDING';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allTabs = [
    { id: 'dashboard', label: 'Tổng Quan Dashboard', icon: BarChart3 },
    { id: 'products', label: 'Quản Lý Tồn Kho', icon: PackageSearch },
    { id: 'imports', label: 'Quản Lý Nhập Kho', icon: ArrowDownToLine },
    { id: 'exports', label: 'Quản Lý Xuất Kho', icon: ArrowUpFromLine },
    { id: 'receivables', label: 'Công Nợ Phải Thu', icon: TrendingUp },
    { id: 'payables', label: 'Công Nợ Phải Trả', icon: TrendingDown },
    { id: 'partners', label: 'Khách Hàng & NCC', icon: UserCircle },
    { id: 'users', label: 'Quản Lý Nhân Viên', icon: Users },
    { id: 'logs', label: 'Nhật Ký Hoạt Động', icon: History },
    { id: 'settings', label: 'Cài Đặt', icon: Settings },
  ];

  const visibleTabs = allTabs.filter(t => hasPermission(t.id, 'view'));

  const roleText: any = {
    'ADMIN': 'Admin Hệ Thống',
    'ACCOUNTANT': 'Kế Toán',
    'CSKH': 'Chăm Sóc Khách Hàng',
    'WAREHOUSE': 'Nhân Viên Kho',
    'PENDING': 'Chờ Duyệt'
  };

  const currentTabLabel = visibleTabs.find(t => t.id === activeTab)?.label || 'LOLA ERP';

  return (
    <div className="flex h-screen w-full bg-brand-bg text-brand-text font-sans overflow-hidden">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-brand-sidebar text-white flex flex-col shrink-0 transform transition-transform duration-300 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 text-[20px] font-bold flex items-center justify-between border-b border-white/10 tracking-widest">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[3px] bg-white text-brand-sidebar flex items-center justify-center font-bold shadow-sm text-sm">L</div>
            LOLA ERP
          </div>
          <button className="lg:hidden text-white/80 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 py-5 flex flex-col overflow-y-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                startTransition(() => {
                  setActiveTab(tab.id);
                });
                setSidebarOpen(false);
              }}
              className={cn(
                "flex items-center w-full px-6 py-3 text-[14px] transition-colors gap-3 cursor-pointer",
                activeTab === tab.id 
                  ? "bg-white/10 text-white border-l-4 border-white" 
                  : "text-white/80 hover:bg-white/10 hover:text-white border-l-4 border-transparent"
              )}
            >
              <tab.icon className="w-[18px] h-[18px] shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 shrink-0">
          <div className="flex items-center text-[14px] text-white/80">
            <UserCircle className="w-8 h-8 mr-3 text-white/60 shrink-0" />
            <div className="text-left w-full overflow-hidden">
              <p className="font-semibold text-white text-[13px] truncate">{userProfile?.name || 'User'}</p>
              <p className="text-[11px] truncate">{roleText[role]}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center gap-3 p-4 bg-white border-b border-brand-border shrink-0">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-brand-text-sub hover:text-brand-text"
          >
            <Menu size={24} />
          </button>
          <div className="font-semibold text-[16px] truncate">{currentTabLabel}</div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
