import React, { useEffect, useState } from 'react';
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
  WifiOff,
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
  const navigate = useNavigate();
  const location = useLocation();

  // Cache keys for localStorage
  const CACHE_KEY = 'cached_orders';
  const CACHE_TIMESTAMP_KEY = 'cached_orders_timestamp';
  const PRODUCT_CACHE_KEY = 'cached_product_assignments';

  // Load cached orders from localStorage
  const loadCachedOrders = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cached && timestamp) {
        const parsedOrders = JSON.parse(cached);
        console.log('📂 Loaded cached orders:', parsedOrders);
        return { orders: parsedOrders, timestamp: new Date(timestamp) };
      }
    } catch (error) {
      console.error('❌ Error loading cached orders:', error.message);
    }
    return { orders: [], timestamp: null };
  };

  // Save orders to localStorage
  const saveOrdersToCache = (ordersToCache) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(ordersToCache));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());
      console.log('💾 Orders saved to cache:', ordersToCache.length);
    } catch (error) {
      console.error('❌ Error saving orders to cache:', error.message);
    }
  };

  // Load cached product assignments from localStorage
  const loadCachedProductAssignments = () => {
    try {
      const cached = localStorage.getItem(PRODUCT_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('📂 Loaded cached product assignments:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error loading cached product assignments:', error.message);
    }
    return {};
  };

  // Save product assignments to localStorage
  const saveProductAssignmentsToCache = (cache) => {
    try {
      const validCache = Object.fromEntries(
        Object.entries(cache).filter(([_, value]) => value && typeof value.isCompleted === 'boolean')
      );
      localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(validCache));
      console.log('💾 Product assignments saved to cache:', Object.keys(validCache).length);
    } catch (error) {
      console.error('❌ Error saving product assignments to cache:', error.message);
    }
  };

  const fetchProductAssignedToId = async (productId, cache = {}) => {
    if (cache[productId]) {
      console.log(`📦 Cached product data for ID ${productId}:`, cache[productId]);
      return cache[productId];
    }

    if (!navigator.onLine) {
      const cachedAssignments = loadCachedProductAssignments();
      if (cachedAssignments[productId]) {
        console.log(`📴 Offline: Using cached product assignment for ID ${productId}`);
        return cachedAssignments[productId];
      }
      console.log(`📴 Offline: No cached assignment for product ${productId}, returning null`);
      return { assignedToId: null, isCompleted: false };
    }

    try {
      const response = await axios.get(`https://alikafecrm.uz/product/${productId}`);
      console.log(`📡 Raw API response for product ${productId}:`, response.data);
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
        icon: Utensils,
      };
    } else if (order.carrierNumber) {
      return {
        type: 'delivery',
        display: order.carrierNumber,
        icon: Car,
      };
    } else {
      return {
        type: 'unknown',
        display: 'Номаълум',
        icon: HelpCircle,
      };
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
      if (isInitialFetch) {
        setIsLoading(true);
      }
      const res = await axios.get('https://alikafecrm.uz/order/kitchen');
      console.log('📦 Orders fetched:', res.data);
      const validOrders = res.data.filter((order) => order.id && order.orderItems);
      setOrders(validOrders);
      setLastUpdateTime(new Date());
      setIsOffline(false);
      saveOrdersToCache(validOrders);
    } catch (error) {
      console.error('❌ Error fetching orders:', error.message);
      setIsOffline(true);
      const { orders: cachedOrders, timestamp } = loadCachedOrders();
      if (cachedOrders.length > 0) {
        setOrders(cachedOrders);
        setLastUpdateTime(timestamp || new Date());
        console.log('🔄 Using cached orders due to fetch failure');
      }
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
        .filter((user) => user.role === 'KITCHEN')
        .map((user) => user.username)
        .sort();
      console.log('👨‍🍳 Kitchen users fetched:', kitchenUsers);
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

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([fetchOrders(true), fetchKitchenUsers(),handleConnect()]);
  };
  function startRefreshTimer() {
    setInterval(handleRefresh, 120000);
}

