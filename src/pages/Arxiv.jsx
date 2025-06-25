import React, { useState, useEffect } from 'react';
import { Clock, User, MapPin, ShoppingCart, CheckCircle, Archive, Utensils, Truck, Info, Home, LogOut, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Arxiv.css';

function OrderDisplay() {
  const [orders, setOrders] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showOrderItems, setShowOrderItems] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/kitchen') return 'home';
    if (path === '/archive') return 'archive';
    return 'home';
  };



  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('https://alikafecrm.uz/order');
        const data = await response.json();
        setOrders(data);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
      }
    };
    fetchOrders();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Йанги':
      case 'Тайёрланмоқда':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Якунланган':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Архивланган':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Тайёр':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Йанги':
        return <ShoppingCart className="w-4 h-4" />;
      case 'Тайёрланмоқда':
        return <Utensils className="w-4 h-4" />;
      case 'Якунланган':
        return <CheckCircle className="w-4 h-4" />;
      case 'Архивланган':
        return <Archive className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING':
        return 'Йанги';
      case 'COOKING':
        return 'Тайёрланмоқда';
      case 'COMPLETED':
        return 'Якунланган';
      case 'ARCHIVE':
        return 'Архивланган';
      case 'READY':
        return 'Тайёр';
      default:
        return status || 'Unknown';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'CASHIER':
        return 'Официант';
      case 'CUSTOMER':
        return 'Админ';
      default:
        return role || 'Номаълум';
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' сўм';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleOrderItems = (orderId) => {
    setShowOrderItems((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleMenuItemClick = (action) => {
    closeMenu();
    switch (action) {
      case 'home':
        navigate('/kitchen');
        break;
      case 'archive':
        navigate('/archive');
        break;
      case 'logout':
        navigate('/logout');
        break;
      default:
        break;
    }
  };

  const currentPage = getCurrentPage();

  // Table or Carrier Number display logic
  const getTableOrCarrierDisplay = (order) => {
    if (order.table && order.table.number) {
      return (
        <>
          <span className="table-icon">{order.table.name}</span>
          {order.table.number}
        </>
      );
    } else if (order.carrierNumber) {
      return (
        <>
          <span className="table-icon"><Truck size={16} /></span>
          Доставка: {order.carrierNumber}
        </>
      );
    } else {
      return (
        <>
          <span className="table-icon"><Info size={16} /></span>
          Маълумот йўқ
        </>
      );
    }
  };

  return (
    <div style={{ background: '#242424' }} className="min-h-screen bg-gray-50 p-6">
      <div className={`hamburger-menu ${isMenuOpen ? 'open' : ''}`}>
        <button className="hamburger-btn" onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div className={`sidebar-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-overlay" onClick={closeMenu}></div>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h3>Меню</h3>
            <button className="close-btn" onClick={closeMenu}><X size={24} /></button>
          </div>
          <div className="sidebar-items">
            <button className={`sidebar-item ${currentPage === 'home' ? 'active' : ''}`} onClick={() => handleMenuItemClick('home')}>
              <span className="sidebar-icon"><Home size={20} /></span> Бош саҳифа
            </button>
            <button className={`sidebar-item ${currentPage === 'archive' ? 'active' : ''}`} onClick={() => handleMenuItemClick('archive')}>
              <span className="sidebar-icon"><Archive size={20} /></span> Архив
            </button>
            <button className="sidebar-item logout" onClick={() => handleMenuItemClick('logout')}>
              <span className="sidebar-icon"><LogOut color='red' size={20} /></span> Чиқиш
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 style={{ color: 'white' }} className="text-3xl font-bold mb-2">Буюртмалар бошқаруви</h1>
          <p style={{ color: 'white' }} className="text-gray-600">Ресторан буюртмалари рўйхати</p>
        </div>

        <div className="grid gap-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 style={{ marginBottom: '0', fontSize: '15px' }} className="text-xl font-semibold text-gray-900">
                        Буюртма #{order.id}
                      </h4>
                      <h3 className="table-number">
                        {getTableOrCarrierDisplay(order)}
                      </h3>
                      <p className="text-gray-500 text-sm">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full border flex items-center space-x-2 ${getStatusColor(getStatusText(order.status))}`}>
                    {getStatusIcon(getStatusText(order.status))}
                    <span className="font-medium">{getStatusText(order.status)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                  <div className="buyurtmachi">
                    <p className="kimligi">{getRoleText(order.user?.role)}:</p>
                    <p className="ismi">{order.user?.name || 'Номаълум'}</p>
                  </div>
                  <button
                    className={`text-white px-4 py-2 rounded-lg transition-all ${showOrderItems[order.id] ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                    onClick={() => toggleOrderItems(order.id)}
                  >
                    {showOrderItems[order.id] ? 'Буюртмаларни яшириш' : 'Буюртмаларни кўриш'}
                  </button>
                </div>

                {showOrderItems[order.id] && order.orderItems?.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Буюртма таркиби:</h4>
                    <div className="grid gap-3">
                      {order.orderItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div>
                              <p className="font-medium text-gray-900">{item.product?.name || '—'}</p>
                              <p className="text-sm text-gray-600">
                                Миқдори: {item.count} x {formatPrice(parseInt(item.product?.price || 0))}
                                {(item.product) && (
                                  <span style={{ color: '#28a745', marginLeft: '10px' }}>(Ичимлик)</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatPrice(parseInt(item.product?.price || 0) * item.count)}
                            </p>
                            <div className={`px-2 py-1 rounded text-xs ${getStatusColor(getStatusText(item.status))}`}>
                              {getStatusText(item.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OrderDisplay;