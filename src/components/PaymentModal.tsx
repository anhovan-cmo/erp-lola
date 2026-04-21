import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import { handleFirestoreError } from '../lib/firebase/errors';
import { auth } from '../lib/firebase/config';

interface PaymentModalProps {
  onClose: () => void;
}

export function PaymentModal({ onClose }: PaymentModalProps) {
  const { partners, updatePartnerDebt } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Chuyển khoản');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(lowerSearch);
      const matchPhone = p.phone && p.phone.toLowerCase().includes(lowerSearch);
      return matchName || matchPhone;
    });
  }, [partners, searchTerm]);

  const selectedPartner = partners.find(p => p.id === selectedPartnerId);
  const amount = Number(amountStr) || 0;

  const debtType = selectedPartner?.type === 'CUSTOMER' ? 'Receivable' : 'Payable';
  const currentDebt = selectedPartner ? (debtType === 'Receivable' ? selectedPartner.totalReceivable : selectedPartner.totalPayable) : 0;

  const handleSubmit = async () => {
    if (!selectedPartnerId || amount <= 0) {
      alert('Vui lòng chọn đối tác và nhập số tiền lớn hơn 0.');
      return;
    }
    setSaving(true);
    try {
      // The context updates only the debt total on partner. 
      // Further extending this to save "Payment" transactions using paymentMethod, transactionId, paymentDate would be ideal.
      // E.g. await createPaymentRecord({ partnerId: selectedPartnerId, amount, method: paymentMethod, type: debtType, ... });
      await updatePartnerDebt(selectedPartnerId, amount, debtType);
      onClose();
    } catch (e: any) {
       handleFirestoreError(e, 'update', 'partners', auth.currentUser);
       alert("Có lỗi xảy ra: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[4px] w-full max-w-[500px] shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25)] flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-brand-border">
          <h2 className="text-[18px] sm:text-[20px] font-semibold text-brand-text">Tạo Phiếu Thanh Toán</h2>
          <button onClick={onClose} className="text-brand-text-sub hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto w-full">
          <div className="mb-4 w-full">
            <label className="block text-sm font-semibold mb-1 text-brand-text-sub">Đối Tác</label>
            <div className="relative mb-2">
              <Search size={16} className="absolute left-3 top-2.5 text-brand-text-sub" />
              <input 
                type="text" 
                placeholder="Tìm đối tác theo tên, sđt..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-brand-border rounded-[3px] text-[13px] focus:outline-none focus:border-brand-primary"
              />
            </div>
            <select 
              className="w-full border border-brand-border rounded-[3px] px-3 py-2 text-[13px] sm:text-[14px]"
              value={selectedPartnerId}
              onChange={e => setSelectedPartnerId(e.target.value)}
            >
              <option value="">-- Chọn Khách Hàng / Nhà Cung Cấp --</option>
              {filteredPartners.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.type === 'CUSTOMER' ? 'Khách Hàng' : 'Nhà Cung Cấp'} (Nợ: {formatCurrency(p.type === 'CUSTOMER' ? p.totalReceivable : p.totalPayable)})
                </option>
              ))}
              {filteredPartners.length === 0 && (
                <option value="" disabled>Không tìm thấy đối tác</option>
              )}
            </select>
          </div>

          {selectedPartner && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-1 text-brand-text-sub">Số Tiền Thanh Toán ({debtType === 'Receivable' ? 'Thu từ KH' : 'Trả cho NCC'})</label>
                <input 
                  type="number" 
                  className="w-full border border-brand-border rounded-[3px] px-3 py-2 text-[13px] sm:text-[14px]"
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  placeholder="Nhập số tiền..."
                />
                <p className="text-xs text-brand-text-sub mt-1">
                  Công nợ hiện tại: <strong className="text-brand-text">{formatCurrency(currentDebt)}</strong> 
                  {amount > 0 && (
                    <> → Còn lại: <strong className="text-brand-success">{formatCurrency(currentDebt - amount)}</strong> {(currentDebt - amount) < 0 && '(Thừa/Ứng trước)'}</>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-brand-text-sub">Hình thức</label>
                  <select 
                    className="w-full border border-brand-border rounded-[3px] px-3 py-2 text-[13px] sm:text-[14px]"
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                  >
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Quẹt thẻ">Quẹt thẻ</option>
                    <option value="Séc">Séc</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-brand-text-sub">Ngày thanh toán</label>
                  <input 
                    type="date" 
                    className="w-full border border-brand-border rounded-[3px] px-3 py-2 text-[13px] sm:text-[14px]"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-1 text-brand-text-sub">Mã giao dịch / Ghi chú</label>
                <input 
                  type="text" 
                  className="w-full border border-brand-border rounded-[3px] px-3 py-2 text-[13px] sm:text-[14px]"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="Mã chuyển khoản, số chứng từ..."
                />
              </div>
            </>
          )}
        </div>
        
        <div className="p-4 sm:p-5 border-t border-brand-border flex justify-end gap-3 bg-[#f8f9fa] shrink-0">
          <button onClick={onClose} className="px-3 sm:px-4 py-2 font-semibold text-brand-text hover:bg-slate-200 rounded-[3px] text-[13px] sm:text-sm">
            Hủy
          </button>
          <button 
            onClick={handleSubmit}
            disabled={saving || !selectedPartnerId || amount <= 0}
            className={`px-3 sm:px-4 py-2 bg-brand-primary text-white font-semibold rounded-[3px] text-[13px] sm:text-sm ${saving || !selectedPartnerId || amount <= 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
          >
            {saving ? 'Đang lưu...' : 'Lưu Thanh Toán'}
          </button>
        </div>
      </div>
    </div>
  );
}
