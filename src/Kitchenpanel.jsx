import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from './socket';
import { 
  ChefHat, 
  Home, 
  Archive, 
  LogOut, 
  Utensils, 
  Clock, 
  Play, 
  CheckCircle, 
  Car, 
  HelpCircle,
  RefreshCw,
  User,
} from 'lucide-react';
import './KitchenPanel.css';
import notificationSound from './assets/synthesize.mp3';

function KitchenPanel() {
  const [orders, setOrders] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const [selectedUsername, setSelectedUsername] = useState('');
  const [kitchenUsers, setKitchenUsers] = useState([]);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const audio = new Audio(notificationSound);

  const SessionExpiredModal = ({ isOpen, onConfirm }) => {
    if (!isOpen) return null;

    return (
      <div
        className="modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
        }}
      >
        <div
          className="modal-content"
          style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏰</div>
          <h2
            style={{
              color: '#333',
              marginBottom: '15px',
              fontSize: '24px',
              fontWeight: 'bold',
            }}
          >
            Иш вақти тугади.
          </h2>
          <p
            style={{
              color: '#666',
              marginBottom: '25px',
              fontSize: '16px',
              lineHeight: '1.5',
            }}
          >
            Иш вақтиз тугади, энди иш бошланса кирасиз.
          </p>
          <button
            onClick={onConfirm}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              minWidth: '100px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#0056b3')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#007bff')}
          >
            OK
          </button>
        </div>
      </div>
    );
  };

  const getOrderType = (order) => {
    if (order.table && order.table.number) {
      return {
        type: 'dine_in',
        display: `${order.table.name} ${order.table.number}`,
        icon: Utensils
      };
    } else if (order.carrierNumber) {
      return {
        type: 'delivery',
        display: order.carrierNumber,
        icon: Car
      };
    } else {
      return {
        type: 'unknown',
        display: 'Номаълум',
        icon: HelpCircle
      };
    }
  };

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/kitchen') return 'home';
    if (path === '/archive') return 'archive';
    return 'home';
  };

  const fetchOrders = async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) {
        setIsLoading(true);
      }
      const res = await axios.get('https://alikafecrm.uz/order/kitchen');
      console.log('📦 Буюртмалар юкланди:', res.data);
      // Ensure only valid orders are set (e.g., with required fields)
      const validOrders = res.data.filter(order => order.id && order.orderItems);
      setOrders(validOrders);
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('❌ Буюртмаларни олишда хатолик:', error.message);
      // Keep existing orders if fetch fails to prevent UI from breaking
      setOrders((prevOrders) => prevOrders);
      // Optionally, you could add a state to show an error message to the user
    } finally {
      if (isInitialFetch) {
        setIsLoading(false);
      }
    }
  };

  const fetchKitchenUsers = async () => {
    try {
      const res = await axios.get('https://alikafecrm.uz/user');
      const kitchenUsers = res.data
        .filter(user => user.role === 'KITCHEN')
        .map(user => user.username)
        .sort();
      console.log('👨‍🍳 Ошпазлар юкланди:', kitchenUsers);
      setKitchenUsers(kitchenUsers);
      
      const storedUser = localStorage.getItem('user');
      if (storedUser && kitchenUsers.includes(storedUser)) {
        setSelectedUsername(storedUser);
        console.log('🔄 Default username set to:', storedUser);
      }
    } catch (error) {
      console.error('❌ Ошпазларни олишда хатолик:', error.message);
      setKitchenUsers([]); // Set empty array on failure to avoid breaking UI
    }
  };

  const checkSessionStatus = async () => {
    try {
      const response = await axios.get('https://alikafecrm.uz/auth-check/1', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setShowSessionExpiredModal(!response.data.status);
      return response.data.status;
    } catch (error) {
      console.error('Session check error:', error);
      setShowSessionExpiredModal(true);
      return false;
    }
  };

  const handleSessionExpiredConfirm = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('user');
    localStorage.removeItem('password');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const autoRefresh = async () => {
    // Check session status before refreshing
    const isSessionValid = await checkSessionStatus();
    if (!isSessionValid) {
      console.log('🔴 Session expired, stopping auto-refresh');
      return;
    }

    if (!socket.connected) {
      console.log('🔄 Автоматик янгилаш: WebSocket узилган, маълумотлар янгиланмоқда...');
      await fetchOrders(false); // Pass false to prevent loader
    } else {
      console.log('🔄 Автоматик янгилаш: WebSocket фаол, фақат вақт янгиланмоқда');
      setLastUpdateTime(new Date());
    }
  };

  useEffect(() => {
    fetchOrders(true); // Initial fetch with loader
    fetchKitchenUsers();
    checkSessionStatus();

    // Set auto-refresh to check session every 3 seconds
    const autoRefreshInterval = setInterval(autoRefresh, 3000);

    const handleConnect = () => {
      console.log('🟢 Ошхона Панели: WebSocket уланди');
      setIsConnected(true);
      setLastUpdateTime(new Date());
    };

    const handleDisconnect = () => {
      console.log('🔴 Ошхона Панели: WebSocket узилди');
      setIsConnected(false);
    };

    const handleOrderCreated = (newOrder) => {
      console.log('🆕 ЯНГИ буюртма келди:', newOrder);
      setLastUpdateTime(new Date());
    
      audio.play().catch((error) => {
        console.error('❌ Audio playback error:', error.message);
      });
    
      setOrders((prevOrders) => {
        const existingOrder = prevOrders.find((order) => order.id === newOrder.id);
        if (existingOrder) {
          console.log('⚠️ Буюртма аллақачон мавжуд, қайта қўшилмайди');
          return prevOrders;
        }
    
        // Append new order to the end of the list
        const updatedOrders = [...prevOrders, newOrder];
        console.log('✅ Янги буюртма қўшилди, жами:', updatedOrders.length);
        return updatedOrders;
      });
    };
    
    const handleOrderUpdated = (updatedOrder) => {
      console.log('🔄 Буюртма янгиланди:', updatedOrder);
      setLastUpdateTime(new Date());
    
      if (!updatedOrder.orderItems) {
        console.log(`⚠️ Тўлиқ маълумот келмади, ID: ${updatedOrder.id}`);
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
          )
        );
        return;
      }
    
      setOrders((prevOrders) => {
        const orderExists = prevOrders.some((order) => order.id === updatedOrder.id);
    
        if (!orderExists) {
          console.log('🆕 Янгиланган буюртма мавжуд эмас, қўшилмоқда:', updatedOrder.id);
          // Append updated order to the end if it doesn't exist
          return [...prevOrders, updatedOrder];
        }
    
        return prevOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        );
      });
    };


    const handleOrderDeleted = ({ id }) => {
      console.log(`🗑️ Буюртма ўчирилди:`, id);
      setLastUpdateTime(new Date());
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id));
    };

    const handleOrderItemStatusUpdated = (updatedItem) => {
      console.log('📝 Итем статус янгиланди:', updatedItem);
      setLastUpdateTime(new Date());
      
      if (updatedItem.status === 'PENDING') {
        audio.play().catch((error) => {
          console.error('❌ Audio playback error:', error.message);
        });
      }

      if (!updatedItem.product || !updatedItem.product.name) {
        console.log(`⚠️ Продукт маълумоти йўқ`);
        return;
      }

      setOrders((prevOrders) =>
        prevOrders.map((order) => ({
          ...order,
          orderItems: order.orderItems.map((item) =>
            item.id === updatedItem.id ? { ...item, ...updatedItem } : item
          ),
        }))
      );
      
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(updatedItem.id);
        return newSet;
      });
    };

    const handleOrderItemDeleted = ({ id }) => {
      console.log(`🗑️ Итем ўчирилди:`, id);
      setLastUpdateTime(new Date());
      
      setOrders((prevOrders) =>
        prevOrders.map((order) => ({
          ...order,
          orderItems: order.orderItems.filter((item) => item.id !== id),
        }))
      );
    };

    const handleOrderItemAdded = (newItem) => {
      console.log('➕ Янги махсулот қўшилди:', newItem);
      setLastUpdateTime(new Date());
      
      audio.play().catch((error) => {
        console.error('❌ Audio playback error:', error.message);
      });

      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order.id === newItem.orderId) {
            const itemExists = order.orderItems.some(item => item.id === newItem.id);
            if (!itemExists) {
              return {
                ...order,
                orderItems: [...order.orderItems, newItem]
              };
            }
          }
          return order;
        })
      );
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('orderCreated', handleOrderCreated);
    socket.on('orderUpdated', handleOrderUpdated);
    socket.on('orderDeleted', handleOrderDeleted);
    socket.on('orderItemStatusUpdated', handleOrderItemStatusUpdated);
    socket.on('orderItemDeleted', handleOrderItemDeleted);
    socket.on('orderItemAdded', handleOrderItemAdded);

    socket.on('reconnect', () => {
      console.log('🔄 WebSocket qayta ulandi, ma\'lumotlar yangilanmoqda...');
      fetchOrders(false); // Pass false to prevent loader on reconnect
    });

    const pollInterval = setInterval(() => {
      if (!socket.connected) {
        console.log('🔄 WebSocket узилган, polling ишлатилмоқда...');
        fetchOrders(false); // Pass false to prevent loader during polling
      }
    }, 60000);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('orderCreated', handleOrderCreated);
      socket.off('orderUpdated', handleOrderUpdated);
      socket.off('orderDeleted', handleOrderDeleted);
      socket.off('orderItemStatusUpdated', handleOrderItemStatusUpdated);
      socket.off('orderItemDeleted', handleOrderItemDeleted);
      socket.off('orderItemAdded', handleOrderItemAdded);
      socket.off('reconnect');
      clearInterval(pollInterval);
      clearInterval(autoRefreshInterval);
    };
  }, []);

  const updateOrderItemStatus = async (itemId, status) => {
    try {
      console.log(`🔄 Итем ${itemId} Status ${status}га ўзгартирилмоқда...`);
      setUpdatingItems((prev) => new Set(prev).add(itemId));
      socket.emit('update_order_item_status', { itemId, status });
    } catch (error) {
      console.error('❌ Статус янгилaшда хатолик:', error.message);
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} дақиқа олдин`;
    }
    return date.toLocaleTimeString('uz-Cyrl-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const visibleOrders = orders.filter(
    (order) =>
      ['PENDING', 'COOKING'].includes(order.status) &&
      order.orderItems.some(
        (item) =>
          ['PENDING', 'COOKING'].includes(item.status) &&
          item.product &&
          (!selectedUsername || 
           (item.product.assignedTo && item.product.assignedTo.username === selectedUsername))
      )
  );

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

  const getUserDisplay = (user) => {
    if (!user) {
      return { roleText: 'Номаълум', displayName: 'Номаълум' };
    }

    switch (user.role) {
      case 'CASHIER':
        return {
          roleText: 'Официант',
          displayName: user.name || 'Номаълум'
        };
      case 'CUSTOMER':
        return {
          roleText: 'Админ',
          displayName: 'Админ'
        };
      default:
        return {
          roleText: user.role || 'Номаълум',
          displayName: user.name || 'Номаълум'
        };
    }
  };

  return (
    <div className="kitchen-panel">

      <header className="kitchen-header">
        <div style={{display:'flex',gap:'35px',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}>
        <button 
              className={`sidebar-item ${currentPage === 'home' ? 'active' : ''} ${isConnected ? 'connected' : 'disconnected'}`}
              onClick={() => handleMenuItemClick('home')}
            >
              <Home size={20} className="sidebar-icon" />
              Бош саҳифа
            </button>
            <button 
              className={`sidebar-item ${currentPage === 'archive' ? 'active' : ''} ${isConnected ? 'connected' : 'disconnected'}`}
              onClick={() => handleMenuItemClick('archive')}
            >
              <Archive size={20} className="sidebar-icon" />
              Архив
            </button>
          <div className="header-right">
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <div className="user-info">
                <span className="user-role">
                  <ChefHat size={16} />
                </span>
                <span className="user-name">{localStorage.getItem('user') || 'Номаълум'}</span>
              </div>
            </div>
            <select 
              value={selectedUsername} 
              onChange={(e) => setSelectedUsername(e.target.value)}
              className="filter-select"
            >
              <option value="">Барча ошпазлар</option>
              {kitchenUsers.map((username) => (
                <option key={username} value={username}>
                  {username}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="main-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">🍽️</div>
            <h3>Ҳозир фаол буюртма йўқ</h3>
            <p>Янги буюртмалар келганда бу ерда кўринади</p>
          </div>
        ) : (
          <div className="orders-grid">
            {visibleOrders.map((order) => {
              const orderInfo = getOrderType(order);
              const { roleText, displayName } = getUserDisplay(order.user);
              
              return (
                <div className="order-card" key={order.id}>
                  <div className="order-header">
                    <div className="order-single-line">
                      <orderInfo.icon size={16} />
                      <span>
                        {orderInfo.type === 'dine_in' ? `${order.table.name} ${order.table.number}` : 
                         orderInfo.type === 'delivery' ? `Доставка ${order.carrierNumber}` : 'Номаълум'}
                      </span>
                      <span> </span>
                      <span> </span>
                      <Clock size={14} />
                      <span>{formatTime(order.createdAt)}</span>
                      <span> </span>
                      <span> </span>
                      <span> </span>
                      <span> </span>
                      <span> </span>
                      <span> </span>
                      <span> </span>
                      {order.status === 'PENDING' ? <Clock size={14} /> : <ChefHat size={14} />}
                      <span>{order.status === 'PENDING' ? 'Кутилмоқда' : 'Пиширилмоқда'}</span>
                      <span><User size={14} />{roleText}: {displayName}</span>
                    </div>
                  </div>

                  <div className="order-items">
                    {order.orderItems
                      .filter(
                        (item) =>
                          ['PENDING', 'COOKING'].includes(item.status) &&
                          item.product &&
                          item.product.name &&
                          (!selectedUsername || 
                           (item.product.assignedTo && item.product.assignedTo.username === selectedUsername))
                      )
                      .map((item) => (
                        <div key={item.id} className="order-item">
                          <div className="item-details">
                            <div className="item-header">
                              <span className="item-count"><b>{item.count} дона</b></span>
                              <span className="item-name">
                                {item.product.name || 'Маҳсулот номи юкланмоқда...'}
                              </span>
                            </div>
                            <div className={`item-status status-${item.status.toLowerCase()}`}>
                              {item.status === 'PENDING' ? (
                                <>
                                  <Clock size={14} />
                                  Кутилмоқда
                                </>
                              ) : (
                                <>
                                  <ChefHat size={14} />
                                  Пиширилмоқда
                                </>
                              )}
                            </div>
                          </div>

                          <div className="item-actions">
                            {item.status === 'PENDING' && (
                              <button
                                className="action-btn start-btn"
                                onClick={() => updateOrderItemStatus(item.id, 'COOKING')}
                                disabled={updatingItems.has(item.id)}
                              >
                                {updatingItems.has(item.id) ? (
                                  <>
                                    <RefreshCw size={16} className="btn-spinner spin" />
                                    Бошланяпти...
                                  </>
                                ) : (
                                  <>
                                    <Play size={16} className="btn-icon" />
                                    Пиширишни бошлаш
                                  </>
                                )}
                              </button>
                            )}
                            {item.status === 'COOKING' && (
                              <button
                                className="action-btn done-btn"
                                onClick={() => updateOrderItemStatus(item.id, 'READY')}
                                disabled={updatingItems.has(item.id)}
                              >
                                {updatingItems.has(item.id) ? (
                                  <>
                                    <RefreshCw size={16} className="btn-spinner spin" />
                                    Тугалланмоқда...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle size={16} className="btn-icon" />
                                    Тайёр деб белгиллаш
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {showSessionExpiredModal && (
          <SessionExpiredModal
            isOpen={showSessionExpiredModal}
            onConfirm={handleSessionExpiredConfirm}
          />
        )}
      </div>
    </div>
  );
}

export default KitchenPanel;