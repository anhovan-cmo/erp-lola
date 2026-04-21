import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase/config';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { formatCurrency } from '../lib/utils';
import { History, Search, Filter } from 'lucide-react';

export type ActivityLog = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  createdAt: any;
};

export function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('ALL');

  useEffect(() => {
    const q = query(
      collection(db, 'activity_logs'),
      orderBy('createdAt', 'desc'),
      limit(500) // limit logic to prevent excessive reads
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData: ActivityLog[] = [];
      snapshot.forEach(doc => {
        logsData.push({ ...doc.data() } as ActivityLog);
      });
      setLogs(logsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchSearch = log.userName?.toLowerCase().includes(term) || log.action?.toLowerCase().includes(term) || log.details?.toLowerCase().includes(term);
    const matchModule = filterModule === 'ALL' || log.module === filterModule;
    return matchSearch && matchModule;
  });

  const modules = Array.from(new Set(logs.map(log => log.module))).filter(Boolean);

  const getActionColor = (action: string) => {
    if (action.includes('TẠO MỚI')) return 'bg-green-100 text-green-700';
    if (action.includes('XÓA')) return 'bg-red-100 text-red-700';
    if (action.includes('CẬP NHẬT')) return 'bg-blue-100 text-blue-700';
    if (action.includes('PHÂN QUYỀN')) return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 sm:p-6 bg-[#f4f5f7]">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-[20px] md:text-[24px] font-semibold flex items-center gap-2 text-brand-text">
          <History className="text-brand-primary" /> Nhật Ký Hoạt Động
        </h1>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-sub" />
            <input 
              type="text" 
              placeholder="Tìm theo user, thao tác..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-9 pr-4 py-2 bg-white border border-brand-border rounded-[3px] text-[13px] text-brand-text focus:outline-none focus:border-brand-primary"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-brand-border rounded-[3px] px-3">
            <Filter size={14} className="text-brand-text-sub" />
            <select
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
              className="py-2 text-[13px] bg-transparent border-none focus:outline-none text-brand-text cursor-pointer"
            >
              <option value="ALL">Tất cả phân hệ</option>
              {modules.map(mod => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="bg-white rounded shadow-sm border border-brand-border flex-1 flex flex-col overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-brand-text-sub">Đang tải nhật ký...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-brand-text-sub flex items-center justify-center gap-2">
            Không tìm thấy nhật ký nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead className="bg-[#f8f9fa] sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 border-b border-brand-border font-semibold text-brand-text-sub w-[160px]">Thời Gian</th>
                  <th className="py-3 px-4 border-b border-brand-border font-semibold text-brand-text-sub w-[180px]">Người Thao Tác</th>
                  <th className="py-3 px-4 border-b border-brand-border font-semibold text-brand-text-sub w-[140px]">Phân Hệ</th>
                  <th className="py-3 px-4 border-b border-brand-border font-semibold text-brand-text-sub w-[140px]">Loại Hành Động</th>
                  <th className="py-3 px-4 border-b border-brand-border font-semibold text-brand-text-sub">Chi Tiết</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 border-b border-brand-border last:border-0 transition-colors">
                    <td className="py-3 px-4">
                      {log.createdAt ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-brand-text">{new Date(log.createdAt.toDate ? log.createdAt.toDate() : log.createdAt).toLocaleDateString('vi-VN')}</span>
                          <span className="text-[11px] text-brand-text-sub">{new Date(log.createdAt.toDate ? log.createdAt.toDate() : log.createdAt).toLocaleTimeString('vi-VN')}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-brand-text">{log.userName || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-brand-text-sub">{log.module || '-'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-[3px] font-semibold text-[11px] ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-brand-text">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
