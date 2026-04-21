import { useEffect, useRef } from 'react';
import { FiX, FiMail, FiPhone, FiMapPin, FiUser, FiShield, FiAward, FiPackage, FiShoppingBag, FiDollarSign, FiClock, FiTruck, FiCheckCircle, FiXCircle, FiCalendar, FiCreditCard, FiStar, FiTrendingUp } from 'react-icons/fi';

const STATUS_CONFIG = {
  pending: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', icon: FiClock },
  processing: { label: 'Processing', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', icon: FiTruck },
  confirmed: { label: 'Confirmed', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: FiCheckCircle },
  delivered: { label: 'Delivered', bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500', icon: FiCheckCircle },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', icon: FiXCircle },
};

const ROLE_CONFIG = {
  admin: { label: 'Admin', bg: 'bg-rose-100', text: 'text-rose-700', icon: FiShield },
  subadmin: { label: 'Subadmin', bg: 'bg-purple-100', text: 'text-purple-700', icon: FiShield },
  seller: { label: 'Seller', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: FiAward },
  user: { label: 'User', bg: 'bg-blue-100', text: 'text-blue-700', icon: FiUser },
};

export default function AdminDetailModal({
  isOpen,
  onClose,
  title,
  subtitle,
  avatar,
  avatarColor = 'bg-indigo-500',
  status,
  statusConfig,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderAvatar = () => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) {
      return <img src={avatar} alt={title} className="w-20 h-20 rounded-2xl object-cover" />;
    }
    return (
      <div className={`w-20 h-20 ${avatarColor} rounded-2xl flex items-center justify-center text-white text-2xl font-bold`}>
        {getInitials(avatar)}
      </div>
    );
  };

  const renderStatus = () => {
    if (!status) return null;
    
    const config = statusConfig || STATUS_CONFIG[status] || ROLE_CONFIG[status] || {
      label: status,
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      icon: FiUser,
    };
    const Icon = config.icon || FiUser;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      
      <div 
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-3xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col`}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors z-10"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}

        {(title || avatar) && (
          <div className="flex items-center gap-4 p-6 border-b border-gray-100">
            {renderAvatar()}
            <div className="flex-1 min-w-0">
              {title && <h2 className="text-xl font-bold text-gray-900 truncate">{title}</h2>}
              {subtitle && <p className="text-sm text-gray-500 truncate mt-1">{subtitle}</p>}
            </div>
            {renderStatus()}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {footer && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminDetailSection({ title, children, className = '' }) {
  return (
    <div className={`mb-6 ${className}`}>
      {title && (
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export function AdminDetailRow({ label, value, icon: Icon, valueClassName = '' }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-medium text-gray-900 ${valueClassName}`}>{value || '—'}</p>
      </div>
    </div>
  );
}

export function AdminDetailGrid({ children, columns = 2 }) {
  const gridClass = columns === 2 ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1 gap-4';
  
  if (columns === 2) {
    return <div className="grid grid-cols-2 gap-6">{children}</div>;
  }
  
  return <div className="space-y-4">{children}</div>;
}

export function AdminDetailCard({ children, className = '' }) {
  return (
    <div className={`bg-gray-50 rounded-2xl p-4 ${className}`}>
      {children}
    </div>
  );
}

export function UserDetailModal({ isOpen, onClose, user }) {
  if (!user) return null;

  return (
    <AdminDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={user.fullName || 'No Name'}
      subtitle={`UID: ${user.uid}`}
      avatar={user.photoURL || user.fullName}
      avatarColor={
        user.role === 'admin' ? 'bg-rose-500' :
        user.role === 'subadmin' ? 'bg-purple-500' :
        user.role === 'seller' ? 'bg-emerald-500' : 'bg-blue-500'
      }
      status={user.role}
      statusConfig={ROLE_CONFIG[user.role]}
      size="md"
    >
      <AdminDetailGrid>
        <AdminDetailSection title="Contact Information">
          <AdminDetailCard>
            <AdminDetailRow label="Email" value={user.email} icon={FiMail} />
            <AdminDetailRow label="Phone" value={user.phone} icon={FiPhone} />
          </AdminDetailCard>
        </AdminDetailSection>

        <AdminDetailSection title="Location">
          <AdminDetailCard>
            <AdminDetailRow 
              label="Address" 
              value={[user.village, user.upazilla, user.zilla].filter(Boolean).join(', ') || 'Not set'} 
              icon={FiMapPin} 
            />
          </AdminDetailCard>
        </AdminDetailSection>

        <AdminDetailSection title="Additional Info">
          <AdminDetailCard>
            <AdminDetailRow label="Blood Group" value={user.bloodGroup || 'Not set'} icon={FiUser} />
          </AdminDetailCard>
        </AdminDetailSection>

        <AdminDetailSection title="Account">
          <AdminDetailCard>
            <AdminDetailRow label="Role" value={user.role?.toUpperCase()} icon={FiShield} />
          </AdminDetailCard>
        </AdminDetailSection>
      </AdminDetailGrid>
    </AdminDetailModal>
  );
}

