import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAppContext } from '../context/AppContext';
import { formatCurrency, cn } from '../lib/utils';
import { seedDatabase } from '../services/firebaseService';
import Papa from 'papaparse';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';

export function Dashboard() {
  const { products, transactions, partners } = useAppContext();

  const [dateRange, setDateRange] = useState({
    start: (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; })(),
    end: new Date().toISOString().split('T')[0]
  });

  // Filter transactions based on date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.date >= dateRange.start && t.date <= dateRange.end);
  }, [transactions, dateRange]);

  const metrics = useMemo(() => {
    const totalInventoryValue = products.reduce((acc, curr) => acc + (curr.cost * curr.stock), 0);
    const totalRevenue = filteredTransactions.filter(t => t.type === 'EXPORT').reduce((acc, curr) => acc + curr.totalValue, 0);
    const totalCOGS = filteredTransactions.filter(t => t.type === 'EXPORT').reduce((acc, curr) => acc + (curr.costValue || 0), 0);
    const totalGrossProfit = totalRevenue - totalCOGS;

    const totalReceivables = partners.reduce((acc, curr) => acc + curr.totalReceivable, 0);
    const totalPayables = partners.reduce((acc, curr) => acc + curr.totalPayable, 0);

    return { totalInventoryValue, totalRevenue, totalGrossProfit, totalReceivables, totalPayables };
  }, [products, filteredTransactions, partners]);

  const handleExportCSV = () => {
    const csvData = [
      { 'Chỉ Tiêu': 'Doanh Thu (Theo Kì)', 'Giá Trị': metrics.totalRevenue },
      { 'Chỉ Tiêu': 'Lợi Nhuận Gộp', 'Giá Trị': metrics.totalGrossProfit },
      { 'Chỉ Tiêu': 'Phải Thu Khách Hàng (AR)', 'Giá Trị': metrics.totalReceivables },
      { 'Chỉ Tiêu': 'Phải Trả Nhà Cung Cấp (AP)', 'Giá Trị': metrics.totalPayables },
      { 'Chỉ Tiêu': 'Tổng Giá Trị Tồn Kho', 'Giá Trị': metrics.totalInventoryValue },
    ];
    const csv = Papa.unparse(csvData);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao_cao_tong_hop_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportProfitCSV = () => {
    const csvData: any[] = [];
    filteredTransactions.filter(t => t.type === 'EXPORT').forEach(t => {
      t.items?.forEach(item => {
        csvData.push({
          'Ngày GD': t.date,
          'Mã Phiếu': t.id,
          'Đối Tác': t.partnerName || 'Khách vãng lai',
          'Mã SP': item.productId,
          'Tên SP': item.name,
          'Số Lượng': item.quantity,
          'Giá Bán': item.price,
          'Giá Vốn': item.cost,
          'Lợi Nhuận Gộp': (item.price - item.cost) * item.quantity
        });
      });
    });

    if (csvData.length === 0) {
      alert("Không có dữ liệu lợi nhuận xuất kho trong thời gian này.");
      return;
    }

    const csv = Papa.unparse(csvData);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chi_tiet_loi_nhuan_${dateRange.start}_den_${dateRange.end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const brandData = useMemo(() => {
    const brands: Record<string, number> = {};
    products.forEach(p => {
      if (p.stock > 0) {
        const b = p.brand || 'Khác';
        brands[b] = (brands[b] || 0) + 1;
      }
    });
    return Object.entries(brands).map(([name, value]) => ({ name, value }));
  }, [products]);

  const COLORS = ['#0052cc', '#36b37e', '#ffab00', '#ff5630', '#5e6c84', '#00b8d9', '#6554c0'];

  // Calculate generic sales data for date range
  const salesData = useMemo(() => {
    const dataByDate: Record<string, { name: string, revenue: number, cost: number }> = {};
    filteredTransactions.filter(t => t.type === 'EXPORT').forEach(t => {
      const d = t.date;
      if (!dataByDate[d]) dataByDate[d] = { name: d, revenue: 0, cost: 0 };
      dataByDate[d].revenue += t.totalValue;
      dataByDate[d].cost += (t.costValue || 0);
    });
    return Object.values(dataByDate).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTransactions]);

  // Calculate profit per product over time
  const profitData = useMemo(() => {
    const dataByDate: Record<string, any> = {};
    const topProducts = new Set<string>();
    
    filteredTransactions.filter(t => t.type === 'EXPORT').forEach(t => {
      const d = t.date;
      if (!dataByDate[d]) dataByDate[d] = { name: d };
      
      t.items?.forEach(item => {
        const profit = (item.price - item.cost) * item.quantity;
        if (profit > 0) {
          dataByDate[d][item.name] = (dataByDate[d][item.name] || 0) + profit;
          topProducts.add(item.name);
        }
      });
    });
    
    return {
      data: Object.values(dataByDate).sort((a, b) => a.name.localeCompare(b.name)),
      products: Array.from(topProducts).slice(0, 5) // restrict to top 5 products for clean chart
    };
  }, [filteredTransactions]);

  const txTypeData = useMemo(() => {
    let importTotal = 0;
    let exportTotal = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'IMPORT') importTotal += t.totalValue;
      if (t.type === 'EXPORT') exportTotal += t.totalValue;
    });
    return [
      { name: 'Nhập Kho', value: importTotal },
      { name: 'Xuất Kho', value: exportTotal }
    ].filter(d => d.value > 0);
  }, [filteredTransactions]);

  const profitByPartnerData = useMemo(() => {
    const partnerProfit: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'EXPORT').forEach(t => {
      const pName = t.partnerName || 'Khách vãng lai';
      let profit = 0;
      t.items?.forEach(item => {
        profit += (item.price - item.cost) * item.quantity;
      });
      if (profit > 0) {
        partnerProfit[pName] = (partnerProfit[pName] || 0) + profit;
      }
    });
    return Object.entries(partnerProfit)
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  }, [filteredTransactions]);

  const StatCard = ({ title, value, colorClass }: any) => (
    <Card className={cn(colorClass ? `border-l-4 ${colorClass}` : "")}>
      <CardContent className="p-4">
        <div className="text-[12px] uppercase font-semibold text-brand-text-sub mb-2">{title}</div>
        <div className="text-[22px] font-bold text-brand-text">{value != null ? formatCurrency(value) : '-'}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-4 pb-12">
      {products.length === 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 flex justify-between items-center rounded-r shadow-sm shrink-0">
          <div>
            <h3 className="font-semibold text-blue-800">Dữ liệu đang trống</h3>
            <p className="text-sm text-blue-600">Bạn có thể đồng bộ 100+ sản phẩm và giao dịch mẫu vào cơ sở dữ liệu để bắt đầu ngay.</p>
          </div>
          <button 
            onClick={() => seedDatabase(products, partners, transactions)}
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm hover:bg-blue-700 transition"
          >
            Đồng bộ Dữ liệu Mẫu
          </button>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 shrink-0">
        <h1 className="text-[20px] md:text-[24px] font-semibold">Báo Cáo Tổng Hợp</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-brand-border rounded-[3px] flex-1 sm:flex-none">
            <span className="text-sm text-brand-text-sub shrink-0">Từ:</span>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="text-sm border-none outline-none bg-transparent w-full"
            />
            <span className="text-sm text-brand-text-sub ml-2 shrink-0">Đến:</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="text-sm border-none outline-none bg-transparent w-full"
            />
          </div>
          <button 
            onClick={handleExportProfitCSV}
            className="bg-white border border-brand-border text-brand-text-sub hover:text-brand-primary py-2 px-4 rounded-[3px] font-semibold text-[14px] shrink-0 whitespace-nowrap transition-colors"
          >
            Tải Chi Tiết Lợi Nhuận
          </button>
          <button 
            onClick={handleExportCSV}
            className="bg-brand-primary text-white border-none py-2 px-4 rounded-[3px] font-semibold text-[14px] shrink-0 whitespace-nowrap"
          >
            + Tải Chỉ Tiêu KPI
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 shrink-0">
        <StatCard title="Doanh Thu (Kì HT)" value={metrics.totalRevenue} />
        <StatCard title="Lợi Nhuận Gộp (Kì HT)" value={metrics.totalGrossProfit} />
        <StatCard title="Phải Thu Khách Hàng (AR)" value={metrics.totalReceivables} colorClass="border-brand-success" />
        <StatCard title="Phải Trả Nhà Cung Cấp (AP)" value={metrics.totalPayables} colorClass="border-brand-danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0 mb-4">
        <Card className="flex flex-col h-full rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-brand-border">
          <CardHeader className="border-b border-brand-border p-4 bg-[#f8f9fa]">
            <CardTitle className="text-[16px] text-brand-text-sub">Doanh thu & Giá vốn</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 pb-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              {salesData.length > 0 ? (
                <BarChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dfe1e6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#5e6c84', fontSize: 13}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#5e6c84', fontSize: 13}} tickFormatter={(val) => `${val / 1000000}M`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    cursor={{fill: '#f4f5f7'}}
                    contentStyle={{ borderRadius: '4px', border: '1px solid #dfe1e6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="revenue" name="Doanh thu" fill="#0052cc" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="cost" name="Giá vốn" fill="#5e6c84" radius={[2, 2, 0, 0]} />
                </BarChart>
              ) : (
                <div className="h-full flex items-center justify-center text-brand-text-sub text-sm">Không có dữ liệu trong khoảng thời gian này</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-brand-border">
          <CardHeader className="border-b border-brand-border p-4 bg-[#f8f9fa]">
            <CardTitle className="text-[16px] text-brand-text-sub">Lợi nhuận theo sản phẩm</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 pb-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              {profitData.data.length > 0 ? (
                <LineChart data={profitData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dfe1e6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#5e6c84', fontSize: 13}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#5e6c84', fontSize: 13}} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    contentStyle={{ borderRadius: '4px', border: '1px solid #dfe1e6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  {profitData.products.map((prod, idx) => (
                    <Line key={prod} type="monotone" dataKey={prod} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  ))}
                </LineChart>
              ) : (
                <div className="h-full flex items-center justify-center text-brand-text-sub text-sm">Không có dữ liệu lợi nhuận</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0 h-auto lg:h-[350px]">
        <Card className="flex flex-col h-full rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-brand-border">
          <CardHeader className="border-b border-brand-border p-4 bg-[#f8f9fa]">
            <CardTitle className="text-[16px] text-brand-text-sub">Phân bổ thương hiệu (Tồn kho)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 shrink-0 overflow-hidden min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brandData}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {brandData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '4px', border: '1px solid #dfe1e6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-brand-border">
          <CardHeader className="border-b border-brand-border p-4 bg-[#f8f9fa]">
            <CardTitle className="text-[16px] text-brand-text-sub">Tỉ trọng Giá trị Giao dịch</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 shrink-0 overflow-hidden min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              {txTypeData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={txTypeData}
                    innerRadius={0}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {txTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Nhập Kho' ? '#36b37e' : '#0052cc'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '4px', border: '1px solid #dfe1e6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                  />
                  <Legend />
                </PieChart>
              ) : (
                <div className="h-full flex items-center justify-center text-brand-text-sub text-sm">Không có dữ liệu giao dịch</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-brand-border">
          <CardHeader className="border-b border-brand-border p-4 bg-[#f8f9fa]">
            <CardTitle className="text-[16px] text-brand-text-sub">Lợi nhuận theo Đối tác (Top 10)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-4 shrink-0 overflow-hidden min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              {profitByPartnerData.length > 0 ? (
                <BarChart data={profitByPartnerData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#dfe1e6" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#5e6c84', fontSize: 11}} tickFormatter={(val) => `${val / 1000}k`} />
                  <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{fill: '#5e6c84', fontSize: 11}} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    cursor={{fill: '#f4f5f7'}}
                    contentStyle={{ borderRadius: '4px', border: '1px solid #dfe1e6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="profit" name="Lợi nhuận" fill="#ffab00" radius={[0, 4, 4, 0]}>
                    {profitByPartnerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <div className="h-full flex items-center justify-center text-brand-text-sub text-sm">Không có dữ liệu lợi nhuận đối tác</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
