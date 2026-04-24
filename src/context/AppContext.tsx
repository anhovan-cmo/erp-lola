import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, signInWithGoogle } from '../lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, doc, writeBatch, serverTimestamp, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export type Role = 'ADMIN' | 'ACCOUNTANT' | 'CSKH' | 'WAREHOUSE' | 'PENDING';
export type AppPermission = { view: boolean; create: boolean; edit: boolean; delete: boolean; };
export type UserPermissions = Record<string, AppPermission>;
export type UserProfile = { id: string; email: string; name: string; role: Role; permissions?: UserPermissions; createdAt?: any; updatedAt?: any; };

export const DEFAULT_PERMISSIONS: Record<Role, UserPermissions> = {
      'ADMIN': {
         dashboard: { view: true, create: true, edit: true, delete: true },
         products: { view: true, create: true, edit: true, delete: true },
         transactions: { view: true, create: true, edit: true, delete: true },
         debts: { view: true, create: true, edit: true, delete: true },
         partners: { view: true, create: true, edit: true, delete: true },
         users: { view: true, create: true, edit: true, delete: true },
         logs: { view: true, create: true, edit: true, delete: true },
      },
      'ACCOUNTANT': {
         dashboard: { view: true, create: false, edit: false, delete: false },
         products: { view: true, create: false, edit: false, delete: false },
         transactions: { view: true, create: true, edit: false, delete: false },
         debts: { view: true, create: true, edit: true, delete: false },
         partners: { view: true, create: true, edit: true, delete: false },
         users: { view: false, create: false, edit: false, delete: false },
         logs: { view: false, create: false, edit: false, delete: false },
      },
      'CSKH': {
         dashboard: { view: false, create: false, edit: false, delete: false },
         products: { view: true, create: false, edit: false, delete: false },
         transactions: { view: true, create: true, edit: false, delete: false },
         debts: { view: false, create: false, edit: false, delete: false },
         partners: { view: true, create: true, edit: true, delete: false },
         users: { view: false, create: false, edit: false, delete: false },
         logs: { view: false, create: false, edit: false, delete: false },
      },
      'WAREHOUSE': {
         dashboard: { view: false, create: false, edit: false, delete: false },
         products: { view: true, create: true, edit: true, delete: true },
         transactions: { view: true, create: true, edit: true, delete: true },
         debts: { view: false, create: false, edit: false, delete: false },
         partners: { view: true, create: true, edit: true, delete: false },
         users: { view: false, create: false, edit: false, delete: false },
         logs: { view: false, create: false, edit: false, delete: false },
      },
      'PENDING': {
         dashboard: { view: false, create: false, edit: false, delete: false },
         products: { view: false, create: false, edit: false, delete: false },
         transactions: { view: false, create: false, edit: false, delete: false },
         debts: { view: false, create: false, edit: false, delete: false },
         partners: { view: false, create: false, edit: false, delete: false },
         users: { view: false, create: false, edit: false, delete: false },
         logs: { view: false, create: false, edit: false, delete: false },
      }
    };

export type Product = { id: string; barcode?: string; name: string; brand: string; price: number; cost: number; stock: number; minStock?: number; maxStock?: number; weight?: number; sellDirectly?: boolean; bonusPoints?: boolean; description?: string; image: string; createdAt?: any; updatedAt?: any; };
export type TransactionItem = { productId: string; name: string; quantity: number; price: number; cost: number; };
export type Transaction = { id: string; type: 'IMPORT' | 'EXPORT'; date: string; totalValue: number; costValue: number; note: string; partnerId: string; partnerName: string; userId: string; items?: TransactionItem[]; discount?: number; otherFees?: number; amountPaid?: number; createdAt?: any; updatedAt?: any; };
export type Partner = { id: string; type: 'CUSTOMER' | 'SUPPLIER'; name: string; phone: string; totalReceivable: number; totalPayable: number; cccd?: string; mst?: string; address?: string; createdAt?: any; updatedAt?: any; };

