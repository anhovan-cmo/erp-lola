import React, { useState, useEffect } from 'react';
import { Save, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export function SettingsPage() {
  const { userProfile, hasPermission } = useAppContext();
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [retailer, setRetailer] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [checkStatus, setCheckStatus] = useState<string | null>(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Load from local storage
    const storedId = localStorage.getItem('kiotviet_client_id') || '';
    const storedSecret = localStorage.getItem('kiotviet_client_secret') || '';
    const storedRetailer = localStorage.getItem('kiotviet_retailer') || '';
    
    setClientId(storedId);
    setClientSecret(storedSecret);
    setRetailer(storedRetailer);

    if (storedId && storedSecret && storedRetailer) {
      checkConnection(storedId, storedSecret, storedRetailer);
    }
  }, []);

  if (!hasPermission('settings', 'view')) {
    return (
      <div className="flex h-full items-center justify-center">
        <h2 className="text-xl font-semibold text-brand-text-sub">Bạn không có quyền truy cập trang Cài đặt</h2>
      </div>
    );
  }

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('kiotviet_client_id', clientId);
    localStorage.setItem('kiotviet_client_secret', clientSecret);
    localStorage.setItem('kiotviet_retailer', retailer);
    
    setTimeout(() => {
      setIsSaving(false);
      alert('Đã lưu thông tin cấu hình KiotViet (Local Storage).');
    }, 500);
  };

  const checkConnection = async (id = clientId, secret = clientSecret, ret = retailer) => {
    setIsChecking(true);
    setCheckStatus(null);
    setCheckMessage(null);
    try {
      const payload = { clientId: id, clientSecret: secret, retailer: ret };
      const res = await fetch('/api/kiotviet/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-kv-client-id': id,
          'x-kv-client-secret': secret,
          'x-kv-retailer': ret
        },
        body: JSON.stringify(payload)
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`TRẠNG THÁI MÔI TRƯỜNG KHÔNG HỢP LỆ:\n\nHosting hiện tại của bạn không hỗ trợ (hoặc chưa bật) NodeJS Backend. Mã nguồn này cần máy chủ Node (để làm trạm trung chuyển - proxy) vì KiotViet chặn trình duyệt gọi API trực tiếp (lỗi CORS).\n\nCách khắc phục:\n1. Nếu dùng cPanel/Hostinger: Tìm mục 'Setup Node.js App' và chạy file 'server.ts'.\n2. Hoặc: Triển khai mã nguồn này lên Vercel, Render hoặc VPS.\n3. Nếu bạn muốn deploy lên Vercel, hãy yêu cầu Agent cấu hình thư mục /api.`);
      }
      
      const data = await res.json();
      if (data.success) {
        setCheckStatus('success');
        setCheckMessage(data.message || 'Kết nối thành công!');
      } else {
        setCheckStatus('error');
        setCheckMessage(data.error || 'Kết nối thất bại!');
      }
    } catch (e: any) {
      setCheckStatus('error');
      setCheckMessage(e.message || 'Lỗi mạng khi kiểm tra kết nối.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <div>
        <h1 className="text-[20px] font-bold text-brand-text">Cài Đặt Hệ Thống</h1>
        <p className="text-brand-text-sub text-[13px] mt-1">Cấu hình kết nối API API KiotViet cho quá trình đồng bộ.</p>
      </div>

      <div className="bg-white rounded-lg border border-brand-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-brand-border pb-3">
          <LinkIcon className="text-brand-primary" size={20} />
          <h2 className="font-semibold text-brand-text text-[15px]">API Keys KiotViet</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1">KIOTVIET_RETAILER (Tên gian hàng)</label>
            <input 
              type="text" 
              value={retailer}
              onChange={(e) => setRetailer(e.target.value)}
              className="w-full px-3 py-2 border border-brand-border rounded-[3px] text-[14px] focus:outline-none focus:border-brand-primary font-mono text-slate-700"
              placeholder="Ví dụ: fugalo"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1">KIOTVIET_CLIENT_ID</label>
            <input 
              type="text" 
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-brand-border rounded-[3px] text-[14px] focus:outline-none focus:border-brand-primary font-mono text-slate-700"
              placeholder="VD: dbae08de-..."
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-brand-text mb-1">KIOTVIET_CLIENT_SECRET</label>
            <input 
              type="password" 
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="w-full px-3 py-2 border border-brand-border rounded-[3px] text-[14px] focus:outline-none focus:border-brand-primary font-mono text-slate-700"
              placeholder="VD: 837AB253..."
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center justify-center gap-2 bg-brand-primary text-white py-2 px-5 rounded-[3px] hover:bg-opacity-90 font-semibold text-[13px] transition disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? 'Đang lưu...' : 'Lưu Cài Đặt'}
            </button>

            <button 
              onClick={() => checkConnection()}
              disabled={isChecking || !clientId || !clientSecret || !retailer}
              className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 border border-slate-200 py-2 px-5 rounded-[3px] hover:bg-slate-200 font-semibold text-[13px] transition disabled:opacity-50"
            >
              <RefreshCw size={16} className={isChecking ? "animate-spin" : ""} />
              {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
              <span className={`w-2 h-2 rounded-full ml-0.5 ${
                isChecking ? 'bg-slate-400' : 
                checkStatus === 'success' ? 'bg-green-500' : 
                checkStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'
              }`}></span>
            </button>
          </div>

          {checkStatus === 'success' && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-[3px] text-[13px] font-medium">
              ✅ {checkMessage}
            </div>
          )}
          {checkStatus === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-[3px] text-[13px] font-medium whitespace-pre-line">
              ❌ {checkMessage}
            </div>
          )}
        </div>
        
        <div className="mt-5 pt-4 border-t border-brand-border">
          <p className="text-[12px] text-slate-500">
            <strong>Lưu ý:</strong> API Keys được bảo mật vì chỉ lưu trữ trên bộ nhớ (Local Storage) của trình duyệt hiện tại và được gửi qua HTTPS tới máy chủ nội bộ. Nó không được chia sẻ cho các tài khoản hay trình duyệt khác trên hệ thống.
          </p>
        </div>
      </div>
    </div>
  );
}
