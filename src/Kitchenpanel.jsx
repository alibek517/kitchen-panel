import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './KitchenPanel.css';
import exit from '/exit.png';

function KitchenPanel() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('PENDING');
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const res = await axios.get('https://suddocs.uz/order');
      setOrders(res.data);
    } catch (err) {
      console.error('Xatolik:', err);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');

    if (!storedToken || role !== 'KITCHEN') {
      navigate('/login');
    }
  }, [navigate]);

  const changeStatus = async (id, newStatus) => {
    try {
      const res = await axios.put(`https://suddocs.uz/order/${id}`, {
        status: newStatus,
      });
      const updatedOrder = res.data;
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === id ? { ...order, status: updatedOrder.status } : order
        )
      );
    } catch (err) {
      console.error('Status o‘zgartirishda xatolik:', err);
    }
  };

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(() => {
      fetchOrders();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const filteredOrders = orders.filter((order) => order.status === activeTab);

  return (
    <div className="kitchen-panel">
      <img
  onClick={logout}
  className="exit-icon"
  src={exit}
  alt="exit"
/>
      <h2>🍽 Oshxona Paneli</h2>

      <div className="filter-tabs">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={activeTab === 'PENDING' ? 'active' : ''}
        >
          Yangi
        </button>
        <button
          onClick={() => setActiveTab('COOKING')}
          className={activeTab === 'COOKING' ? 'active' : ''}
        >
          Tayyorlanayotganlar
        </button>
        <button
          onClick={() => setActiveTab('READY')}
          className={activeTab === 'READY' ? 'active' : ''}
        >
          Tayyor
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders">🚫 Buyurtmalar yo‘q</div>
      ) : (
        <div className="order-list">
          {filteredOrders.map((order) => (
            <div key={order.id} className="order-card">
              <p><strong>🪑 Stol:</strong> {order.tableNumber}</p>
              <p><strong>🕒 Vaqt:</strong> {new Date(order.createdAt).toLocaleTimeString()}</p>
              <p><strong>🍲 Ovqatlar:</strong></p>
              <ul>
                {order.orderItems.map((item, index) => (
                  <li key={index}>
                    {item.product.name} - {item.count} ta
                  </li>
                ))}
              </ul>

              {order.status === 'PENDING' && (
                <button
                  className="start-btn"
                  onClick={() => changeStatus(order.id, 'COOKING')}
                >
                  ▶️ Pishirishni boshlash
                </button>
              )}

              {order.status === 'COOKING' && (
                <button
                  className="done-btn"
                  onClick={() => changeStatus(order.id, 'READY')}
                >
                  ✅ Tayyor
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default KitchenPanel;
