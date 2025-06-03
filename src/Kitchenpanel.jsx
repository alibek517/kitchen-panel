import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { socket } from './socket';
import './KitchenPanel.css';
import exit from '/exit.png';

function KitchenPanel() {
  const [orders, setOrders] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const navigate = useNavigate();

  // API orqali orderlarni olish
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('https://suddocs.uz/order/kitchen');
      console.log('📦 Buyurtmalar yuklandi:', res.data);
  
      // Automatically update the status of "Ichimlik" items to "READY"
      const updatedOrders = res.data.map((order) => ({
        ...order,
        orderItems: order.orderItems.map((item) => {
          if (item.product?.category === 'Ichimlik' && item.status !== 'READY') {
            // Emit a WebSocket event to update the status
            socket.emit('update_order_item_status', { itemId: item.id, status: 'READY' });
            return { ...item, status: 'READY' };
          }
          return item;
        }),
      }));
  
      setOrders(updatedOrders);
    } catch (error) {
      console.error('❌ Buyurtmalarni olishda xatolik:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // WebSocket event listeners
    const handleConnect = () => {
      console.log('🟢 Kitchen Panel: WebSocket ulandi');
      setIsConnected(true);
      fetchOrders(); // Refresh orders on reconnect
    };

    const handleDisconnect = () => {
      console.log('🔴 Kitchen Panel: WebSocket uzildi');
      setIsConnected(false);
    };

    const handleOrderCreated = (newOrder) => {
      console.log('🆕 Yangi buyurtma keldi:', newOrder);
      setOrders((prevOrders) => {
        const exists = prevOrders.some((order) => order.id === newOrder.id);
        if (exists) return prevOrders;
        return [...prevOrders, newOrder];
      });
    };

    const handleOrderUpdated = (updatedOrder) => {
      console.log('🔄 Buyurtma yangilandi:', updatedOrder);
      // Agar to'liq ma'lumot kelmasa, API dan qayta yuklash
      if (!updatedOrder.orderItems || !updatedOrder.table) {
        console.log('⚠️ To\'liq ma\'lumot kelmadi, qayta yuklanmoqda...');
        fetchOrders();
        return;
      }
      
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );
    };

    const handleOrderDeleted = ({ id }) => {
      console.log('🗑️ Buyurtma o\'chirildi:', id);
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id));
    };

    const handleOrderItemStatusUpdated = (updatedItem) => {
      console.log('📝 Item status yangilandi:', updatedItem);
      
      // Agar product ma'lumoti yo'q bo'lsa, API dan qayta yuklash
      if (!updatedItem.product || !updatedItem.product.name) {
        console.log('⚠️ Product ma\'lumoti yo\'q, qayta yuklanmoqda...');
        fetchOrders();
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
    };

    const handleOrderItemDeleted = ({ id }) => {
      console.log('🗑️ Item o\'chirildi:', id);
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
    
    socket.on('update_order_item_status_response', (response) => {
      if (response.status === 'ok') {
        console.log('✅ Item status muvaffaqiyatli yangilandi');
        // Barcha holatlarda API dan qayta yuklash
        setTimeout(() => fetchOrders(), 500);
      } else {
        console.error('❌ Item status yangilanmadi:', response.message);
        fetchOrders();
      }
    });

    socket.on('update_order_status_response', (response) => {
      if (response.status === 'ok') {
        console.log('✅ Order status muvaffaqiyatli yangilandi');
        setTimeout(() => fetchOrders(), 500);
      } else {
        console.error('❌ Order status yangilanmadi:', response.message);
        fetchOrders();
      }
    });

    // Agar allaqachon ulangan bo'lsa
    if (socket.connected) {
      setIsConnected(true);
    }

    // Backup polling
    const pollInterval = setInterval(() => {
      if (!socket.connected) {
        console.log('🔄 WebSocket uzilgan, polling ishlatilmoqda...');
        fetchOrders();
      }
    }, 30000);

    // Har 5 daqiqada bir marta avtomatik yangilash
    const refreshInterval = setInterval(() => {
      console.log('🔄 Avtomatik yangilash...');
      fetchOrders();
    }, 300000); // 5 minut

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('orderCreated', handleOrderCreated);
      socket.off('orderUpdated', handleOrderUpdated);
      socket.off('orderDeleted', handleOrderDeleted);
      socket.off('orderItemStatusUpdated', handleOrderItemStatusUpdated);
      socket.off('orderItemDeleted', handleOrderItemDeleted);
      socket.off('update_order_item_status_response');
      socket.off('update_order_status_response');
      clearInterval(pollInterval);
      clearInterval(refreshInterval);
    };
  }, []);

  // Order item statusini yangilash
  const updateOrderItemStatus = async (itemId, status) => {
    try {
      console.log(`🔄 Item ${itemId} status ${status}ga o'zgartirilmoqda...`);
      setUpdatingItems(prev => new Set(prev).add(itemId));
      
      socket.emit('update_order_item_status', { itemId, status });
      
      // 3 soniyadan keyin loading holatini to'xtatish
      setTimeout(() => {
        setUpdatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 3000);
      
    } catch (error) {
      console.error('❌ Status yangilashda xatolik:', error);
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      await fallbackUpdateItemStatus(itemId, status);
    }
  };

  // Fallback API method
  const fallbackUpdateItemStatus = async (itemId, status) => {
    try {
      await axios.patch(`https://suddocs.uz/order/item/${itemId}/status`, { status });
      fetchOrders();
    } catch (error) {
      console.error('❌ API orqali yangilanmadi:', error);
    }
  };

  // Order statusini yangilash
  const updateOrderStatus = async (orderId, status) => {
    try {
      console.log(`🔄 Order ${orderId} status ${status}ga o'zgartirilmoqda...`);
      socket.emit('update_order_status', { orderId, status });
    } catch (error) {
      console.error('❌ Order status yangilashda xatolik:', error);
      await fallbackUpdateOrderStatus(orderId, status);
    }
  };

  // Fallback API method
  const fallbackUpdateOrderStatus = async (orderId, status) => {
    try {
      await axios.patch(`https://suddocs.uz/order/${orderId}/status`, { status });
      fetchOrders();
    } catch (error) {
      console.error('❌ API orqali yangilanmadi:', error);
    }
  };

  // Vaqtni formatlash
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} daqiqa oldin`;
    } else {
      return date.toLocaleTimeString('uz-UZ', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  // Ko'rinadigan orderlarni filtrlash
  const visibleOrders = orders.filter((order) =>
    ['PENDING', 'COOKING'].includes(order.status) &&
    order.orderItems.some((item) => ['PENDING', 'COOKING'].includes(item.status))
  );

  return (
    <div className="kitchen-panel">
      <header className="kitchen-header">
        <div className="header-content">
          <h1 className="kitchen-title">
            <span className="kitchen-icon">👨‍🍳</span>
            Oshxona Paneli
          </h1>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
          <div className="user-info">
            <span className="user-role">Oshpaz: </span>
            <span className="user-name">{localStorage.getItem('user') || 'Noma\'lum'}</span>
          </div>
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span className="status-text">
              {isConnected ? 'Real-time ulanish faol' : 'Offline rejim'}
            </span>
          </div>
          </div>
        <img
          src={exit}
          alt="exit"
          className="exit-icon"
          onClick={() => navigate('/logout')}
        />
        </div>
        </div>
      </header>

      <div className="main-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Buyurtmalar yuklanmoqda...</p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">🍽️</div>
            <h3>Hozir faol buyurtma yo'q</h3>
            <p>Yangi buyurtmalar kelganda bu yerda ko'rinadi</p>
          </div>
        ) : (
          <div className="orders-grid">
            {visibleOrders.map((order) => (
              <div className="order-card" key={order.id}>
                <div className="order-header">
                  <div className="order-info">
                    <h3 className="table-number">
                      <span className="table-icon">🪑</span>
                      Stol {order.table?.number || 'N/A'}
                    </h3>
                    <p className="order-time">
                      <span className="time-icon">🕒</span>
                      {formatTime(order.createdAt)}
                    </p>
                  </div>
                  <div className={`order-status status-${order.status?.toLowerCase()}`}>
                    {order.status === 'PENDING' ? '⏳ Kutilmoqda' : '🔥 Pishirilmoqda'}
                  </div>
                </div>
                
                <div className="order-items">
                  {order.orderItems
                    .filter((item) => ['PENDING', 'COOKING'].includes(item.status))
                    .map((item) => (
                      <div key={item.id} className="order-item">
                        <div className="item-details">
                          <div className="item-header">
                            <span className="item-name">
                              {item.product?.name || 'Mahsulot nomi yuklanmoqda...'}
                            </span>
                            <span className="item-count">×{item.count}</span>
                          </div>
                          <div className={`item-status status-${item.status?.toLowerCase()}`}>
                            {item.status === 'PENDING' ? '⏳ Kutilmoqda' : '🔥 Pishirilmoqda'}
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
                                  <span className="btn-spinner"></span>
                                  Boshlanyapti...
                                </>
                              ) : (
                                <>
                                  <span className="btn-icon">▶️</span>
                                  Pishirishni boshlash
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
                                  <span className="btn-spinner"></span>
                                  Tugallanmoqda...
                                </>
                              ) : (
                                <>
                                  <span className="btn-icon">✅</span>
                                  Tayyor deb belgilash
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default KitchenPanel;