startRefreshTimer()

  const autoRefresh = async () => {
    const isSessionValid = await checkSessionStatus();
    if (!isSessionValid) {
      console.log('🔴 Session expired, stopping auto-refresh');
      return;
    }

    if (!socket.connected || isOffline) {
      console.log('🔄 Auto-refresh: WebSocket disconnected or offline, fetching data...');
      await fetchOrders(false);
    } else {
      console.log('🔄 Auto-refresh: WebSocket active, updating timestamp...');
      setLastUpdateTime(new Date());
    }
  };

  const playNotification = () => {
    console.log('🔔 Playing notification sound...');
    audio.play().catch((error) => {
      console.error('❌ Notification audio error:', error.message);
    });
  };

  // Helper function to update order status to READY
  const updateOrderStatusToReady = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      console.log(`⚠️ Order ${orderId} not found for status update`);
      return;
    }

    if (order.status !== 'READY') {
      console.log(`🔄 Updating order ${orderId} to READY`);
      socket.emit('update_order_status', { orderId, status: 'READY' });
    } else {
      console.log(`⚠️ Order ${orderId} already READY`);
    }
  };

  // Automatically process items with isCompleted: true and update order status
  useEffect(() => {
    const processCompletedItems = async () => {
      if (isOffline || isLoading || showSessionExpiredModal) {
        console.log('⏸️ Skipping processCompletedItems: offline, loading, or session expired');
        return;
      }

      const productCache = loadCachedProductAssignments();
      const currentUserId = localStorage.getItem('userId');
      console.log('🔍 Processing completed items for userId:', currentUserId);

      for (const order of orders) {
        let shouldUpdateOrder = true; // Flag to determine if order should be set to READY

        for (const item of order.orderItems) {
          if (
            ['PENDING', 'COOKING'].includes(item.status) &&
            item.product?.id &&
            !updatingItems.has(item.id)
          ) {
            console.log(`🔎 Checking item ${item.id} (status: ${item.status}, productId: ${item.product.id})`);
            const { isCompleted, assignedToId } = await fetchProductAssignedToId(item.product.id, productCache);
            console.log(`🔍 Product ${item.product.id} - isCompleted: ${isCompleted}, assignedToId: ${assignedToId}`);

            if (isCompleted && assignedToId === currentUserId) {
              console.log(`🔄 Auto-processing item ${item.id} with isCompleted: true to READY`);
              setUpdatingItems((prev) => new Set(prev).add(item.id));
              socket.emit('update_order_item_status', { itemId: item.id, status: 'READY' });
              await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
            } else {
              console.log(`⚠️ Item ${item.id} not processed: isCompleted=${isCompleted}, assignedToId=${assignedToId}, currentUserId=${currentUserId}`);
              if (!isCompleted || item.status !== 'READY') {
                shouldUpdateOrder = false; // Non-completed or non-READY items prevent order from being READY
              }
            }
          } else if (item.status !== 'READY') {
            console.log(`⚠️ Skipping item ${item.id}: Invalid status (${item.status}) or missing product ID`);
            shouldUpdateOrder = false; // Non-READY items prevent order from being READY
          }
        }

        // Update order status to READY if all items are processed or already READY
        if (shouldUpdateOrder && ['PENDING', 'COOKING'].includes(order.status)) {
          updateOrderStatusToReady(order.id);
        }
      }
    };

    processCompletedItems();
  }, [orders, isOffline, isLoading, showSessionExpiredModal]);

  useEffect(() => {
    console.log('🔍 localStorage userId:', localStorage.getItem('userId'));

    // Load cached orders if offline
    if (!navigator.onLine) {
      const { orders: cachedOrders, timestamp } = loadCachedOrders();
      if (cachedOrders.length > 0) {
        setOrders(cachedOrders);
        setLastUpdateTime(timestamp || new Date());
        setIsOffline(true);
        setIsLoading(false);
      }
    } else {
      fetchOrders(true);
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
      console.log('🌐 Back online, fetching fresh data...');
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

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleConnect = () => {
      setIsConnected(true);
      setLastUpdateTime(new Date());
    };

    const handleDisconnect = () => {
      console.log('🔴 Kitchen Panel: WebSocket disconnected');
      setIsConnected(false);
    };

    const handleOrderCreated = async (newOrder) => {
      console.log('🆕 New order received:', newOrder);
      setLastUpdateTime(new Date());

      const currentUserId = localStorage.getItem('userId');
      console.log('🔍 Current userId:', currentUserId);

      const productCache = loadCachedProductAssignments();
      let shouldUpdateOrder = true; // Flag to determine if order should be set to READY

      const hasAssignedOrder = await Promise.all(
        newOrder.orderItems.map(async (item) => {
          if (item.status !== 'PENDING' || !item.product || !item.product.id) {
            shouldUpdateOrder = false;
            return false;
          }
          const { assignedToId, isCompleted } = await fetchProductAssignedToId(item.product.id, productCache);
          if (isCompleted && assignedToId === currentUserId) {
            console.log(`🔄 Auto-processing new item ${item.id} with isCompleted: true to READY`);
            setUpdatingItems((prev) => new Set(prev).add(item.id));
            socket.emit('update_order_item_status', { itemId: item.id, status: 'READY' });
            await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
            return true;
          }
          if (!isCompleted) {
            shouldUpdateOrder = false; // Non-completed item prevents order from being READY
          }
          return assignedToId === currentUserId;
        })
      ).then((results) => results.some((result) => result));

      if (shouldUpdateOrder) {
        updateOrderStatusToReady(newOrder.id);
      }

      if (hasAssignedOrder) {
        console.log('🔔 Playing sound: Matching order found');
        try {
          await audio.play();
          console.log('✅ Audio played successfully');
        } catch (error) {
          console.error('❌ Audio playback error:', error.message);
        }
      }

      setOrders((prevOrders) => {
        const existingOrder = prevOrders.find((order) => order.id === newOrder.id);
        if (existingOrder) {
          console.log('⚠️ Order already exists, not adding');
          return prevOrders;
        }

        const updatedOrders = [...prevOrders, newOrder];
        console.log('✅ New order added, total:', updatedOrders.length);
        saveOrdersToCache(updatedOrders);
        return updatedOrders;
      });
    };

    const handleOrderUpdated = (updatedOrder) => {
      console.log('🔄 Order updated:', updatedOrder);
      setLastUpdateTime(new Date());

      if (!updatedOrder.orderItems) {
        console.log(`⚠️ Incomplete data received, ID: ${updatedOrder.id}`);
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
          )
        );
        saveOrdersToCache(orders);
        return;
      }

      setOrders((prevOrders) => {
        const orderExists = prevOrders.some((order) => order.id === updatedOrder.id);

        if (!orderExists) {
          console.log('🆕 Updated order not found, adding:', updatedOrder.id);
          const updatedOrders = [...prevOrders, updatedOrder];
          saveOrdersToCache(updatedOrders);
          return updatedOrders;
        }

        const updatedOrders = prevOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        );
        saveOrdersToCache(updatedOrders);
        return updatedOrders;
      });
    };

    const handleOrderDeleted = ({ id }) => {
      console.log(`🗑️ Order deleted:`, id);
      setLastUpdateTime(new Date());
      setOrders((prevOrders) => {
        const updatedOrders = prevOrders.filter((order) => order.id !== id);
        saveOrdersToCache(updatedOrders);
        return updatedOrders;
      });
    };

    const handleOrderItemStatusUpdated = async (updatedItem) => {
      console.log('📝 Item status updated:', updatedItem);
      setLastUpdateTime(new Date());

      const currentUserId = localStorage.getItem('userId');
      const productCache = loadCachedProductAssignments();

      // Only play sound for automatic updates or new items, not manual clicks
      if (['PENDING', 'COOKING', 'READY'].includes(updatedItem.status) && updatedItem.product && updatedItem.product.id) {
        const { assignedToId, isCompleted } = await fetchProductAssignedToId(updatedItem.product.id, productCache);
        if (assignedToId === currentUserId && isCompleted) {
          console.log(`🔔 Playing sound: Status changed to ${updatedItem.status} for matching product (auto)`);
          try {
            await audio.play();
            console.log('✅ Audio played successfully');
          } catch (error) {
            console.error('❌ Audio playback error:', error.message);
          }
        } else {
          console.log('⚠️ No sound played: Manual update or user not assigned');
        }
      } else {
        console.log('⚠️ Invalid item: Status not relevant or no product ID');
      }

      if (!updatedItem.product || !updatedItem.product.name) {
        console.log(`⚠️ No product information`);
        return;
      }

      setOrders((prevOrders) => {
        const updatedOrders = prevOrders.map((order) => ({
          ...order,
          orderItems: order.orderItems.map((item) =>
            item.id === updatedItem.id ? { ...item, ...updatedItem } : item
          ),
        }));
        saveOrdersToCache(updatedOrders);
        return updatedOrders;
      });

      setUpdatingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(updatedItem.id);
        return newSet;
      });

      // Check if order should be updated to READY
      const order = orders.find((o) => o.id === updatedItem.orderId);
      if (order && updatedItem.status === 'READY') {
        const allItemsReady = order.orderItems.every((item) => item.status === 'READY');
        if (allItemsReady) {
          updateOrderStatusToReady(updatedItem.orderId);
        }
      }
    };

    const handleOrderItemDeleted = ({ id }) => {
      console.log(`🗑️ Item deleted:`, id);
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
      console.log('➕ New item added:', newItem);
      setLastUpdateTime(new Date());

      const currentUserId = localStorage.getItem('userId');
      console.log('🔍 Current userId:', currentUserId, 'ProductId:', newItem.product?.id || 'N/A');

      const productCache = loadCachedProductAssignments();

      if (newItem.status === 'PENDING' && newItem.product && newItem.product.id) {
        const { assignedToId, isCompleted } = await fetchProductAssignedToId(newItem.product.id, productCache);
        if (isCompleted && assignedToId === currentUserId) {
          console.log(`🔄 Auto-processing new item ${newItem.id} with isCompleted: true to READY`);
          setUpdatingItems((prev) => new Set(prev).add(newItem.id));
          socket.emit('update_order_item_status', { itemId: newItem.id, status: 'READY' });
          await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
          // Check if all items in the order are READY or completed
          const order = orders.find((o) => o.id === newItem.orderId) || { orderItems: [] };
          const allItems = [...order.orderItems, newItem];
          const allItemsReadyOrCompleted = await Promise.all(
            allItems.map(async (item) => {
              if (item.status === 'READY') return true;
              if (item.product?.id) {
                const { isCompleted: itemCompleted } = await fetchProductAssignedToId(item.product.id, productCache);
                return itemCompleted;
              }
              return false;
            })
          );
          if (allItemsReadyOrCompleted.every((ready) => ready)) {
            updateOrderStatusToReady(newItem.orderId);
          }
        } else if (assignedToId === currentUserId) {
          console.log('🔔 Playing sound: Matching product found');
          try {
            await audio.play();
            console.log('✅ Audio played successfully');
          } catch (error) {
            console.error('❌ Audio playback error:', error.message);
          }
        }
      } else {
        console.log('⚠️ Invalid item: Status not PENDING or no product ID');
      }

      setOrders((prevOrders) => {
        const updatedOrders = prevOrders.map((order) => {
          if (order.id === newItem.orderId) {
            const itemExists = order.orderItems.some((item) => item.id === newItem.id);
            if (!itemExists) {
              return {
                ...order,
                orderItems: [...order.orderItems, newItem],
              };
            }
          }
          return order;
        });
        saveOrdersToCache(updatedOrders);
        return updatedOrders;
      });
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
      console.log('🔄 WebSocket reconnected, refreshing data...');
      fetchOrders(false);
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
      socket.off('reconnect');
      clearInterval(pollInterval);
      clearInterval(autoRefreshInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateOrderItemStatus = async (itemId, status) => {
    try {
      console.log(`🔄 Updating item ${itemId} to status ${status}...`);
      setUpdatingItems((prev) => new Set(prev).add(itemId));
      socket.emit('update_order_item_status', { itemId, status });
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

    if (diffInMinutes < 60) {
      return `${diffInMinutes} дақиқа олдин`;
    }
    return date.toLocaleTimeString('uz-Cyrl-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const visibleOrders = orders
  .filter(
    (order) =>
      ['PENDING', 'COOKING'].includes(order.status) &&
      order.orderItems.some(
        (item) =>
          ['PENDING', 'COOKING'].includes(item.status) &&
          item.product &&
          (!selectedUsername ||
            (item.product.assignedTo && item.product.assignedTo.username === selectedUsername))
      )
  )
  .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Sort oldest first

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
          displayName: user.name || 'Номаълум',
        };
      case 'CUSTOMER':
        return {
          roleText: 'Админ',
          displayName: 'Админ',
        };
      default:
        return {
          roleText: user.role || 'Номаълум',
          displayName: user.name || 'Номаълум',
        };
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
                <div className={`order-card ${orderInfo.type === 'delivery' ? 'delivery-order' : ''}`} key={order.id}>
                  <div className="order-header">
                    <div className="order-single-line">
                      <orderInfo.icon size={16} />
                      <span>
                        {orderInfo.type === 'dine_in' ? `${order.table.name} ${order.table.number}` :
                          orderInfo.type === 'delivery' ? `Доставка ${order.carrierNumber}` : 'Номаълум'}
                      </span>
                      <span> </span>
                      <Clock size={14} />
                      <span>{formatTime(order.createdAt)}</span>
                      <span> </span>
                      <span> </span>
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