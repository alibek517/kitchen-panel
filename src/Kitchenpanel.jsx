import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './KitchenPanel.css';
import exit from '/exit.png';

function KitchenPanel() {
  const [orders, setOrders] = useState([]);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const res = await axios.get('https://suddocs.uz/order');
      console.log('Buyurtmalar:', res.data);
      
      setOrders(res.data);
    } catch (error) {
      console.error('Buyurtmalarni olishda xatolik:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateOrderItemStatus = async (itemId, status) => {
    try {
      await axios.patch(`https://suddocs.uz/order/item/${itemId}/status`, { status });
      fetchOrders();
    } catch (error) {
      console.error('Status yangilashda xatolik:', error);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.patch(`https://suddocs.uz/order/${orderId}/status`, { status });
      fetchOrders();
    } catch (error) {
      console.error('Order status yangilashda xatolik:', error);
    }
  };

  const visibleOrders = orders.filter(order => {
    if (['COMPLETED', 'ARCHIVE', 'READY'].includes(order.status)) return false;
  
    if (order.status === 'PENDING') {
      const hasProgress = order.orderItems.some(item =>
        ['COOKING', 'READY', 'COMPLETED'].includes(item.status)
      );
      if (hasProgress) return false;
    }
  
    return true;
  });
  
  return (
    <div className="kitchen-panel">
      <img
        src={exit}
        alt="exit"
        className="exit-icon"
        onClick={() => navigate('/logout')}
        style={{ cursor: 'pointer' }}
      />
      <h2>🍽 Oshxona Paneli</h2>
  
      <div className="order-list">
        {visibleOrders.length === 0 ? (
          <div className="no-orders">🚫 Buyurtma yo'q</div>
        ) : (
          visibleOrders.map(order => {
            const visibleItems = order.orderItems.filter(item => 
              item.status !== 'COMPLETED' && 
              item.status !== 'ARCHIVE' && 
              item.status !== 'READY'
            );
            
            // Agar barcha itemlar READY bo'lsa, order statusini READY ga o'zgartir
            const allItemsReady = order.orderItems.every(item => 
              item.status === 'READY' || 
              item.status === 'COMPLETED' || 
              item.status === 'ARCHIVE'
            );
            
            if (allItemsReady && order.status !== 'READY') {
              updateOrderStatus(order.id, 'READY');
            }
            
            if (visibleItems.length === 0) return null;
  
            return (
              <div className="order-card" key={order.id}>
                <p><strong>🪑 Stol:</strong> {order.table.number}</p>
                <p><strong>🕒 Vaqt:</strong> {new Date(order.createdAt).toLocaleTimeString()}</p>
                <ul>
                  {visibleItems.map((item) => {
                    console.log('Item:', item.product.name, 'Status:', item.status, 'ID:', item.id);
                    return (
                      <li key={item.id}>
                        {item.product.name} - {item.count}
                        {item.status === 'PENDING' && (
                          <button
                            className="start-btn"
                            onClick={() => updateOrderItemStatus(item.id, 'COOKING')}
                          >
                            ▶ Pishirish
                          </button>
                        )}
                        {item.status === 'COOKING' && (
                          <button
                            className="done-btn"
                            onClick={() => updateOrderItemStatus(item.id, 'READY')}
                          >
                            ✅ Tayyor
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default KitchenPanel;