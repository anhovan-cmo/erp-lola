import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { BookOpen, User, Users, ShieldAlert, BarChart3, PackageSearch, ArrowUpRight, ArrowDownRight, CreditCard, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export function GuidePage() {
  const { userProfile, hasPermission } = useAppContext();
  const role = userProfile?.role || 'PENDING';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-bold text-brand-text">Hướng Dẫn Sử Dụng Hệ Thống</h1>
        <p className="text-brand-text-sub mt-1">
          Tài liệu hướng dẫn thao tác trên hệ thống quản lý kho, công nợ và đồng bộ KiotViet.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="rounded-[8px] shadow-sm border border-brand-border">
            <CardHeader className="bg-[#f8f9fa] border-b border-brand-border pb-4">
              <CardTitle className="text-[16px] text-brand-text flex items-center gap-2">
                <BookOpen size={18} className="text-brand-primary" /> 
                Chức năng chung (Hiển thị theo quyền của bạn)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-brand-border">
                
                {hasPermission('dashboard', 'view') && (
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-full mt-0.5"><BarChart3 size={16} className="text-blue-600" /></div>
                    <div>
                      <h4 className="font-semibold text-brand-text text-[14px]">Tổng Quan Dashboard</h4>
                      <p className="text-sm text-brand-text-sub mt-1">Cung cấp báo cáo chung về tài chính, công nợ, số lượng tồn kho. Các biểu đồ lợi nhuận theo kỳ, doanh thu & giá vốn. Thông tin này giúp bạn nắm bắt nhanh tình hình công ty.</p>
                    </div>
                  </div>
                </div>
                )}

                {hasPermission('products', 'view') && (
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="bg-indigo-100 p-2 rounded-full mt-0.5"><PackageSearch size={16} className="text-indigo-600" /></div>
                    <div>
                      <h4 className="font-semibold text-brand-text text-[14px]">Quản Lý Tồn Kho & Sản Phẩm</h4>
                      <p className="text-sm text-brand-text-sub mt-1">Hiển thị toàn bộ danh mục sản phẩm, tồn kho hiện tại. Bạn có thể thêm, sửa, xoá sản phẩm (nếu có quyền).</p>
                      {hasPermission('products', 'create') && <p className="text-sm text-brand-text-sub mt-1"><span className="font-medium text-brand-primary">Đồng bộ KiotViet:</span> Ở tab Tồn Kho, có nút <strong>"Đồng bộ KiotViet"</strong>. Nhấn vào để tải dữ liệu danh mục hàng hoá mới nhất từ KiotViet về hệ thống nội bộ.</p>}
                    </div>
                  </div>
                </div>
                )}

                {hasPermission('imports', 'view') && (
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-full mt-0.5"><ArrowDownRight size={16} className="text-green-600" /></div>
                    <div>
                      <h4 className="font-semibold text-brand-text text-[14px]">Quản Lý Nhập Kho</h4>
                      <p className="text-sm text-brand-text-sub mt-1">Tạo phiếu nhập từ nhà cung cấp (NCC). Phiếu nhập sẽ cộng tồn kho, và có thể ghi nhận Công nợ (Phải trả) đối với NCC nếu mua chịu.</p>
                      <ul className="list-disc pl-5 mt-1 text-sm text-brand-text-sub space-y-1">
                        {hasPermission('imports', 'create') && <li><strong>Quản lý kho:</strong> Tạo phiếu, ghi nhận sản phẩm và số lượng nhập.</li>}
                        {hasPermission('payables', 'view') && <li><strong>Kế Toán:</strong> Theo dõi giá trị đơn nhập, quản lý công nợ NCC.</li>}
                      </ul>
                    </div>
                  </div>
                </div>
                )}

                {hasPermission('exports', 'view') && (
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-100 p-2 rounded-full mt-0.5"><ArrowUpRight size={16} className="text-orange-600" /></div>
                    <div>
                      <h4 className="font-semibold text-brand-text text-[14px]">Quản Lý Xuất Kho</h4>
                      <p className="text-sm text-brand-text-sub mt-1">Tạo phiếu xuất bán hàng cho khách hàng. Trừ tồn kho và ghi nhận Công nợ (Phải thu) đối với Khách hàng.</p>
                    </div>
                  </div>
                </div>
                )}

                {(hasPermission('receivables', 'view') || hasPermission('payables', 'view')) && (
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 p-2 rounded-full mt-0.5"><CreditCard size={16} className="text-purple-600" /></div>
                    <div>
                      <h4 className="font-semibold text-brand-text text-[14px]">Công Nợ & Đối Tác</h4>
                      <p className="text-sm text-brand-text-sub mt-1">Quản lý Khách Hàng và Nhà Cung Cấp. Theo dõi dư nợ Phải Thu (tiền khách nợ mình) và Phải Trả (tiền mình nợ NCC).</p>
                      {hasPermission('receivables', 'create') && <p className="text-sm text-brand-text-sub mt-1">Cung cấp chức năng thanh toán để giảm trừ số dư nợ.</p>}
                    </div>
                  </div>
                </div>
                )}

                {hasPermission('settings', 'view') && (
                <div className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2 rounded-full mt-0.5"><Users size={16} className="text-slate-600" /></div>
                    <div>
                      <h4 className="font-semibold text-brand-text text-[14px]">Quản Lý Chức Năng Cài Đặt & Logs</h4>
                      <p className="text-sm text-brand-text-sub mt-1">Cấp tài khoản, phân quyền chức năng chi tiết cho từng luồng (view/create/edit/delete) cho từng người dùng, cũng như kiểm tra trạng thái token KiotViet từ Cài Đặt.</p>
                      <p className="text-sm text-brand-text-sub mt-1">Nhật ký hệ thống lưu trữ toàn bộ các thay đổi của mọi người dùng với chức năng xoá sửa để truy vết.</p>
                    </div>
                  </div>
                </div>
                )}

              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[8px] shadow-sm border border-brand-border">
            <CardHeader className="bg-[#f8f9fa] border-b border-brand-border pb-4">
              <CardTitle className="text-[16px] text-brand-text flex items-center gap-2">
                <ShieldAlert size={18} className="text-[#ff991f]" />
                Vai Trò Của Bạn: {role}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {role === 'ADMIN' && (
                <div className="text-sm text-brand-text-sub space-y-2">
                  <p><strong>Admin</strong> có toàn quyền trong hệ thống.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Có thể chỉnh sửa hoặc xoá dữ liệu nếu có sai sót.</li>
                    <li>Phân quyền cho nhân viên khác.</li>
                    <li>Nên xem các <strong>Nhật ký hoạt động</strong> để theo dõi các hành vi sửa/xoá của người khác.</li>
                  </ul>
                </div>
              )}
              {role === 'ACCOUNTANT' && (
                <div className="text-sm text-brand-text-sub space-y-2">
                  <p><strong>Kế toán</strong> chịu trách nhiệm quản lý dòng tiền, công nợ và rà soát phiếu nhập/xuất.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Ưu tiên thao tác ở module <strong>Công Nợ</strong> để thu/trả nợ đối tác.</li>
                    <li>Tạo/Sửa các Đối tác khách hàng và NCC, nhập địa chỉ, số ĐT và theo dõi tổng nợ của họ.</li>
                    <li>Kiểm tra tính chính xác của các phiếu.</li>
                  </ul>
                </div>
              )}
              {role === 'WAREHOUSE' && (
                <div className="text-sm text-brand-text-sub space-y-2">
                  <p><strong>Nhân viên kho</strong> quản lý hàng tồn, thao tác trực tiếp với sản phẩm vật lý.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Tạo <strong>Phiếu Nhập</strong>, <strong>Phiếu Xuất</strong>.</li>
                    <li>Sử dụng chức năng <strong>Đồng bộ KiotViet</strong> định kỳ để lấy thông tin mã hàng mới từ hệ thống bán lẻ xuống nếu có.</li>
                  </ul>
                </div>
              )}
              {role === 'CSKH' && (
                <div className="text-sm text-brand-text-sub space-y-2">
                  <p><strong>Nhân viên CSKH / Sales</strong> quản lý dữ liệu Khách Hàng, tạo đơn hàng xuất.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Tạo thông tin <strong>Đối Tác</strong> (Khách hàng) để lưu trữ thông tin nhận hàng, liên hệ.</li>
                    <li>Có thể xem tồn kho để báo cho khách hàng số lượng còn lại.</li>
                    <li>Tạo phiếu xuất để giao cho giao vận.</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[8px] shadow-sm border border-brand-border bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] text-blue-700 flex items-center gap-2">
                <RefreshCw size={16} /> Mẹo Hệ Thống
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-blue-800 leading-relaxed">
                Hệ thống tự động liên thông dữ liệu. Ví dụ: Khi tạo phiếu Xuất, Tồn kho sẽ giảm tương ứng và Công nợ của khách hàng đó sẽ tăng nếu bạn chọn ghi nợ, tất cả xảy ra cùng một lúc. Do đó, hãy cẩn thận kiểm tra kỹ số lượng và đối tác.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
