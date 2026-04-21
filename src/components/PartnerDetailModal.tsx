import React, { useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { Partner, useAppContext } from '../context/AppContext';
import { formatCurrency, cn } from '../lib/utils';

interface PartnerDetailModalProps {
  partner: Partner;
  onClose: () => void;
}

export function PartnerDetailModal({ partner, onClose }: PartnerDetailModalProps) {
  const { transactions } = useAppContext();

  // Find all transactions involving this partner
  const partnerTransactions = useMemo(() => {
    return transactions
      .filter(t => t.partnerId === partner.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, partner.id]);

  return (
    <div className="fixed inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[4px] w-full max-w-[800px] shadow-lg flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-brand-border bg-[#f8f9fa]">
          <h2 className="text-[18px] sm:text-[20px] font-semibold text-brand-text">Hồ sơ Đối tác</h2>
          <button onClick={onClose} className="text-brand-text-sub hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8 bg-blue-50/50 p-4 rounded border border-blue-100">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={cn("px-2 py-0.5 rounded-[3px] text-[11px] font-bold uppercase", partner.type === 'CUSTOMER' ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800")}>
                  {partner.type === 'CUSTOMER' ? 'Khách hàng' : 'Nhà cung cấp'}
                </span>
                <span className="text-[13px] text-brand-text-sub font-mono">ID: {partner.id}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-brand-text mb-1">{partner.name}</h3>
              <p className="text-[14px] text-brand-text-sub flex items-center gap-2 mb-1">📞 {partner.phone || 'Chưa cập nhật số điện thoại'}</p>
              {partner.type === 'CUSTOMER' && <p className="text-[13px] text-brand-text-sub">💳 CCCD: {partner.cccd || <span className="italic text-gray-400">Chưa cập nhật</span>}</p>}
              {partner.type === 'SUPPLIER' && <p className="text-[13px] text-brand-text-sub">🏢 MST: {partner.mst || <span className="italic text-gray-400">Chưa cập nhật</span>}</p>}
              <p className="text-[13px] text-brand-text-sub mt-1">📍 Địa chỉ: {partner.address || <span className="italic text-gray-400">Chưa cập nhật</span>}</p>
            </div>
            
            <div className="flex flex-col gap-2 sm:items-end justify-center min-w-[200px] border-t border-dashed border-blue-200 sm:border-t-0 sm:border-l sm:pl-6 pt-4 sm:pt-0 mt-4 sm:mt-0">
              <div className="w-full">
                <div className="text-[12px] text-brand-text-sub font-semibold">CẦN THU (AR)</div>
                <div className="text-lg font-bold text-brand-success">{formatCurrency(partner.totalReceivable)}</div>
              </div>
              <div className="w-full">
                <div className="text-[12px] text-brand-text-sub font-semibold">CẦN TRẢ (AP)</div>
                <div className="text-lg font-bold text-brand-danger">{formatCurrency(partner.totalPayable)}</div>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <h4 className="font-semibold text-[15px] sm:text-[16px] mb-3 flex items-center gap-2 border-b border-brand-border pb-2">
            Lịch sử giao dịch ({partnerTransactions.length})
          </h4>

          {partnerTransactions.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 border border-brand-border border-dashed rounded text-brand-text-sub text-[13px]">
              Chưa có giao dịch nào với đối tác này.
            </div>
          ) : (
            <div className="border border-brand-border rounded-[4px] overflow-hidden">
              <table className="w-full text-[12px] sm:text-[13px] border-collapse bg-white">
                <thead className="bg-[#f8f9fa] border-b border-brand-border">
                  <tr>
                    <th className="py-2.5 px-3 text-left font-semibold text-brand-text-sub w-[120px]">Ngày</th>
                    <th className="py-2.5 px-3 text-left font-semibold text-brand-text-sub w-[120px]">Mã Giao Dịch</th>
                    <th className="py-2.5 px-3 text-left font-semibold text-brand-text-sub">Loại</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-brand-text-sub">Ghi chú</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-brand-text-sub">Giá trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {partnerTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 whitespace-nowrap">{new Date(t.date).toLocaleDateString('vi-VN')}</td>
                      <td className="py-2.5 px-3 text-brand-primary font-mono">{t.id}</td>
                      <td className="py-2.5 px-3">
                        <span className={cn("px-2 py-0.5 rounded-[3px] font-bold text-[10px]", t.type === 'IMPORT' ? "bg-brand-tag-in-bg text-brand-tag-in-text" : "bg-brand-tag-out-bg text-brand-tag-out-text")}>
                          {t.type === 'IMPORT' ? 'NHẬP KHO' : 'XUẤT KHO'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-brand-text-sub truncate max-w-[200px]" title={t.note}>
                        {t.note || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {formatCurrency(t.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="p-4 sm:p-5 border-t border-brand-border flex justify-end gap-3 bg-[#f8f9fa]">
          <button onClick={onClose} className="px-4 sm:px-5 py-2 bg-brand-primary text-white font-semibold rounded-[3px] hover:bg-blue-700 text-[13px] sm:text-[14px]">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
