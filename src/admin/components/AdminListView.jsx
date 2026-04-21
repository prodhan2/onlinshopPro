import { useState } from 'react';
import { FiSearch, FiFilter, FiRefreshCw, FiGrid, FiList, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function AdminListView({
  children,
  title,
  subtitle,
  loading = false,
  emptyIcon: EmptyIcon,
  emptyMessage = 'No data found',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterOptions,
  selectedFilter,
  onFilterChange,
  onRefresh,
  refreshLabel = 'Refresh',
  viewMode = 'list',
  onViewModeChange,
  actions,
  stats,
  statsLoading = false,
  className = '',
}) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className={`admin-list-view ${className}`}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            {title && (
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onViewModeChange && (
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => onViewModeChange('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FiList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FiGrid className="w-4 h-4" />
                </button>
              </div>
            )}
            {actions}
          </div>
        </div>
      )}

      {stats && (
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-6`}>
          {stats.map((stat, idx) => (
            <div 
              key={idx}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bgColor || 'bg-indigo-100'} ${stat.color || 'text-indigo-600'}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchValue || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
            
            {filterOptions && filterOptions.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={selectedFilter || 'all'}
                  onChange={(e) => onFilterChange?.(e.target.value)}
                  className="px-4 py-3 bg-gray-50 border-0 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  {filterOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{refreshLabel}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)', minHeight: '300px' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : children ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4 p-4' : 'divide-y divide-gray-100'}>
              {children}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {EmptyIcon && (
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <EmptyIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <p className="text-gray-500 font-medium">{emptyMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminListPagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between p-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
        >
          <FiChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
        >
          <FiChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
