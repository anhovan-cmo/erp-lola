import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronUp, ChevronDown, Check, Image as ImageIcon } from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { Product, useAppContext } from '../context/AppContext';

interface ProductFormModalProps {
  onClose: () => void;
  onSuccess?: (productId: string) => void;
  initialProduct?: Product;
}

export function ProductFormModal({ onClose, onSuccess, initialProduct }: ProductFormModalProps) {
  const { user, logActivity, products } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'desc'>('info');
  
  // Extract unique categories (mapped to brand currently in our data model)
  const existingCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.brand).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  const [formData, setFormData] = useState({
    id: initialProduct?.id || '', 
    barcode: initialProduct?.barcode || '',
    name: initialProduct?.name || '',
    category: initialProduct?.brand || '',
    brand: initialProduct?.brand || '',
    cost: initialProduct?.cost?.toString() || '0',
    price: initialProduct?.price?.toString() || '0',
    stock: initialProduct?.stock?.toString() || '0',
    minStock: initialProduct?.minStock?.toString() || '0',
    maxStock: initialProduct?.maxStock?.toString() || '999999999',
    weight: initialProduct?.weight?.toString() || '0',
    image: initialProduct?.image || '',
    sellDirectly: initialProduct?.sellDirectly ?? true,
    bonusPoints: initialProduct?.bonusPoints ?? true
  });

  const [expandedSections, setExpandedSections] = useState({
    pricing: true,
    inventory: true,
    location: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const generateRandomId = () => {
    return 'SP' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
  };

  const handleSubmit = async (e: React.FormEvent, createAnother = false) => {
    e.preventDefault();
    if (!formData.name.trim()) return alert("Tên hàng không được để trống");
    if (!formData.category.trim()) return alert("Nhóm hàng không được để trống");
    
    setLoading(true);
    try {
      let productId = formData.id.trim();
      if (!productId) {
        productId = generateRandomId();
      }

      const pRef = doc(db, 'products', productId);
      
      const cost = parseInt(formData.cost.replace(/[^0-9]/g, '')) || 0;
      const price = parseInt(formData.price.replace(/[^0-9]/g, '')) || 0;
      const stock = parseInt(formData.stock.replace(/[^0-9]/g, '')) || 0;
      const minStock = parseInt(formData.minStock.replace(/[^0-9]/g, '')) || 0;
      const maxStock = parseInt(formData.maxStock.replace(/[^0-9]/g, '')) || 0;
      const weight = parseInt(formData.weight.replace(/[^0-9]/g, '')) || 0;

      if (initialProduct) {
        // Edit mode
        await updateDoc(pRef, {
          barcode: formData.barcode.trim(),
          name: formData.name.trim(),
          brand: formData.category,
          cost,
          price,
          stock,
          minStock,
          maxStock,
          weight,
          sellDirectly: formData.sellDirectly,
          bonusPoints: formData.bonusPoints,
          image: formData.image.trim(),
          updatedAt: serverTimestamp()
        });
        await logActivity('CẬP NHẬT', 'SẢN PHẨM', `Cập nhật sản phẩm: ${formData.name}`);
        alert("Đã cập nhật sản phẩm thành công!");
      } else {
        // Create mode
        const docSnap = await getDoc(pRef);
        if (docSnap.exists()) {
          alert("Mã hàng này đã tồn tại, vui lòng nhập mã khác hoặc để trống tự động sinh mã.");
          setLoading(false);
          return;
        }

        await setDoc(pRef, {
          id: productId,
          barcode: formData.barcode.trim(),
          name: formData.name.trim(),
          brand: formData.category,
          cost,
          price,
          stock,
          minStock,
          maxStock,
          weight,
          sellDirectly: formData.sellDirectly,
          bonusPoints: formData.bonusPoints,
          image: formData.image.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await logActivity('TẠO MỚI', 'SẢN PHẨM', `Thêm sản phẩm mới: ${formData.name}`);
        alert("Đã thêm sản phẩm thành công!");
      }

      if (onSuccess) onSuccess(productId);
      
      if (createAnother && !initialProduct) {
        setFormData({
          id: '', barcode: '', name: '', category: formData.category, brand: formData.brand,
          cost: '0', price: '0', stock: '0', minStock: '0', maxStock: '999999999',
          weight: '0', image: '', sellDirectly: true, bonusPoints: true
        });
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrencyInput = (val: string) => {
    if (!val) return '';
    const num = val.replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#f0f2f5] rounded-md shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
        <header className="px-6 py-4 flex justify-between items-center bg-white border-b">
          <h2 className="text-[18px] font-medium text-gray-800">{initialProduct ? 'Cập nhật hàng hóa' : 'Tạo hàng hóa'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
             <X size={20} />
          </button>
        </header>
        
        <div className="flex bg-white px-6 border-b">
          <button 
            className={`py-3 px-4 outline-none border-b-2 font-medium text-[14px] ${activeTab === 'info' ? 'border-[#0070f4] text-[#0070f4]' : 'border-transparent text-gray-600 hover:text-[#0070f4]'}`}
            onClick={() => setActiveTab('info')}
          >
            Thông tin
          </button>
          <button 
            className={`py-3 px-4 outline-none border-b-2 font-medium text-[14px] ${activeTab === 'desc' ? 'border-[#0070f4] text-[#0070f4]' : 'border-transparent text-gray-600 hover:text-[#0070f4]'}`}
            onClick={() => setActiveTab('desc')}
          >
            Mô tả
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 content-area">
          {activeTab === 'info' && (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-4">
                <div className="bg-white p-5 rounded-sm border shadow-sm">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
                    <div>
                      <label className="block text-[13px] text-gray-600 mb-1">Mã hàng</label>
                      <input 
                        type="text" name="id" value={formData.id} onChange={handleChange}
                        placeholder={initialProduct ? formData.id : "Tự động"}
                        disabled={!!initialProduct}
                        className="w-full border border-gray-300 rounded-[3px] px-3 py-1.5 text-[14px] focus:outline-none focus:border-[#0070f4] disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] text-gray-600 mb-1">Mã vạch</label>
                      <input 
                        type="text" name="barcode" value={formData.barcode} onChange={handleChange}
                        placeholder="Nhập mã vạch"
                        className="w-full border border-gray-300 rounded-[3px] px-3 py-1.5 text-[14px] focus:outline-none focus:border-[#0070f4]"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                     <label className="block text-[13px] text-gray-600 mb-1">Tên hàng</label>
                     <input 
                       type="text" name="name" required value={formData.name} onChange={handleChange}
                       placeholder="Bắt buộc"
                       className="w-full border border-gray-300 rounded-[3px] px-3 py-1.5 text-[14px] focus:outline-none focus:border-[#0070f4]"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[13px] text-gray-600">Nhóm hàng / Thương hiệu</label>
                        <button 
                          type="button" 
                          onClick={() => {
                            const newCat = prompt("Nhập tên nhóm hàng / thương hiệu mới:");
                            if (newCat && newCat.trim()) {
                              setFormData(prev => ({ ...prev, category: newCat.trim() }));
                            }
                          }}
                          className="text-[#0070f4] text-[13px] hover:underline"
                        >Tạo mới</button>
                      </div>
                      <select 
                        name="category" value={existingCategories.includes(formData.category) ? formData.category : ''} 
                        onChange={(e) => {
                          if (e.target.value !== '') {
                            setFormData(prev => ({ ...prev, category: e.target.value }));
                          }
                        }}
                        className="w-full border border-gray-300 rounded-[3px] px-3 py-1.5 text-[14px] focus:outline-none focus:border-[#0070f4] bg-white text-gray-500 mb-2"
                      >
                        <option value="">Chọn nhóm hàng có sẵn...</option>
                        {existingCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {/* Show input if category is not in the list, allowing free text or displaying the newly prompted category */}
                      <input 
                        type="text" 
                        name="category" 
                        value={formData.category} 
                        onChange={handleChange}
                        placeholder="Hoặc nhập nhóm hàng / thương hiệu..."
                        className="w-full border border-gray-300 rounded-[3px] px-3 py-1.5 text-[14px] focus:outline-none focus:border-[#0070f4]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Phân nhóm: Giá vốn, giá bán */}
                <div className="bg-white rounded-sm border shadow-sm text-[14px]">
                  <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleSection('pricing')}>
                    <span className="font-medium text-gray-800">Giá vốn, giá bán</span>
                    {expandedSections.pricing ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                  </div>
                  {expandedSections.pricing && (
                    <div className="px-4 pb-4 grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[13px] text-gray-600 mb-1">Giá vốn</label>
                        <input 
                          type="text" name="cost" value={formatCurrencyInput(formData.cost)}
                          onChange={(e) => handleChange({ target: { name: 'cost', value: e.target.value } } as any)}
                          className="w-full border border-gray-300 rounded-[3px] px-3 py-1.5 text-right focus:outline-none focus:border-[#0070f4]"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                           <label className="block text-[13px] text-gray-600">Giá bán</label>
                           <button type="button" className="text-[#0070f4] text-[13px] flex items-center hover:underline">📋 Thiết lập giá</button>
                        </div>
                        <input 
                          type="text" name="price" value={formatCurrencyInput(formData.price)}
                          onChange={(e) => handleChange({ target: { name: 'price', value: e.target.value } } as any)}
                          className="w-full border border-gray-300 rounded-[3px] px-3 py-1.5 text-right focus:outline-none focus:border-[#0070f4]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Tồn kho */}
                <div className="bg-white rounded-sm border shadow-sm text-[14px]">
                  <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleSection('inventory')}>
                    <div>
                      <span className="font-medium text-gray-800 block">Tồn kho</span>
                      <span className="text-[12px] text-gray-500">Quản lý số lượng tồn kho và định mức tồn. Khi tồn kho chạm đến định mức, bạn sẽ nhận được cảnh báo.</span>
                    </div>
                    {expandedSections.inventory ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                  </div>
                  {expandedSections.inventory && (
                    <div className="px-4 pb-4 grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[13px] text-gray-600 mb-1">Tồn kho</label>
                        <div className="flex border border-gray-300 rounded-[3px] overflow-hidden focus-within:border-[#0070f4]">
                          <input 
                            type="text" name="stock" value={formatCurrencyInput(formData.stock)}
                            onChange={(e) => handleChange({ target: { name: 'stock', value: e.target.value } } as any)}
                            className="w-full px-3 py-1.5 text-right focus:outline-none"
                          />
                          <div className="bg-gray-100 flex items-center justify-center px-2 border-l border-gray-300">
                             <ImageIcon size={14} className="text-gray-400" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[13px] text-gray-600 mb-1">Định mức tồn thấp nhất</label>
                        <input 
                          type="text" name="minStock" value={formatCurrencyInput(formData.minStock)}
                          onChange={(e) => handleChange({ target: { name: 'minStock', value: e.target.value } } as any)}
                          className="w-full border border-gray-300 rounded-[3px] px-3 py-1.5 text-right focus:outline-none focus:border-[#0070f4]"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] text-gray-600 mb-1">Định mức tồn cao nhất</label>
                        <input 
                          type="text" name="maxStock" value={formatCurrencyInput(formData.maxStock)}
                          onChange={(e) => handleChange({ target: { name: 'maxStock', value: e.target.value } } as any)}
                          className="w-full border border-gray-300 rounded-[3px] px-3 py-1.5 text-right focus:outline-none focus:border-[#0070f4]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Tích điểm toggle */}
                <div className="bg-white p-4 rounded-sm border shadow-sm flex py-4 justify-between items-center text-[14px]">
                  <span className="font-medium text-gray-800">Tích điểm</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="bonusPoints" checked={formData.bonusPoints} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0070f4]"></div>
                  </label>
                </div>

                {/* Vị trí, trọng lượng */}
                <div className="bg-white rounded-sm border shadow-sm text-[14px]">
                  <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleSection('location')}>
                    <div>
                      <span className="font-medium text-gray-800 block">Vị trí, trọng lượng</span>
                      <span className="text-[12px] text-gray-500">Quản lý việc sắp xếp kho, vị trí bán hàng hoặc trọng lượng hàng hóa</span>
                    </div>
                    {expandedSections.location ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                  </div>
                  {expandedSections.location && (
                    <div className="px-4 pb-4 grid grid-cols-2 gap-6">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                           <label className="block text-[13px] text-gray-600">Vị trí</label>
                           <button type="button" className="text-[#0070f4] text-[13px] hover:underline">Tạo mới</button>
                        </div>
                        <select className="w-full border border-gray-300 rounded-[3px] px-3 py-1.5 focus:outline-none focus:border-[#0070f4] bg-white text-gray-500">
                          <option>Chọn vị trí</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] text-gray-600 mb-1">Trọng lượng</label>
                        <div className="flex border border-gray-300 rounded-[3px] overflow-hidden focus-within:border-[#0070f4]">
                           <input 
                             type="text" name="weight" value={formatCurrencyInput(formData.weight)}
                             onChange={(e) => handleChange({ target: { name: 'weight', value: e.target.value } } as any)}
                             className="w-full px-3 py-1.5 text-right focus:outline-none"
                           />
                           <div className="bg-white flex items-center justify-center px-3 border-l border-gray-300 text-[13px] text-gray-600">
                              g
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Sidebar - Ảnh */}
              <div className="w-[280px] shrink-0">
                 <div className="bg-white border rounded-sm shadow-sm p-4 text-center border-dashed border-2 border-gray-300 relative">
                   {formData.image ? (
                     <div className="relative w-full h-32 mb-3 bg-gray-50 flex items-center justify-center overflow-hidden rounded border">
                       <img src={formData.image} alt="Preview" className="max-w-full max-h-full object-contain" />
                       <button 
                         type="button" 
                         onClick={() => setFormData({ ...formData, image: '' })}
                         className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                       >
                         <X size={14} className="text-gray-500" />
                       </button>
                     </div>
                   ) : (
                     <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-3">
                        <ImageIcon size={28} className="text-gray-400" />
                     </div>
                   )}
                   
                   <div className="relative overflow-hidden inline-block">
                     <button type="button" className="bg-white border text-gray-700 px-4 py-1.5 text-[14px] rounded-[3px] hover:bg-gray-50 mb-2 whitespace-nowrap">
                        Thêm ảnh (Từ máy)
                     </button>
                     <input 
                       type="file" 
                       accept="image/*"
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (!file) return;
                         
                         const reader = new FileReader();
                         reader.onload = (event) => {
                           const img = new Image();
                           img.onload = () => {
                             const canvas = document.createElement('canvas');
                             let width = img.width;
                             let height = img.height;
                             const MAX_DIMENSION = 500; // Small size for Firestore
                             
                             if (width > height) {
                               if (width > MAX_DIMENSION) {
                                 height *= MAX_DIMENSION / width;
                                 width = MAX_DIMENSION;
                               }
                             } else {
                               if (height > MAX_DIMENSION) {
                                 width *= MAX_DIMENSION / height;
                                 height = MAX_DIMENSION;
                               }
                             }
                             
                             canvas.width = width;
                             canvas.height = height;
                             const ctx = canvas.getContext('2d');
                             ctx?.drawImage(img, 0, 0, width, height);
                             
                             // Get compressed data URL
                             const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% quality JPEG
                             setFormData(prev => ({ ...prev, image: dataUrl }));
                           };
                           img.src = event.target?.result as string;
                         };
                         reader.readAsDataURL(file);
                       }}
                     />
                   </div>
                   <p className="text-[12px] text-gray-500">Kích thước sẽ tự động thu gọn để phù hợp lưu trữ.</p>
                   
                   <div className="mt-4 text-left">
                     <p className="text-[12px] font-medium text-gray-600 mb-1">Hoặc dùng Link Ảnh (URL)</p>
                     <input 
                       type="text" name="image" value={formData.image.startsWith('data:') ? '' : formData.image} onChange={handleChange} 
                       className="w-full border border-gray-300 p-1.5 rounded-[3px] text-[13px] focus:outline-none focus:border-[#0070f4]" 
                       placeholder="https://..."
                       disabled={formData.image.startsWith('data:')}
                     />
                   </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'desc' && (
             <div className="bg-white p-5 rounded-sm border shadow-sm">
                 <h3 className="font-medium mb-3">Mô tả sản phẩm</h3>
                 <textarea 
                   rows={6}
                   className="w-full border p-3 text-sm rounded-[3px] focus:outline-none focus:border-[#0070f4]"
                   placeholder="Nhập mô tả..."
                 />
             </div>
          )}
        </div>

        <footer className="px-6 py-3 border-t bg-white flex justify-between items-center shadow-inner mt-auto shrink-0 z-10 relative">
           <label className="flex items-center text-[14px] cursor-pointer text-gray-700 relative">
             <input type="checkbox" name="sellDirectly" checked={formData.sellDirectly} onChange={handleChange} className="mr-2 rounded text-[#0070f4] focus:ring-[#0070f4] w-4 h-4 cursor-pointer" />
             Bán trực tiếp
           </label>

           <div className="flex gap-3">
             <button type="button" onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-[3px] font-medium text-[14px] hover:bg-gray-50 transition-colors">
               Bỏ qua
             </button>
             <div className="flex rounded-[3px] overflow-hidden divide-x divide-[#005bb5]">
               {!initialProduct && (
                 <button 
                   type="button" 
                   onClick={(e) => handleSubmit(e, true)}
                   disabled={loading} 
                   className="px-4 py-2 bg-[#0070f4] hover:bg-[#005bb5] text-white font-medium text-[14px] flex items-center transition-colors shadow-sm disabled:opacity-70"
                 >
                   <Check size={16} className="mr-2" strokeWidth={3} /> Lưu & Tạo thêm hàng hoá
                 </button>
               )}
               <button 
                 type="button" 
                 onClick={(e) => handleSubmit(e, false)}
                 disabled={loading}
                 className="px-6 py-2 bg-[#0070f4] hover:bg-[#005bb5] text-white font-medium text-[14px] flex items-center transition-colors shadow-sm disabled:opacity-70"
               >
                 {initialProduct ? 'Lưu cập nhật' : 'Lưu'}
               </button>
             </div>
           </div>
        </footer>
      </div>
    </div>
  );
}

