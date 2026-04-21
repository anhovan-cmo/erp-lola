import React, { useState, useRef, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { useAppContext, Partner } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import { Edit2, Trash2, Upload, Search, X, Eye } from 'lucide-react';
import { PartnerFormModal } from '../components/PartnerFormModal';
import { PartnerDetailModal } from '../components/PartnerDetailModal';
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

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmPartner, setDeleteConfirmPartner] = useState<{id: string, name: string} | null>(null);

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(lowerSearch);
      const matchPhone = p.phone && p.phone.toLowerCase().includes(lowerSearch);
      return matchName || matchPhone;
    });
  }, [partners, searchTerm]);

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

  const executeSyncKiotViet = async () => {
    if (!window.confirm('Xác nhận đồng bộ dữ liệu Khách hàng & Nhà cung cấp từ KiotViet? Quá trình này sẽ lấy dữ liệu nợ và làm mới danh sách đối tác.')) return;
    setSyncingKiotViet(true);
    setSyncProgress({ status: 'FETCHING', saved: 0, total: 0, message: 'Đang kết nối KiotViet và tải danh sách...' });
    
    try {
      const res = await fetch('/api/kiotviet/sync-partners');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Server lỗi không rõ nguyên nhân');

      const totalItems = (data.customers?.length || 0) + (data.suppliers?.length || 0);
      setSyncProgress({ status: 'SAVING', saved: 0, total: totalItems, message: `Đã tải ${totalItems} đối tác. Đang lưu vào hệ thống...` });

      // Now sync to Firestore
      let batch = writeBatch(db);
      let count = 0;
      const now = serverTimestamp();

      const processItem = async (item: any, type: 'CUSTOMER' | 'SUPPLIER') => {
        const idStr = String(item.id || item.code || Math.random());
        const ptRef = doc(collection(db, 'partners'));
        const name = (item.name || 'Khách KiotViet').substring(0, 256);
        const phone = (item.contactNumber || item.phone || '').substring(0, 32);
        const address = (item.address || '').substring(0, 500);
        const debt = Number(item.debt || 0);

        batch.set(ptRef, {
          id: ptRef.id,
          name,
          phone,
          address,
          cccd: '',
          mst: '',
          type,
          totalReceivable: type === 'CUSTOMER' ? debt : 0,
          totalPayable: type === 'SUPPLIER' ? debt : 0,
          createdAt: now,
          updatedAt: now
        });
        count++;

        if (count % 20 === 0) { // Batch at 20 so progress bar triggers visually fast
          await batch.commit();
          batch = writeBatch(db);
          setSyncProgress(p => ({ ...p, saved: count, message: `Đang lưu ${count}/${totalItems} đối tác...` }));
        }
      };

      for (const cus of data.customers) await processItem(cus, 'CUSTOMER');
      for (const sup of data.suppliers) await processItem(sup, 'SUPPLIER');

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
            onClick={executeSyncKiotViet}
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
        <div className="fixed inset-0 bg-[rgba(9,30,66,0.7)] flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[6px] w-full max-w-[400px] shadow-2xl flex flex-col p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-[18px] font-bold text-brand-text text-center mb-4">
              Đồng Bộ KiotViet
            </h2>
            
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              {syncProgress.status === 'FETCHING' && (
                 <div className="w-10 h-10 border-4 border-[#005fb8] border-t-transparent rounded-full animate-spin"></div>
              )}
              {syncProgress.status === 'SAVING' && (
                 <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                   <div 
                     className="bg-[#005fb8] h-2.5 rounded-full transition-all duration-300 relative overflow-hidden" 
                     style={{ width: `${Math.max(5, (syncProgress.saved / syncProgress.total) * 100)}%` }}
                   >
                     <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-pulse"></div>
                   </div>
                 </div>
              )}
              {syncProgress.status === 'DONE' && (
                 <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                 </div>
              )}
              {syncProgress.status === 'ERROR' && (
                 <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                   <X size={24} strokeWidth={3} />
                 </div>
              )}
              
              <p className={`text-center font-medium ${syncProgress.status === 'ERROR' ? 'text-red-500' : 'text-brand-text-sub'} text-[14px]`}>
                {syncProgress.message}
              </p>
            </div>
            
            {syncProgress.status === 'ERROR' && (
              <button 
                onClick={() => { setSyncProgress({status: 'IDLE', saved: 0, total:0, message: ''}); setSyncingKiotViet(false); }}
                className="mt-4 w-full py-2 bg-slate-100 text-brand-text font-semibold rounded-[3px] hover:bg-slate-200"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <PartnerFormModal
          partner={editingPartner}
          onClose={() => setModalOpen(false)}
        />
      )}

      {deleteConfirmPartner && (
        <div className="fixed inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[4px] w-full max-w-[400px] shadow-xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-brand-border">
              <h2 className="text-[18px] font-bold text-brand-danger flex items-center gap-2">
                <Trash2 size={20} /> Xác nhận xóa
              </h2>
              <button onClick={() => setDeleteConfirmPartner(null)} className="text-brand-text-sub hover:text-brand-text">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 sm:p-5 text-brand-text text-[14px]">
              Bạn có chắc chắn muốn xóa đối tác <strong>{deleteConfirmPartner.name}</strong> không?
              <p className="mt-2 text-brand-danger text-sm font-medium bg-red-50 p-2 rounded border border-red-100">
                Lưu ý: Hành động này là vĩnh viễn và không thể hoàn tác. Sẽ xóa hoàn toàn mọi hồ sơ dư nợ liên quan.
              </p>
            </div>
            <div className="p-4 border-t border-brand-border flex justify-end gap-3 bg-[#f8f9fa]">
              <button 
                onClick={() => setDeleteConfirmPartner(null)}
                className="px-4 py-2 font-semibold text-brand-text hover:bg-slate-200 rounded-[3px] text-[13px] transition"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={executeDelete}
                className="px-4 py-2 bg-brand-danger text-white font-semibold rounded-[3px] text-[13px] hover:bg-red-700 transition"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      <Card className="flex flex-col flex-1 overflow-hidden rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-brand-border mt-2">
        <div className="p-4 border-b border-brand-border flex justify-between items-center bg-brand-card">
          <h3 className="text-[15px] sm:text-[16px] font-semibold">Danh Sách Đối Tác</h3>
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
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-brand-text-sub italic">
                    {searchTerm ? `Không tìm thấy kết quả cho "${searchTerm}"` : 'Chưa có đối tác nào. Vui lòng thêm mới.'}
                  </td>
                </tr>
              ) : filteredPartners.map((p) => (
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
      </Card>

      {detailPartner && (
        <PartnerDetailModal partner={detailPartner} onClose={() => setDetailPartner(null)} />
      )}
    </>
  );
}