interface AppState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  products: Product[];
  transactions: Transaction[];
  partners: Partner[];
  usersList: UserProfile[];
  login: () => Promise<void>;
  updateUserPermissions: (userId: string, permissions: UserPermissions) => Promise<void>;
  hasPermission: (module: string, action: keyof AppPermission) => boolean;
  addTransaction: (tx: any, prodChanges: any[], partnerId: string, isDebt: boolean, debtAmount?: number) => Promise<void>;
  updatePartnerDebt: (partnerId: string, amountToReduce: number, debtType: 'Receivable' | 'Payable') => Promise<void>;
  updateUserRole: (userId: string, newRole: Role) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addPartner: (partner: Partial<Partner>) => Promise<void>;
  updatePartner: (partnerId: string, data: Partial<Partner>) => Promise<void>;
  deletePartner: (partnerId: string) => Promise<void>;
  updateTransaction: (transactionId: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  logActivity: (action: string, module: string, details: string) => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const profileRef = doc(db, 'users', u.uid);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
           // Auto confirm account by skipping 'PENDING' assignment for new accounts
           const adminEmails = ['anhovan.mmo@gmail.com', 'anhovan.cso@gmail.com'];
           const newRole = adminEmails.includes(u.email || '') ? 'ADMIN' : 'CSKH';
           await setDoc(profileRef, {
             email: u.email,
             name: u.displayName || u.email,
             role: newRole,
             permissions: DEFAULT_PERMISSIONS[newRole],
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp()
           });
           setUserProfile({ id: u.uid, email: u.email || '', name: u.displayName || u.email || '', role: newRole });
        } else {
           setUserProfile({ id: profileSnap.id, ...profileSnap.data() } as UserProfile);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !userProfile || userProfile.role === 'PENDING') return;
    
    const getSortTime = (obj: any) => {
      if (obj.createdAt?.toMillis) return obj.createdAt.toMillis();
      if (obj.createdAt?.seconds) return obj.createdAt.seconds * 1000;
      if (typeof obj.createdAt === 'string') return new Date(obj.createdAt).getTime();
      if (typeof obj.createdAt === 'number') return obj.createdAt;
      
      if (obj.updatedAt?.toMillis) return obj.updatedAt.toMillis();
      if (obj.updatedAt?.seconds) return obj.updatedAt.seconds * 1000;
      
      return 0; // Fallback
    };
    
    // Extract max numeric part from ID for secondary sort fallback
    const getNumericId = (id: string) => {
      const match = id.match(/\d+/g);
      if (!match) return 0;
      return parseInt(match[match.length - 1], 10);
    };

    const sortByNewest = (a: any, b: any) => {
      const timeDiff = getSortTime(b) - getSortTime(a);
      if (timeDiff !== 0) return timeDiff;
      // Secondary sort: Reverse natural order of IDs (e.g. CO627 > CO01)
      const numDiff = getNumericId(b.id) - getNumericId(a.id);
      if (numDiff !== 0) return numDiff;
      return b.id.localeCompare(a.id);
    };

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)).sort(sortByNewest));
    });
    const unsubTx = onSnapshot(collection(db, 'transactions'), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)).sort(sortByNewest));
    });
    const unsubPartners = onSnapshot(collection(db, 'partners'), (snap) => {
      setPartners(snap.docs.map(d => ({ id: d.id, ...d.data() } as Partner)).sort(sortByNewest));
    });

    let unsubUsers = () => {};
    if (userProfile?.role === 'ADMIN') {
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
      });
    }

    return () => {
      unsubProducts();
      unsubTx();
      unsubPartners();
      unsubUsers();
    };
  }, [user, userProfile?.role]);

  const login = async () => {
    await signInWithGoogle();
  };

  const logActivity = async (action: string, module: string, details: string) => {
    if (!user) return;
    try {
      const logRef = doc(collection(db, 'activity_logs'));
      await setDoc(logRef, {
        id: logRef.id,
        userId: user.uid,
        userName: userProfile?.name || user.email || 'Unknown',
        action,
        module,
        details,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Lỗi khi ghi log hoạt động:', e);
    }
  };

  const updateUserRole = async (userId: string, newRole: Role) => {
    if (userProfile?.role !== 'ADMIN') throw new Error('Permission denied');
    const uRef = doc(db, 'users', userId);
    const defaultPerms = DEFAULT_PERMISSIONS[newRole] || DEFAULT_PERMISSIONS['PENDING'];
    await setDoc(uRef, { role: newRole, permissions: defaultPerms, updatedAt: serverTimestamp() }, { merge: true });
    logActivity('PHÂN QUYỀN', 'NHÂN VIÊN', `Mã NV: ${userId} -> Quyền: ${newRole}`);
  };

  const updateUserPermissions = async (userId: string, permissions: UserPermissions) => {
    if (userProfile?.role !== 'ADMIN') throw new Error('Permission denied');
    const uRef = doc(db, 'users', userId);
    await setDoc(uRef, { permissions, updatedAt: serverTimestamp() }, { merge: true });
    logActivity('PHÂN QUYỀN', 'NHÂN VIÊN', `Mã NV: ${userId} -> Cập nhật quyền chi tiết`);
  };

  const hasPermission = (module: string, action: keyof AppPermission): boolean => {
    if (!userProfile) return false;
    if (userProfile.role === 'ADMIN') return true;
    
    let checkModule = module;
    if (userProfile.permissions) {
      if (userProfile.permissions[checkModule] !== undefined) {
        return !!userProfile.permissions[checkModule]?.[action];
      }
      
      // Legacy fallback
      if (checkModule === 'imports' || checkModule === 'exports') {
        if (userProfile.permissions['transactions'] !== undefined) {
          return !!userProfile.permissions['transactions']?.[action];
        }
      }
      if (checkModule === 'receivables' || checkModule === 'payables') {
        if (userProfile.permissions['debts'] !== undefined) {
          return !!userProfile.permissions['debts']?.[action];
        }
      }
    }
    
    // Fallback to defaults
    const defaults = DEFAULT_PERMISSIONS[userProfile.role] || DEFAULT_PERMISSIONS['PENDING'];
    if (defaults[checkModule] !== undefined) {
      return !!defaults[checkModule][action];
    }
    
    return false;
  };

  const deleteProduct = async (productId: string) => {
    if (userProfile?.role !== 'ADMIN' && userProfile?.role !== 'ACCOUNTANT') throw new Error('Permission denied');
    try {
      await deleteDoc(doc(db, 'products', productId));
      logActivity('XÓA', 'SẢN PHẨM', `Xóa sản phẩm ID: ${productId}`);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };


  const addTransaction = async (
    txObj: any, 
    productChanges: {id: string, qtyChange: number}[], 
    partnerId: string,
    isDebt: boolean,
    debtAmount?: number
  ) => {
    if (!user) throw new Error("Must be logged in.");
    
    // For now purely to demonstrate it compiles, we use batch
    const batch = writeBatch(db);
    const now = serverTimestamp();
    
    const prefix = txObj.type === 'IMPORT' ? 'NK' : 'XK';
    const existingIds = transactions
      .map(t => t.id)
      .filter(id => id.startsWith(prefix))
      .map(id => parseInt(id.replace(prefix, ''), 10))
      .filter(num => !isNaN(num));
      
    const maxSeq = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const newTxId = `${prefix}${(maxSeq + 1).toString().padStart(4, '0')}`;
    
    const txRef = doc(db, 'transactions', newTxId);
    
    batch.set(txRef, {
      ...txObj,
      id: newTxId,
      userId: user.uid,
      createdAt: now,
      updatedAt: now
    });

    // We do local read from state for simplicity in POC
    for (const pc of productChanges) {
      const pRef = doc(db, 'products', pc.id);
      const existingProduct = products.find(p => p.id === pc.id);
      if (existingProduct) {
        batch.update(pRef, {
          stock: existingProduct.stock + pc.qtyChange,
          updatedAt: now
        });
      }
    }

    const debtAmountToApply = debtAmount !== undefined ? debtAmount : (isDebt ? txObj.totalValue : 0);

    if (debtAmountToApply !== 0 && partnerId) {
      const ptRef = doc(db, 'partners', partnerId);
      const existingPartner = partners.find(p => p.id === partnerId);
      if (existingPartner) {
        const pUpdate: any = { updatedAt: now };
        if (txObj.type === 'EXPORT') {
          pUpdate.totalReceivable = existingPartner.totalReceivable + debtAmountToApply;
        } else {
          pUpdate.totalPayable = existingPartner.totalPayable + debtAmountToApply;
        }
        batch.update(ptRef, pUpdate);
      }
    }

    await batch.commit();
    logActivity('TẠO MỚI', 'GIAO DỊCH', `Tạo phiếu ${txObj.type === 'IMPORT' ? 'Nhập kho' : 'Xuất kho'} trị giá ${txObj.totalValue}`);
  };

  const updatePartnerDebt = async (partnerId: string, amountToReduce: number, debtType: 'Receivable' | 'Payable') => {
    if (!user) throw new Error('Not logged in');
    const partner = partners.find(p => p.id === partnerId);
    if (!partner) throw new Error('Partner not found');
    if (amountToReduce <= 0) return;

    const ptRef = doc(db, 'partners', partnerId);
    const pUpdate: any = { updatedAt: serverTimestamp() };
    
    if (debtType === 'Receivable') {
      pUpdate.totalReceivable = partner.totalReceivable - amountToReduce;
    } else {
      pUpdate.totalPayable = partner.totalPayable - amountToReduce;
    }

    try {
      if ((window as any).handleFirestoreError) {
        // Safe check
      }
    } catch(e) {}
    
    // In order to use setDoc with merge instead of raw operations.
    // Actually we can just do writeBatch or setDoc merge true.
    const batch = writeBatch(db);
    batch.update(ptRef, pUpdate);
    await batch.commit();
    logActivity('CẬP NHẬT', 'CÔNG NỢ', `Thanh toán giảm nợ ${debtType === 'Receivable' ? 'phải thu' : 'phải trả'} số tiền ${amountToReduce}`);
  };

  const addPartner = async (partnerData: Partial<Partner>) => {
    if (!user) throw new Error('Not logged in');
    const ptRef = doc(collection(db, 'partners'));
    await setDoc(ptRef, {
      ...partnerData,
      id: ptRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    logActivity('TẠO MỚI', 'KHÁCH/NCC', `Tên: ${partnerData.name}`);
  };

  const updatePartner = async (partnerId: string, partnerData: Partial<Partner>) => {
    if (!user) throw new Error('Not logged in');
    const ptRef = doc(db, 'partners', partnerId);
    await setDoc(ptRef, { ...partnerData, updatedAt: serverTimestamp() }, { merge: true });
    logActivity('CẬP NHẬT', 'KHÁCH/NCC', `Cập nhật đối tác ID: ${partnerId}`);
  };

  const deletePartner = async (partnerId: string) => {
    if (!user) throw new Error('Not logged in');
    const ptRef = doc(db, 'partners', partnerId);
    await deleteDoc(ptRef);
    logActivity('XÓA', 'KHÁCH/NCC', `Xóa đối tác ID: ${partnerId}`);
  };

  const updateTransaction = async (transactionId: string, data: Partial<Transaction>) => {
    if (!user) throw new Error('Not logged in');
    
    // Authorization check
    let moduleName = 'transactions';
    if (transactionId.startsWith('NK')) moduleName = 'imports';
    if (transactionId.startsWith('XK')) moduleName = 'exports';
    
    if (!hasPermission(moduleName, 'edit')) {
      throw new Error('Permission denied');
    }

    try {
      const tRef = doc(db, 'transactions', transactionId);
      await updateDoc(tRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      logActivity('CẬP NHẬT', 'GIAO DỊCH', `Cập nhật thông tin giao dịch ID: ${transactionId}`);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!user) throw new Error('Not logged in');
    
    // Authorization check
    let moduleName = 'transactions';
    if (transactionId.startsWith('NK')) moduleName = 'imports';
    if (transactionId.startsWith('XK')) moduleName = 'exports';
    
    if (!hasPermission(moduleName, 'delete')) {
      throw new Error('Permission denied');
    }

    const txRef = doc(db, 'transactions', transactionId);
    
    await deleteDoc(txRef);
    logActivity('XÓA', 'GIAO DỊCH', `Xóa giao dịch ID: ${transactionId}`);
  };

  const deleteUser = async (userId: string) => {
    if (!user) throw new Error('Not logged in');
    if (userProfile?.role !== 'ADMIN') throw new Error('Permission denied');
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    logActivity('XÓA', 'NHÂN VIÊN', `Xóa nhân viên ID: ${userId}`);
  };

  return (
    <AppContext.Provider value={{ 
      user, userProfile, loading, products, transactions, partners, usersList, 
      login, addTransaction, updateTransaction, updatePartnerDebt, updateUserRole, updateUserPermissions, hasPermission, deleteProduct,
      addPartner, updatePartner, deletePartner, deleteTransaction, deleteUser,
      logActivity
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
}
