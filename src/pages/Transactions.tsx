import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { useAppContext, Transaction } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import { TransactionFormModal } from '../components/TransactionFormModal';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { Trash2 } from 'lucide-react';

export function Transactions({ type }: { type: 'IMPORT' | 'EXPORT' }) {
  const { transactions, deleteTransaction, userProfile } = useAppContext();
  const [modalType, setModalType] = useState<'IMPORT' | 'EXPORT' | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = transactions.filter(t => t.type === type);

  const handleDelete = async (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation(); // Ngăn mở modal chi tiết
    if (confirm(`Bạn có chắc muốn xoá ${tx.type === 'IMPORT' ? 'Phiếu nhập' : 'Phiếu xuất'} ${tx.id}? Hành động này (quyền Admin) sẽ xoá vĩnh viễn dữ liệu.`)) {
      try {
        await deleteTransaction(tx.id);
        alert('Xoá thành công!');
      } catch (err: any) {
        alert('Lỗi: ' + err.message);
      }
    }
  };

  const TrashIcon = ({ tx }: { tx: Transaction }) => {
    if (userProfile?.role !== 'ADMIN') return null;
    return (
      <button 
        onClick={(e) => handleDelete(e, tx)}
        className="p-1.5 text-brand-danger hover:bg-red-50 rounded transition-colors"
        title="Admin: Xóa giao dịch"
      >
        <Trash2 size={16} />
      </button>
    );
  };

  return (
    <>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <h1 className="text-[20px] md:text-[24px] font-semibold uppercase">
          {type === 'IMPORT' ? 'Quản Lý Nhập Kho' : 'Quản Lý Xuất Kho'}
        </h1>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {type === 'IMPORT' && (
            <button 
              onClick={() => setModalType('IMPORT')}
              className="bg-brand-tag-in-bg text-brand-tag-in-text border border-[#b3ebd3] py-2 px-4 rounded-[3px] font-semibold text-[13px] hover:bg-green-100 transition flex-1 sm:flex-none"
            >
              + Nhập Kho
            </button>
          )}
          {type === 'EXPORT' && (
            <button 
              onClick={() => setModalType('EXPORT')}
              className="bg-brand-primary text-white border-none py-2 px-4 rounded-[3px] font-semibold text-[13px] hover:bg-blue-700 transition flex-1 sm:flex-none"
            >
              + Xuất Kho
            </button>
          )}
        </div>
      </header>

      {modalType && (
        <TransactionFormModal 
          type={modalType} 
          onClose={() => setModalType(null)} 
        />
      )}

      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}

      <Card className="flex flex-col flex-1 overflow-hidden rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-brand-border mt-2">
        <div className="p-4 border-b border-brand-border flex justify-between items-center bg-brand-card">
          <h3 className="text-[15px] sm:text-[16px] font-semibold">Giao Dịch Gần Đây</h3>
          <div className="text-[12px] text-brand-text-sub">Đang hiển thị {filteredTransactions.length} giao dịch</div>
        </div>
        <CardContent className="p-0 overflow-x-auto flex-1">
          <div className="min-w-[700px]">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr>
                <th className="bg-[#f8f9fa] text-left p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border pl-4">Ngày Giao Dịch</th>
                <th className="bg-[#f8f9fa] text-left p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border">Mã Phiếu</th>
                <th className="bg-[#f8f9fa] text-left p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border">Loại</th>
                <th className="bg-[#f8f9fa] text-left p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border">Đối Tác</th>
                <th className="bg-[#f8f9fa] text-right p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border">Tổng Giá Trị</th>
                <th className="bg-[#f8f9fa] text-left p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border pr-4">Ghi Chú</th>
                <th className="bg-[#f8f9fa] text-right p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border pr-4 w-[60px]">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500 italic">Không có giao dịch nào.</td>
                </tr>
              )}
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} onClick={() => setSelectedTransaction(tx)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="p-3 pl-4 border-b border-brand-border text-brand-text-sub whitespace-nowrap">{tx.date}</td>
                  <td className="p-3 border-b border-brand-border font-semibold text-brand-text whitespace-nowrap">{tx.id}</td>
                  <td className="p-3 border-b border-brand-border whitespace-nowrap">
                    {tx.type === 'IMPORT' ? (
                      <span className="bg-brand-tag-in-bg text-brand-tag-in-text font-bold px-2 py-1 rounded-[3px] text-[11px] uppercase">Nhập Kho</span>
                    ) : (
                      <span className="bg-brand-tag-out-bg text-brand-tag-out-text font-bold px-2 py-1 rounded-[3px] text-[11px] uppercase">Xuất Kho</span>
                    )}
                  </td>
                  <td className="p-3 border-b border-brand-border font-medium text-brand-text">{tx.partnerName || '-'}</td>
                  <td className="p-3 border-b border-brand-border text-right font-semibold whitespace-nowrap">
                    <span className={tx.type === 'IMPORT' ? 'text-brand-text' : 'text-brand-text'}>
                      {formatCurrency(tx.totalValue)}
                    </span>
                  </td>
                  <td className="p-3 border-b border-brand-border text-brand-text-sub text-[12px] truncate max-w-[200px]">{tx.note}</td>
                  <td className="p-3 pr-4 border-b border-brand-border text-right whitespace-nowrap">
                    <TrashIcon tx={tx} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
