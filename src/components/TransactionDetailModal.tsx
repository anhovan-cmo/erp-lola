import React from 'react';
import { X, Calendar, User, FileText, ArrowRightCircle, ArrowLeftCircle, Printer } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { Transaction, useAppContext } from '../context/AppContext';

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  const { products, partners, usersList, userProfile, user } = useAppContext();

  const calculateGrossProfit = () => {
    if (!transaction.items) return 0;
    return transaction.items.reduce((acc, item) => {
      // Cost might be missing for older transactions
      const itemCost = item.cost || 0; 
      return acc + ((item.price - itemCost) * item.quantity);
    }, 0);
  };

  const grossProfit = calculateGrossProfit();
  
  const discount = transaction.discount || 0;
  const otherFees = transaction.otherFees || 0;
  const totalValue = transaction.totalValue || 0;
  const totalPayable = totalValue - discount + otherFees;
  const amountPaid = transaction.amountPaid || 0;
  const debt = totalPayable - amountPaid;

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // Prepare dynamic data
    const txPartner = partners.find(p => p.id === transaction.partnerId);
    const partnerPhone = txPartner?.phone ? ` - ${txPartner.phone}` : '';
    const creatorUser = usersList.find(u => u.id === transaction.userId);
    const creatorName = creatorUser?.name || userProfile?.name || 'Admin';
    const sumQty = transaction.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
    
    // Fallback current debt from partner
    const currentDebt = txPartner ? (txPartner.totalReceivable - txPartner.totalPayable) : 0;
    
    // Create rows with product image lookup
    const rows = transaction.items ? transaction.items.map((item, index) => {
      const p = products.find(prod => prod.id === item.productId);
      const imgCell = p?.image ? `<img src="${p.image}" alt="img" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />` : '';
      
      return `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${item.productId}</td>
          <td style="text-align: center;">${imgCell}</td>
          <td>${item.name}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: center;">${formatCurrency(item.price)}</td>
          <td style="text-align: center;">${formatCurrency(item.price * item.quantity)}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="7" style="text-align:center; padding: 20px;">Không có chi tiết mặt hàng</td></tr>';

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>In Phiếu ${transaction.id}</title>
          <style>
            @page { margin: 15mm; }
            body { font-family: "Times New Roman", Times, serif; margin: 0; padding: 0; color: #000; font-size: 14px; }
            
            .header-container { display: flex; align-items: flex-start; justify-content: flex-start; margin-bottom: 5px; position:relative; }
            .logo-box { width: 80px; height: 80px; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; margin-right: 20px; }
            .header-text { text-align: center; flex: 1; padding-right: 100px; } /* offset logo */
            
            .title { font-size: 20px; font-weight: bold; margin: 0 0 5px 0; text-transform: uppercase; }
            .subtitle { font-size: 14px; margin: 0; padding: 2px 0; }
            .store-name { font-weight: bold; font-size: 14px; margin-top: 5px; }

            .info-box { border: 1px solid #000; border-radius: 4px; padding: 5px 10px; margin-bottom: 5px; font-size: 13px; line-height: 1.5; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th, td { border: 1px solid #000; padding: 8px 5px; }
            th { text-align: center; font-weight: bold; }
            
            .footer-row { border: 1px solid #000; display: flex; justify-content: space-between; font-size: 13px; border-top: none;}
            .footer-row > div { padding: 5px; }
            
            .note-box { border: 1px solid #000; padding: 5px; margin-top: 5px; min-height: 40px; font-size: 13px; }
            
            .thanks { text-align: center; font-style: italic; font-weight: bold; margin-top: 20px; font-size: 15px; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="logo-box">
               <div style="text-align: center; line-height: 1.2;">
                 <div style="font-size: 24px; letter-spacing: -2px;">FUGALO</div>
               </div>
            </div>
            <div class="header-text">
              <h1 class="title">${transaction.type === 'IMPORT' ? 'HÓA ĐƠN NHẬP KHO' : 'HÓA ĐƠN BÁN HÀNG'}</h1>
              <p class="subtitle">SỐ HĐ: ${transaction.id} - ${new Date(transaction.date).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric'})}</p>
              <p class="store-name">KHO FUGALO</p>
            </div>
          </div>
          
          <div class="info-box">
            - Khách Hàng: <strong>${transaction.partnerName || 'Khách vãng lai'}</strong>${partnerPhone}
          </div>
          <div class="info-box">
            - NVBH : <strong>${creatorName}</strong> - Hotline: 0938655886
          </div>
          <div class="info-box">
            - Địa Chỉ : 
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%;">STT</th>
                <th style="width: 15%;">Mã Hàng</th>
                <th style="width: 10%;">Ảnh SP</th>
                <th style="width: 30%;">Tên Hàng</th>
                <th style="width: 10%;">Số<br/>Lượng</th>
                <th style="width: 15%;">Đơn Giá</th>
                <th style="width: 15%;">Thành Tiền</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr>
                <td colspan="4" style="text-align: left;">Tổng Số Lượng:</td>
                <td style="text-align: center;"><strong>${sumQty}</strong></td>
                <td style="text-align: right; border-right: none;">Tổng tiền hàng:</td>
                <td style="text-align: center; border-left: none;"><strong>${formatCurrency(totalPayable)}</strong></td>
              </tr>
              <tr>
                <td colspan="6" style="text-align: right; border-right: none;">Số Dư Cũ :</td>
                <td style="text-align: center; border-left: none;">${formatCurrency(currentDebt - debt)}</td>
              </tr>
              <tr>
                <td colspan="6" style="text-align: right; border-right: none;">Khách Thanh Toán:</td>
                <td style="text-align: center; border-left: none;">${formatCurrency(amountPaid)}</td>
              </tr>
              <tr>
                <td colspan="6" style="text-align: right; border-right: none;">Số dư hiện tại :</td>
                <td style="text-align: center; border-left: none;"><strong>${formatCurrency(currentDebt)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="note-box">
            - Ghi Chú: ${transaction.note || ''}
          </div>

          <div class="thanks">
            Fugalo Xin Cảm Ơn Quý Khách
          </div>
        </body>
      </html>
    `;

    if (iframe.contentWindow) {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(content);
      iframe.contentWindow.document.close();
      iframe.contentWindow.focus();
      
      // Delay to allow images to load before printing
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 60000);
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[4px] w-full max-w-[800px] shadow-lg flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-brand-border bg-[#f8f9fa]">
          <h2 className="text-[18px] sm:text-[20px] font-semibold text-brand-text flex items-center gap-2">
            Chi tiết giao dịch: <span className="font-mono text-brand-primary">{transaction.id}</span>
          </h2>
          <button onClick={onClose} className="text-brand-text-sub hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-3">
              {transaction.type === 'IMPORT' ? (
                <ArrowRightCircle className="w-10 h-10 text-brand-tag-in-text bg-brand-tag-in-bg rounded-full p-1.5" />
              ) : (
                <ArrowLeftCircle className="w-10 h-10 text-brand-tag-out-text bg-brand-tag-out-bg rounded-full p-1.5" />
              )}
              <div>
                <p className="text-sm text-brand-text-sub font-semibold">Loại giao dịch</p>
                <p className="font-semibold text-brand-text text-lg">
                  {transaction.type === 'IMPORT' ? 'Phiếu Nhập Kho' : 'Phiếu Xuất Kho'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-10 h-10 text-brand-text-sub bg-slate-100 rounded-full p-2" />
              <div>
                <p className="text-sm text-brand-text-sub font-semibold">Ngày tạo</p>
                <p className="font-medium text-brand-text text-[15px]">
                  {new Date(transaction.date).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-10 h-10 text-brand-text-sub bg-slate-100 rounded-full p-2" />
              <div>
                <p className="text-sm text-brand-text-sub font-semibold">Đối Tác</p>
                <p className="font-medium text-brand-text text-[15px]">
                  {transaction.partnerName || 'Khách vãng lai / Không xác định'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="w-10 h-10 text-brand-text-sub bg-slate-100 rounded-full p-2" />
              <div>
                <p className="text-sm text-brand-text-sub font-semibold">Ghi chú</p>
                <p className="font-medium text-brand-text text-[14px]">
                  {transaction.note || <span className="italic text-gray-400">Không có ghi chú</span>}
                </p>
              </div>
            </div>
          </div>

          <h4 className="font-semibold text-[15px] sm:text-[16px] mb-3 border-b border-brand-border pb-2">
            Danh sách Hàng hóa ({transaction.items?.length || 0})
          </h4>
          
          {(!transaction.items || transaction.items.length === 0) ? (
            <div className="text-center py-6 text-brand-text-sub italic border border-dashed border-brand-border bg-slate-50 font-medium rounded">
              Không có chi tiết hàng hóa (Phiếu cũ).
            </div>
          ) : (
            <div className="border border-brand-border rounded-[4px] overflow-x-auto">
              <table className="w-full text-[12px] sm:text-[13px] border-collapse min-w-[500px]">
                <thead className="bg-[#f8f9fa]">
                  <tr>
                    <th className="py-2 px-3 text-left border-b border-brand-border font-semibold text-brand-text-sub">Sản phẩm</th>
                    <th className="py-2 px-3 text-right border-b border-brand-border font-semibold text-brand-text-sub">Số lượng</th>
                    <th className="py-2 px-3 text-right border-b border-brand-border font-semibold text-brand-text-sub">Đơn giá</th>
                    <th className="py-2 px-3 text-right border-b border-brand-border font-semibold text-brand-text-sub">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 border-b border-gray-100">
                        <div className="font-medium text-brand-text">{item.name}</div>
                        <div className="text-xs text-brand-text-sub font-mono">{item.productId}</div>
                      </td>
                      <td className="py-3 px-3 border-b border-gray-100 text-right font-medium">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 border-b border-gray-100 text-right">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-3 px-3 border-b border-gray-100 text-right font-bold text-brand-text">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#f8f9fa]">
                    <td colSpan={3} className="py-2 px-3 text-right font-medium text-brand-text-sub">
                      Tổng tiền hàng:
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-[14px] text-brand-text">
                      {formatCurrency(totalValue)}
                    </td>
                  </tr>
                  {discount > 0 && (
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-right font-medium text-brand-text-sub">
                        Giảm giá:
                      </td>
                      <td className="py-2 px-3 text-right text-[14px] text-brand-text">
                        -{formatCurrency(discount)}
                      </td>
                    </tr>
                  )}
                  {otherFees > 0 && (
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-right font-medium text-brand-text-sub">
                        Thu khác:
                      </td>
                      <td className="py-2 px-3 text-right text-[14px] text-brand-text">
                        +{formatCurrency(otherFees)}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-blue-50">
                    <td colSpan={3} className="py-2 px-3 text-right font-bold text-brand-text">
                      Khách cần trả:
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-[15px] text-blue-600">
                      {formatCurrency(totalPayable)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right font-medium text-brand-text-sub">
                      {transaction.type === 'EXPORT' ? 'Khách thanh toán:' : 'Đã thanh toán:'}
                    </td>
                    <td className="py-2 px-3 text-right text-[14px] font-bold text-brand-text">
                      {formatCurrency(amountPaid)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right font-medium text-brand-text-sub">
                      Tính vào công nợ:
                    </td>
                    <td className="py-2 px-3 text-right text-[14px] font-bold text-brand-text">
                      {formatCurrency(Math.abs(debt))} {debt > 0 ? '(Ghi nợ)' : debt < 0 ? '(Thối lại)' : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="p-4 sm:p-5 border-t border-brand-border flex justify-end gap-3 bg-[#f8f9fa] shrink-0">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 sm:px-5 py-2 border border-brand-primary text-brand-primary font-semibold rounded-[3px] hover:bg-blue-50 text-[13px] sm:text-[14px]">
            <Printer size={16} /> In Phiếu
          </button>
          <button onClick={onClose} className="px-4 sm:px-5 py-2 bg-brand-primary text-white font-semibold rounded-[3px] hover:bg-blue-700 text-[13px] sm:text-[14px]">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