export function OrderDetailModal({ isOpen, onClose, order, onUpdateStatus, busyId }) {
  if (!order) return null;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    let ms = 0;
    if (typeof timestamp?.toMillis === 'function') ms = timestamp.toMillis();
    else if (typeof timestamp === 'string') ms = new Date(timestamp).getTime();
    if (!ms || !Number.isFinite(ms)) return 'N/A';
    return new Intl.DateTimeFormat('en-BD', { 
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    }).format(new Date(ms));
  };

  const formatPrice = (price) => `৳${Number(price || 0).toFixed(2)}`;

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  const renderStatusActions = () => {
    if (order.status === 'pending') {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onUpdateStatus(order, 'processing')}
            disabled={busyId === order.docId}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <FiTruck className="w-4 h-4" /> Process
          </button>
          <button
            onClick={() => onUpdateStatus(order, 'confirmed')}
            disabled={busyId === order.docId}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <FiCheckCircle className="w-4 h-4" /> Confirm
          </button>
          <button
            onClick={() => onUpdateStatus(order, 'cancelled')}
            disabled={busyId === order.docId}
            className="px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <FiXCircle className="w-4 h-4" /> Cancel
          </button>
        </div>
      );
    }
    if (order.status === 'processing') {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onUpdateStatus(order, 'confirmed')}
            disabled={busyId === order.docId}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <FiCheckCircle className="w-4 h-4" /> Confirm
          </button>
          <button
            onClick={() => onUpdateStatus(order, 'cancelled')}
            disabled={busyId === order.docId}
            className="px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <FiXCircle className="w-4 h-4" /> Cancel
          </button>
        </div>
      );
    }
    if (order.status === 'confirmed') {
      return (
        <button
          onClick={() => onUpdateStatus(order, 'delivered')}
          disabled={busyId === order.docId}
          className="px-4 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <FiCheckCircle className="w-4 h-4" /> Mark as Delivered
        </button>
      );
    }
    return null;
  };

  return (
    <AdminDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Order #${order.docId?.slice(-8).toUpperCase()}`}
      subtitle={`Placed on ${formatDate(order.createdAt)}`}
      status={order.status}
      statusConfig={statusConfig}
      size="lg"
      footer={
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-lg font-bold text-gray-900">
            Total: {formatPrice(order.totalPrice)}
          </div>
          {renderStatusActions()}
        </div>
      }
    >
      <div className="space-y-6">
        <AdminDetailSection title="Customer Information">
          <AdminDetailCard>
            <AdminDetailRow label="Name" value={order.userName} icon={FiUser} />
            <AdminDetailRow label="Phone" value={order.userPhone} icon={FiPhone} />
            <AdminDetailRow label="Email" value={order.userEmail} icon={FiMail} />
          </AdminDetailCard>
        </AdminDetailSection>

        <AdminDetailSection title="Payment & Shipping">
          <AdminDetailCard>
            <AdminDetailRow label="Payment Method" value={order.paymentMethod} icon={FiCreditCard} />
            <AdminDetailRow label="Status Message" value={order.statusMessage || 'No message'} />
            <AdminDetailRow 
              label="Shipping Address" 
              value={`${order.shipping?.street || ''}, ${order.shipping?.area || ''}`.replace(/^, |, $/g, '') || 'Not specified'} 
              icon={FiMapPin} 
            />
          </AdminDetailCard>
        </AdminDetailSection>

        <AdminDetailSection title={`Items (${order.items?.length || 0})`}>
          <div className="space-y-2">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <FiPackage className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.name || 'Unnamed Product'}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity || 1}</p>
                  </div>
                </div>
                <span className="font-semibold text-gray-900">{formatPrice(item.price * (item.quantity || 1))}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatPrice(order.totalPrice - (order.shippingCharge || 0))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Shipping</span>
              <span className="font-medium">{formatPrice(order.shippingCharge || 0)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(order.totalPrice)}</span>
            </div>
          </div>
        </AdminDetailSection>
      </div>
    </AdminDetailModal>
  );
}

export function SellerDetailModal({ isOpen, onClose, seller, rank }) {
  if (!seller) return null;

  const formatPrice = (price) => `৳${Number(price || 0).toLocaleString()}`;

  return (
    <AdminDetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={seller.fullName || 'No Name'}
      subtitle={seller.email || 'No email'}
      avatar={seller.photoURL || seller.fullName}
      avatarColor="bg-emerald-500"
      status="seller"
      statusConfig={ROLE_CONFIG.seller}
      size="md"
    >
      <AdminDetailGrid>
        <AdminDetailSection title="Performance">
          <AdminDetailCard>
            <AdminDetailRow label="Rank" value={`#${rank}`} icon={FiStar} />
            <AdminDetailRow label="Products" value={seller.productCount || 0} icon={FiPackage} />
            <AdminDetailRow label="Total Orders" value={seller.orderCount || 0} icon={FiShoppingBag} />
          </AdminDetailCard>
        </AdminDetailSection>

        <AdminDetailSection title="Revenue">
          <AdminDetailCard>
            <AdminDetailRow label="Confirmed Revenue" value={formatPrice(seller.confirmedRevenue)} icon={FiDollarSign} />
            <AdminDetailRow label="Total Sales" value={formatPrice(seller.totalRevenue)} icon={FiTrendingUp} />
          </AdminDetailCard>
        </AdminDetailSection>

        <AdminDetailSection title="Contact">
          <AdminDetailCard>
            <AdminDetailRow label="Phone" value={seller.phone} icon={FiPhone} />
            <AdminDetailRow label="Email" value={seller.email} icon={FiMail} />
          </AdminDetailCard>
        </AdminDetailSection>

        <AdminDetailSection title="Account Info">
          <AdminDetailCard>
            <AdminDetailRow label="UID" value={seller.uid?.substring(0, 20) + '...'} />
            <AdminDetailRow label="Role" value={seller.role?.toUpperCase()} icon={FiShield} />
          </AdminDetailCard>
        </AdminDetailSection>
      </AdminDetailGrid>
    </AdminDetailModal>
  );
}
