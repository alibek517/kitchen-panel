import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { socket } from './socket';
import './KitchenPanel.css';
import exit from '/exit.png';
import { 
  ChefHat, 
  Clock, 
  Table, 
  Play, 
  CheckCircle, 
  Coffee, 
  UtensilsCrossed,
  Loader2,
  AlertCircle,
  Flame,
  Timer,
  Package
} from 'lucide-react';

function KitchenPanel() {
  const [orders, setOrders] = useState([]);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const navigate = useNavigate();

  // Ichimlik kategoriyasini aniqlash
  const isDrinkCategory = (product) => {
    if (!product) return false;
    return (
      product.categoryId === 10 ||
      product.category?.name === 'Ichimlik' ||
      product.category?.id === 10
    );
  };

  // Ichimlik itemlarini avtomatik READY qilish
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

    console.log(`🥤 ${drinkItems.length} ta ichimlik avtomatik ishlov berilmoqda...`);

    for (const item of drinkItems) {
      try {
        console.log(`🥤 Ichimlik READY qilinmoqda: ${item.product.name} (ID: ${item.id})`);
        setUpdatingItems((prev) => new Set(prev).add(item.id));

        // Faqat WebSocket orqali yangilash
        socket.emit('update_order_item_status', {
          itemId: item.id,
          status: 'READY',
        });

        // Yangilashdan keyin kutish (WebSocket hodisasiga ishonamiz)
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error('❌ Ichimlik avtomatik yangilashda xatolik:', error);
      } finally {
        setUpdatingItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      }
    }
  };

  // API orqali orderlarni olish (faqat boshlang'ich yuklash uchun)
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('https://suddocs.uz/order/kitchen');
      console.log('📦 Buyurtmalar yuklandi:', res.data);
      setOrders(res.data);
      setTimeout(() => autoUpdateDrinkItems(res.data), 500);
    } catch (error) {
      console.error('❌ Buyurtmalarni olishda xatolik:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Boshlang'ich yuklash
    fetchOrders();

    // WebSocket hodisalari
    const handleConnect = () => {
      console.log('🟢 Kitchen Panel: WebSocket ulandi');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('🔴 Kitchen Panel: WebSocket uzildi');
      setIsConnected(false);
    };

    const handleOrderCreated = (newOrder) => {
      console.log('🆕 Yangi buyurtma keldi:', newOrder);
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
      console.log('🔄 Buyurtma yangilandi:', updatedOrder);
      if (!updatedOrder.orderItems || !updatedOrder.table) {
        console.log(`⚠️ To'liq ma'lumot kelmadi, state yangilanmoqda...`);
        return;
      }

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );

      // Yangilangan buyurtmadagi ichimliklarni tekshirish
      setTimeout(() => autoUpdateDrinkItems([updatedOrder]), 200);
    };

    const handleOrderDeleted = ({ id }) => {
      console.log(`🗑️ Buyurtma o'chirildi:`, id);
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== id));
    };

    const handleOrderItemStatusUpdated = (updatedItem) => {
      console.log('📝 Item status yangilandi:', updatedItem);
      if (!updatedItem.product || !updatedItem.product.name) {
        console.log(`⚠️ Product ma'lumoti yo'q`);
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
      console.log(`🗑️ Item o'chirildi:`, id);
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

    // Faqat xatolik bo'lsa yoki WebSocket ishlamasa polling
    const pollInterval = setInterval(() => {
      if (!socket.connected) {
        console.log('🔄 WebSocket uzilgan, polling ishlatilmoqda...');
        fetchOrders();
      }
    }, 60000); // 60 soniyada bir marta

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

  // Order item statusini yangilash
  const updateOrderItemStatus = async (itemId, status) => {
    try {
      console.log(`🔄 Item ${itemId} status ${status}ga o'zgartirilmoqda...`);
      setUpdatingItems((prev) => new Set(prev).add(itemId));
      socket.emit('update_order_item_status', { itemId, status });
    } catch (error) {
      console.error('❌ Status yangilashda xatolik:', error);
      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  // Vaqtni formatlash
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} daqiqa oldin`;
    }
    return date.toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Ko'rinadigan orderlarni filtrlash
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

  return (
    <div className="kitchen-panel">
      <header className="kitchen-header">
        <div className="header-content">
          <h1 className="kitchen-title">
            <ChefHat className="kitchen-icon" size={32} />
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
            <Loader2 className="loading-spinner animate-spin" size={48} />
            <p className="loading-text">Buyurtmalar yuklanmoqda...</p>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="no-orders">
            <UtensilsCrossed className="no-orders-icon" size={64} />
            <h3>Hozir faol buyurtma yo'q</h3>
            <p>Yangi buyurtmalar kelganda bu yerda ko'rinadi</p>
            <small style={{ color: '#666', marginTop: '10px', display: 'block' }}>
              <AlertCircle size={16} style={{ display: 'inline', marginRight: '4px' }} />
              Ichimliklar (categoryId: 10) avtomatik READY qilinadi
            </small>
          </div>
        ) : (
          <div className="orders-grid">
            {visibleOrders.map((order) => (
              <div className="order-card" key={order.id}>
                <div className="order-header">
                  <div className="order-info">
                    <h3 className="table-number">
                      <Table className="table-icon" size={20} />
                      Stol {order.table?.number || 'N/A'}
                    </h3>
                    <p className="order-time">
                      <Clock className="time-icon" size={16} />
                      {formatTime(order.createdAt)}
                    </p>
                  </div>
                  <div className={`order-status status-${order.status?.toLowerCase()}`}>
                    {order.status === 'PENDING' ? (
                      <>
                        <Timer size={16} style={{ marginRight: '4px' }} />
                        Kutilmoqda
                      </>
                    ) : (
                      <>
                        <Flame size={16} style={{ marginRight: '4px' }} />
                        Pishirilmoqda
                      </>
                    )}
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
                            <span className="item-name">
                              {item.product?.name || 'Mahsulot nomi yuklanmoqda...'}
                            </span>
                            <span className="item-count">×{item.count}</span>
                          </div>
                          <div className={`item-status status-${item.status?.toLowerCase()}`}>
                            {item.status === 'PENDING' ? (
                              <>
                                <Timer size={14} style={{ marginRight: '4px' }} />
                                Kutilmoqda
                              </>
                            ) : (
                              <>
                                <Flame size={14} style={{ marginRight: '4px' }} />
                                Pishirilmoqda
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
                                  <Loader2 className="btn-spinner animate-spin" size={16} />
                                  Boshlanyapti...
                                </>
                              ) : (
                                <>
                                  <Play className="btn-icon" size={16} />
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
                                  <Loader2 className="btn-spinner animate-spin" size={16} />
                                  Tugallanmoqda...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="btn-icon" size={16} />
                                  Tayyor deb belgilash
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
                    <small style={{ color: '#28a745', fontStyle: 'italic' }}>
                      <Coffee size={16} style={{ display: 'inline', marginRight: '4px' }} />
                      Bu buyurtmadagi ichimliklar avtomatik READY qilindi
                      <br />
                      <span style={{ fontSize: '0.8em', color: '#666' }}>
                        Ichimliklar:{' '}
                        {order.orderItems
                          .filter((item) => isDrinkCategory(item.product))
                          .map((item) => `${item.product.name} (×${item.count})`)
                          .join(', ')}
                      </span>
                    </small>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default KitchenPanel;