import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { MaintenanceOrder, ChatMessage, OrderStatus, TechnicianProfile } from '../types';

const ORDERS_COLLECTION = 'orders';
const CHATS_COLLECTION = 'chats';
const TECHNICIANS_COLLECTION = 'technicians';

export const DEFAULT_TECHNICIAN_PROFILE: TechnicianProfile = {
  id: 'omar',
  name: 'الفني عمر',
  email: 'omar7018@gmail.com',
  recoveryEmail: 'omar7018@gmail.com',
  password: 'omar_root',
  updatedAt: new Date().toISOString(),
};

/**
 * Subscribe to real-time order updates from Firestore
 */
export function subscribeToOrders(
  onOrdersReceived: (orders: MaintenanceOrder[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, ORDERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const orders: MaintenanceOrder[] = [];
      snapshot.forEach((docSnap) => {
        orders.push(docSnap.data() as MaintenanceOrder);
      });
      // Sort orders by most recent (assuming ID or timestamp if available)
      onOrdersReceived(orders);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, ORDERS_COLLECTION);
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
    }
  );
}

/**
 * Subscribe to real-time chat messages from Firestore
 */
export function subscribeToChats(
  onChatsReceived: (chats: ChatMessage[]) => void,
  onError?: (error: Error) => void
): () => void {
  const colRef = collection(db, CHATS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const chats: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        chats.push(docSnap.data() as ChatMessage);
      });
      onChatsReceived(chats);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, CHATS_COLLECTION);
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
    }
  );
}

/**
 * Save or create a maintenance order
 */
export async function saveOrderToFirestore(order: MaintenanceOrder): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, order.id);
  try {
    await setDoc(docRef, order, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ORDERS_COLLECTION}/${order.id}`);
  }
}

/**
 * Update order status, price, schedule, review or notes
 */
export async function updateOrderStatusInFirestore(
  orderId: string,
  status: OrderStatus,
  extra?: {
    price?: number;
    scheduledTime?: string;
    technicianNotes?: string;
    cancellationReason?: string;
  }
): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  try {
    const updateData: Record<string, unknown> = { status };
    if (extra?.price !== undefined) updateData.price = extra.price;
    if (extra?.scheduledTime !== undefined) updateData.scheduledTime = extra.scheduledTime;
    if (extra?.technicianNotes !== undefined) updateData.technicianNotes = extra.technicianNotes;
    if (extra?.cancellationReason !== undefined) updateData.cancellationReason = extra.cancellationReason;

    await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COLLECTION}/${orderId}`);
  }
}

/**
 * Update order review in Firestore
 */
export async function submitOrderReviewInFirestore(
  orderId: string,
  rating: number,
  comment: string
): Promise<void> {
  const docRef = doc(db, ORDERS_COLLECTION, orderId);
  try {
    await updateDoc(docRef, {
      review: {
        rating,
        comment,
        createdAt: 'اليوم ' + new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      },
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ORDERS_COLLECTION}/${orderId}`);
  }
}

/**
 * Send and store a chat message in Firestore
 */
export async function sendChatMessageToFirestore(message: ChatMessage): Promise<void> {
  const docRef = doc(db, CHATS_COLLECTION, message.id);
  try {
    await setDoc(docRef, message);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CHATS_COLLECTION}/${message.id}`);
  }
}

/**
 * Subscribe to Technician Profile in Firestore
 */
export function subscribeToTechnicianProfile(
  onProfileReceived: (profile: TechnicianProfile) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, TECHNICIANS_COLLECTION, 'omar');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as TechnicianProfile;
        onProfileReceived(data);
      } else {
        // Initialize default technician profile with omar7018@gmail.com
        setDoc(docRef, DEFAULT_TECHNICIAN_PROFILE).then(() => {
          onProfileReceived(DEFAULT_TECHNICIAN_PROFILE);
        }).catch((err) => {
          console.warn('Could not auto-seed technician:', err);
        });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${TECHNICIANS_COLLECTION}/omar`);
      if (onError) onError(error instanceof Error ? error : new Error(String(error)));
    }
  );
}

/**
 * Update Technician Profile in Firestore (e.g. password recovery/reset or update email)
 */
export async function updateTechnicianProfileInFirestore(
  updates: Partial<TechnicianProfile>
): Promise<void> {
  const docRef = doc(db, TECHNICIANS_COLLECTION, 'omar');
  try {
    await setDoc(
      docRef,
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${TECHNICIANS_COLLECTION}/omar`);
    throw error;
  }
}

/**
 * Initialize Firestore with sample data if the collections are completely empty
 */
export async function seedInitialFirestoreData(
  initialOrders: MaintenanceOrder[],
  initialChats: ChatMessage[]
): Promise<void> {
  try {
    const ordersSnap = await getDocs(collection(db, ORDERS_COLLECTION));
    if (ordersSnap.empty) {
      for (const ord of initialOrders) {
        await setDoc(doc(db, ORDERS_COLLECTION, ord.id), ord);
      }
    }

    const chatsSnap = await getDocs(collection(db, CHATS_COLLECTION));
    if (chatsSnap.empty) {
      for (const chat of initialChats) {
        await setDoc(doc(db, CHATS_COLLECTION, chat.id), chat);
      }
    }

    // Seed technician profile if not exists
    const techDoc = await getDoc(doc(db, TECHNICIANS_COLLECTION, 'omar'));
    if (!techDoc.exists()) {
      await setDoc(doc(db, TECHNICIANS_COLLECTION, 'omar'), DEFAULT_TECHNICIAN_PROFILE);
    }
  } catch (error) {
    console.warn('Initial data seeding error or offline:', error);
  }
}
