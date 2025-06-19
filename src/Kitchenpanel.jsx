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
  Phone, 
  Coffee,
  RefreshCw,
  Users,
  User,
  HelpCircle
} from 'lucide-react';
import './KitchenPanel.css';

function KitchenPanel() {
  const [orders, setOrders] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Ичимлик категориясини аниқлаш
  const isDrinkCategory = (product) => {
    if (!product) return false;
    return (
      product.categoryId === 10 ||
      product.category?.name === 'Ичимлик' ||
      product.category?.id === 10
    );
  };

  // Буюртма турини аниқлаш (ресторанда ёки доставка)
  const getOrderType = (order) => {
    if (order.table && order.table.number) {
      return {
        type: 'dine_in',
        display: `Стол ${order.table.number}`,
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

  // Ҳозирги саҳифани аниқлаш
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/kitchen') return 'home';
    if (path === '/archive') return 'archive';
    return 'home';
  };

  // Ичимлик итемларини автомат READY қилиш
  const autoUpdateDrinkItems = async (orders) => {
    const drinkItems = [];
    
    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        if (isDrinkCategory(item.product) && item.status === 'PENDING') {
          drinkItems.push(item);
        }
      });
    });

    if (drinkItems.length === 0) return;

    console.log(`🥤 ${drinkItems.length} та ичимлик автомат ишлов берилмоқда...`);

    for (const item of drinkItems) {
      try {
        console.log(`🥤 Ичимлик READY қилинмоқда: ${item.product.name} (ID: ${item.id})`);
        setUpdatingItems((prev) => new Set(prev).add(item.id));

        // Фақат WebSocket орқали янгилaш
        socket.emit('update_order_item_status', {
          itemId: item.id,
          status: 'READY',
        });

        // Янгилaшдан кейин кутиш (WebSocket ҳодисасига ишонамиз)
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error('❌ Ичимлик автомат янгилaшда хатолик:', error);
      } finally {
        setUpdatingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      }
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    await fetchOrders();
  };

  // API орқали ордерларни олиш (фақат бошланғич юклaш учун)
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('https://alikafecrm.uz/order/kitchen');
      console.log('📦 Буюртмалар юкланди:', res.data);
      setOrders(res.data);
      setTimeout(() => autoUpdateDrinkItems(res.data), 500);
    } catch (error) {
      console.error('❌ Буюртмаларни олишда хатолик:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Бошланғич юклaш
    fetchOrders();

    // WebSocket ҳодисалари
    const handleConnect = () => {
      console.log('🟢 Ошхона Панели: WebSocket уланди');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('🔴 Ошхона Панели: WebSocket узилди');
      setIsConnected(false);
    };

    const handleOrderCreated = (newOrder) => {
      console.log('🆕 ЯнгИ буюртма келди:', newOrder);
      setOrders((prevOrders) => {
        if (prevOrders.some((order) => order.id === newOrder.id)) {
          return prevOrders;
        }
        const updatedOrders = [...prevOrders, newOrder];
        setTimeout(() => autoUpdateDrinkItems([newOrder]), 200);
        return updatedOrders;
      });
    };

    const handleOrderUpdated = (updatedOrder) => {
      console.log('🔄 Буюртма янгиланди:', updatedOrder);
      if (!updatedOrder.orderItems) {
        console.log(`⚠️ Тўлиқ маълумот келмади, state янгиланмоқда...`);
        return;
      }

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );

      // Янгиланган буюртмадаги ичимликларни текшириш
      setTimeout(() => autoUpdateDrinkItems([updatedOrder]), 200);
    };

    const handleOrderDeleted = ({ id }) => {
      console.log(`🗑️ Буюртма ўчирилди:`, id);
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id));
    };

    const handleOrderItemStatusUpdated = (updatedItem) => {
      console.log('📝 Итем статус янгиланди:', updatedItem);
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
      setOrders((prevOrders) =>
        prevOrders.map((order) => ({
          ...order,
          orderItems: order.orderItems.filter((item) => item.id !== id),
        }))
      );
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('orderCreated', handleOrderCreated);
    socket.on('orderUpdated', handleOrderUpdated);
    socket.on('orderDeleted', handleOrderDeleted);
    socket.on('orderItemStatusUpdated', handleOrderItemStatusUpdated);
    socket.on('orderItemDeleted', handleOrderItemDeleted);

    // Фақат хатолик бўлса ёки WebSocket ишламаса polling
    const pollInterval = setInterval(() => {
      if (!socket.connected) {
        console.log('🔄 WebSocket узилган, polling ишлатилмоқда...');
        fetchOrders();
      }
    }, 60000); // 60 сонияда бир марта

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('orderCreated', handleOrderCreated);
      socket.off('orderUpdated', handleOrderUpdated);
      socket.off('orderDeleted', handleOrderDeleted);
      socket.off('orderItemStatusUpdated', handleOrderItemStatusUpdated);
      socket.off('orderItemDeleted', handleOrderItemDeleted);
      clearInterval(pollInterval);
    };
  }, []);

  // Ордер итем статусни янгилaш
  const updateOrderItemStatus = async (itemId, status) => {
    try {
      console.log(`🔄 Итем ${itemId} статус ${status}га ўзгартирилмоқда...`);
      setUpdatingItems((prev) => new Set(prev).add(itemId));
      socket.emit('update_order_item_status', { itemId, status });
    } catch (error) {
      console.error('❌ Статус янгилaшда хатолик:', error);
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // Вақтни форматлaш
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

  // Кўринадиган ордерларни фильтрлаш
  const visibleOrders = orders.filter(
    (order) =>
      ['PENDING', 'COOKING'].includes(order.status) &&
      order.orderItems.some(
        (item) =>
          ['PENDING', 'COOKING'].includes(item.status) &&
          item.product &&
          !isDrinkCategory(item.product)
      )
  );

  // Menu functions
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

  // Helper function to get role text
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

  return (
    <div className="kitchen-panel">
      {/* Hamburger Menu */}
      <div className={`hamburger-menu ${isMenuOpen ? 'open' : ''}`}>
        <button 
          className={`hamburger-btn ${isConnected ? 'connected' : 'disconnected'}`}
          onClick={toggleMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Sidebar Menu */}
      <div className={`sidebar-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-overlay" onClick={closeMenu}></div>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h3>Меню</h3>
            <button className="close-btn" aria-label="Close menu" onClick={closeMenu}>×</button>
          </div>
          <div className="sidebar-items">
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
            <button 
              className={`sidebar-item logout ${isConnected ? 'connected' : 'disconnected'}`}
              onClick={() => handleMenuItemClick('logout')}
            >
              <LogOut size={20} className="sidebar-icon" />
              Чиқиш
            </button>
          </div>
        </div>
      </div>

      <header className="kitchen-header">
        <div className="header-content">
          <h1 className="kitchen-title">
            <ChefHat size={32} className="kitchen-icon" />
            Ошхона Панели
          </h1>
          <div className="header-right">
            <button 
              className={`refresh-btn ${isLoading ? 'loading' : ''}`}
              onClick={handleRefresh}
              disabled={isLoading}
              title="Янгилаш"
            >
              <RefreshCw size={20} className={isLoading ? 'spin' : ''} />
              Янгилаш
            </button>
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
              <div className="user-info">
                <span className="user-role">
                  <ChefHat size={16} />
                  Ошпаз: 
                </span>
                <span className="user-name">{localStorage.getItem('user') || `Номаълум`}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="main-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Буюртмалар юкланмоқда...</p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">🍽️</div>
            <h3>Ҳозир фаол буюртма йўқ</h3>
            <p>Янги буюртмалар келганда бу ерда кўринади</p>
            <small style={{ color: '#666', marginTop: '10px', display: 'block' }}>
              💡 Ичимликлар автомат Тайёр қилинади
            </small>
          </div>
        ) : (
          <div className="orders-grid">
            {visibleOrders.map((order) => {
              const orderInfo = getOrderType(order);
              
              return (
                <div className="order-card" key={order.id}>
                  <div className="order-header">
                    <div className="order-info">
                      <h3 className="table-number">
                        <orderInfo.icon size={20} className="table-icon" />
                        {orderInfo.type === 'dine_in' ? ` ${order.table.number}` : 
                         orderInfo.type === 'delivery' ? ` Доставка` : ' Номаълум'}
                      </h3>
                      {orderInfo.type === 'delivery' && (
                        <p className="delivery-number">
                          <Phone size={16} className="phone-icon" />
                          {order.carrierNumber}
                        </p>
                      )}
                      <p className="order-time">
                        <Clock size={16} className="time-icon" />
                        {formatTime(order.createdAt)}
                      </p>
                    </div>
                    <div>
                      <div className={`order-status status-${order.status?.toLowerCase()}`}>
                        {order.status === 'PENDING' ? (
                          <>
                            <Clock size={16} />
                            Кутилмоқда
                          </>
                        ) : (
                          <>
                            <ChefHat size={16} />
                            Пиширилмоқда
                          </>
                        )}
                      </div>
                      <br />
                      <div className="order-user-info">
                        <span className="user-role bold large">
                          <User size={16} />
                          <b>{getRoleText(order.user?.role)}: </b>
                        </span> 
                        <span className="user-name smaller">
                          <b>{order.user?.name || 'Номаълум'}</b>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="order-items">
                    {order.orderItems
                      .filter(
                        (item) =>
                          ['PENDING', 'COOKING'].includes(item.status) &&
                          item.product &&
                          !isDrinkCategory(item.product)
                      )
                      .map((item) => (
                        <div key={item.id} className="order-item">
                          <div className="item-details">
                            <div className="item-header">
                              <span style={{background:'green'}} className="item-count"><b>{item.count} - дона</b></span>
                              <span className="item-name">
                                {item.product?.name || 'Маҳсулот номи юкланмоқда...'}
                              </span>
                            </div>
                            <div className={`item-status status-${item.status?.toLowerCase()}`}>
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
                                    Тайёр деб белгилaш
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {order.orderItems.some((item) => isDrinkCategory(item.product)) && (
                    <div className="drinks-info">
                      <small style={{ color: '#28a745', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Coffee size={16} />
                        Бу буюртмадаги ичимликлар автоматик Тайёр қилинди
                        <br />
                        <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '21px' }}>
                          Ичимликлар: {' '}
                          {order.orderItems
                            .filter((item) => isDrinkCategory(item.product))
                            .map((item) => `${item.product.name} (×${item.count})`)
                            .join(', ')}
                        </span>
                      </small>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default KitchenPanel;