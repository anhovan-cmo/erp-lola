import React, { useState } from 'react';
import { X, Trash2, ArrowLeftRight } from 'lucide-react';
import { Product, useAppContext } from '../context/AppContext';
import { formatCurrency, cn } from '../lib/utils';
import { handleFirestoreError } from '../lib/firebase/errors';
import { auth } from '../lib/firebase/config';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const { transactions, deleteProduct, userProfile } = useAppContext();
  const [isZoomed, setIsZoomed] = useState(false);

  // Find all transactions that include this product
  const productTransactions = transactions.filter(t => {
    if (t.items) {
      return t.items.some(item => item.productId === product.id);
    }
    // Fallback if older transactions without items
    return false;
  });

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"? Hành động này không thể hoàn tác.`)) {
      return;
    }
    try {
      await deleteProduct(product.id);
      onClose();
    } catch (e: any) {
      handleFirestoreError(e, 'delete', 'products', auth.currentUser);
      alert("Lỗi khi xóa: " + e.message);
    }
  };

  const canDelete = userProfile?.role === 'ADMIN' || userProfile?.role === 'ACCOUNTANT';

  return (
    <div className="fixed inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[4px] w-full max-w-[800px] shadow-lg flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-brand-border bg-[#f8f9fa]">
          <h2 className="text-[18px] sm:text-[20px] font-semibold text-brand-text">Chi tiết sản phẩm</h2>
          <button onClick={onClose} className="text-brand-text-sub hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] shrink-0 border border-brand-border rounded-[4px] p-1 bg-white mx-auto sm:mx-0">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name} 
                  referrerPolicy="no-referrer" 
                  className="w-full h-full object-contain cursor-zoom-in hover:opacity-80 transition-opacity" 
                  onClick={() => setIsZoomed(true)}
                  title="Nhấn để phóng to"
                />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-brand-text-sub text-center">Không hình ảnh</div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-[18px] sm:text-xl font-bold text-brand-text mb-3 text-center sm:text-left">{product.name}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-[13px] sm:text-[14px]">
                <div className="flex justify-between sm:block border-b border-dashed border-gray-200 sm:border-0 pb-1 sm:pb-0"><span className="text-brand-text-sub">Mã hàng:</span> <strong className="ml-2 sm:ml-0">{product.id}</strong></div>
                <div className="flex justify-between sm:block border-b border-dashed border-gray-200 sm:border-0 pb-1 sm:pb-0"><span className="text-brand-text-sub">Thương hiệu:</span> <strong className="ml-2 sm:ml-0">{product.brand || '-'}</strong></div>
                <div className="flex justify-between sm:block border-b border-dashed border-gray-200 sm:border-0 pb-1 sm:pb-0"><span className="text-brand-text-sub">Tồn kho hiện tại:</span> 
                  <span className={cn("ml-2 font-bold px-2 py-0.5 rounded-[3px] text-[12px]", product.stock > 0 ? "bg-brand-tag-in-bg text-brand-tag-in-text" : "bg-brand-tag-out-bg text-brand-tag-out-text")}>
                    {product.stock > 0 ? product.stock : 'HẾT HÀNG'}
                  </span>
                </div>
                <div className="hidden sm:block"></div>
                <div className="flex justify-between sm:block border-b border-dashed border-gray-200 sm:border-0 pb-1 sm:pb-0"><span className="text-brand-text-sub">Giá vốn:</span> <strong className="text-brand-text-sub ml-2 sm:ml-0">{formatCurrency(product.cost)}</strong></div>
                <div className="flex justify-between sm:block"><span className="text-brand-text-sub">Giá bán:</span> <strong className="text-brand-success ml-2 sm:ml-0">{formatCurrency(product.price)}</strong></div>
              </div>
            </div>
          </div>

          <h4 className="font-semibold text-[15px] sm:text-[16px] mb-3 flex items-center gap-2 border-b border-brand-border pb-2">
            <ArrowLeftRight className="w-5 h-5 text-brand-primary" /> Lịch sử Giao dịch 
          </h4>
          
          {productTransactions.length === 0 ? (
            <p className="text-[13px] text-brand-text-sub italic">Chưa có giao dịch nhập/xuất nào (có ghi nhận chi tiết) cho sản phẩm này.</p>
          ) : (
            <div className="border border-brand-border rounded-[4px] overflow-x-auto">
              <table className="w-full text-[12px] sm:text-[13px] border-collapse min-w-[400px]">
                <thead className="bg-[#f8f9fa]">
                  <tr>
                    <th className="py-2 px-2 sm:px-3 text-left border-b border-brand-border font-semibold text-brand-text-sub">Ngày</th>
                    <th className="py-2 px-2 sm:px-3 text-left border-b border-brand-border font-semibold text-brand-text-sub">Loại</th>
                    <th className="py-2 px-2 sm:px-3 text-right border-b border-brand-border font-semibold text-brand-text-sub">SL</th>
                    <th className="py-2 px-2 sm:px-3 text-right border-b border-brand-border font-semibold text-brand-text-sub">Đơn giá</th>
                  </tr>
                </thead>
                <tbody>
                  {productTransactions.map((t, idx) => {
                    const item = t.items!.find(i => i.productId === product.id)!;
                    return (
                      <tr key={t.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-2 sm:px-3 border-b border-brand-border">{new Date(t.date).toLocaleDateString('vi-VN')}</td>
                        <td className="py-2 px-2 sm:px-3 border-b border-brand-border">
                          <span className={cn("px-2 py-0.5 rounded-[3px] font-bold text-[10px] sm:text-[11px]", t.type === 'IMPORT' ? "bg-brand-tag-in-bg text-brand-tag-in-text" : "bg-brand-tag-out-bg text-brand-tag-out-text")}>
                            {t.type === 'IMPORT' ? 'NHẬP' : 'XUẤT'}
                          </span>
                        </td>
                        <td className="py-2 px-2 sm:px-3 border-b border-brand-border text-right font-medium">{item.quantity}</td>
                        <td className="py-2 px-2 sm:px-3 border-b border-brand-border text-right">{formatCurrency(item.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="p-4 sm:p-5 border-t border-brand-border flex justify-between items-center gap-3 bg-[#f8f9fa]">
          <div>
            {canDelete && (
              <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 text-brand-danger hover:bg-red-50 rounded-[3px] font-semibold text-[13px] sm:text-sm transition-colors">
                <Trash2 size={16} /> <span className="hidden sm:inline">Xóa hàng hóa</span>
              </button>
            )}
          </div>
          <button onClick={onClose} className="px-4 sm:px-5 py-2 bg-brand-primary text-white font-semibold rounded-[3px] hover:bg-blue-700 text-[13px] sm:text-[14px]">
            Đóng
          </button>
        </div>
      </div>

      {isZoomed && product.image && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <img 
            src={product.image} 
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[95vh] object-contain rounded"
            alt={product.name}
          />
          <button 
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
            onClick={() => setIsZoomed(false)}
          >
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
