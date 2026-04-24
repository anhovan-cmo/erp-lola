import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Minus, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import { ProductFormModal } from './ProductFormModal';

interface TransactionFormModalProps {
  type: 'IMPORT' | 'EXPORT';
  onClose: () => void;
}

export function TransactionFormModal({ type, onClose }: TransactionFormModalProps) {
  const { products, partners, addTransaction } = useAppContext();
  
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [isDebt, setIsDebt] = useState(false);
  const [note, setNote] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [cart, setCart] = useState<{ productId: string, name: string, price: number, cost: number, quantity: number, stock: number }[]>([]);
  const [isPartnerOpen, setIsPartnerOpen] = useState(false);
  
  const [discountStr, setDiscountStr] = useState<string>('');
  const [otherFeesStr, setOtherFeesStr] = useState<string>('');
  const [amountPaidStr, setAmountPaidStr] = useState<string>('0');
  const [isAmountTouched, setIsAmountTouched] = useState(false);

  const [saving, setSaving] = useState(false);

  const formatNumberInput = (val: number | string) => {
    if (!val) return '';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseNumberInput = (str: string) => {
    if (!str) return 0;
    const stripped = str.replace(/[^0-9]/g, '');
    return Number(stripped) || 0;
  };

  const normalizedProducts = useMemo(() => {
    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
    return products.map(p => ({
      ...p,
      _normalizedName: normalize(p.name),
      _normalizedId: normalize(p.id),
      _normalizedBrand: normalize(p.brand || '')
    }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    // Normalize string: lower case and remove accents
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const searchLower = normalize(searchTerm);
    const searchTermsArray = searchLower.split(/\s+/).filter(Boolean); // Split into words

    return normalizedProducts.filter(p => {
      // Match if all search words are found somewhere
      return searchTermsArray.every(term => 
        p._normalizedName.includes(term) || p._normalizedId.includes(term) || p._normalizedBrand.includes(term)
      );
    }).slice(0, 10);
  }, [searchTerm, normalizedProducts]);

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { 
        productId: product.id, 
        name: product.name, 
        price: type === 'EXPORT' ? product.price : product.cost, 
        cost: product.cost, 
        quantity: 1, 
        stock: product.stock 
      }]);
    }
    setSearchTerm('');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === id) {
        const newQ = item.quantity + delta;
        return { ...item, quantity: newQ > 0 ? newQ : 1 };
      }
      return item;
    }));
  };

  const removeCartItem = (id: string) => {
    setCart(cart.filter(item => item.productId !== id));
  };

  const updateCustomPrice = (id: string, newPrice: number) => {
    setCart(cart.map(item => {
      if (item.productId === id) {
        return { ...item, price: newPrice };
      }
      return item;
    }));
  };

  const totalValue = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalCost = cart.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
  
  const discount = parseNumberInput(discountStr);
  const otherFees = parseNumberInput(otherFeesStr);
  
  const totalPayable = totalValue - discount + otherFees;
  
  React.useEffect(() => {
    if (!isAmountTouched) {
      setAmountPaidStr(formatNumberInput(totalPayable));
    }
  }, [totalPayable, isAmountTouched]);

  const handleSave = async () => {
    if (cart.length === 0) return alert('Vui lòng chọn ít nhất 1 sản phẩm');
    
    // Kiểm tra cấm xuất âm
    if (type === 'EXPORT') {
      for (const item of cart) {
        if (item.quantity > item.stock) {
          alert(`Lỗi: Sản phẩm "${item.name}" vượt quá số lượng tồn kho (Tồn: ${item.stock}, Xuất: ${item.quantity}). Không được phép xuất âm.`);
          return;
        }
      }
    }

    const amountPaid = parseNumberInput(amountPaidStr);
    const debtAmount = totalPayable - amountPaid;
    if (debtAmount > 0 && !selectedPartnerId) {
      return alert('Khách còn nợ vui lòng chọn Khách hàng / Nhà CC!');
    }

    setSaving(true);
    try {
      const partner = partners.find(p => p.id === selectedPartnerId);
      let pName = partner ? partner.name : null;
      if (!pName) {
        pName = type === 'IMPORT' ? 'Không xác định' : 'Khách vãng lai';
      }
      
      const txObj = {
        type,
        date: new Date().toISOString().split('T')[0],
        totalValue,
        costValue: type === 'EXPORT' ? totalCost : null,
        note,
        partnerId: selectedPartnerId || null,
        partnerName: pName,
        discount: discount,
        otherFees: otherFees,
        amountPaid: amountPaid,
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          cost: item.cost
        }))
      };

      const prodChanges = cart.map(item => ({
        id: item.productId,
        qtyChange: type === 'IMPORT' ? item.quantity : -item.quantity
      }));

      const computedDebtAmount = totalPayable - amountPaid;
      const requiresDebt = computedDebtAmount !== 0;
      
      await addTransaction(txObj, prodChanges, selectedPartnerId, requiresDebt, computedDebtAmount);
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(`Lỗi khi lưu: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const currentPartners = partners.filter(p => type === 'EXPORT' ? p.type === 'CUSTOMER' : p.type === 'SUPPLIER');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">
            {type === 'IMPORT' ? 'Tạo Phiếu Nhập Kho' : 'Tạo Phiếu Xuất Kho'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-auto flex flex-col md:flex-row">
          {/* Cột trái: Form nhập liệu & Chọn sản phẩm */}
          <div className="w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col gap-4">
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-semibold text-gray-700">Tìm Hàng Hóa</label>
                <button 
                  onClick={() => setIsAddProductOpen(true)}
                  className="text-xs text-blue-600 hover:underline flex items-center"
                >
                  <Plus size={12} className="mr-0.5" /> Tạo sản phẩm mới
                </button>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Gõ tên hoặc mã SP để tìm kiếm..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                />
                
                {searchTerm && (
                  <div className="absolute top-10 left-0 right-0 bg-white border border-gray-200 shadow-lg rounded mt-1 z-10 max-h-48 overflow-auto">
                    {filteredProducts.length > 0 ? filteredProducts.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => addToCart(p)}
                        className="flex justify-between items-center p-2 hover:bg-blue-50 cursor-pointer border-b"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.id} - Tồn: {p.stock}</p>
                        </div>
                        <span className="text-sm font-semibold text-blue-600">
                          {formatCurrency(type === 'EXPORT' ? p.price : p.cost)}
                        </span>
                      </div>
                    )) : (
                      <div className="p-3 text-sm text-gray-500 text-center">Không tìm thấy SP</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Khách hàng / Nhà CC</label>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Tìm đối tác theo tên, sđt..." 
                  value={partnerSearchTerm}
                  onChange={(e) => {
                     setPartnerSearchTerm(e.target.value);
                     setIsPartnerOpen(true);
                     if (!e.target.value) setSelectedPartnerId('');
                  }}
                  onFocus={() => setIsPartnerOpen(true)}
                  onBlur={() => setTimeout(() => setIsPartnerOpen(false), 200)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                />
                {selectedPartnerId && (
                  <button 
                    onClick={() => { setSelectedPartnerId(''); setPartnerSearchTerm(''); }}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
                {isPartnerOpen && (
                  <div className="absolute top-10 left-0 right-0 bg-white border border-gray-200 shadow-lg rounded mt-1 z-10 max-h-48 overflow-auto">
                    <div 
                      onClick={() => { setSelectedPartnerId(''); setPartnerSearchTerm(''); setIsPartnerOpen(false); }}
                      className="p-2 hover:bg-blue-50 cursor-pointer border-b text-sm font-medium text-gray-800"
                    >
                      -- Khách vãng lai / Trực tiếp --
                    </div>
                    {currentPartners.filter(p => {
                       if (!partnerSearchTerm) return true;
                       const lSearch = partnerSearchTerm.toLowerCase();
                       return p.name.toLowerCase().includes(lSearch) || (p.phone && p.phone.toLowerCase().includes(lSearch));
                    }).map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => { 
                          setSelectedPartnerId(p.id); 
                          setPartnerSearchTerm(`${p.name} - ${p.phone || ''}`); 
                          setIsPartnerOpen(false); 
                        }}
                        className="p-2 hover:bg-blue-50 cursor-pointer border-b"
                      >
                        <div className="text-sm font-medium text-gray-800">{p.name}</div>
                        {p.phone && <div className="text-xs text-gray-500">{p.phone}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú</label>
              <textarea 
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full p-2 bg-gray-50 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm h-16 sm:h-20"
                placeholder="Nội dung ghi chú phiếu..."
              />
            </div>

          </div>

          {/* Cột phải: DS đã chọn */}
          <div className="w-full md:w-1/2 p-4 flex flex-col bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Sản Phẩm Đã Chọn ({cart.length})</h3>
            <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded p-2 flex flex-col gap-2">
              {cart.length === 0 ? (
                <div className="text-center text-sm text-gray-400 mt-10">Chưa có sản phẩm nào</div>
              ) : (
                cart.map(item => (
                  <div key={item.productId} className="flex items-center justify-between p-2 border border-gray-100 rounded bg-gray-50/50">
                    <div className="flex-1 pr-2">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1" title={item.name}>{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Đơn giá:</span>
                        <input 
                          type="text" 
                          value={formatNumberInput(item.price)}
                          onChange={e => updateCustomPrice(item.productId, parseNumberInput(e.target.value))}
                          className="w-24 text-xs p-1 border rounded"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mr-4">
                      <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 bg-gray-200 rounded hover:bg-gray-300"><Minus size={14} /></button>
                      <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 bg-gray-200 rounded hover:bg-gray-300"><Plus size={14} /></button>
                    </div>

                    <div className="text-right w-24 mr-2">
                      <p className="text-sm font-bold text-gray-800">{formatCurrency(item.price * item.quantity)}</p>
                    </div>

                    <button onClick={() => removeCartItem(item.productId)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-300 flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between">
                 <span className="text-gray-600 font-medium">
                    <span className="inline-block w-5 text-center font-semibold text-gray-800 bg-gray-200 rounded mr-1">{cart.reduce((a,c)=>a+c.quantity,0)}</span>
                    Tổng tiền hàng
                 </span>
                 <span className="font-bold text-gray-800">{formatCurrency(totalValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-gray-600 font-medium">Giảm giá</span>
                 <input 
                   type="text"
                   value={discountStr}
                   onChange={e => setDiscountStr(formatNumberInput(parseNumberInput(e.target.value)))}
                   className="w-28 text-right p-1 border-b border-gray-300 bg-transparent focus:outline-none focus:border-blue-500"
                 />
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-gray-600 font-medium">Thu khác</span>
                 <input 
                   type="text"
                   value={otherFeesStr}
                   onChange={e => setOtherFeesStr(formatNumberInput(parseNumberInput(e.target.value)))}
                   className="w-28 text-right p-1 border-b border-gray-300 bg-transparent focus:outline-none focus:border-blue-500"
                 />
              </div>
              <div className="flex justify-between items-center mt-2">
                 <span className="text-gray-800 font-bold">Khách cần trả</span>
                 <span className="text-lg font-bold text-blue-600">{formatCurrency(totalPayable)}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-gray-600 font-medium">{type === 'EXPORT' ? 'Khách thanh toán' : 'Đã thanh toán'}</span>
                 <input 
                   type="text"
                   value={amountPaidStr}
                   onFocus={() => setIsAmountTouched(true)}
                   onChange={e => {
                      setIsAmountTouched(true);
                      setAmountPaidStr(formatNumberInput(parseNumberInput(e.target.value)));
                   }}
                   className="w-32 text-right p-1 border-b border-blue-400 bg-blue-50 font-bold text-gray-800 focus:outline-none focus:border-blue-600"
                 />
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-gray-600 font-medium whitespace-nowrap">Tính vào công nợ</span>
                 <span className="font-bold text-gray-800 flex items-center">
                    {(totalPayable - parseNumberInput(amountPaidStr)) > 0 && <span className="mr-1">+</span>}
                    {(totalPayable - parseNumberInput(amountPaidStr)) < 0 && <span className="mr-1 text-green-600">-</span>}
                    {formatCurrency(Math.abs(totalPayable - parseNumberInput(amountPaidStr)))}
                 </span>
              </div>
            </div>
          </div>
        </div>

        <footer className="p-4 bg-gray-100 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-white border border-gray-300 font-semibold rounded text-sm hover:bg-gray-50"
          >
            Hủy Bỏ
          </button>
          <button 
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Đang Xử Lý...' : 'Hoàn Tất Giao Dịch'}
          </button>
        </footer>
      </div>

      {isAddProductOpen && (
        <ProductFormModal 
          onClose={() => setIsAddProductOpen(false)}
          onSuccess={(newId) => {
            setSearchTerm(newId);
          }}
        />
      )}
    </div>
  );
}
