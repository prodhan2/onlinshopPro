import { useState } from 'react';

/**
 * Reusable confirmation dialog component
 * Shows a beautiful popup asking for confirmation before delete/remove actions
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info'
  logo, // Optional logo image URL
  onConfirm,
  onCancel,
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  async function handleConfirm() {
    setIsProcessing(true);
    try {
      await onConfirm?.();
    } finally {
      setIsProcessing(false);
    }
  }

  function handleCancel() {
    onCancel?.();
  }

  const typeColors = {
    danger: { bg: '#ef4444', hover: '#dc2626', light: '#fef2f2' },
    warning: { bg: '#f59e0b', hover: '#d97706', light: '#fffbeb' },
    info: { bg: '#3b82f6', hover: '#2563eb', light: '#eff6ff' },
  };

  const colors = typeColors[type] || typeColors.danger;

  return (
    <div className="confirm-dialog-overlay" onClick={handleCancel}>
      <div className="confirm-dialog-box" onClick={e => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          {logo && (
            <div className="confirm-dialog-logo">
              <img src={logo} alt="Logo" />
            </div>
          )}
          <div className="confirm-dialog-icon" style={{ background: colors.light }}>
            {type === 'danger' ? '🗑️' : type === 'warning' ? '⚠️' : 'ℹ️'}
          </div>
          <h3 className="confirm-dialog-title">{title}</h3>
          <button className="confirm-dialog-close" onClick={handleCancel}>×</button>
        </div>
        
        <div className="confirm-dialog-body">
          <p className="confirm-dialog-message">{message}</p>
          
          <div className="confirm-dialog-actions">
            <button
              className="confirm-dialog-btn confirm-dialog-cancel"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              {cancelText}
            </button>
            <button
              className="confirm-dialog-btn confirm-dialog-confirm"
              onClick={handleConfirm}
              disabled={isProcessing}
              style={{ 
                background: colors.bg,
              }}
              onMouseOver={e => e.currentTarget.style.background = colors.hover}
              onMouseOut={e => e.currentTarget.style.background = colors.bg}
            >
              {isProcessing ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
