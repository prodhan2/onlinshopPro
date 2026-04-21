import { useState } from 'react';
import { 
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiChevronRight,
  FiRefreshCw, FiImage
} from 'react-icons/fi';

/**
 * Flutter-like ListView component for catalog items.
 * Displays minimal details with click to view full details.
 */
export default function CatalogListView({
  items = [],
  title,
  itemCount,
  searchValue,
  onSearchChange,
  onAddClick,
  onItemClick,
  renderItem,
  loading = false,
  emptyMessage = 'No items found',
  searchPlaceholder = 'Search...',
  onRefresh,
  className = '',
}) {
  return (
    <div className={`catalog-listview ${className}`}>
      {/* Header */}
      <div className="catalog-listview-header">
        <div className="catalog-listview-title-section">
          {title && <h2 className="catalog-listview-title">{title}</h2>}
          {itemCount !== undefined && (
            <span className="catalog-listview-count">({itemCount})</span>
          )}
        </div>
        <button
          type="button"
          className="catalog-listview-add-btn"
          onClick={onAddClick}
          title="Add new item"
        >
          <FiPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="catalog-listview-search-bar">
        <FiSearch className="catalog-listview-search-icon" />
        <input
          type="text"
          value={searchValue || ''}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="catalog-listview-search-input"
        />
        {onRefresh && (
          <button
            type="button"
            className="catalog-listview-refresh-btn"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh list"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* List Container */}
      <div className="catalog-listview-container">
        {loading ? (
          <div className="catalog-listview-loading">
            <div className="catalog-listview-spinner" />
            <p>Loading...</p>
          </div>
        ) : items.length > 0 ? (
          <div className="catalog-listview-list">
            {items.map((item) => (
              <div
                key={item._docId || item.id}
                className="catalog-listview-item"
                onClick={() => onItemClick?.(item)}
              >
                {renderItem && renderItem(item)}
                <FiChevronRight className="catalog-listview-item-chevron" />
              </div>
            ))}
          </div>
        ) : (
          <div className="catalog-listview-empty">
            <FiImage className="catalog-listview-empty-icon" />
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * List item component for catalog items.
 * Displays thumbnail, title, subtitle, and status badge.
 */
export function CatalogListItem({
  thumbnail,
  title,
  subtitle,
  status,
  statusColor = 'bg-gray-100 text-gray-700',
  meta,
  actions,
  onClick,
}) {
  return (
    <div className="catalog-list-item-wrapper" onClick={onClick}>
      {/* Thumbnail */}
      {thumbnail && (
        <div className="catalog-list-item-thumbnail">
          {typeof thumbnail === 'string' ? (
            <img src={thumbnail} alt={title} />
          ) : (
            thumbnail
          )}
        </div>
      )}

      {/* Content */}
      <div className="catalog-list-item-content">
        <div className="catalog-list-item-header">
          <div className="catalog-list-item-texts">
            {title && <h4 className="catalog-list-item-title">{title}</h4>}
            {subtitle && <p className="catalog-list-item-subtitle">{subtitle}</p>}
          </div>
          {status && (
            <span className={`catalog-list-item-status ${statusColor}`}>
              {status}
            </span>
          )}
        </div>

        {/* Meta info */}
        {meta && meta.length > 0 && (
          <div className="catalog-list-item-meta">
            {meta.map((m, idx) => (
              <span key={idx} className="catalog-list-item-meta-item">
                {m.icon && <span className="catalog-list-item-meta-icon">{m.icon}</span>}
                <span className="catalog-list-item-meta-text">{m.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="catalog-list-item-actions" onClick={(e) => e.stopPropagation()}>
          {actions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              className={`catalog-list-item-action-btn ${action.danger ? 'danger' : ''}`}
              onClick={action.onClick}
              title={action.label}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Detail modal for viewing/editing catalog items.
 * Shows all details in a modal when clicking a list item.
 */
export function CatalogDetailModal({
  isOpen,
  title,
  item,
  onClose,
  onEdit,
  onDelete,
  children,
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="catalog-modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="catalog-modal">
        {/* Header */}
        <div className="catalog-modal-header">
          <h2 className="catalog-modal-title">{title}</h2>
          <button
            type="button"
            className="catalog-modal-close-btn"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="catalog-modal-content">
          {children}
        </div>

        {/* Footer Actions */}
        <div className="catalog-modal-footer">
          <button
            type="button"
            className="catalog-modal-btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
          {onEdit && (
            <button
              type="button"
              className="catalog-modal-btn btn-primary"
              onClick={onEdit}
              title="Edit item"
            >
              <FiEdit2 className="w-4 h-4" />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="catalog-modal-btn btn-danger"
              onClick={onDelete}
              title="Delete item"
            >
              <FiTrash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  );
}
