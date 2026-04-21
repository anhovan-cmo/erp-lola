import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Partner, useAppContext } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import { Landmark, Users, Download, Search, ArrowUpDown, History } from 'lucide-react';
import { PaymentModal } from '../components/PaymentModal';
import { DebtDetailModal } from '../components/DebtDetailModal';
import Papa from 'papaparse';

export function Debts({ type }: { type: 'RECEIVABLE' | 'PAYABLE' }) {
  const { partners } = useAppContext();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'name'>('desc');

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      // Filter by type early
      if (type === 'RECEIVABLE' && p.type !== 'CUSTOMER') return false;
      if (type === 'PAYABLE' && p.type !== 'SUPPLIER') return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || (p.phone && p.phone.toLowerCase().includes(term));
    }).sort((a, b) => {
       if (sortOrder === 'name') {
         return a.name.localeCompare(b.name);
       }
       const valA = a.type === 'CUSTOMER' ? a.totalReceivable : a.totalPayable;
       const valB = b.type === 'CUSTOMER' ? b.totalReceivable : b.totalPayable;
       return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [partners, searchTerm, sortOrder, type]);

  const customers = filteredPartners.filter(p => p.type === 'CUSTOMER');
  const suppliers = filteredPartners.filter(p => p.type === 'SUPPLIER');

  const handleExportCSV = () => {
    const csvDataCustomers = customers.map(c => ({
      'Loại': 'Khách Hàng',
      'Tên Đối Tác': c.name,
      'SĐT': c.phone,
      'Công Nợ (AR)': c.totalReceivable,
      'Phải Trả (AP)': 0
    }));

    const csvDataSuppliers = suppliers.map(s => ({
      'Loại': 'Nhà Cung Cấp',
      'Tên Đối Tác': s.name,
      'SĐT': s.phone,
      'Công Nợ (AR)': 0,
      'Phải Trả (AP)': s.totalPayable
    }));

    const csvData = [...csvDataCustomers, ...csvDataSuppliers];
    const csv = Papa.unparse(csvData);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh_sach_cong_no_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h1 className="text-[20px] md:text-[24px] font-semibold uppercase">
          {type === 'RECEIVABLE' ? 'CÔNG NỢ PHẢI THU KHÁCH HÀNG' : 'CÔNG NỢ PHẢI TRẢ NHÀ CUNG CẤP'}
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto overflow-hidden">
          <div className="relative flex-1 sm:w-64 shrink-0">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm theo tên/sđt..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-brand-primary"
            />
          </div>
          <div className="relative shrink-0">
             <select
               value={sortOrder}
               onChange={e => setSortOrder(e.target.value as any)}
               className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded text-sm appearance-none focus:outline-none focus:border-brand-primary"
             >
                <option value="desc">Nợ giảm dần</option>
                <option value="asc">Nợ tăng dần</option>
                <option value="name">Tên A-Z</option>
             </select>
             <ArrowUpDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
          </div>
          <button 
            onClick={handleExportCSV}
            className="bg-white text-brand-primary border border-brand-primary py-2 px-4 rounded-[3px] font-semibold text-[14px] w-full sm:w-auto flex items-center justify-center gap-2 shrink-0"
          >
            <Download size={16} /> Xuất CSV
          </button>
          <button 
            onClick={() => setShowPaymentModal(true)}
            className="bg-brand-primary text-white border-none py-2 px-4 rounded-[3px] font-semibold text-[14px] w-full sm:w-auto shrink-0 whitespace-nowrap"
          >
            + Phiếu Thanh Toán
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 pb-4 overflow-y-auto">
        {type === 'RECEIVABLE' ? (
        <Card className="flex flex-col flex-1 overflow-hidden border-l-4 border-brand-success rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] bg-[#ffffff] min-h-[300px]">
          <div className="p-4 border-b border-brand-border flex justify-between items-center bg-[#f8f9fa]">
            <h3 className="text-[15px] sm:text-[16px] font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-success" />
              Phải Thu Khách Hàng (AR)
            </h3>
          </div>
          <CardContent className="p-0 overflow-x-auto flex-1 bg-white">
            <div className="min-w-[400px]">
            <table className="w-full text-[13px] border-collapse relative">
              <thead>
                <tr>
                  <th className="bg-[#f8f9fa] text-left px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white sticky top-0 z-10 w-2/5">Tên Khách Hàng</th>
                  <th className="bg-[#f8f9fa] text-left px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white sticky top-0 z-10">SĐT</th>
                  <th className="bg-[#f8f9fa] text-right px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white sticky top-0 z-10">Phải Thu</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => setSelectedPartner(c)} title="Nhấn để xem chi tiết lịch sử">
                    <td className="px-4 py-3 border-b border-brand-border font-semibold text-brand-text group-hover:text-brand-primary transition-colors flex items-center gap-2">
                       <History size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 hidden sm:block" /> {c.name}
                    </td>
                    <td className="px-4 py-3 border-b border-brand-border text-brand-text-sub">{c.phone || '-'}</td>
                    <td className="px-4 py-3 border-b border-brand-border text-right font-bold text-brand-text">
                      {formatCurrency(c.totalReceivable)}
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                     <td colSpan={3} className="text-center py-8 text-gray-500 italic">Không có khách hàng nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
        ) : (
        <Card className="flex flex-col flex-1 overflow-hidden border-l-4 border-brand-danger rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] bg-[#ffffff] min-h-[300px]">
          <div className="p-4 border-b border-brand-border flex justify-between items-center bg-[#f8f9fa]">
            <h3 className="text-[15px] sm:text-[16px] font-semibold flex items-center gap-2">
              <Landmark className="w-5 h-5 text-brand-danger" />
              Phải Trả Nhà Cung Cấp (AP)
            </h3>
          </div>
          <CardContent className="p-0 overflow-x-auto flex-1 bg-white">
            <div className="min-w-[400px]">
            <table className="w-full text-[13px] border-collapse relative">
              <thead>
                <tr>
                  <th className="bg-[#f8f9fa] text-left px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white sticky top-0 z-10 w-2/5">Tên Nhà Cung Cấp</th>
                  <th className="bg-[#f8f9fa] text-left px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white sticky top-0 z-10">SĐT</th>
                  <th className="bg-[#f8f9fa] text-right px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white sticky top-0 z-10">Phải Trả</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 cursor-pointer group" onClick={() => setSelectedPartner(s)} title="Nhấn để xem chi tiết lịch sử">
                    <td className="px-4 py-3 border-b border-brand-border font-semibold text-brand-text group-hover:text-brand-primary transition-colors flex items-center gap-2">
                      <History size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 hidden sm:block" /> {s.name}
                    </td>
                    <td className="px-4 py-3 border-b border-brand-border text-brand-text-sub">{s.phone || '-'}</td>
                    <td className="px-4 py-3 border-b border-brand-border text-right font-bold text-brand-text">
                      {formatCurrency(s.totalPayable)}
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                     <td colSpan={3} className="text-center py-8 text-gray-500 italic">Không có nhà cung cấp nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
      
      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} />}
      {selectedPartner && <DebtDetailModal partner={selectedPartner} onClose={() => setSelectedPartner(null)} />}
    </>
  );
}
