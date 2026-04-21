import React, { useRef, useState } from 'react';
import { X, Printer, Monitor } from 'lucide-react';
import { Transaction, useAppContext } from '../context/AppContext';
import { formatCurrency, cn } from '../lib/utils';
import { useReactToPrint } from 'react-to-print';

interface PrintPreviewModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function PrintPreviewModal({ transaction, onClose }: PrintPreviewModalProps) {
  const { products, partners, usersList, userProfile } = useAppContext();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [templateSize, setTemplateSize] = useState<'A4_A5' | 'K80' | 'SP46'>('SP46');
  const [showImage, setShowImage] = useState<boolean>(true);
  const [customNote, setCustomNote] = useState<string>(transaction.note || '');


  const txPartner = partners.find(p => p.id === transaction.partnerId);
  const partnerPhone = txPartner?.phone ? ` - ${txPartner.phone}` : '';
  const creatorUser = usersList.find(u => u.id === transaction.userId);
  const creatorName = creatorUser?.name || userProfile?.name || 'Admin';
  
  const sumQty = transaction.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  
  const totalValue = transaction.totalValue || 0;
  const discount = transaction.discount || 0;
  const otherFees = transaction.otherFees || 0;
  const totalPayable = totalValue - discount + otherFees;
  const amountPaid = transaction.amountPaid || 0;
  const debt = totalPayable - amountPaid;
  
