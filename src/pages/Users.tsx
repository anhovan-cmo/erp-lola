import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { useAppContext, Role, UserProfile } from '../context/AppContext';
import { ShieldAlert, Trash2, ShieldCheck } from 'lucide-react';
import { UserPermissionModal } from '../components/UserPermissionModal';
import { ConfirmModal } from '../components/ConfirmModal';

export function UsersPage() {
  const { usersList, updateUserRole, updateUserPermissions, userProfile, deleteUser } = useAppContext();
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);

  if (userProfile?.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center h-full text-brand-text-sub">
        <ShieldAlert className="w-6 h-6 mr-2" /> Không có quyền truy cập
      </div>
    );
  }

  const roleLabels: Record<Role, string> = {
    'ADMIN': 'Quản Trị Viên (Admin)',
    'ACCOUNTANT': 'Kế Toán',
    'CSKH': 'Chăm Sóc Khách Hàng',
    'WAREHOUSE': 'Nhân Viên Kho',
    'PENDING': 'Chờ Duyệt'
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (confirm('Bạn có chắc chắn muốn thay đổi phân quyền của nhân viên này? LƯU Ý: Phân quyền chi tiết (nếu có) cũng sẽ bị ghi đè về mặc định. Thực hiện?')) {
      await updateUserRole(userId, newRole);
    }
  };

  const handleSavePerms = async (perms: any) => {
    if (selectedUserForPerms) {
      await updateUserPermissions(selectedUserForPerms.id, perms);
      setSelectedUserForPerms(null);
    }
  };

  const handleDeleteUserClick = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete.id);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
    setUserToDelete(null);
  };

  return (
    <>
      <header className="flex justify-between items-center mb-1">
        <h1 className="text-[24px] font-semibold uppercase">QUẢN LÝ NHÂN VIÊN</h1>
      </header>

      <div className="flex-1 min-h-0 pb-4">
        <Card className="flex flex-col h-full overflow-hidden border-l-4 border-brand-primary rounded-[4px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] bg-[#ffffff]">
          <div className="p-4 border-b border-brand-border bg-[#f8f9fa]">
            <h3 className="text-[16px] font-semibold">Danh sách Tài Khoản</h3>
          </div>
          <CardContent className="p-0 overflow-auto flex-1 bg-white">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr>
                  <th className="bg-[#f8f9fa] text-left px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white">Tên Nhân Viên</th>
                  <th className="bg-[#f8f9fa] text-left px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white">Email</th>
                  <th className="bg-[#f8f9fa] text-left px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white">Phân Quyền Hiện Tại</th>
                  <th className="bg-[#f8f9fa] text-left px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white w-[250px]">Thao tác Quyền</th>
                  <th className="bg-[#f8f9fa] text-center px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white w-[120px]">Quyền Cụ Thể</th>
                  <th className="bg-[#f8f9fa] text-center px-4 py-3 text-brand-text-sub font-semibold border-b-2 border-brand-border border-t border-t-white w-[80px]">Xóa</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 border-b border-brand-border font-semibold text-brand-text">{u.name}</td>
                    <td className="px-4 py-3 border-b border-brand-border text-brand-text-sub">{u.email}</td>
                    <td className="px-4 py-3 border-b border-brand-border font-semibold text-brand-primary">
                      {roleLabels[u.role] || u.role}
                    </td>
                    <td className="px-4 py-3 border-b border-brand-border">
                      <select 
                        disabled={u.id === userProfile.id}
                        className="border border-brand-border rounded-[3px] px-2 py-1 text-[13px] text-brand-text w-[150px]"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      >
                        <option value="PENDING">{roleLabels['PENDING']}</option>
                        <option value="WAREHOUSE">{roleLabels['WAREHOUSE']}</option>
                        <option value="CSKH">{roleLabels['CSKH']}</option>
                        <option value="ACCOUNTANT">{roleLabels['ACCOUNTANT']}</option>
                        <option value="ADMIN">{roleLabels['ADMIN']}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 border-b border-brand-border text-center">
                      <button
                        onClick={() => setSelectedUserForPerms(u)}
                        className={`p-1.5 rounded transition-colors text-brand-primary hover:bg-blue-50`}
                        title="Điều chỉnh quyền chi tiết hệ thống"
                      >
                        <ShieldCheck size={18} />
                      </button>
                    </td>
                    <td className="px-4 py-3 border-b border-brand-border text-center">
                      <button 
                        disabled={u.id === userProfile.id}
                        onClick={() => handleDeleteUserClick(u.id, u.name)}
                        className={`p-1.5 rounded transition-colors ${u.id === userProfile.id ? 'opacity-30 cursor-not-allowed' : 'text-brand-danger hover:bg-red-50'}`}
                        title={u.id === userProfile.id ? "Không thể tự xóa user của mình" : "Xóa nhân viên"}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {selectedUserForPerms && (
        <UserPermissionModal
          user={selectedUserForPerms}
          onClose={() => setSelectedUserForPerms(null)}
          onSave={handleSavePerms}
        />
      )}

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Xác nhận xóa tài khoản"
        message={
          <>Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <strong>{userToDelete?.name}</strong> không? Hành động này không thể hoàn tác.</>
        }
        confirmText="Xóa tài khoản"
        cancelText="Hủy"
        onConfirm={confirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </>
  );
}
