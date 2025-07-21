import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from './socket';
import {
  ChefHat,
  Home,
  Archive,
  Utensils,
  Clock,
  Play,
  CheckCircle,
  Car,
  HelpCircle,
  RefreshCw,
  User,
  UtensilsCrossed,
} from 'lucide-react';
import './KitchenPanel.css';

const audio = new Audio('/synthesize.mp3');

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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingNotifications, setPendingNotifications] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const CACHE_KEY = 'cached_orders';
  const CACHE_TIMESTAMP_KEY = 'cached_orders_timestamp';
  const PRODUCT_CACHE_KEY = 'cached_product_assignments';
  const PENDING_NOTIFICATIONS_KEY = 'pending_notifications';

  const loadCachedOrders = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cached && timestamp) {
        const parsedOrders = JSON.parse(cached);
        console.log('📂 Loaded cached orders:', parsedOrders.length);
        return { orders: parsedOrders, timestamp: new Date(timestamp) };
      }
    } catch (error) {
      console.error('❌ Error loading cached orders:', error.message);
    }
    return { orders: [], timestamp: null };
  };

  const saveOrdersToCache = (ordersToCache) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(ordersToCache));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());
      console.log('💾 Orders saved to cache:', ordersToCache.length);
    } catch (error) {
      console.error('❌ Error saving orders to cache:', error.message);
    }
  };

  const loadCachedProductAssignments = () => {
    try {
      const cached = localStorage.getItem(PRODUCT_CACHE_KEY);
      const timestamp = localStorage.getItem(PRODUCT_CACHE_TIMESTAMP_KEY);
      if (cached && timestamp) {
        const age = (new Date() - new Date(timestamp)) / (1000 * 60);
        if (age > 30) {
          console.log('🗑️ Product cache expired');
          localStorage.removeItem(PRODUCT_CACHE_KEY);
          localStorage.removeItem(PRODUCT_CACHE_TIMESTAMP_KEY);
          return {};
        }
        const parsed = JSON.parse(cached);
        console.log('📂 Loaded cached product assignments:', Object.keys(parsed).length);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error loading cached product assignments:', error.message);
    }
    return {};
  };

  const saveProductAssignmentsToCache = (cache) => {
    try {
      const validCache = Object.fromEntries(
        Object.entries(cache).filter(([_, value]) => value && typeof value.isCompleted === 'boolean')
      );
      localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(validCache));
      localStorage.setItem(PRODUCT_CACHE_TIMESTAMP_KEY, new Date().toISOString());
      console.log('💾 Product assignments saved to cache:', Object.keys(validCache).length);
    } catch (error) {
      console.error('❌ Error saving product assignments to cache:', error.message);
    }
  };

  const clearProductCache = (productId) => {
    try {
      const cached = loadCachedProductAssignments();
      delete cached[productId];
      localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cached));
      console.log(`🗑️ Cleared cache for product ID ${productId}`);
    } catch (error) {
      console.error(`❌ Error clearing cache for product ${productId}:`, error.message);
    }
  };

  const loadPendingNotifications = () => {
    try {
      const cached = localStorage.getItem(PENDING_NOTIFICATIONS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('📂 Loaded pending notifications:', parsed.length);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error loading pending notifications:', error.message);
    }
    return [];
  };

  const savePendingNotifications = (notifications) => {
    try {
      localStorage.setItem(PENDING_NOTIFICATIONS_KEY, JSON.stringify(notifications));
      console.log('💾 Pending notifications saved:', notifications.length);
    } catch (error) {
      console.error('❌ Error saving pending notifications:', error.message);
    }
  };

  const fetchProductAssignedToId = async (productId, cache = {}, forceRefresh = false) => {
    if (!forceRefresh && cache[productId]) {
      console.log(`📦 Using cached product data for ID ${productId}`);
      return cache[productId];
    }
    if (!navigator.onLine) {
      const cachedAssignments = loadCachedProductAssignments();
      console.log(`📴 Offline: Using cached product assignment for ID ${productId}`);
      return cachedAssignments[productId] || { assignedToId: null, isCompleted: false };
    }
    try {
      const response = await axios.get(`http://192.168.100.99:3000/product/${productId}`);
      const { assignedToId, isCompleted } = response.data;
      const productData = { assignedToId: assignedToId?.toString(), isCompleted: !!isCompleted };
      cache[productId] = productData;
      saveProductAssignmentsToCache({ ...cache, [productId]: productData });
      console.log(`📡 Fetched product ID ${productId}:`, productData);
      return productData;
    } catch (error) {
      console.error(`❌ Error fetching product ${productId}:`, error.message);
      return { assignedToId: null, isCompleted: false };
    }
  };

  const SessionExpiredModal = ({ isOpen, onConfirm }) => {
    if (!isOpen) return null;
    return (
      <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
        <div className="modal-content" style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏰</div>
          <h2 style={{ color: '#333', marginBottom: '15px', fontSize: '24px', fontWeight: 'bold' }}>Иш вақти тугади.</h2>
          <p style={{ color: '#666', marginBottom: '25px', fontSize: '16px', lineHeight: '1.5' }}>Иш вақтиз тугади, энди иш бошланса кирасиз.</p>
          <button
            onClick={onConfirm}
            style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', minWidth: '100px', transition: 'all 0.3s ease' }}
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
      return { type: 'dine_in', display: `${order.table.name} ${order.table.number}`, icon: Utensils };
    } else if (order.carrierNumber) {
      return { type: 'delivery', display: order.carrierNumber, icon: Car };
    } else {
      return { type: 'unknown', display: 'Номаълум', icon: HelpCircle };
    }
  };

  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/kitchen') return 'home';
    if (path === '/archive') return 'archive';
    if (path === '/maxsulotlar') return 'maxsulotlar';
    return 'home';
  };

  const fetchOrders = async (isInitialFetch = false) => {
    try {
      if (isInitialFetch) setIsLoading(true);
      const res = await axios.get('http://192.168.100.99:3000/order/kitchen');
      const validOrders = res.data.filter((order) => order.id && order.orderItems);
      setOrders(validOrders);
      setLastUpdateTime(new Date());
      setIsOffline(false);
      saveOrdersToCache(validOrders);
      console.log('📦 Orders fetched:', validOrders.length);
    } catch (error) {
      console.error('❌ Error fetching orders:', error.message);
      setIsOffline(true);
      const { orders: cachedOrders, timestamp } = loadCachedOrders();
      if (cachedOrders.length > 0) {
        setOrders(cachedOrders);
        setLastUpdateTime(timestamp || new Date());
        console.log('🔄 Using cached orders');
      }
    } finally {
      if (isInitialFetch) setIsLoading(false);
    }
  };

  const fetchKitchenUsers = async () => {
    try {
      const res = await axios.get('http://192.168.100.99:3000/user');
      const kitchenUsers = res.data
        .filter((user) => user.role === 'KITCHEN')
        .map((user) => user.username)
        .sort();
      setKitchenUsers(kitchenUsers);
      const storedUser = localStorage.getItem('user');
      if (storedUser && kitchenUsers.includes(storedUser)) {
        setSelectedUsername(storedUser);
        console.log('🔄 Default username set to:', storedUser);
      }
    } catch (error) {
      console.error('❌ Error fetching kitchen users:', error.message);
      setKitchenUsers([]);
    }
  };

  const checkSessionStatus = async () => {
    try {
      const response = await axios.get('http://192.168.100.99:3000/auth-check/1', {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
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

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setIsLoading(true);
    await Promise.all([fetchOrders(true), fetchKitchenUsers()]);
    localStorage.removeItem(PRODUCT_CACHE_KEY);
    setPendingNotifications([]);
    savePendingNotifications([]);
    console.log('🗑️ Cleared product cache and notifications');
  };

  const autoRefresh = async () => {
    const isSessionValid = await checkSessionStatus();
    if (!isSessionValid) return;
    if (!socket.connected || isOffline) {
      await fetchOrders(false);
    } else {
      setLastUpdateTime(new Date());
    }
  };

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const playNotification = useCallback(
    debounce(async () => {
      try {
        if (audio.context && audio.context.state === 'suspended') {
          await audio.context.resume();
          console.log('🔊 Audio context resumed');
        }
        await audio.play();
        console.log('🔔 Notification sound played');
      } catch (error) {
        console.error('❌ Notification audio error:', error.message);
        setPendingNotifications((prev) => {
          const updated = [...prev, Date.now()];
          savePendingNotifications(updated);
          return updated;
        });
      }
    }, 1000),
    []
  );

  const processPendingNotifications = async () => {
    if (pendingNotifications.length === 0) return;
    console.log('🔊 Processing pending notifications:', pendingNotifications.length);
    for (let i = 0; i < pendingNotifications.length; i++) {
      await playNotification();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setPendingNotifications([]);
    savePendingNotifications([]);
  };

  const updateOrderStatusToReady = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      console.log(`⚠️ Order ${orderId} not found`);
      return;
    }
    if (order.status !== 'READY') {
      console.log(`🔄 Updating order ${orderId} to READY`);
      socket.emit('update_order_status', { orderId, status: 'READY' });
    }
  };

  const revertItemStatus = (itemId) => {
    console.log(`🔄 Reverting item ${itemId} to PENDING`);
    setUpdatingItems((prev) => new Set(prev).add(itemId));
    socket.emit('update_order_item_status', { itemId, status: 'PENDING' });
  };

  const processItemCompletion = async (item, productCache, currentUserId, forceRefresh = false) => {
    if (item.status !== 'PENDING' && item.status !== 'COOKING' || !item.product || !item.product.id) {
      console.log(`⚠️ Skipping item ${item.id}: Invalid status or product`);
      return { shouldUpdateOrder: item.status === 'READY', isAssigned: false };
    }
    const { assignedToId, isCompleted } = await fetchProductAssignedToId(item.product.id, productCache, forceRefresh);
    console.log(`🔍 Item ${item.id} - assignedToId: ${assignedToId}, isCompleted: ${isCompleted}`);
    if (isCompleted && assignedToId === currentUserId && item.status !== 'READY' && !updatingItems.has(item.id)) {
      console.log(`🔄 Auto-setting item ${item.id} to READY`);
      setUpdatingItems((prev) => new Set(prev).add(item.id));
      socket.emit('update_order_item_status', { itemId: item.id, status: 'READY' });
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { shouldUpdateOrder: true, isAssigned: true };
    } else if (assignedToId === currentUserId && item.status === 'PENDING' && !isCompleted) {
      console.log(`🔔 Queuing notification for item ${item.id}`);
      setPendingNotifications((prev) => {
        const updated = [...prev, Date.now()];
        savePendingNotifications(updated);
        return updated;
      });
      return { shouldUpdateOrder: item.status === 'READY', isAssigned: true };
    }
    return { shouldUpdateOrder: item.status === 'READY', isAssigned: assignedToId === currentUserId };
  };

  useEffect(() => {
    const processCompletedItems = async () => {
      if (isOffline || isLoading || showSessionExpiredModal) {
        console.log('⏸️ Skipping processCompletedItems');
        return;
      }
      const productCache = loadCachedProductAssignments();
      const currentUserId = localStorage.getItem('userId');
      console.log('🔍 Processing items for userId:', currentUserId);
      for (const order of orders) {
        let shouldUpdateOrder = true;
        for (const item of order.orderItems) {
          if (['PENDING', 'COOKING', 'READY'].includes(item.status) && item.product?.id) {
            const { shouldUpdateOrder: itemShouldUpdate } = await processItemCompletion(item, productCache, currentUserId, true);
            if (!itemShouldUpdate) shouldUpdateOrder = false;
          } else {
            shouldUpdateOrder = false;
          }
        }
        if (shouldUpdateOrder && ['PENDING', 'COOKING'].includes(order.status)) {
          updateOrderStatusToReady(order.id);
        }
      }
    };
    processCompletedItems();
  }, [orders, isOffline, isLoading, showSessionExpiredModal]);

  useEffect(() => {
    console.log('🔍 Initializing KitchenPanel, userId:', localStorage.getItem('userId'));
    if (!navigator.onLine) {
      const { orders: cachedOrders, timestamp } = loadCachedOrders();
      if (cachedOrders.length > 0) {
        setOrders(cachedOrders);
        setLastUpdateTime(timestamp || new Date());
        setIsOffline(true);
        setIsLoading(false);
      }
      setPendingNotifications(loadPendingNotifications());
    } else {
      fetchOrders(true);
      setPendingNotifications(loadPendingNotifications());
    }
    fetchKitchenUsers();
    checkSessionStatus();

    const autoRefreshInterval = setInterval(autoRefresh, 120000);
    const pollInterval = setInterval(() => {
      if (!socket.connected) {
        console.log('🔄 WebSocket disconnected, polling...');
        fetchOrders(false);
      }
    }, 120000);

    const handleOnline = () => {
      setIsOffline(false);
      fetchOrders(false);
      processPendingNotifications();
      console.log('🌐 Back online');
    };

    const handleOffline = () => {
      setIsOffline(true);
      const { orders: cachedOrders, timestamp } = loadCachedOrders();
      if (cachedOrders.length > 0) {
        setOrders(cachedOrders);
        setLastUpdateTime(timestamp || new Date());
        console.log('📴 Offline, loaded cached orders');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔊 App visible, processing notifications');
        processPendingNotifications();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleConnect = () => {
      console.log('🟢 WebSocket connected');
      setIsConnected(true);
      setLastUpdateTime(new Date());
      processPendingNotifications();
    };

    const handleDisconnect = () => {
      console.log('🔴 WebSocket disconnected');
      setIsConnected(false);
    };

    const handleOrderCreated = async (newOrder) => {
      console.log('🆕 New order:', newOrder.id);
      setLastUpdateTime(new Date());
      const currentUserId = localStorage.getItem('userId');
      const productCache = loadCachedProductAssignments();
      let shouldUpdateOrder = true;
      let hasAssignedOrder = false;

      if (newOrder.orderItems && Array.isArray(newOrder.orderItems)) {
        for (const item of newOrder.orderItems) {
          const { shouldUpdateOrder: itemShouldUpdate, isAssigned } = await processItemCompletion(item, productCache, currentUserId, true);
          if (isAssigned) hasAssignedOrder = true;
          if (!itemShouldUpdate) shouldUpdateOrder = false;
        }
      } else {
        shouldUpdateOrder = false;
      }

      if (shouldUpdateOrder) updateOrderStatusToReady(newOrder.id);

      if (hasAssignedOrder && document.visibilityState === 'visible') {
        console.log('🔔 Playing notification for new order');
        playNotification();
      }

      setOrders((prevOrders) => {
        const existingOrder = prevOrders.find((order) => order.id === newOrder.id);
        if (existingOrder) {
          console.log('⚠️ Order already exists:', newOrder.id);
          return prevOrders;
        }
        const updatedOrders = [...prevOrders, newOrder];
        saveOrdersToCache(updatedOrders);
        return updatedOrders;
      });
    };

    const handleOrderUpdated = (updatedOrder) => {
      console.log('🔄 Order updated:', updatedOrder.id);
      setLastUpdateTime(new Date());
      if (!updatedOrder.orderItems) {
        setOrders((prevOrders) =>
          prevOrders.map((order) => (order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order))
        );
        saveOrdersToCache(orders);
        return;
      }
      setOrders((prevOrders) => {
        const orderExists = prevOrders.some((order) => order.id === updatedOrder.id);
        if (!orderExists) {
          const updatedOrders = [...prevOrders, updatedOrder];
          saveOrdersToCache(updatedOrders);
          return updatedOrders;
        }
        const updatedOrders = prevOrders.map((order) => (order.id === updatedOrder.id ? updatedOrder : order));
        saveOrdersToCache(updatedOrders);
        return updatedOrders;
      });
    };

    const handleOrderDeleted = ({ id }) => {
      console.log('🗑️ Order deleted:', id);
      setLastUpdateTime(new Date());
      setOrders((prevOrders) => {
        const updatedOrders = prevOrders.filter((order) => order.id !== id);
        saveOrdersToCache(updatedOrders);
        return updatedOrders;
      });
    };

    const handleOrderItemStatusUpdated = async (updatedItem) => {
      console.log('📝 Item status updated:', updatedItem.id, updatedItem.status);
      setLastUpdateTime(new Date());
      const currentUserId = localStorage.getItem('userId');
      const productCache = loadCachedProductAssignments();

      if (['PENDING', 'COOKING', 'READY'].includes(updatedItem.status) && updatedItem.product?.id) {
        const { assignedToId, isCompleted } = await fetchProductAssignedToId(updatedItem.product.id, productCache, true);
        if (assignedToId === currentUserId && isCompleted && updatedItem.status === 'PENDING') {
          console.log(`🔔 Queuing notification for item ${updatedItem.id} (newly completed)`);
          setPendingNotifications((prev) => {
            const updated = [...prev, Date.now()];
            savePendingNotifications(updated);
            return updated;
          });
        }
      }

      if (!updatedItem.product || !updatedItem.product.name) {
        console.log('⚠️ No product information for item:', updatedItem.id);
        return;
      }

      setOrders((prevOrders) => {
        const updatedOrders = prevOrders.map((order) => ({
          ...order,
          orderItems: order.orderItems.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item)),
        }));
        saveOrdersToCache(updatedOrders);
        return updatedOrders;
      });

      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(updatedItem.id);
        return newSet;
      });

      const order = orders.find((o) => o.id === updatedItem.orderId);
      if (order) {
        const allItemsReady = order.orderItems.every((item) => item.status === 'READY');
        if (allItemsReady && order.status !== 'READY') {
          updateOrderStatusToReady(updatedItem.orderId);
        } else if (!allItemsReady && order.status === 'READY') {
          console.log(`🔄 Reverting order ${order.id} to PENDING`);
          socket.emit('update_order_status', { orderId: order.id, status: 'PENDING' });
        }
      }
    };

    const handleOrderItemDeleted = ({ id }) => {
      console.log('🗑️ Item deleted:', id);
      setLastUpdateTime(new Date());
      setOrders((prevOrders) => {
        const updatedOrders = prevOrders.map((order) => ({
          ...order,
          orderItems: order.orderItems.filter((item) => item.id !== id),
        }));
        saveOrdersToCache(updatedOrders);
        return updatedOrders;
      });
    };

    const handleOrderItemAdded = async (newItem) => {
      console.log('➕ New item added:', newItem.id);
      setLastUpdateTime(new Date());
      const currentUserId = localStorage.getItem('userId');
      const productCache = loadCachedProductAssignments();
      const { shouldUpdateOrder, isAssigned } = await processItemCompletion(newItem, productCache, currentUserId, true);

      setOrders((prevOrders) => {
        const updatedOrders = prevOrders.map((order) => {
          if (order.id === newItem.orderId) {
            const itemExists = order.orderItems.some((item) => item.id === newItem.id);
            if (!itemExists) {
              return { ...order, orderItems: [...order.orderItems, newItem] };
            }
          }
          return order;
        });
        saveOrdersToCache(updatedOrders);
        return updatedOrders;
      });

      if (newItem.orderId) {
        const order = orders.find((o) => o.id === newItem.orderId) || { orderItems: [] };
        const allItems = [...order.orderItems, newItem];
        const allItemsReadyOrCompleted = await Promise.all(
          allItems.map(async (item) => {
            if (item.status === 'READY') return true;
            if (item.product?.id) {
              const { isCompleted: itemCompleted } = await fetchProductAssignedToId(item.product.id, productCache, true);
              return itemCompleted;
            }
            return false;
          })
        );
        if (allItemsReadyOrCompleted.every((ready) => ready)) {
          updateOrderStatusToReady(newItem.orderId);
        } else if (order.status === 'READY') {
          console.log(`🔄 Reverting order ${newItem.orderId} to PENDING`);
          socket.emit('update_order_status', { orderId: newItem.orderId, status: 'PENDING' });
        }
      }

      if (isAssigned && document.visibilityState === 'visible') {
        console.log('🔔 Playing notification for new item');
        playNotification();
      }
    };

    const handleProductUpdated = async (updatedProduct) => {
      console.log('📦 Product updated:', updatedProduct.id);
      if (updatedProduct.id) {
        clearProductCache(updatedProduct.id);
        const productCache = loadCachedProductAssignments();
        const currentUserId = localStorage.getItem('userId');
        for (const order of orders) {
          for (const item of order.orderItems) {
            if (item.product?.id === updatedProduct.id && ['PENDING', 'COOKING', 'READY'].includes(item.status)) {
              await processItemCompletion(item, productCache, currentUserId, true);
            }
          }
          const allItemsReadyOrCompleted = await Promise.all(
            order.orderItems.map(async (item) => {
              if (item.status === 'READY') return true;
              if (item.product?.id) {
                const { isCompleted: itemCompleted } = await fetchProductAssignedToId(item.product.id, productCache, true);
                return itemCompleted;
              }
              return false;
            })
          );
          if (allItemsReadyOrCompleted.every((ready) => ready) && order.status !== 'READY') {
            updateOrderStatusToReady(order.id);
          } else if (!allItemsReadyOrCompleted.every((ready) => ready) && order.status === 'READY') {
            console.log(`🔄 Reverting order ${order.id} to PENDING`);
            socket.emit('update_order_status', { orderId: order.id, status: 'PENDING' });
          }
        }
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('orderCreated', handleOrderCreated);
    socket.on('orderUpdated', handleOrderUpdated);
    socket.on('orderDeleted', handleOrderDeleted);
    socket.on('orderItemStatusUpdated', handleOrderItemStatusUpdated);
    socket.on('orderItemDeleted', handleOrderItemDeleted);
    socket.on('orderItemAdded', handleOrderItemAdded);
    socket.on('productUpdated', handleProductUpdated);
    socket.on('reconnect', () => {
      console.log('🔄 WebSocket reconnected');
      fetchOrders(false);
      localStorage.removeItem(PRODUCT_CACHE_KEY);
      processPendingNotifications();
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('orderCreated', handleOrderCreated);
      socket.off('orderUpdated', handleOrderUpdated);
      socket.off('orderDeleted', handleOrderDeleted);
      socket.off('orderItemStatusUpdated', handleOrderItemStatusUpdated);
      socket.off('orderItemDeleted', handleOrderItemDeleted);
      socket.off('orderItemAdded', handleOrderItemAdded);
      socket.off('productUpdated', handleProductUpdated);
      socket.off('reconnect');
      clearInterval(pollInterval);
      clearInterval(autoRefreshInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const updateOrderItemStatus = async (itemId, status) => {
    if (!isConnected || isOffline) {
      console.log('⚠️ Cannot update item status: offline or disconnected');
      return;
    }
    try {
      console.log(`🔄 Updating item ${itemId} to ${status}`);
      setUpdatingItems((prev) => new Set(prev).add(itemId));
      socket.emit('update_order_item_status', { itemId, status });
      const item = orders.flatMap((o) => o.orderItems).find((i) => i.id === itemId);
      if (item?.product?.id) clearProductCache(item.product.id);
      if (status === 'READY') {
        setPendingNotifications([]);
        savePendingNotifications([]);
        console.log('🗑️ Cleared pending notifications on READY status');
      }
    } catch (error) {
      console.error('❌ Error updating status:', error.message);
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
    if (diffInMinutes < 60) return `${diffInMinutes} дақиқа олдин`;
    return date.toLocaleTimeString('uz-Cyrl-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  const visibleOrders = orders.filter((order) =>
    ['PENDING', 'COOKING'].includes(order.status) &&
    order.orderItems.some(
      (item) =>
        ['PENDING', 'COOKING'].includes(item.status) &&
        item.product &&
        (!selectedUsername || (item.product.assignedTo && item.product.assignedTo.username === selectedUsername))
    )
  );

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

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
      default:
        break;
    }
  };

  const currentPage = getCurrentPage();

  const getUserDisplay = (user) => {
    if (!user) return { roleText: 'Номаълум', displayName: 'Номаълум' };
    switch (user.role) {
      case 'CASHIER':
        return { roleText: 'Официант', displayName: user.name || 'Номаълум' };
      case 'CUSTOMER':
        return { roleText: 'Админ', displayName: 'Админ' };
      default:
        return { roleText: user.role || 'Номаълум', displayName: user.name || 'Номаълум' };
    }
  };

  return (
    <div className="kitchen-panel">
      <header className="kitchen-header">
        <div style={{ display: 'flex', gap: '35px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
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
            className={`sidebar-item ${currentPage === 'maxsulotlar' ? 'active' : ''} ${isConnected ? 'connected' : 'disconnected'}`}
            onClick={() => handleMenuItemClick('maxsulotlar')}
          >
            <UtensilsCrossed size={20} className="sidebar-icon" />
            Таомлар
          </button>
          <div className="header-right">
            <button
              className="action-btn refresh-btn"
              onClick={handleRefresh}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                opacity: isLoading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = '#218838')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = '#28a745')}
            >
              <RefreshCw size={16} className={isLoading ? 'btn-spinner spin' : ''} />
              Янгилаш
            </button>
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
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px' }}
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
                <div className={`order-card ${orderInfo.type === 'delivery' ? 'delivery-order' : ''}`} key={order.id}>
                  <div className="order-header">
                    <div className="order-single-line">
                      <orderInfo.icon size={16} />
                      <span>
                        {orderInfo.type === 'dine_in'
                          ? `${order.table.name} ${order.table.number}`
                          : orderInfo.type === 'delivery'
                          ? `Доставка ${order.carrierNumber}`
                          : 'Номаълум'}
                      </span>
                      <span> </span>
                      <Clock size={14} />
                      <span>{formatTime(order.createdAt)}</span>
                      <span> </span>
                      <span> </span>
                      <span>
                        <User size={14} />
                        {roleText}: {displayName}
                      </span>
                    </div>
                  </div>
                  <div className="order-items">
                    {order.orderItems
                      .filter(
                        (item) =>
                          ['PENDING', 'COOKING'].includes(item.status) &&
                          item.product &&
                          item.product.name &&
                          (!selectedUsername || (item.product.assignedTo && item.product.assignedTo.username === selectedUsername))
                      )
                      .map((item) => (
                        <div key={item.id} className="order-item">
                          <div className="item-details">
                            <div className="item-header">
                              <span className="item-count">
                                <b>{item.count} дона</b>
                              </span>
                              <span>{item.product.name || 'Маҳсулот номи юкланмоқда...'}</span>
                              <span style={{ fontSize: '20px' }}>{formatTime(item.createdAt)}</span>
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
                            <div>{item.description || ' '}</div>
                          </div>
                          <div className="item-actions">
                            {item.status === 'PENDING' && (
                              <button
                                className="action-btn start-btn"
                                onClick={() => updateOrderItemStatus(item.id, 'COOKING')}
                                disabled={updatingItems.has(item.id) || !isConnected || isOffline}
                                style={{ opacity: updatingItems.has(item.id) || !isConnected || isOffline ? 0.5 : 1 }}
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
                                disabled={updatingItems.has(item.id) || !isConnected || isOffline}
                                style={{ opacity: updatingItems.has(item.id) || !isConnected || isOffline ? 0.5 : 1 }}
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
          <SessionExpiredModal isOpen={showSessionExpiredModal} onConfirm={handleSessionExpiredConfirm} />
        )}
      </div>
    </div>
  );
}

export default KitchenPanel;