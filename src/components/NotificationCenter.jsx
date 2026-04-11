import React, { useState, useEffect } from 'react';
import { getNotifications, deleteNotification, markNotificationAsRead, clearAllNotifications } from '../utils/notificationUtils.js';
import '../styles.css';

const NotificationCenter = ({ userId, isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications();
    }
  }, [isOpen, userId]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const notifs = await getNotifications(userId, 50);
      setNotifications(notifs);

      const unread = notifs.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notifId) => {
    if (userId) {
      await markNotificationAsRead(userId, notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    }
  };

  const handleDeleteNotification = async (notifId) => {
    if (userId) {
      await deleteNotification(userId, notifId);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    }
  };

  const handleClearAll = async () => {
    if (userId && window.confirm('Clear all notifications?')) {
      await clearAllNotifications(userId);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="notification-overlay" onClick={onClose} />

      {/* Notification Panel */}
      <div className="notification-panel">
        <div className="notification-header">
          <h3>Notifications</h3>
          <div className="notification-controls">
            {unreadCount > 0 && <span className="badge bg-danger">{unreadCount}</span>}
            <button className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
        </div>

        <div className="notification-content">
          {loading ? (
            <div className="notification-loading">
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span>Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <div className="empty-icon">🔔</div>
              <p>No notifications yet</p>
              <small>You'll see updates here when something important happens</small>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                  style={{ borderLeftColor: notif.color || '#667eea' }}
                >
                  <div className="notification-icon">{notif.icon}</div>

                  <div className="notification-body">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-message">{notif.message}</div>
                    {notif.createdAt && (
                      <div className="notification-time">
                        {formatTimeAgo(notif.createdAt)}
                      </div>
                    )}
                  </div>

                  <div className="notification-actions">
                    {!notif.read && (
                      <button
                        className="btn-action"
                        onClick={() => handleMarkAsRead(notif.id)}
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="btn-action btn-action-delete"
                      onClick={() => handleDeleteNotification(notif.id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="notification-footer">
            <button className="btn btn-sm btn-outline-secondary w-100" onClick={handleClearAll}>
              Clear All
            </button>
          </div>
        )}
      </div>

      <style>{`
        .notification-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 999;
          animation: fadeIn 0.2s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .notification-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 380px;
          height: 100vh;
          background: white;
          box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .notification-header {
          padding: 20px;
          border-bottom: 1px solid #e9ecef;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notification-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .notification-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .notification-controls .badge {
          font-size: 0.75rem;
          padding: 0.35em 0.65em;
        }

        .btn-close {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.5rem;
          line-height: 1;
          color: #999;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-close:hover {
          color: #333;
        }

        .notification-content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 20px;
        }

        .notification-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          gap: 10px;
          color: #667eea;
        }

        .notification-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #999;
          text-align: center;
          padding: 20px;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 10px;
        }

        .notification-empty p {
          margin: 0;
          font-weight: 500;
        }

        .notification-empty small {
          color: #bbb;
        }

        .notification-list {
          padding: 10px 0;
        }

        .notification-item {
          padding: 15px 20px;
          border-left: 4px solid #667eea;
          display: flex;
          gap: 15px;
          align-items: flex-start;
          background: white;
          transition: all 0.2s;
          cursor: pointer;
        }

        .notification-item:hover {
          background: #f8f9fa;
        }

        .notification-item.unread {
          background: #f0f4ff;
          font-weight: 500;
        }

        .notification-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 50%;
        }

        .notification-body {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-weight: 600;
          margin-bottom: 4px;
          color: #172033;
        }

        .notification-message {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 6px;
          word-wrap: break-word;
        }

        .notification-time {
          font-size: 0.8rem;
          color: #999;
        }

        .notification-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-action {
          background: none;
          border: none;
          cursor: pointer;
          color: #667eea;
          font-size: 1rem;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .btn-action:hover {
          background: rgba(102, 126, 234, 0.1);
        }

        .btn-action-delete {
          color: #dc3545;
        }

        .btn-action-delete:hover {
          background: rgba(220, 53, 69, 0.1);
        }

        .notification-footer {
          padding: 15px 20px;
          border-top: 1px solid #e9ecef;
          flex-shrink: 0;
        }

        @media (max-width: 576px) {
          .notification-panel {
            width: 100%;
            max-width: 100%;
          }
        }
      `}</style>
    </>
  );
};

function formatTimeAgo(date) {
  if (typeof date === 'object' && date.toDate) {
    date = date.toDate();
  } else if (typeof date === 'number') {
    date = new Date(date);
  } else if (!(date instanceof Date)) {
    return 'Just now';
  }

  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

export default NotificationCenter;
