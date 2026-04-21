import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppContext, Partner } from '../context/AppContext';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase/config';

interface PartnerFormModalProps {
  partner: Partner | null;
  onClose: () => void;
}

export function PartnerFormModal({ partner, onClose }: PartnerFormModalProps) {
  const { addPartner, updatePartner, userProfile } = useAppContext();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (partner) {
      setName(partner.name || '');
      setPhone(partner.phone || '');
      setType(partner.type || 'CUSTOMER');
    }
  }, [partner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Vui lòng nhập tên đối tác");
    if (!userProfile) return;
    
    setSaving(true);
    try {
      if (partner) {
        // Edit mode (Note: We block editing type to avoid accounting mess with receivable/payable mismatch)
        await updatePartner(partner.id, {
          name: name.trim(),
          phone: phone.trim(),
        });
      } else {
        // Create mode
        await addPartner({
          name: name.trim(),
          phone: phone.trim(),
          type,
          totalReceivable: 0,
          totalPayable: 0,
        });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Lỗi: ' + (err.message || 'Không thể lưu đối tác'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[4px] w-full max-w-[450px] shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25)] flex flex-col">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-brand-border bg-[#f8f9fa]">
          <h2 className="text-[18px] sm:text-[20px] font-semibold text-brand-text">
            {partner ? 'Chỉnh sửa Đối tác' : 'Thêm mới Đối tác'}
          </h2>
          <button onClick={onClose} className="text-brand-text-sub hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-col flex">
          <div className="p-4 sm:p-5 flex-1 w-full gap-4 flex flex-col">
            
            {!partner && (
              <div>
                <label className="block text-sm font-semibold mb-1 text-brand-text-sub">Phân Loại *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="partnerType" 
                      value="CUSTOMER"
                      checked={type === 'CUSTOMER'}
                      onChange={() => setType('CUSTOMER')}
                      className="cursor-pointer"
                    />
                    <span className="text-[14px]">Khách Hàng</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="partnerType" 
                      value="SUPPLIER"
                      checked={type === 'SUPPLIER'}
                      onChange={() => setType('SUPPLIER')}
                      className="cursor-pointer"
                    />
                    <span className="text-[14px]">Nhà Cung Cấp</span>
                  </label>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 italic">Phân loại không thể thay đổi sau khi tạo để đảm bảo logic công nợ.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-1 text-brand-text-sub">Tên Khách/NCC *</label>
              <input 
                type="text" 
                className="w-full border border-brand-border rounded-[3px] px-3 py-2 text-[14px] focus:outline-none focus:border-brand-primary"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="VD: Công ty TNHH Lola..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-brand-text-sub">Điện thoại</label>
              <input 
                type="text" 
                className="w-full border border-brand-border rounded-[3px] px-3 py-2 text-[14px] focus:outline-none focus:border-brand-primary"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Số điện thoại liên hệ..."
              />
            </div>
          </div>
          
          <div className="p-4 sm:p-5 border-t border-brand-border flex justify-end gap-3 bg-[#f8f9fa] shrink-0 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-brand-text hover:bg-slate-200 rounded-[3px] text-[13px] sm:text-sm transition-colors">
              Hủy bỏ
            </button>
            <button 
              type="submit"
              disabled={saving}
              className={`px-4 py-2 bg-brand-primary text-white font-semibold rounded-[3px] text-[13px] sm:text-sm transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            >
              {saving ? 'Đang lưu...' : 'Lưu dữ liệu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
