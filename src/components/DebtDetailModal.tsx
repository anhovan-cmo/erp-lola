import React, { useMemo } from 'react';
import { X, Search, Download, History } from 'lucide-react';
import { Partner, useAppContext } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import { Card, CardContent } from './ui/card';

interface DebtDetailModalProps {
  partner: Partner;
  onClose: () => void;
}

export function DebtDetailModal({ partner, onClose }: DebtDetailModalProps) {
  const { transactions } = useAppContext();

  // Find all transactions associated with this partner
  const partnerTx = useMemo(() => {
    return transactions
      .filter(t => t.partnerId === partner.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, partner.id]);

  const debtValue = partner.type === 'CUSTOMER' ? partner.totalReceivable : partner.totalPayable;
  const debtLabel = partner.type === 'CUSTOMER' ? 'Phải Thu (AR)' : 'Phải Trả (AP)';

  return (
    <div className="fixed inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[4px] w-full max-w-[800px] shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25)] flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-brand-border bg-[#f8f9fa]">
          <h2 className="text-[18px] sm:text-[20px] font-semibold text-brand-text flex items-center gap-2">
            <History className="text-brand-primary" size={24} /> Chi Tiết Công Nợ: {partner.name}
          </h2>
          <button onClick={onClose} className="text-brand-text-sub hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto w-full bg-slate-50">
          <div className="bg-white p-4 rounded border border-brand-border mb-6">
            <h3 className="text-sm font-semibold text-brand-text-sub uppercase mb-1">Dư nợ hiện tại ({debtLabel})</h3>
            <p className="text-2xl font-bold text-brand-danger mb-1">{formatCurrency(debtValue)}</p>
            <p className="text-[13px] text-gray-500">Loại đối tác: {partner.type === 'CUSTOMER' ? 'Khách Hàng' : 'Nhà Cung Cấp'}</p>
            <p className="text-[13px] text-gray-500">Số ĐT: {partner.phone || 'Chưa cập nhật'}</p>
          </div>

          <h4 className="font-semibold text-[15px] sm:text-[16px] mb-3">
            Lịch sử giao dịch ({partnerTx.length})
          </h4>
          
          {partnerTx.length === 0 ? (
            <div className="text-center py-6 text-brand-text-sub italic border border-dashed border-brand-border bg-white font-medium rounded">
              Không có giao dịch nào được ghi nhận với đối tác này.
            </div>
          ) : (
            <div className="border border-brand-border rounded-[4px] overflow-hidden bg-white">
              <table className="w-full text-[12px] sm:text-[13px] border-collapse min-w-[600px]">
                <thead className="bg-[#f8f9fa]">
                  <tr>
                    <th className="py-2 px-3 text-left border-b border-brand-border font-semibold text-brand-text-sub">Ngày Lập</th>
                    <th className="py-2 px-3 text-left border-b border-brand-border font-semibold text-brand-text-sub">Mã Phiếu</th>
                    <th className="py-2 px-3 text-left border-b border-brand-border font-semibold text-brand-text-sub w-32">Loại Giao Dịch</th>
                    <th className="py-2 px-3 text-right border-b border-brand-border font-semibold text-brand-text-sub">Tổng Giá Trị</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerTx.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 border-b border-gray-100 font-medium">
                        {new Date(tx.date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 border-b border-gray-100">
                        <span className="font-mono text-brand-primary">{tx.id}</span>
                        <div className="text-[11px] text-gray-400 mt-0.5 max-w-[200px] truncate" title={tx.note}>{tx.note || '(Không ghi chú)'}</div>
                      </td>
                      <td className="py-3 px-3 border-b border-gray-100">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          tx.type === 'IMPORT' 
                            ? 'bg-brand-tag-in-bg text-brand-tag-in-text' 
                            : 'bg-brand-tag-out-bg text-brand-tag-out-text'
                        }`}>
                          {tx.type === 'IMPORT' ? 'NHẬP KHO' : 'XUẤT KHO'}
                        </span>
                      </td>
                      <td className="py-3 px-3 border-b border-gray-100 text-right font-bold text-brand-text">
                        {formatCurrency(tx.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="p-4 sm:p-5 border-t border-brand-border flex justify-end bg-[#f8f9fa] shrink-0">
          <button onClick={onClose} className="px-4 sm:px-5 py-2 bg-brand-primary text-white font-semibold rounded-[3px] hover:bg-blue-700 text-[13px] sm:text-[14px]">
            Đóng Chi Tiết
          </button>
        </div>
      </div>
    </div>
  );
}
