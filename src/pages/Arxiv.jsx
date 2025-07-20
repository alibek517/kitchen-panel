import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Clock, User, MapPin, ShoppingCart, CheckCircle, Archive, Utensils, Truck, Info, Home, LogOut, X, UtensilsCrossed } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Arxiv.css';

function OrderDisplay() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showOrderItems, setShowOrderItems] = useState({});
  const [kitchenStaff, setKitchenStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/kitchen') return 'home';
    if (path === '/archive') return 'archive';
    if (path === '/maxsulotlar') return 'maxsulotlar';
    return 'home';
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('https://alikafecrm.uz/order');
        const data = await response.json();
        setOrders(data);

        // Extract unique kitchen staff
        const staffSet = new Set();
        data.forEach((order) => {
          order.orderItems.forEach((item) => {
            if (item.product?.assignedTo) {
              staffSet.add(JSON.stringify(item.product.assignedTo));
            }
          });
        });
        const staffList = Array.from(staffSet).map((staff) => JSON.parse(staff));
        setKitchenStaff(staffList);

        // Set default selectedStaff to logged-in user's ID
        const loggedInUser = localStorage.getItem('userId'); // Assuming user ID is stored
        if (loggedInUser && staffList.some((staff) => staff.id.toString() === loggedInUser)) {
          setSelectedStaff(loggedInUser);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
        setFilteredOrders([]);
        setKitchenStaff([]);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    // Filter orders by selected date and staff
    let updatedOrders = orders;
    if (selectedDate) {
      updatedOrders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate === selectedDate;
      });
    }

    if (selectedStaff) {
      updatedOrders = updatedOrders
        .map((order) => ({
          ...order,
          orderItems: order.orderItems.filter(
            (item) => item.product?.assignedTo?.id === parseInt(selectedStaff)
          ),
        }))
        .filter((order) => order.orderItems.length > 0);
    }

    // Sort orders: READY orders go first
    updatedOrders.sort((a, b) => {
      const aHasReady = a.orderItems.some((item) => item.status === 'READY');
      const bHasReady = b.orderItems.some((item) => item.status === 'READY');
      if (bHasReady && !aHasReady) return 1; // READY orders first
      if (!bHasReady && aHasReady) return -1;
      return 0;
    });

    setFilteredOrders(updatedOrders);
  }, [selectedStaff, orders, selectedDate]);

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
      case 'maxsulotlar':
        navigate('/maxsulotlar');
        break;
      case 'logout':
        navigate('/logout');
        break;
      default:
        break;
    }
  };

  const currentPage = getCurrentPage();

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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="table-icon"><Truck size={16} /></span>
              Доставка:
            </div>
            <div>{order.carrierNumber}</div>
          </div>
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl backk mx-auto">
        <header className="kitchen-header">
          <div style={{ display: 'flex', gap: '35px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className={`sidebar-item ${currentPage === 'home' ? 'active' : ''}`}
              onClick={() => handleMenuItemClick('home')}
            >
              <Home size={20} className="sidebar-icon" />
              Бош саҳифа
            </button>
            <button
              className={`sidebar-item ${currentPage === 'archive' ? 'active' : ''}`}
              onClick={() => handleMenuItemClick('archive')}
            >
              <Archive size={20} className="sidebar-icon" />
              Архив
            </button>
            <button
              className={`sidebar-item ${currentPage === 'maxsulotlar' ? 'active' : ''}`}
              onClick={() => handleMenuItemClick('maxsulotlar')}
            >
            <UtensilsCrossed size={20} className="sidebar-icon" />
              Таомлар
            </button>
            <div className="header-right">
              <div className="connection-status">
                <div className="user-info">
                  <span className="user-role">
                    <User size={16} />
                  </span>
                  <span className="user-name">{localStorage.getItem('user') || 'Номаълум'}</span>
                </div>
              </div>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                classNameazarazar="filter-select p-2 border border-gray-300 rounded-lg text-base"
              >
                <option value="">Барча ошпазлар</option>
                {kitchenStaff.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Date Picker */}
        <div className="my-4 flex items-center">
         
          <input
            type="date"
            id="dateFilter"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg text-base w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{margin:'30px'}}
          />
        </div>

        <div className="grid gap-6">
          {filteredOrders.length === 0 ? (
            <p className="text-gray-500 text-center">Ушбу сана учун буюртмалар топилмади.</p>
          ) : (
            filteredOrders.map((order) => (
              <div style={{ width: '100%' }} key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex' }} className="flex flex-wrap items-center justify-between mb-6">
                      <div className="flex items-center space-x-4" style={{ marginLeft: '0' }}>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '15px' }}>
                          <h4 style={{ marginBottom: '0', fontSize: '15px' }} className="text-xl font-semibold text-gray-900">
                            Буюртма #{order.id}
                          </h4>
                          <div>
                            <h3 className="table-number">
                              {getTableOrCarrierDisplay(order)}
                            </h3>
                            <p className="text-gray-500 text-sm">{formatDate(order.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex' }} className="flex items-center space-x-4 mb-4">
                        <div className="buyurtmachi">
                          <p className="kimligi">{getRoleText(order.user?.role)}:</p>
                          <p className="ismi">{order.user?.name || 'Номаълум'}</p>
                        </div>
                        <button
                          className={`text-white px-4 py-2 rounded-lg transition-all ${
                            showOrderItems[order.id] ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                          }`}
                          onClick={() => toggleOrderItems(order.id)}
                        >
                          {showOrderItems[order.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
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
                                  {item.product?.categoryId === 10 && (
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDisplay;