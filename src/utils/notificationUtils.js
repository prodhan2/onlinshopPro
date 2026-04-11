import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy } from 'firebase/firestore';

/**
 * Add a notification to Firestore
 */
export async function addNotification(userId, notificationData) {
  try {
    const notificationsRef = collection(db, 'notifications', userId, 'userNotifications');
    const docRef = await addDoc(notificationsRef, {
      ...notificationData,
      createdAt: new Date(),
      read: false,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding notification:', error);
    return null;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(userId, notificationId) {
  try {
    const notifRef = doc(
      db,
      'notifications',
      userId,
      'userNotifications',
      notificationId
    );
    await updateDoc(notifRef, { read: true });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(userId, notificationId) {
  try {
    const notifRef = doc(
      db,
      'notifications',
      userId,
      'userNotifications',
      notificationId
    );
    await deleteDoc(notifRef);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

/**
 * Get user's notifications
 */
export async function getNotifications(userId, limit = 20) {
  try {
    const notificationsRef = collection(db, 'notifications', userId, 'userNotifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const notifications = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    return notifications.slice(0, limit);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId) {
  try {
    const notificationsRef = collection(db, 'notifications', userId, 'userNotifications');
    const q = query(notificationsRef, where('read', '==', false));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

/**
 * Notification types and templates
 */
export const NOTIFICATION_TYPES = {
  ORDER_STATUS: 'order_status',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  WISHLIST_ALERT: 'wishlist_alert',
  PRICE_DROP: 'price_drop',
  BACK_IN_STOCK: 'back_in_stock',
  SELLER_MESSAGE: 'seller_message',
  SYSTEM_ALERT: 'system_alert',
};

export const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.ORDER_STATUS]: {
    icon: '📦',
    color: '#667eea',
    title: 'Order Status Updated',
    getMessage: (data) => `Order ${data.orderId?.slice(0, 8)} - ${data.status}`,
  },
  [NOTIFICATION_TYPES.ORDER_CONFIRMED]: {
    icon: '✅',
    color: '#28a745',
    title: 'Order Confirmed',
    getMessage: (data) => `Your order has been confirmed by the seller`,
  },
  [NOTIFICATION_TYPES.ORDER_SHIPPED]: {
    icon: '🚚',
    color: '#17a2b8',
    title: 'Order Shipped',
    getMessage: (data) => `Your order is on its way!`,
  },
  [NOTIFICATION_TYPES.ORDER_DELIVERED]: {
    icon: '🎉',
    color: '#28a745',
    title: 'Order Delivered',
    getMessage: (data) => `Your order has been delivered`,
  },
  [NOTIFICATION_TYPES.ORDER_CANCELLED]: {
    icon: '❌',
    color: '#dc3545',
    title: 'Order Cancelled',
    getMessage: (data) => `Your order has been cancelled`,
  },
  [NOTIFICATION_TYPES.WISHLIST_ALERT]: {
    icon: '❤️',
    color: '#ff006b',
    title: 'Wishlist Alert',
    getMessage: (data) => `${data.productName} is now on sale!`,
  },
  [NOTIFICATION_TYPES.PRICE_DROP]: {
    icon: '💰',
    color: '#ffc107',
    title: 'Price Drop',
    getMessage: (data) => `${data.productName} price dropped to ৳${data.newPrice}`,
  },
  [NOTIFICATION_TYPES.BACK_IN_STOCK]: {
    icon: '📱',
    color: '#28a745',
    title: 'Back in Stock',
    getMessage: (data) => `${data.productName} is back in stock!`,
  },
  [NOTIFICATION_TYPES.SELLER_MESSAGE]: {
    icon: '💬',
    color: '#667eea',
    title: 'Seller Message',
    getMessage: (data) => data.message || 'You have a message from the seller',
  },
  [NOTIFICATION_TYPES.SYSTEM_ALERT]: {
    icon: '⚠️',
    color: '#ffc107',
    title: 'System Alert',
    getMessage: (data) => data.message || 'System notification',
  },
};

/**
 * Create notification data object
 */
export function createNotification(type, data = {}) {
  const template = NOTIFICATION_TEMPLATES[type] || NOTIFICATION_TEMPLATES[NOTIFICATION_TYPES.SYSTEM_ALERT];
  return {
    type,
    icon: template.icon,
    color: template.color,
    title: template.title,
    message: template.getMessage(data),
    data,
    timestamp: new Date(),
  };
}

/**
 * Send order status update notification
 */
export async function notifyOrderStatusUpdate(userId, orderId, newStatus) {
  const statusMessages = {
    processing: 'Your order is being processed',
    confirmed: 'Your order has been confirmed',
    shipped: 'Your order has been shipped',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled',
  };

  const notifType = {
    processing: NOTIFICATION_TYPES.ORDER_STATUS,
    confirmed: NOTIFICATION_TYPES.ORDER_CONFIRMED,
    shipped: NOTIFICATION_TYPES.ORDER_SHIPPED,
    delivered: NOTIFICATION_TYPES.ORDER_DELIVERED,
    cancelled: NOTIFICATION_TYPES.ORDER_CANCELLED,
  }[newStatus] || NOTIFICATION_TYPES.ORDER_STATUS;

  const notification = createNotification(notifType, {
    orderId,
    status: statusMessages[newStatus],
  });

  return addNotification(userId, notification);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(userId) {
  try {
    const notifications = await getNotifications(userId, 1000);
    for (const notif of notifications) {
      await deleteNotification(userId, notif.id);
    }
    return true;
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return false;
  }
}
