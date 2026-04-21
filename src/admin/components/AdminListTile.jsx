import { FiChevronRight, FiUser, FiMail, FiPhone, FiMapPin, FiPackage, FiShoppingBag, FiClock, FiCheckCircle, FiXCircle, FiTruck, FiDollarSign, FiAward, FiShield, FiCalendar, FiCreditCard, FiStar } from 'react-icons/fi';

const ROLE_COLORS = {
  admin: 'bg-rose-500',
  subadmin: 'bg-purple-500',
  seller: 'bg-emerald-500',
  user: 'bg-blue-500',
  pending: 'bg-amber-500',
  processing: 'bg-blue-500',
  confirmed: 'bg-emerald-500',
  delivered: 'bg-teal-500',
  cancelled: 'bg-red-500',
};

const ROLE_TEXT_COLORS = {
  admin: 'text-rose-600',
  subadmin: 'text-purple-600',
  seller: 'text-emerald-600',
  user: 'text-blue-600',
  pending: 'text-amber-600',
  processing: 'text-blue-600',
  confirmed: 'text-emerald-600',
  delivered: 'text-teal-600',
  cancelled: 'text-red-600',
};

export default function AdminListTile({
  title,
  subtitle,
  leading,
  trailing,
  onClick,
  children,
  className = '',
  variant = 'default',
  showChevron = true,
  badge,
  badgeColor,
  avatar,
  avatarColor = 'bg-indigo-500',
  status,
  statusLabel,
  extraInfo,
  metaInfo,
  actions,
  selected = false,
  disabled = false,
}) {
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderLeading = () => {
    if (leading) return leading;
    if (avatar) {
      return avatar.startsWith('http') ? (
        <img src={avatar} alt={title} className="w-12 h-12 rounded-xl object-cover" /> 
      ) : (
        <div className={`w-12 h-12 ${avatarColor} rounded-xl flex items-center justify-center text-white font-semibold`}>
          {getInitials(avatar)}
        </div>
      );
    }
    return (
      <div className={`w-12 h-12 ${avatarColor || 'bg-gray-200'} rounded-xl flex items-center justify-center text-white font-semibold`}>
        <FiUser className="w-5 h-5" />
      </div>
    );
  };

  const renderTrailing = () => {
    if (trailing) return trailing;
    if (badge) {
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor || 'bg-gray-100 text-gray-600'}`}>
          {badge}
        </span>
      );
    }
    if (status) {
      const colorClass = ROLE_COLORS[status] || 'bg-gray-500';
      const textColorClass = ROLE_TEXT_COLORS[status] || 'text-gray-600';
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colorClass} text-white capitalize`}>
          {statusLabel || status}
        </span>
      );
    }
    if (showChevron) {
      return <FiChevronRight className="w-5 h-5 text-gray-400" />;
    }
    return null;
  };

  const baseClasses = `
    flex items-center gap-4 p-4 
    bg-white rounded-2xl 
    border border-gray-100 
    shadow-sm hover:shadow-md 
    transition-all duration-200 
    cursor-pointer
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${selected ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}
    ${className}
  `;

  const content = (
    <>
      <div className="flex-shrink-0">
        {renderLeading()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
          {status && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${ROLE_COLORS[status] || 'bg-gray-500'} text-white`}>
              {statusLabel || status}
            </span>
          )}
        </div>
        
        {subtitle && (
          <p className="text-sm text-gray-500 truncate mb-1">{subtitle}</p>
        )}
        
        {extraInfo && (
          <div className="flex flex-wrap gap-3 mt-2">
            {extraInfo.map((info, idx) => (
              <span key={idx} className="flex items-center gap-1 text-xs text-gray-500">
                {info.icon}
                {info.label}
              </span>
            ))}
          </div>
        )}
        
        {metaInfo && (
          <div className="flex flex-wrap gap-2 mt-2">
            {metaInfo.map((meta, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg text-xs text-gray-600">
                {meta.icon}
                {meta.label}
              </span>
            ))}
          </div>
        )}
        
        {children}
      </div>
      
      <div className="flex-shrink-0 flex items-center gap-2">
        {actions}
        {renderTrailing()}
      </div>
    </>
  );

  if (onClick && !disabled) {
    return (
      <div 
        className={baseClasses}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
      >
        {content}
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {content}
    </div>
  );
}

export function AdminListTileUser({ user, onClick, onViewDetails }) {
  const extraInfo = [];
  if (user.email) extraInfo.push({ icon: <FiMail className="w-3 h-3" />, label: user.email });
  if (user.phone) extraInfo.push({ icon: <FiPhone className="w-3 h-3" />, label: user.phone });
  if (user.village || user.upazilla || user.zilla) {
    const location = [user.village, user.upazilla, user.zilla].filter(Boolean).join(', ');
    extraInfo.push({ icon: <FiMapPin className="w-3 h-3" />, label: location });
  }

  return (
    <AdminListTile
      title={user.fullName || 'No Name'}
      subtitle={`UID: ${user.uid?.substring(0, 12)}...`}
      avatar={user.photoURL || user.fullName}
      avatarColor={
        user.role === 'admin' ? 'bg-rose-500' :
        user.role === 'subadmin' ? 'bg-purple-500' :
        user.role === 'seller' ? 'bg-emerald-500' : 'bg-blue-500'
      }
      status={user.role}
      statusLabel={user.role?.toUpperCase()}
      extraInfo={extraInfo}
      onClick={onClick}
    />
  );
}

export function AdminListTileOrder({ order, onClick, onViewDetails }) {
  const formatPrice = (price) => `৳${Number(price || 0).toFixed(0)}`;
  
  const metaInfo = [
    { icon: <FiPhone className="w-3 h-3" />, label: order.userPhone || '—' },
    { icon: <FiCreditCard className="w-3 h-3" />, label: order.paymentMethod || '—' },
    { icon: <FiPackage className="w-3 h-3" />, label: `${order.items?.length || 0} items` },
  ];

  const getStatusIcon = () => {
    switch (order.status) {
      case 'pending': return <FiClock className="w-3 h-3" />;
      case 'processing': return <FiTruck className="w-3 h-3" />;
      case 'confirmed': 
      case 'delivered': return <FiCheckCircle className="w-3 h-3" />;
      case 'cancelled': return <FiXCircle className="w-3 h-3" />;
      default: return <FiClock className="w-3 h-3" />;
    }
  };

  return (
    <AdminListTile
      title={`Order #${order.docId?.slice(-8).toUpperCase()}`}
      subtitle={order.userName || 'Unknown Customer'}
      leading={
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          order.status === 'pending' ? 'bg-amber-100' :
          order.status === 'processing' ? 'bg-blue-100' :
          order.status === 'confirmed' || order.status === 'delivered' ? 'bg-emerald-100' :
          order.status === 'cancelled' ? 'bg-red-100' : 'bg-gray-100'
        }`}>
          <FiShoppingBag className={`w-5 h-5 ${
            order.status === 'pending' ? 'text-amber-600' :
            order.status === 'processing' ? 'text-blue-600' :
            order.status === 'confirmed' || order.status === 'delivered' ? 'text-emerald-600' :
            order.status === 'cancelled' ? 'text-red-600' : 'text-gray-600'
          }`} />
        </div>
      }
      status={order.status}
      statusLabel={order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
      metaInfo={metaInfo}
      trailing={
        <div className="text-right">
          <div className="font-bold text-gray-900">{formatPrice(order.totalPrice)}</div>
        </div>
      }
      onClick={onClick}
    />
  );
}

export function AdminListTileSeller({ seller, rank, onClick }) {
  const metaInfo = [
    { icon: <FiPackage className="w-3 h-3" />, label: `${seller.productCount || 0} Products` },
    { icon: <FiShoppingBag className="w-3 h-3" />, label: `${seller.orderCount || 0} Orders` },
    { icon: <FiDollarSign className="w-3 h-3" />, label: `৳${(seller.confirmedRevenue || 0).toLocaleString()}` },
  ];

  return (
    <AdminListTile
      title={seller.fullName || 'No Name'}
      subtitle={seller.email || 'No email'}
      avatar={seller.photoURL || seller.fullName}
      avatarColor="bg-emerald-500"
      trailing={
        <div className="flex items-center gap-2">
          {rank && (
            <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
              #{rank}
            </span>
          )}
          <FiChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      }
      metaInfo={metaInfo}
      onClick={onClick}
    />
  );
}

export function AdminListTileAdmin({ admin, index, onClick }) {
  const extraInfo = [];
  if (admin.email) extraInfo.push({ icon: <FiMail className="w-3 h-3" />, label: admin.email });
  if (admin.phone) extraInfo.push({ icon: <FiPhone className="w-3 h-3" />, label: admin.phone });

  const Icon = admin.role === 'admin' ? FiShield : FiAward;

  return (
    <AdminListTile
      title={admin.fullName || 'No Name'}
      subtitle={`UID: ${admin.uid?.substring(0, 12)}...`}
      avatar={admin.photoURL || admin.fullName}
      avatarColor={admin.role === 'admin' ? 'bg-rose-500' : 'bg-purple-500'}
      status={admin.role}
      statusLabel={admin.role?.toUpperCase()}
      extraInfo={extraInfo}
      trailing={
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">#{index + 1}</span>
          <FiChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      }
      onClick={onClick}
    />
  );
}

export function AdminListTileRole({ user, onChangeRole, isCurrentUser, busyId }) {
  const ROLE_OPTIONS = ['user', 'seller', 'subadmin', 'admin'];
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          user.role === 'admin' ? 'bg-rose-500' :
          user.role === 'subadmin' ? 'bg-purple-500' :
          user.role === 'seller' ? 'bg-emerald-500' : 'bg-blue-500'
        } text-white font-semibold`}>
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.fullName} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            user.fullName?.[0]?.toUpperCase() || '?'
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{user.fullName || 'No Name'}</h3>
          <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          user.role === 'admin' ? 'bg-rose-100 text-rose-700' :
          user.role === 'subadmin' ? 'bg-purple-100 text-purple-700' :
          user.role === 'seller' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {user.role}
        </span>
      </div>
      
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Change Role:</p>
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role}
              onClick={() => !isCurrentUser && !busyId && onChangeRole(user, role)}
              disabled={isCurrentUser || busyId === user.docId}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                user.role === role
                  ? `${ROLE_COLORS[role]} text-white`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
        {isCurrentUser && (
          <p className="text-xs text-amber-600 mt-2">You cannot change your own role</p>
        )}
      </div>
    </div>
  );
}
