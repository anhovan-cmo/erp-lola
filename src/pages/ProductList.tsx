import React, { useState, useRef, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Product, useAppContext } from '../context/AppContext';
import { formatCurrency } from '../lib/utils';
import { Upload, Filter, Columns, Bell, Settings, ChevronDown, Check, X } from 'lucide-react';
import Papa from 'papaparse';
import { db, auth } from '../lib/firebase/config';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { ProductFormModal } from '../components/ProductFormModal';

export function ProductList() {
  const { products } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [stockThreshold, setStockThreshold] = useState<string>('');
  const [sortStockDir, setSortStockDir] = useState<'asc' | 'desc' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  
  // New States
  const [notifyLowStock, setNotifyLowStock] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showColDropdown, setShowColDropdown] = useState(false);

  const [syncKiotVietStatus, setSyncKiotVietStatus] = useState<string | null>(null);
  const [isAutoSync, setIsAutoSync] = useState(() => localStorage.getItem('autoSyncKiotViet') === 'true');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [cols, setCols] = useState(() => {
    const saved = localStorage.getItem('productTableCols');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch(e) {}
    }
    return [
      { id: 'id', label: 'Mã Hàng', visible: true },
      { id: 'image', label: 'Hình Ảnh', visible: true },
      { id: 'name', label: 'Tên Sản Phẩm', visible: true },
      { id: 'brand', label: 'Thương Hiệu', visible: true },
      { id: 'cost', label: 'Giá Vốn', visible: true },
      { id: 'price', label: 'Giá Bán', visible: true },
      { id: 'stock', label: 'Tồn Lượng', visible: true },
      { id: 'updatedAt', label: 'Cập Nhật', visible: true },
      { id: 'createdAt', label: 'Ngày Tạo', visible: true }
    ];
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uniqueBrands = useMemo(() => Array.from(new Set(products.map(p => p.brand || 'Khác'))).sort(), [products]);

  // Keep selectedProduct in sync with products array (for edits)
  React.useEffect(() => {
    if (selectedProduct) {
      const updated = products.find(p => p.id === selectedProduct.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedProduct)) {
        setSelectedProduct(updated);
      } else if (!updated) {
        // Product was deleted
        setSelectedProduct(null);
      }
    }
  }, [products, selectedProduct]);

  const normalize = (str: string) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
  const handleAutoSyncToggle = () => {
    const newVal = !isAutoSync;
    setIsAutoSync(newVal);
    localStorage.setItem('autoSyncKiotViet', String(newVal));
  };

  const syncRef = useRef(false);

  const executeKiotVietSync = async (isBackground = false) => {
    if (syncRef.current) return; // Prevent concurrent syncs
    syncRef.current = true;
    if (!isBackground) setSyncKiotVietStatus('Đang kết nối KiotViet...');
    
    let currentSkip = 0;
    let totalSynced = 0;
    let newCount = 0;
    let updateCount = 0;
    let hasMore = true;

    try {
      while (hasMore) {
        if (!isBackground) setSyncKiotVietStatus(currentSkip === 0 ? 'Đang kéo CSDL...' : `Đã kéo ${currentSkip} SP...`);
        
        let res;
        try {
          res = await fetch(`/api/kiotviet/sync-products?skip=${currentSkip}`);
        } catch(e) {
          throw new Error(`Lỗi đường truyền (Mạng chập chờn) khi lấy trang ${currentSkip}. KịtViet đang bận hoặc gián đoạn mạng. ${e.message || ''}`);
        }

        
        let data;
        try {
           data = await res.json();
        } catch (err) {
           if (res.status === 404) {
              throw new Error(`KiotViet bị lỗi 404 - Có thể ứng dụng đang được host tại môi trường Tĩnh (Static, vd: erp.lola.com.vn) nhưng không có sẵn NodeJS Backend để gọi API bảo mật. Vui lòng deploy dự án lên môi trường có NodeJS server (Render, Vercel, VPS) hoặc cấu hình proxy.`);
           }
           throw new Error(`Mất kết nối máy chủ (HTTP ${res.status}) - đang ở trang ${currentSkip}`);
        }
        
        if (!res.ok || !data.success) {
           throw new Error(data.error || 'Lỗi server');
        }

        const kvProducts = data.products || [];
        totalSynced += kvProducts.length;
        
        if (kvProducts.length > 0) {
           if (!isBackground) setSyncKiotVietStatus(`Đang ghi ${kvProducts.length} SP (mới: ${newCount}, cũ: ${updateCount})...`);
           const now = serverTimestamp();
           let batch = writeBatch(db);
           let count = 0;
     
           for (const item of kvProducts) {
             const docRef = doc(db, 'products', item.code); // Use KV code as ID
             
             let imageUrl = '';
             if (item.images && item.images.length > 0) {
                imageUrl = item.images[0];
             }
     
             let itemStock = item.onHand || 0;
             if (item.inventories && item.inventories.length > 0) {
                itemStock = item.inventories.reduce((acc: number, inv: any) => acc + (inv.onHand || 0), 0);
             }
     
             let itemCreatedAt: any = now;
             if (item.createdDate) {
                const parsed = new Date(item.createdDate);
                if (!isNaN(parsed.getTime())) {
                   itemCreatedAt = parsed.getTime(); 
                }
             }
             
             let itemModifiedAt: any = now;
             if (item.modifiedDate) {
                const parsedMod = new Date(item.modifiedDate);
                if (!isNaN(parsedMod.getTime())) {
                   itemModifiedAt = parsedMod.getTime();
                }
             }

             const updateData: any = {
               name: item.fullName,
               brand: item.categoryId ? `Danh mục KV (${item.categoryId || ''})` : 'Khác',
               price: item.basePrice || 0,
               cost: item.cost || 0,
               stock: itemStock,
               image: imageUrl || "",
               updatedAt: itemModifiedAt
             };

             const existing = products.find(p => p.id === item.code);
             if (existing) {
               batch.update(docRef, updateData);
               updateCount++;
             } else {
               batch.set(docRef, { ...updateData, id: item.code, createdAt: itemCreatedAt });
               newCount++;
             }
     
             count++;
             if (count >= 490) {
               await batch.commit();
               batch = writeBatch(db);
               count = 0;
             }
           }
           if (count > 0) await batch.commit();
        }

        if (data.nextSkip && data.nextSkip > currentSkip) {
           currentSkip = data.nextSkip;
           await new Promise(resolve => setTimeout(resolve, 300)); // Small delay to avoid overloading
        } else {
           hasMore = false;
        }
      }
      
      if (!isBackground) {
        setSyncKiotVietStatus(null);
        alert(`Đã lấy xong! Lấy từ KV: ${totalSynced} SP.\n- Cập nhật tồn kho/thông tin: ${updateCount} SP\n- Thêm mới: ${newCount} SP`);
      }
    } catch (e: any) {
       console.error("KiotViet Sync Error:", e);
       if (!isBackground) {
          alert('Lỗi đồng bộ: ' + e.message);
          setSyncKiotVietStatus(null);
       }
    } finally {
       syncRef.current = false;
    }
  };

  // Auto-sync polling every 30 seconds
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoSync) {
       interval = setInterval(() => {
          executeKiotVietSync(true); // run silently
       }, 30000); // 30s limit
    }
    return () => {
       if (interval) clearInterval(interval);
    };
  }, [isAutoSync, products]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrands, stockThreshold, sortStockDir, startDate, endDate]);

  let filteredProducts = useMemo(() => {
    const searchLower = normalize(searchTerm);
    const searchTermsArray = searchLower.split(/\s+/).filter(Boolean);

    let result = products.filter(p => {
      // 1. Search Logic
      let matchSearch = true;
      if (searchTermsArray.length > 0) {
        const nameNorm = normalize(p.name);
        const idNorm = normalize(p.id);
        const brandNorm = normalize(p.brand);
        matchSearch = searchTermsArray.every(term => 
          nameNorm.includes(term) || idNorm.includes(term) || brandNorm.includes(term)
        );
      }

      // 2. Brand Filter
      let matchBrand = true;
      if (selectedBrands.length > 0) {
        matchBrand = selectedBrands.includes(p.brand || 'Khác');
      }

      // 3. Date Filter
      let matchDate = true;
      if (startDate || endDate) {
         let pTime = p.createdAt?.toMillis ? p.createdAt.toMillis() : p.createdAt;
         if (pTime && typeof pTime === 'number') {
            if (startDate) {
               const start = new Date(startDate).getTime();
               if (!isNaN(start) && pTime < start) matchDate = false;
            }
            if (endDate) {
               const endD = new Date(endDate);
               endD.setHours(23, 59, 59, 999);
               if (!isNaN(endD.getTime()) && pTime > endD.getTime()) matchDate = false;
            }
         }
      }

      return matchSearch && matchBrand && matchDate;
    });

    const thresholdValue = parseInt(stockThreshold);
    if (!isNaN(thresholdValue)) {
      result = result.filter(p => p.stock < thresholdValue);
    }

    if (sortStockDir === 'asc') {
      result.sort((a,b) => a.stock - b.stock);
    } else if (sortStockDir === 'desc') {
      result.sort((a,b) => b.stock - a.stock);
    } else {
      // Default: Sort by newest updated
      result.sort((a, b) => {
         const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (typeof a.updatedAt === 'number' ? a.updatedAt : 0);
         const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (typeof b.updatedAt === 'number' ? b.updatedAt : 0);
         return bTime - aTime;
      });
    }

    return result;
  }, [products, searchTerm, selectedBrands, stockThreshold, sortStockDir]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const moveCol = (index: number, direction: 'up' | 'down') => {
    const newCols = [...cols];
    if (direction === 'up' && index > 0) {
      [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
    } else if (direction === 'down' && index < newCols.length - 1) {
      [newCols[index + 1], newCols[index]] = [newCols[index], newCols[index + 1]];
    }
    setCols(newCols);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
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

          // Lọc rác & xử lý kiểu dữ liệu
          const data = results.data;
          
          for (let i = 0; i < data.length; i++) {
            const row: any = data[i];
            const rawId = row['Mã hàng'] || row['id'];
            if (!rawId) continue;

            const id = String(rawId).trim().replace(/[^a-zA-Z0-9_\-]/g, '');
            if (!id) continue;

            const name = (row['Tên hàng']?.trim() || 'No Name').substring(0, 490);
            const brand = (row['Thương hiệu']?.trim() || '').substring(0, 95);
            
            // Xử lý giá tiền: "7.000.000,0" -> 7000000
            const parseNum = (val: any) => {
              if (val == null) return 0;
              const clean = String(val).replace(/\./g, '').split(',')[0].replace(/"/g, '');
              const num = parseInt(clean);
              return isNaN(num) ? 0 : num;
            };

            const price = Math.max(0, parseNum(row['Giá bán']));
            const cost = Math.max(0, parseNum(row['Giá vốn']));
            const stock = parseNum(row['Tồn kho']);
            
            let image = null;
            const imgStr = row['Hình ảnh (url1,url2...)'] || row['Hình ảnh'];
            if (imgStr) {
               image = String(imgStr).split(',')[0].replace(/"/g, '').trim().substring(0, 2000);
            }

            const docRef = doc(db, 'products', id);
            const existingProduct = products.find(p => p.id === id);

            if (existingProduct) {
              const updateData: any = {
                name, brand, price, cost, stock, updatedAt: now
              };
              if (image) updateData.image = image;
              batch.update(docRef, updateData);
            } else {
              batch.set(docRef, {
                id, name, brand, price, cost, stock,
                image: image || "",
                createdAt: now,
                updatedAt: now
              });
            }

            count++;
            // Firestore max batch is 500
            if (count === 490) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }

          if (count > 0) {
            await batch.commit();
          }

          alert(`Nhập thành công! Đã xử lý tập tin.`);
        } catch (error: any) {
          console.error("Lỗi import:", error);
          alert(`Lỗi import: ${error.message || 'Không thể tạo mới hàng trăm bản ghi'}`);
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('colIndex', index.toString());
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData('colIndex'), 10);
    if (dragIndex === index || isNaN(dragIndex)) return;
    const newCols = [...cols];
    const [dragged] = newCols.splice(dragIndex, 1);
    newCols.splice(index, 0, dragged);
    setCols(newCols);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const saveColsDefault = () => {
    localStorage.setItem('productTableCols', JSON.stringify(cols));
    alert('Đã lưu cấu hình cột mặc định');
  };

  return (
    <>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <h1 className="text-[20px] md:text-[24px] font-semibold">QUẢN LÝ TỒN KHO</h1>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <label className="flex items-center gap-2 text-[13px] bg-slate-100 px-3 py-2 rounded border border-slate-200 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isAutoSync} 
              onChange={handleAutoSyncToggle} 
              className="rounded border-gray-300 text-brand-primary"
            />
            Tự động lấy KV (30s)
          </label>
          <button 
            disabled={!!syncKiotVietStatus}
            onClick={() => executeKiotVietSync(false)}
            className="bg-brand-tag-pe-bg text-brand-tag-pe-text border border-[#fed69c] flex items-center justify-center py-2 px-3 rounded-[3px] font-semibold text-[13px] hover:bg-[#ffeac7] transition"
          >
            {syncKiotVietStatus || "🔄 Đồng bộ ngay"}
          </button>
          
          <input 
            type="text" 
            placeholder="Tìm kiếm hàng hóa..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-brand-card border border-brand-border rounded-[3px] text-[13px] text-brand-text focus:outline-none focus:border-brand-primary"
          />
          <button 
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            className="bg-white text-brand-primary border border-brand-primary flex items-center justify-center py-2 px-3 rounded-[3px] font-semibold text-[13px] hover:bg-blue-50 transition min-w-[100px] flex-1 md:flex-none disabled:opacity-50"
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
            onClick={() => setIsAddProductOpen(true)}
            className="bg-brand-primary text-white border-none py-2 px-4 rounded-[3px] font-semibold text-[14px] flex-1 md:flex-none">
            + Thêm Mới
          </button>
        </div>
      </header>

      <Card className="flex flex-col flex-1 overflow-hidden rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-brand-border">
        <div className="p-3 sm:p-4 border-b border-brand-border flex flex-col items-start gap-3 bg-brand-card">
          <div className="flex flex-wrap items-center gap-4 w-full">
            <h3 className="text-[15px] sm:text-[16px] font-semibold">Danh Sách Sản Phẩm</h3>
            
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-brand-text-sub font-medium">Từ ngày:</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-32 px-2 py-1 text-[13px] border border-brand-border rounded-[3px] focus:outline-none focus:border-brand-primary"
              />
              <span className="text-[13px] text-brand-text-sub font-medium">Đến:</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-32 px-2 py-1 text-[13px] border border-brand-border rounded-[3px] focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-brand-text-sub" />
              <span className="text-[13px] text-brand-text-sub font-medium">Lọc tồn kho {'<'}</span>
              <input 
                type="number" 
                min="0"
                value={stockThreshold}
                onChange={(e) => setStockThreshold(e.target.value)}
                placeholder="VD: 10"
                className="w-16 px-2 py-1 text-[13px] border border-brand-border rounded-[3px] focus:outline-none focus:border-brand-primary"
              />
              <button
                onClick={() => setNotifyLowStock(!notifyLowStock)}
                className={`flex items-center justify-center p-1.5 rounded-[3px] border transition-colors ${notifyLowStock ? 'bg-orange-50 border-orange-300 text-orange-600' : 'bg-white border-brand-border text-brand-text-sub hover:bg-slate-50'}`}
                title="Nhận thông báo khi tồn kho thấp"
              >
                <Bell size={14} />
              </button>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium border border-brand-border bg-white rounded-[3px] text-brand-text-sub hover:bg-slate-50"
              >
                Thương hiệu {selectedBrands.length > 0 && `(${selectedBrands.length})`} <ChevronDown size={14} />
              </button>
              {showBrandDropdown && (
                <div className="absolute top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto bg-white border border-brand-border shadow-lg rounded-[4px] z-10 p-2">
                  <div className="text-[12px] font-bold text-brand-text-sub mb-2 uppercase px-2">Chọn Thương Hiệu</div>
                  {uniqueBrands.map(brand => (
                    <label key={brand} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 cursor-pointer rounded-[3px]">
                      <input 
                        type="checkbox" 
                        checked={selectedBrands.includes(brand)} 
                        onChange={() => toggleBrand(brand)} 
                        className="cursor-pointer"
                      />
                      <span className="text-[13px] text-brand-text truncate pb-0.5">{brand}</span>
                    </label>
                  ))}
                  {uniqueBrands.length === 0 && <div className="p-2 text-center text-xs text-brand-text-sub">Chưa có thương hiệu</div>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <span className="text-[12px] text-brand-text-sub">Tổng: {filteredProducts.length} SP</span>
              
              <div className="relative">
                <button 
                  onClick={() => setShowColDropdown(!showColDropdown)}
                  className="flex items-center gap-1.5 p-1.5 text-brand-text-sub hover:text-brand-primary border border-transparent hover:border-brand-border rounded-[3px] transition-colors"
                  title="Cấu hình hiển thị cột"
                >
                  <Columns size={16} />
                </button>
                {showColDropdown && (
                  <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-brand-border shadow-lg rounded-[4px] z-10 p-2">
                    <div className="flex justify-between items-center mb-2 px-2">
                      <div className="text-[12px] font-bold text-brand-text-sub uppercase">Ẩn/Hiện Cột</div>
                      <button onClick={saveColsDefault} className="text-[11px] text-brand-primary font-medium hover:underline">Lưu mặc định</button>
                    </div>
                    {cols.map((col, idx) => (
                      <div 
                        key={col.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, idx)} 
                        onDrop={(e) => handleDrop(e, idx)} 
                        onDragOver={handleDragOver}
                        className="flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-[3px] group border border-transparent hover:border-slate-200 cursor-move"
                      >
                        <label className="flex items-center gap-2 cursor-pointer w-full" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={col.visible} 
                            onChange={() => {
                              const newCols = [...cols];
                              newCols[idx].visible = !newCols[idx].visible;
                              setCols(newCols);
                            }} 
                            className="cursor-pointer"
                          />
                          <span className="text-[13px] text-brand-text">{col.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div className="min-w-[800px]">
              <table className="w-full text-[13px] border-collapse min-w-max">
                <thead>
                  <tr>
                    {cols.map(col => {
                  if (!col.visible) return null;
                  if (col.id === 'stock') {
                    return (
                      <th 
                        key={col.id}
                        className="bg-[#f8f9fa] text-center p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border whitespace-nowrap pr-4 cursor-pointer hover:bg-slate-200 transition-colors"
                        onClick={() => setSortStockDir(prev => prev === 'desc' ? 'asc' : (prev === 'asc' ? null : 'desc'))}
                        title="Bấm để sắp xếp"
                      >
                        {col.label} {sortStockDir === 'asc' ? '↑' : (sortStockDir === 'desc' ? '↓' : '')}
                      </th>
                    );
                  }
                  return (
                    <th key={col.id} className="bg-[#f8f9fa] p-3 text-brand-text-sub font-semibold border-b-2 border-brand-border whitespace-nowrap text-left px-4">
                      {col.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={cols.filter(c=>c.visible).length} className="p-6 text-center text-brand-text-sub">Không tìm thấy dữ liệu.</td>
                </tr>
              ) : paginatedProducts.map((product) => (
                <tr key={product.id} onClick={() => setSelectedProduct(product)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                  {cols.map(col => {
                    if (!col.visible) return null;
                    if (col.id === 'id') return <td key={col.id} className="p-3 pl-4 border-b border-brand-border font-semibold text-brand-text-sub whitespace-nowrap">{product.id}</td>;
                    if (col.id === 'image') return (
                      <td key={col.id} className="p-3 px-4 border-b border-brand-border w-16">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.name} 
                            referrerPolicy="no-referrer" 
                            className="w-10 h-10 object-contain rounded-[3px] border border-brand-border bg-white cursor-zoom-in hover:opacity-80 transition-opacity" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage(product.image!);
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-[3px] border border-brand-border"></div>
                        )}
                      </td>
                    );
                    if (col.id === 'name') return <td key={col.id} className="p-3 px-4 border-b border-brand-border font-medium text-brand-text max-w-[300px] truncate" title={product.name}>{product.name}</td>;
                    if (col.id === 'brand') return <td key={col.id} className="p-3 px-4 border-b border-brand-border text-brand-text-sub whitespace-nowrap">{product.brand || '-'}</td>;
                    if (col.id === 'cost') return <td key={col.id} className="p-3 px-4 border-b border-brand-border font-medium text-brand-text-sub whitespace-nowrap">{formatCurrency(product.cost)}</td>;
                    if (col.id === 'price') return <td key={col.id} className="p-3 px-4 border-b border-brand-border font-semibold text-brand-success whitespace-nowrap">{formatCurrency(product.price)}</td>;
                    if (col.id === 'stock') {
                      const isLowStock = notifyLowStock && parseInt(stockThreshold) >= 0 && product.stock <= parseInt(stockThreshold);
                      return (
                      <td key={col.id} className="p-3 pr-4 border-b border-brand-border text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          {product.stock > 0 ? (
                            <span className={product.stock < 10 ? "bg-orange-100 text-orange-800 font-bold px-2 py-1 rounded-[3px] text-[11px]" : "bg-brand-tag-in-bg text-brand-tag-in-text font-bold px-2 py-1 rounded-[3px] text-[11px]"}>{product.stock}</span>
                          ) : (
                            <span className="bg-brand-tag-out-bg text-brand-tag-out-text font-bold px-2 py-1 rounded-[3px] text-[11px]">HẾT</span>
                          )}
                          {isLowStock && <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" title="Dưới định mức" />}
                        </div>
                      </td>
                    );
                    }
                    if (col.id === 'updatedAt') {
                      let dateStr = '---';
                      if (product.updatedAt) {
                         const date = product.updatedAt?.toMillis ? new Date(product.updatedAt.toMillis()) : new Date(product.updatedAt);
                         if (!isNaN(date.getTime())) {
                            dateStr = date.toLocaleString('vi-VN', { 
                              day: '2-digit', month: '2-digit', year: 'numeric', 
                              hour: '2-digit', minute: '2-digit', second: '2-digit' 
                            });
                         }
                      }
                      return <td key={col.id} className="p-3 px-4 border-b border-brand-border text-brand-text-sub whitespace-nowrap text-[12px]">{dateStr}</td>;
                    }
                    if (col.id === 'createdAt') {
                      let dateStr = '---';
                      if (product.createdAt) {
                         const date = product.createdAt?.toMillis ? new Date(product.createdAt.toMillis()) : new Date(product.createdAt);
                         if (!isNaN(date.getTime())) {
                            dateStr = date.toLocaleString('vi-VN', { 
                              day: '2-digit', month: '2-digit', year: 'numeric', 
                              hour: '2-digit', minute: '2-digit', second: '2-digit' 
                            });
                         }
                      }
                      return <td key={col.id} className="p-3 px-4 border-b border-brand-border text-brand-text-sub whitespace-nowrap text-[12px]">{dateStr}</td>;
                    }
                    return null;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </div>
          
          <div className="p-3 border-t border-brand-border bg-white flex flex-wrap items-center justify-between gap-4 shrink-0">
             <div className="text-[13px] text-brand-text-sub">
                Hiển thị từ {filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredProducts.length)} / {filteredProducts.length} sản phẩm
             </div>
             <div className="flex items-center gap-2">
                <select 
                   value={pageSize}
                   onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                   className="border border-brand-border rounded-[3px] px-2 py-1 text-[13px] focus:outline-none focus:border-brand-primary cursor-pointer"
                >
                   <option value={20}>20/trang</option>
                   <option value={50}>50/trang</option>
                   <option value={100}>100/trang</option>
                   <option value={500}>500/trang</option>
                </select>
                <div className="flex gap-1">
                   <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-brand-border rounded-[3px] text-[13px] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                   >
                      Trang trước
                   </button>
                   <span className="px-3 py-1 text-[13px] font-medium min-w-[3rem] text-center text-brand-text">
                     {totalPages === 0 ? 0 : currentPage} / {totalPages}
                   </span>
                   <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="px-3 py-1 border border-brand-border rounded-[3px] text-[13px] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                   >
                      Sang trang
                   </button>
                </div>
             </div>
          </div>
        </CardContent>
      </Card>
      
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}

      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <img 
            src={zoomedImage} 
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[95vh] object-contain rounded"
            alt="Zoomed product"
          />
          <button 
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white hover:text-gray-300 bg-black/50 rounded-full p-2"
            onClick={() => setZoomedImage(null)}
          >
            <X size={24} />
          </button>
        </div>
      )}

      {isAddProductOpen && (
        <ProductFormModal onClose={() => setIsAddProductOpen(false)} />
      )}
    </>
  );
}
