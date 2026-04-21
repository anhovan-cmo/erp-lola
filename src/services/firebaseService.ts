import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase/config';
import { handleFirestoreError } from '../lib/firebase/errors';
import { INITIAL_PRODUCTS, INITIAL_PARTNERS, INITIAL_TRANSACTIONS } from '../data/mockData';

export async function processTransaction(
  txObj: any, 
  productChanges: { id: string, newStock: number }[],
  partnerChanges: { id: string, receivableChange?: number, payableChange?: number, newReceivable?: number, newPayable?: number }[]
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in.");

  const batch = writeBatch(db);
  const now = serverTimestamp();

  try {
    const txRef = doc(collection(db, 'transactions'));
    const txId = txRef.id;
    batch.set(txRef, {
      ...txObj,
      id: txId,
      userId: user.uid,
      createdAt: now,
      updatedAt: now
    });

    for (const pc of productChanges) {
      const pRef = doc(db, 'products', pc.id);
      batch.update(pRef, {
        stock: pc.newStock,
        updatedAt: now
      });
    }

    for (const pt of partnerChanges) {
      const ptRef = doc(db, 'partners', pt.id);
      const updateData: any = { updatedAt: now };
      if (pt.receivableChange !== undefined) {
        updateData.totalReceivable = pt.newReceivable;
      }
      if (pt.payableChange !== undefined) {
        updateData.totalPayable = pt.newPayable;
      }
      batch.update(ptRef, updateData);
    }

    await batch.commit();

  } catch (error) {
    handleFirestoreError(error, 'write', 'batch', user);
  }
}

export async function seedDatabase(products: any[], partners: any[], transactions: any[]) {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to seed.");

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    // 1. Seed Partners
    for (const p of INITIAL_PARTNERS) {
      const pRef = doc(db, 'partners', p.id);
      const existing = partners.find(x => x.id === p.id);
      if (existing) {
        batch.update(pRef, { ...p, updatedAt: now });
      } else {
        batch.set(pRef, { ...p, createdAt: now, updatedAt: now });
      }
    }

    // 2. Seed Products (max 500 per batch usually, we have around 100 so it's fine)
    for (const prod of INITIAL_PRODUCTS) {
      const prodRef = doc(db, 'products', prod.id);
      const existing = products.find(x => x.id === prod.id);
      if (existing) {
        const { id, createdAt, ...rest } = prod as any;
        batch.update(prodRef, { ...rest, updatedAt: now });
      } else {
        batch.set(prodRef, { ...prod, createdAt: now, updatedAt: now });
      }
    }

    // 3. Seed Transactions
    for (const tx of INITIAL_TRANSACTIONS) {
      const txRef = doc(db, 'transactions', tx.id);
      const existing = transactions.find(x => x.id === tx.id);
      if (!existing) {
        batch.set(txRef, {
          ...tx,
          userId: user.uid,
          createdAt: now,
          updatedAt: now
        });
      }
    }

    await batch.commit();
    alert('Đồng bộ dữ liệu thành công!');
  } catch (error) {
    console.error('Lỗi khi đồng bộ dữ liệu:', error);
    alert('Lỗi khi đồng bộ. Xem console để biết thêm chi tiết.');
  }
}
