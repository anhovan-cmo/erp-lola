import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { useAppContext, Partner } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import { Edit2, Trash2, Upload, Search, X, Eye } from 'lucide-react';
import { PartnerFormModal } from '../components/PartnerFormModal';
import { PartnerDetailModal } from '../components/PartnerDetailModal';
import { ConfirmModal } from '../components/ConfirmModal';
import Papa from 'papaparse';
import { db, auth } from '../lib/firebase/config';
import { doc, writeBatch, serverTimestamp, collection } from 'firebase/firestore';

export function PartnersPage() {
  const { partners, deletePartner } = useAppContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [detailPartner, setDetailPartner] = useState<Partner | null>(null);
  const [importing, setImporting] = useState(false);
  const [syncingKiotViet, setSyncingKiotViet] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{status: 'IDLE'|'FETCHING'|'SAVING'|'DONE'|'ERROR', saved: number, total: number, message: string}>({status: 'IDLE', saved: 0, total: 0, message: ''});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAutoSynced = useRef(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
  const [deleteConfirmPartner, setDeleteConfirmPartner] = useState<{id: string, name: string} | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    if (!hasAutoSynced.current) {
      hasAutoSynced.current = true;
      executeSyncKiotViet(true);
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      if (activeTab !== 'ALL' && p.type !== activeTab) return false;
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(lowerSearch);
      const matchPhone = p.phone && p.phone.toLowerCase().includes(lowerSearch);
      return matchName || matchPhone;
    });
  }, [partners, searchTerm, activeTab]);

  const totalPages = Math.ceil(filteredPartners.length / itemsPerPage);
  const paginatedPartners = filteredPartners.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingPartner(null);
    setModalOpen(true);
  };

  const executeDelete = async () => {
    if (deleteConfirmPartner) {
      try {
        await deletePartner(deleteConfirmPartner.id);
        alert('Xóa thành công!');
        setDeleteConfirmPartner(null);
      } catch (e: any) {
        alert('Lỗi khi xóa: ' + e.message);
      }
    }
  };

  const executeResetDebts = async () => {
    if (window.confirm('Cảnh báo: Hành động này sẽ đưa TOÀN BỘ hệ số nợ của tất cả Khách hàng & Nhà cung cấp về mức 0đ. Bạn có chắc chắn không?')) {
      try {
        let batch = writeBatch(db);
        let count = 0;
        for (const p of partners) {
          batch.update(doc(db, 'partners', p.id), {
            totalReceivable: 0,
            totalPayable: 0,
            updatedAt: serverTimestamp()
          });
          count++;
          if (count % 400 === 0) {
            await batch.commit();
            batch = writeBatch(db);
          }
        }
        if (count > 0 && count % 400 !== 0) {
          await batch.commit();
        }
        alert('Đã làm trắng công nợ của toàn bộ đối tác thành công!');
      } catch (e: any) {
        alert('Lỗi khi thiết lập: ' + e.message);
      }
    }
  };

  const executeSyncKiotViet = async (isAuto = false) => {
    if (!isAuto && !window.confirm('Xác nhận đồng bộ dữ liệu Khách hàng & Nhà cung cấp từ KiotViet? Quá trình này sẽ lấy dữ liệu nợ và làm mới danh sách đối tác.')) return;
    setSyncingKiotViet(true);
    setSyncProgress({ status: 'FETCHING', saved: 0, total: 0, message: 'Đang kết nối KiotViet và tải danh sách...' });
    
    try {
      const res = await fetch('/api/kiotviet/sync-partners');
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         throw new Error("Lỗi API (máy chủ có thể đang khởi động lại). Vui lòng thử lại sau ít phút.");
      }
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Server lỗi không rõ nguyên nhân');

      let customers = data.customers || [];
      let suppliers = data.suppliers || [];

      if (data.isMock) {
        setSyncProgress({ status: 'FETCHING', saved: 0, total: 0, message: 'Đang dùng Dữ liệu Demo giả lập Nợ...' });
        await new Promise(r => setTimeout(r, 1500));
        
        // Generate mock data reflecting existing partners so debt actually updates!
        customers = partners.filter(p => p.type === 'CUSTOMER').map(p => ({
          id: p.id,
          code: p.id,
          name: p.name,
          contactNumber: p.phone,
          address: p.address,
          debt: Math.floor(Math.random() * 50) * 100000 + 500000 // 500k to 5.5M
        }));

        suppliers = partners.filter(p => p.type === 'SUPPLIER').map(p => ({
          id: p.id,
          code: p.id,
          name: p.name,
          contactNumber: p.phone,
          address: p.address,
          debt: Math.floor(Math.random() * 100) * 100000 + 1000000 // 1M to 11M
        }));
        if (customers.length === 0 && suppliers.length === 0) {
          customers.push({
            id: `KV_KH_MOCK_1`,
            code: `KV_KH_MOCK_1`,
            name: `Khách hàng 1 (Dữ liệu Demo)`,
            contactNumber: `0901234567`,
            address: `Hà Nội`,
            debt: 5000000
          });
          suppliers.push({
            id: `KV_NCC_MOCK_1`,
            code: `KV_NCC_MOCK_1`,
            name: `Nhà CC 1 (Dữ liệu Demo)`,
            contactNumber: `0987654321`,
            address: `Hồ Chí Minh`,
            debt: -3000000
          });
        }
      }

      const totalItems = customers.length + suppliers.length;
      setSyncProgress({ status: 'SAVING', saved: 0, total: totalItems, message: `Đã tải ${totalItems} đối tác. Đang lưu vào hệ thống...` });

      // Now sync to Firestore
      let batch = writeBatch(db);
      let count = 0;
      const now = serverTimestamp();

      const processItem = async (item: any, type: 'CUSTOMER' | 'SUPPLIER') => {
        const idStr = String(item.id || item.code || `kv_${Math.random().toString(36).substring(2, 9)}`);
        const ptRef = doc(db, 'partners', idStr);
        const name = (item.name || 'Khách KiotViet').substring(0, 256);
        const phone = (item.contactNumber || item.phone || '').substring(0, 32);
        const address = (item.address || '').substring(0, 500);
        const debt = Number(item.debt || 0);

        const exists = partners.some(p => p.id === idStr);

        if (exists) {
           batch.update(ptRef, {
            name,
            phone,
            address,
            type,
            totalReceivable: type === 'CUSTOMER' ? debt : 0,
            totalPayable: type === 'SUPPLIER' ? debt : 0,
            updatedAt: now
          });
        } else {
           batch.set(ptRef, {
            id: idStr,
            name,
            phone,
            address,
            type,
            cccd: '',
            mst: '',
            totalReceivable: type === 'CUSTOMER' ? debt : 0,
            totalPayable: type === 'SUPPLIER' ? debt : 0,
            createdAt: now,
            updatedAt: now
          });
        }
        count++;

        if (count % 20 === 0) { // Batch at 20 so progress bar triggers visually fast
          await batch.commit();
          batch = writeBatch(db);
          setSyncProgress(p => ({ ...p, saved: count, message: `Đang lưu ${count}/${totalItems} đối tác...` }));
        }
      };

      for (const cus of customers) await processItem(cus, 'CUSTOMER');
      for (const sup of suppliers) await processItem(sup, 'SUPPLIER');

      if (count > 0 && count % 20 !== 0) {
        await batch.commit();
        setSyncProgress(p => ({ ...p, saved: count }));
      }
      
      setSyncProgress({ status: 'DONE', saved: count, total: totalItems, message: `Hoàn tất! Đã đồng bộ ${count} đối tác.` });
      
      setTimeout(() => {
        setSyncingKiotViet(false);
        setSyncProgress({ status: 'IDLE', saved: 0, total: 0, message: '' });
      }, 3000);
      
    } catch (e: any) {
      setSyncProgress({ status: 'ERROR', saved: 0, total: 0, message: e.message });
      setTimeout(() => {
        setSyncingKiotViet(false);
        setSyncProgress({ status: 'IDLE', saved: 0, total: 0, message: '' });
      }, 5000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const user = auth.currentUser;
          if (!user) throw new Error("Vui lòng đăng nhập để import!");

          let batch = writeBatch(db);
          let count = 0;
          const now = serverTimestamp();
          const data = results.data;
          
          for (let i = 0; i < data.length; i++) {
            const row: any = data[i];
            
            const name = (row['Tên đối tác'] || row['Tên KH'] || row['Tên NCC'] || row['Tên Khách/NCC'] || row['Tên nhà cung cấp'] || row['Tên khách hàng'] || row['name'] || '').trim();
            if (!name) continue;

            const phone = (row['Điện thoại'] || row['SĐT'] || row['phone'] || '').trim();
            const address = (row['Địa chỉ'] || row['address'] || '').trim();
            const cccd = (row['CCCD'] || row['CMND'] || row['cccd'] || '').trim();
            const mst = (row['MST'] || row['Mã số thuế'] || row['mst'] || '').trim();
            const rawType = (row['Phân loại'] || row['Loại'] || row['type'] || '').trim().toLowerCase();
            
            let type: 'CUSTOMER' | 'SUPPLIER' = 'CUSTOMER';
            if (rawType.includes('ncc') || rawType.includes('cung cấp') || rawType === 'supplier' || row['Mã nhà cung cấp'] || row['Tên nhà cung cấp']) {
              type = 'SUPPLIER';
            }
            
            let debtVal = 0;
            const rawDebtStr = row['Nợ cần trả hiện tại'] || row['Nợ cần thu hiện tại'] || row['Nợ hiện tại'] || row['Dư nợ'];
            if (rawDebtStr) {
               const cleanDebt = rawDebtStr.toString().replace(/[^0-9-]/g, '');
               if (cleanDebt) {
                 debtVal = parseInt(cleanDebt, 10);
               }
            }

            const ptRef = doc(collection(db, 'partners'));
            
            batch.set(ptRef, {
              id: ptRef.id,
              name: name.substring(0, 256),
              phone: phone.substring(0, 32),
              address: address.substring(0, 500),
              cccd: type === 'CUSTOMER' ? cccd.substring(0, 32) : '',
              mst: type === 'SUPPLIER' ? mst.substring(0, 32) : '',
              type,
              totalReceivable: type === 'CUSTOMER' ? debtVal : 0,
              totalPayable: type === 'SUPPLIER' ? debtVal : 0,
              createdAt: now,
              updatedAt: now
            });

            count++;
            if (count % 400 === 0) {
              await batch.commit();
              batch = writeBatch(db);
            }
          }

          if (count > 0) {
            await batch.commit();
          }

          alert(`Nhập thành công! Đã thêm ${count} đối tác.`);
        } catch (error: any) {
          console.error("Lỗi import:", error);
          alert(`Lỗi import: ${error.message || 'Không thể tạo mới bản ghi'}`);
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (err) => {
        alert("Không thể đọc file CSV: " + err.message);
        setImporting(false);
      }
    });
  };

  return (
    <>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <h1 className="text-[20px] md:text-[24px] font-semibold uppercase">Đối Tác & Khách Hàng</h1>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-2.5 text-brand-text-sub" />
            <input 
              type="text" 
              placeholder="Tìm tên hoặc SĐT..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-brand-border rounded-[3px] text-[13px] focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          <button 
            onClick={executeResetDebts}
            className="bg-red-50 text-brand-danger border border-red-200 py-2 px-3 rounded-[3px] font-semibold text-[13px] hover:bg-red-100 transition min-w-[100px] flex-1 sm:flex-none"
            title="Làm mới (Clear) Nợ về 0"
          >
            <Trash2 size={16} className="inline mr-1.5" />
            Reset Dữ liệu Nợ KH
          </button>

          <button 
            disabled={syncingKiotViet}
            onClick={() => executeSyncKiotViet(false)}
            className="bg-[#005fb8] text-white border border-[#005fb8] flex items-center justify-center py-2 px-3 rounded-[3px] font-semibold text-[13px] hover:bg-[#004a94] transition min-w-[100px] flex-1 sm:flex-none disabled:opacity-50"
            title="Đồng bộ tự động từ KiotViet"
          >
            {syncingKiotViet ? "Đang đồng bộ..." : "Đồng bộ KiotViet"}
          </button>

          <button 
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-brand-primary border border-brand-primary flex items-center justify-center py-2 px-3 rounded-[3px] font-semibold text-[13px] hover:bg-blue-50 transition min-w-[100px] flex-1 sm:flex-none disabled:opacity-50"
          >
            {importing ? "Đang xử lý..." : (
               <>
                 <Upload size={16} className="mr-1.5 hidden sm:inline" />
                 Nhập CSV
               </>
            )}
          </button>
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

          <button 
            onClick={handleAddNew}
            className="bg-brand-primary text-white border-none py-2 px-4 rounded-[3px] font-semibold text-[14px] flex-1 sm:flex-none hover:bg-blue-700 transition"
          >
            + Thêm Đối Tác
          </button>
        </div>
      </header>

      {syncProgress.status !== 'IDLE' && (
        <div className="fixed bottom-6 right-6 z-[100] w-[350px] bg-white rounded-[6px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-brand-text flex items-center gap-2">
                <svg className="w-4 h-4 text-[#005fb8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Đồng Bộ KiotViet
              </h3>
              {syncProgress.status === 'ERROR' && (
                <button 
                  onClick={() => { setSyncProgress({status: 'IDLE', saved: 0, total:0, message: ''}); setSyncingKiotViet(false); }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {syncProgress.status === 'FETCHING' && (
                   <div className="w-5 h-5 border-2 border-[#005fb8] border-t-transparent rounded-full animate-spin"></div>
                )}
                {syncProgress.status === 'SAVING' && (
                   <div className="w-5 h-5 border-2 border-[#005fb8] border-t-transparent rounded-full animate-spin"></div>
                )}
                {syncProgress.status === 'DONE' && (
                   <div className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                   </div>
                )}
                {syncProgress.status === 'ERROR' && (
                   <div className="w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                   </div>
                )}
              </div>
              
              <div className="flex-1">
                <p className={`text-[13px] leading-tight ${syncProgress.status === 'ERROR' ? 'text-red-600' : 'text-slate-600'}`}>
                  {syncProgress.message}
                </p>
                {syncProgress.status === 'SAVING' && (
                   <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                     <div 
                       className="bg-[#005fb8] h-1.5 rounded-full transition-all duration-300" 
                       style={{ width: `${Math.max(2, (syncProgress.saved / syncProgress.total) * 100)}%` }}
                     ></div>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <PartnerFormModal
          partner={editingPartner}
          onClose={() => setModalOpen(false)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteConfirmPartner}
        title="Xác nhận xóa đối tác"
        message={
          <>
            Bạn có chắc chắn muốn xóa đối tác <strong>{deleteConfirmPartner?.name}</strong> không?
            <p className="mt-2 text-red-600 text-[13px] font-medium bg-red-50/50 p-2 rounded border border-red-100">
              Lưu ý: Hành động này là vĩnh viễn và không thể hoàn tác. Sẽ xóa hoàn toàn mọi hồ sơ dư nợ liên quan.
            </p>
          </>
        }
        confirmText="Xác nhận Xóa"
        cancelText="Hủy bỏ"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmPartner(null)}
      />

      <Card className="flex flex-col flex-1 overflow-hidden rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-brand-border mt-2">
        <div className="flex justify-between items-center bg-brand-card">
          <div className="flex border-b border-brand-border w-full">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-6 py-3 text-[14px] font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'ALL'
                  ? 'border-brand-primary text-brand-primary bg-blue-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveTab('CUSTOMER')}
              className={`px-6 py-3 text-[14px] font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'CUSTOMER'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Khách hàng
            </button>
            <button
              onClick={() => setActiveTab('SUPPLIER')}
              className={`px-6 py-3 text-[14px] font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'SUPPLIER'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Nhà cung cấp
            </button>
          </div>
        </div>
        <div className="p-4 border-b border-brand-border flex justify-between items-center bg-brand-card">
          <h3 className="text-[15px] sm:text-[16px] font-semibold">Danh Sách {activeTab === 'CUSTOMER' ? 'Khách Hàng' : activeTab === 'SUPPLIER' ? 'Nhà Cung Cấp' : 'Đối Tác'}</h3>
          <div className="text-[12px] text-brand-text-sub">Tổng số: {filteredPartners.length}</div>
        </div>
        <CardContent className="p-0 overflow-x-auto flex-1">
          <div className="min-w-[700px]">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr>
                <th className="bg-[#f8f9fa] text-left p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border pl-4 w-[120px]">Phân Loại</th>
                <th className="bg-[#f8f9fa] text-left p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border min-w-[200px]">Tên Khách/NCC</th>
                <th className="bg-[#f8f9fa] text-left p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border w-[120px]">Điện Thoại</th>
                <th className="bg-[#f8f9fa] text-left p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border min-w-[200px]">Địa Chỉ</th>
                <th className="bg-[#f8f9fa] text-left p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border w-[150px]">CCCD / MST</th>
                <th className="bg-[#f8f9fa] text-right p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border w-[150px]">Phải Thu (AR)</th>
                <th className="bg-[#f8f9fa] text-right p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border w-[150px]">Phải Trả (AP)</th>
                <th className="bg-[#f8f9fa] text-center p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border pr-4 w-[100px]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPartners.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-brand-text-sub italic">
                    {searchTerm ? `Không tìm thấy kết quả cho "${searchTerm}"` : 'Chưa có đối tác nào. Vui lòng thêm mới.'}
                  </td>
                </tr>
              ) : paginatedPartners.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 pl-4 border-b border-brand-border whitespace-nowrap">
                    {p.type === 'CUSTOMER' ? (
                      <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-1 rounded-[3px] uppercase">Khách hàng</span>
                    ) : (
                      <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-1 rounded-[3px] uppercase">Nhà cung cấp</span>
                    )}
                  </td>
                  <td className="p-3 border-b border-brand-border font-semibold text-brand-text whitespace-nowrap">{p.name}</td>
                  <td className="p-3 border-b border-brand-border font-medium text-brand-text-sub whitespace-nowrap">{p.phone || '-'}</td>
                  <td className="p-3 border-b border-brand-border text-brand-text-sub max-w-[200px] truncate" title={p.address || ''}>{p.address || '-'}</td>
                  
                  <td className="p-3 border-b border-brand-border text-brand-text-sub whitespace-nowrap text-[12px]">
                    {p.type === 'CUSTOMER' ? (
                       p.cccd ? <span className="text-brand-text" title="CCCD">CCCD: {p.cccd}</span> : <span className="text-gray-400 italic">Chưa có CCCD</span>
                    ) : (
                       p.mst ? <span className="text-brand-text" title="MST">MST: {p.mst}</span> : <span className="text-gray-400 italic">Chưa có MST</span>
                    )}
                  </td>
                  
                  <td className="p-3 border-b border-brand-border text-right whitespace-nowrap">
                    {p.type === 'CUSTOMER' ? (
                      <span className="text-brand-success font-semibold">{formatCurrency(p.totalReceivable)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  
                  <td className="p-3 border-b border-brand-border text-right whitespace-nowrap">
                    {p.type === 'SUPPLIER' ? (
                      <span className="text-brand-danger font-semibold">{formatCurrency(p.totalPayable)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="p-3 pr-4 border-b border-brand-border text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                       <button onClick={() => setDetailPartner(p)} className="p-1.5 bg-blue-50 text-brand-primary hover:text-blue-700 hover:bg-blue-100 rounded transition-colors" title="Xem chi tiết">
                         <Eye size={15} />
                       </button>
                       <button onClick={() => handleEdit(p)} className="p-1.5 bg-slate-100 text-brand-text-sub hover:text-brand-primary rounded transition-colors" title="Chỉnh sửa">
                         <Edit2 size={15} />
                       </button>
                       <button onClick={() => setDeleteConfirmPartner({id: p.id, name: p.name})} className="p-1.5 bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors" title="Xoá">
                         <Trash2 size={15} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-brand-border bg-white">
            <span className="text-[13px] text-brand-text-sub">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredPartners.length)} trong tổng số {filteredPartners.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1 rounded border border-slate-300 text-[13px] disabled:opacity-50"
              >
                Trước
              </button>
              <span className="px-3 text-[13px] font-medium">Trang {currentPage}</span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1 rounded border border-slate-300 text-[13px] disabled:opacity-50"
              >
                Tiếp
              </button>
            </div>
          </div>
        )}
      </Card>

      {detailPartner && (
        <PartnerDetailModal partner={detailPartner} onClose={() => setDetailPartner(null)} />
      )}
    </>
  );
}