  const currentDebt = txPartner ? (txPartner.totalReceivable - txPartner.totalPayable) : 0;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Phieu_${transaction.id}`,
    pageStyle: templateSize === 'SP46'
      ? `@media print { @page { size: 100mm 150mm; margin: 3mm; } body { width: 100mm; font-family: "Times New Roman", Times, serif; -webkit-print-color-adjust: exact; margin: 0; } table { page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } thead { display: table-header-group; } tfoot { display: table-footer-group; } }`
      : templateSize === 'K80' 
      ? `@media print { @page { size: 80mm auto; margin: 0; padding: 0mm; } body { width: 80mm; font-family: monospace; -webkit-print-color-adjust: exact; } table { page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } thead { display: table-header-group; } }`
      : `@media print { @page { size: A4 portrait; margin: 15mm; } body { font-family: "Times New Roman", Times, serif; -webkit-print-color-adjust: exact; } table { page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } thead { display: table-header-group; } }`
  });

  return (
    <div className="fixed inset-0 z-[60] bg-[rgba(9,30,66,0.6)] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#f0f2f5] rounded shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col md:flex-row overflow-hidden">
        
        {/* Sidebar Controls */}
        <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Monitor size={18} /> Tùy chỉnh In
            </h3>
            <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-800">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-4 flex-1 overflow-auto flex flex-col gap-4 text-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1.5">Mẫu khổ giấy</label>
              <select 
                value={templateSize} 
                onChange={(e) => setTemplateSize(e.target.value as 'A4_A5' | 'K80' | 'SP46')}
                className="w-full border border-gray-300 rounded p-2 focus:border-brand-primary outline-none"
              >
                <option value="SP46">Khổ A6 100x150mm (SP46)</option>
                <option value="A4_A5">Khổ A4 / A5 (Chuẩn)</option>
                <option value="K80">Khổ 80mm (Máy in bill)</option>
              </select>
            </div>
            
            {(templateSize === 'A4_A5' || templateSize === 'SP46') && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-gray-700 font-medium">
                  <input 
                    type="checkbox" 
                    checked={showImage} 
                    onChange={e => setShowImage(e.target.checked)} 
                    className="w-4 h-4 rounded text-brand-primary focus:ring-0"
                  />
                  Hiển thị ảnh sản phẩm
                </label>
              </div>
            )}
            
            <div>
              <label className="block font-semibold text-gray-700 mb-1.5">Ghi chú thêm trên phiếu</label>
              <textarea 
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded p-2 focus:border-brand-primary outline-none"
                placeholder="Ghi chú nội bộ hoặc trên phiếu..."
              />
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200 flex flex-col gap-2">
            <button 
              onClick={() => handlePrint()}
              className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white font-semibold py-2.5 rounded hover:bg-blue-700 transition"
            >
              <Printer size={18} /> Bắt Đầu In
            </button>
            <button 
              onClick={onClose}
              className="w-full py-2.5 bg-gray-100 text-gray-700 font-semibold rounded border border-gray-300 hover:bg-gray-200 transition"
            >
              Hủy
            </button>
          </div>
        </div>
        
        {/* Preview Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-gray-500/10">
          <div className="bg-white shadow-md mx-auto print-preview-container" style={{
            width: templateSize === 'A4_A5' ? '210mm' : templateSize === 'SP46' ? '100mm' : '80mm',
            minHeight: templateSize === 'A4_A5' ? '297mm' : templateSize === 'SP46' ? '150mm' : 'auto',
            padding: templateSize === 'A4_A5' ? '15mm' : templateSize === 'SP46' ? '5mm' : '5mm',
            margin: '0 auto',
            transformOrigin: 'top center',
          }}>
            <div ref={printRef} className={cn(
              "print-content",
              templateSize === 'K80' ? 'font-mono text-[12px]' : 'font-serif text-[14px]'
            )}>
              
              {/* --- SP46 Template --- */}
              {templateSize === 'SP46' && (
                <div style={{ color: '#000', width: '100%', fontFamily: '"Times New Roman", Times, serif' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ width: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <h1 style={{ margin: 0, fontSize: '34px', fontWeight: 'normal', fontFamily: '"Times New Roman", Times, serif', color: '#000', letterSpacing: '1.5px', lineHeight: '1' }}>LOLA</h1>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1, paddingLeft: '0px' }}>
                       <div style={{ fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase', marginBottom: '4px' }}>
                          {transaction.type === 'IMPORT' ? 'HÓA ĐƠN NHẬP KHO' : 'HÓA ĐƠN BÁN HÀNG'}
                       </div>
                       <div style={{ fontSize: '12px', marginBottom: '2px' }}>
                          SỐ HĐ: {transaction.id} - {new Date().toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric'})}
                       </div>
                       <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                          KHO LOLA
                       </div>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '12px' }}>
                    <div style={{ border: '1px solid #000', borderRadius: '3px', padding: '5px 8px', marginBottom: '4px' }}>
                      - {txPartner?.type === 'SUPPLIER' ? 'NCC:' : 'Khách Hàng:'} {transaction.partnerName || 'Khách vãng lai'} {partnerPhone}
                    </div>
                    {((txPartner?.type === 'CUSTOMER' && txPartner.cccd) || (txPartner?.type === 'SUPPLIER' && txPartner.mst) || txPartner?.address) && (
                    <div style={{ border: '1px solid #000', borderRadius: '3px', padding: '5px 8px', marginBottom: '4px' }}>
                      - {txPartner.type === 'CUSTOMER' && txPartner.cccd ? `CCCD: ${txPartner.cccd} | ` : ''}{txPartner.type === 'SUPPLIER' && txPartner.mst ? `MST: ${txPartner.mst} | ` : ''}{txPartner.address ? `Địa Chỉ: ${txPartner.address}` : ''}
                    </div>
                    )}
                    <div style={{ border: '1px solid #000', borderRadius: '3px', padding: '5px 8px', marginBottom: '4px' }}>
                      - NVBH: {creatorName} - Hotline: 0372866986
                    </div>
                    <div style={{ border: '1px solid #000', borderRadius: '3px', padding: '5px 8px', marginBottom: '8px' }}>
                      - Kho: Tầng 1 chung cư Phúc Đạt, 159 QL1K, KP Đông A, P. Đông Hòa, TP.HCM
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: 'none' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '25px' }}>STT</th>
                        <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '60px' }}>Mã Hàng</th>
                        {showImage && <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '50px' }}>Ảnh SP</th>}
                        <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center' }}>Tên Hàng</th>
                        <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '35px' }}>Số<br/>Lượng</th>
                        <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center', width: '70px' }}>Đơn Giá</th>
                        <th style={{ border: '1px solid #000', padding: '4px 4px', textAlign: 'center', width: '75px' }}>Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transaction.items?.map((item, idx) => {
                         const p = products.find(prod => prod.id === item.productId);
                         return (
                           <tr key={idx}>
                             <td style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center' }}>{idx + 1}</td>
                             <td style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', wordBreak: 'break-all', fontSize: '11px' }}>{item.productId}</td>
                             {showImage && (
                               <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'center' }}>
                                  {p?.image ? <img src={p.image} alt="IMG" style={{ width: '45px', height: '45px', objectFit: 'cover', display: 'block', margin: '0 auto' }} /> : ''}
                               </td>
                             )}
                             <td style={{ border: '1px solid #000', padding: '4px' }}>{item.name}</td>
                             <td style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center' }}>{item.quantity}</td>
                             <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                             <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{formatCurrency(item.price * item.quantity)}</td>
                           </tr>
                         );
                      })}
                      {/* Footer rows placed inside tbody so they don't repeat on multiple pages like the header does. If keeping together is needed, could use a separate table or avoid page break inside these rows */}
                      <tr style={{ pageBreakInside: 'avoid' }}>
                        <td colSpan={showImage ? 4 : 3} style={{ border: '1px solid #000', padding: '4px 8px', borderRight: 'none', borderBottom: 'none' }}>Tổng Số Lượng:</td>
                        <td style={{ border: '1px solid #000', borderTop: '1px solid #000', padding: '4px', textAlign: 'center', borderRight: '1px solid #000', borderLeft: '1px solid #000', borderBottom: '1px solid #000' }}>{sumQty}</td>
                        <td colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>Tổng tiền hàng:</span>
                            <span>{formatCurrency(totalValue)}</span>
                          </div>
                        </td>
                      </tr>
                      <tr style={{ pageBreakInside: 'avoid' }}>
                        <td colSpan={showImage ? 5 : 4} style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '0px' }}></td>
                        <td colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>Số Dư Cũ :</span>
                            <span>{formatCurrency(currentDebt - debt)}</span>
                          </div>
                        </td>
                      </tr>
                      {discount > 0 && (
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td colSpan={showImage ? 5 : 4} style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '0px' }}></td>
                          <td colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <span>Giảm giá :</span>
                              <span>-{formatCurrency(discount)}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {otherFees > 0 && (
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td colSpan={showImage ? 5 : 4} style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '0px' }}></td>
                          <td colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <span>Phụ phí/Thu khác :</span>
                              <span>+{formatCurrency(otherFees)}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {/* Khách cần trả (only if there are discounts or fees, otherwise "tổng tiền hàng" is enough. Included to be consistent)*/}
                      {(discount > 0 || otherFees > 0) && (
                        <tr style={{ pageBreakInside: 'avoid' }}>
                          <td colSpan={showImage ? 5 : 4} style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '0px' }}></td>
                          <td colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <span>Khách Cần Trả :</span>
                              <span style={{ fontWeight: 'bold' }}>{formatCurrency(totalPayable)}</span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr style={{ pageBreakInside: 'avoid' }}>
                        <td colSpan={showImage ? 5 : 4} style={{ borderLeft: '1px solid #000', borderRight: '1px solid #000', padding: '0px' }}></td>
                        <td colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>Khách Thanh Toán:</span>
                            <span>{formatCurrency(amountPaid)}</span>
                          </div>
                        </td>
                      </tr>
                      <tr style={{ pageBreakInside: 'avoid' }}>
                        <td colSpan={showImage ? 5 : 4} style={{ borderLeft: '1px solid #000', borderBottom: '1px solid #000', borderRight: '1px solid #000', padding: '0px' }}></td>
                        <td colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>Số dư hiện tại :</span>
                            <span>{formatCurrency(currentDebt)}</span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  
                  {customNote && (
                    <div style={{ border: '1px solid #000', borderRadius: '3px', padding: '5px 8px', fontSize: '12px', marginTop: '10px' }}>
                      - Ghi Chú: {customNote}
                    </div>
                  )}

                  <div style={{ textAlign: 'center', marginTop: '15px', fontWeight: 'bold', fontSize: '14px', fontStyle: 'italic', paddingBottom: '15px' }}>
                    Lola Xin Cảm Ơn Quý Khách
                  </div>
                </div>
              )}

              {/* --- K80 Template --- */}
              {templateSize === 'K80' && (
                <div style={{ width: '70mm', margin: '0 auto', color: '#000' }}>
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <h1 style={{ fontSize: '24px', margin: '0', fontWeight: 'bold' }}>LOLA</h1>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px' }}>ĐC: Tầng 1 CC Phúc Đạt, 159 QL1K, TP.HCM</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '11px' }}>SĐT: 0372866986 - MST: 089097008672</p>
                    <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '10px 0 5px 0', borderBottom: '1px dashed #000', paddingBottom: '5px' }}>
                      {transaction.type === 'IMPORT' ? 'PHIẾU NHẬP' : 'HÓA ĐƠN BÁN HÀNG'}
                    </p>
                  </div>
                  
                  <div style={{ fontSize: '12px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Số: {transaction.id}</span>
                      <span>{new Date().toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div>{txPartner?.type === 'SUPPLIER' ? 'NCC:' : 'KH:'} {transaction.partnerName || 'Khách vãng lai'}</div>
                    {txPartner?.phone && <div>SĐT: {txPartner.phone}</div>}
                    {txPartner?.type === 'CUSTOMER' && txPartner.cccd && <div>CCCD: {txPartner.cccd}</div>}
                    {txPartner?.type === 'SUPPLIER' && txPartner.mst && <div>MST: {txPartner.mst}</div>}
                    {txPartner?.address && <div>ĐC: {txPartner.address}</div>}
                    <div>NV: {creatorName}</div>
                  </div>
                  
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', borderTop: '1px dashed #000', borderBottom: '1px dashed #000' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '5px 0', borderBottom: '1px dashed #000' }}>Tên MH</th>
                        <th style={{ textAlign: 'right', padding: '5px 0', borderBottom: '1px dashed #000', width: '20px' }}>SL</th>
                        <th style={{ textAlign: 'right', padding: '5px 0', borderBottom: '1px dashed #000', width: '50px' }}>TT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transaction.items?.map((item, idx) => (
                        <React.Fragment key={idx}>
                          <tr>
                            <td colSpan={3} style={{ paddingTop: '5px' }}>{item.name}</td>
                          </tr>
                          <tr>
                            <td style={{ color: '#555', paddingBottom: '5px' }}>{formatCurrency(item.price)}</td>
                            <td style={{ textAlign: 'right', paddingBottom: '5px' }}>x{item.quantity}</td>
                            <td style={{ textAlign: 'right', paddingBottom: '5px' }}>{formatCurrency(item.price * item.quantity)}</td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  
                  <div style={{ marginTop: '10px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tổng tiền:</span>
                      <span>{formatCurrency(totalValue)}</span>
                    </div>
                    {discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Giảm giá:</span>
                        <span>-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    {otherFees > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Phụ phí:</span>
                        <span>+{formatCurrency(otherFees)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '5px' }}>
                      <span>Cần trả:</span>
                      <span>{formatCurrency(totalPayable)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                      <span>Đã thanh toán:</span>
                      <span>{formatCurrency(amountPaid)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Nợ phiếu này:</span>
                      <span>{formatCurrency(Math.abs(debt))}</span>
                    </div>
                  </div>
                  
                  {customNote && (
                    <div style={{ marginTop: '10px', fontSize: '11px', borderTop: '1px dashed #000', paddingTop: '5px' }}>
                      Ghi chú: {customNote}
                    </div>
                  )}
                  
                  <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '11px', fontStyle: 'italic', borderTop: '1px dashed #000', paddingTop: '10px' }}>
                    Cảm ơn quý khách!
                  </div>
                </div>
              )}

              {/* --- A4/A5 Template --- */}
              {templateSize === 'A4_A5' && (
                <div style={{ color: '#000', maxWidth: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #e85a22', paddingBottom: '15px', marginBottom: '20px' }}>
                    <div>
                      <h1 style={{ fontFamily: '"Times New Roman", serif', fontSize: '50px', fontWeight: 'normal', color: '#e85a22', letterSpacing: '2px', lineHeight: '0.9', margin: 0 }}>LOLA</h1>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '13px', lineHeight: '1.5' }}>
                       <div style={{ fontWeight: 'bold', fontSize: '16px', textTransform: 'uppercase', marginBottom: '3px' }}>HỘ KINH DOANH LOLA</div>
                       <div><strong>MST:</strong> 089097008672</div>
                       <div><strong>Địa chỉ:</strong> Tầng 1 chung cư Phúc Đạt, 159 QL1K, KP Đông A, P. Đông Hòa, TP.HCM</div>
                       <div><strong>SĐT:</strong> 0372866986</div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0', textTransform: 'uppercase' }}>
                      {transaction.type === 'IMPORT' ? 'HÓA ĐƠN NHẬP KHO' : 'HÓA ĐƠN BÁN HÀNG'}
                    </h2>
                    <p style={{ margin: 0, fontStyle: 'italic', fontSize: '14px' }}>
                      SỐ HĐ: {transaction.id} - Ngày: {new Date().toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  
                  <div style={{ border: '1px dashed #ccc', borderRadius: '4px', padding: '10px 15px', marginBottom: '15px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0' }}><strong>{txPartner?.type === 'SUPPLIER' ? 'Nhà Cung Cấp:' : 'Khách Hàng/Đối Tác:'}</strong> {transaction.partnerName || 'Khách vãng lai'}</p>
                      {txPartner?.phone && <p style={{ margin: '0 0 5px 0' }}><strong>SĐT:</strong> {txPartner.phone}</p>}
                      {txPartner?.type === 'CUSTOMER' && txPartner.cccd && <p style={{ margin: '0 0 5px 0' }}><strong>CCCD:</strong> {txPartner.cccd}</p>}
                      {txPartner?.type === 'SUPPLIER' && txPartner.mst && <p style={{ margin: '0 0 5px 0' }}><strong>MST:</strong> {txPartner.mst}</p>}
                      {txPartner?.address && <p style={{ margin: '0 0 5px 0' }}><strong>Địa chỉ:</strong> {txPartner.address}</p>}
                      {customNote && <p style={{ margin: 0 }}><strong>Ghi chú:</strong> {customNote}</p>}
                    </div>
                    <div>
                      <p style={{ margin: '0 0 5px 0' }}><strong>Nhân viên lập phiếu:</strong> {creatorName}</p>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '15px' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #777', padding: '8px 5px', backgroundColor: '#f8f9fa', width: '5%' }}>STT</th>
                        <th style={{ border: '1px solid #777', padding: '8px 5px', backgroundColor: '#f8f9fa', width: '15%' }}>Mã Hàng</th>
                        {showImage && <th style={{ border: '1px solid #777', padding: '8px 5px', backgroundColor: '#f8f9fa', width: '12%' }}>Ảnh</th>}
                        <th style={{ border: '1px solid #777', padding: '8px 5px', backgroundColor: '#f8f9fa' }}>Tên Hàng</th>
                        <th style={{ border: '1px solid #777', padding: '8px 5px', backgroundColor: '#f8f9fa', width: '8%', textAlign: 'center' }}>SL</th>
                        <th style={{ border: '1px solid #777', padding: '8px 5px', backgroundColor: '#f8f9fa', width: '15%', textAlign: 'right' }}>Đơn Giá</th>
                        <th style={{ border: '1px solid #777', padding: '8px 5px', backgroundColor: '#f8f9fa', width: '15%', textAlign: 'right' }}>Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transaction.items?.map((item, idx) => {
                         const p = products.find(prod => prod.id === item.productId);
                         return (
                           <tr key={idx}>
                             <td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'center' }}>{idx + 1}</td>
                             <td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'center', fontSize: '12px' }}>{item.productId}</td>
                             {showImage && (
                               <td style={{ border: '1px solid #777', padding: '4px', textAlign: 'center' }}>
                                  {p?.image ? <img src={p.image} alt="IMG" style={{ width: '50px', height: '50px', objectFit: 'cover' }} /> : ''}
                               </td>
                             )}
                             <td style={{ border: '1px solid #777', padding: '8px 5px' }}>{item.name}</td>
                             <td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'center' }}>{item.quantity}</td>
                             <td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}>{formatCurrency(item.price)}</td>
                             <td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.price * item.quantity)}</td>
                           </tr>
                         );
                      })}
                      <tr>
                        <td colSpan={showImage ? 4 : 3} style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}><strong>Tổng Cộng:</strong></td>
                        <td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'center' }}><strong>{sumQty}</strong></td>
                        <td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}>Tổng tiền hàng:</td>
                        <td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}><strong>{formatCurrency(totalValue)}</strong></td>
                      </tr>
                      {discount > 0 && (
                        <tr><td colSpan={showImage ? 6 : 5} style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}>Giảm giá:</td><td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}>-{formatCurrency(discount)}</td></tr>
                      )}
                      {otherFees > 0 && (
                        <tr><td colSpan={showImage ? 6 : 5} style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}>Phụ phí/Thu khác:</td><td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}>+{formatCurrency(otherFees)}</td></tr>
                      )}
                      <tr>
                        <td colSpan={showImage ? 6 : 5} style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right', fontSize: '15px' }}><strong>Khách Cần Trả:</strong></td>
                        <td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right', fontSize: '15px' }}><strong>{formatCurrency(totalPayable)}</strong></td>
                      </tr>
                      <tr>
                        <td colSpan={showImage ? 6 : 5} style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}>Khách thanh toán:</td>
                        <td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}>{formatCurrency(amountPaid)}</td>
                      </tr>
                      <tr>
                        <td colSpan={showImage ? 6 : 5} style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}>Nợ cần thanh toán kỳ này:</td>
                        <td style={{ border: '1px solid #777', padding: '8px 5px', textAlign: 'right' }}><strong>{formatCurrency(currentDebt)}</strong></td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '30px', fontWeight: 'bold' }}>
                     <div style={{ textAlign: 'center' }}>Khách Hàng<br/><span style={{ fontSize: '12px', fontWeight: 'normal', fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</span><br/><br/><br/><br/><br/></div>
                     <div style={{ textAlign: 'center' }}>Người Nhận/Giao Hàng<br/><span style={{ fontSize: '12px', fontWeight: 'normal', fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</span><br/><br/><br/><br/><br/></div>
                     <div style={{ textAlign: 'center' }}>Người Lập Phiếu<br/><span style={{ fontSize: '12px', fontWeight: 'normal', fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</span><br/><br/><br/><br/><br/></div>
                  </div>
                  
                  <div style={{ textAlign: 'center', marginTop: '20px', fontStyle: 'italic', fontWeight: 'bold', fontSize: '15px' }}>
                    Xin chân thành cảm ơn sự đồng hành của Quý Khách!
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
