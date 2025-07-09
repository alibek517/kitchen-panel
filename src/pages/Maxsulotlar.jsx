import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import {
    ChefHat,
    Home,
    Archive,
    UtensilsCrossed,
} from 'lucide-react';
import './Maxsulotlar.css';

function Maxsulotlar() {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingItems, setUpdatingItems] = useState(new Set());
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
    const [selectedUsername, setSelectedUsername] = useState('');
    const [kitchenUsers, setKitchenUsers] = useState([]);
    const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
    const [filter, setFilter] = useState('unfinished');
    const navigate = useNavigate();
    const location = useLocation();
    const audio = new Audio('/notification.mp3');

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
            const res = await axios.get('https://alikafecrm.uz/order/kitchen');
            console.log('📦 Буюртмалар юкланди:', res.data);
            const validOrders = res.data.filter(order => order.id && order.orderItems);
            setOrders(validOrders);
            setLastUpdateTime(new Date());
        } catch (error) {
            console.error('❌ Буюртмаларни олишда хатолик:', error.message);
            setOrders((prevOrders) => prevOrders);
        } finally {
            if (isInitialFetch) setIsLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            const res = await axios.get('https://alikafecrm.uz/product/');
            console.log('🍽️ Махсулотлар юкланди:', res.data);
            const validProducts = res.data.filter(product => product.id && typeof product.isFinished === 'boolean');
            setProducts(validProducts);
        } catch (error) {
            console.error('❌ Махсулотларни олишда хатолик:', error.message);
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleProductStatus = async (productId, currentStatus) => {
        try {
            setUpdatingItems((prev) => new Set(prev).add(productId));
            const newStatus = !currentStatus;
            const response = await axios.put(
                `https://alikafecrm.uz/product/${productId}`,
                { isFinished: newStatus },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            console.log('✅ Product status updated:', response.data);
            setProducts((prevProducts) =>
                prevProducts.map((product) =>
                    product.id === productId ? { ...product, isFinished: newStatus } : product
                )
            );
            setLastUpdateTime(new Date());
        } catch (error) {
            console.error('❌ Error updating product status:', error.message);
        } finally {
            setUpdatingItems((prev) => {
                const newSet = new Set(prev);
                newSet.delete(productId);
                return newSet;
            });
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
        setShowSessionExpiredModal(false);
        navigate('/login');
    };

    const autoRefresh = async () => {
        const isSessionValid = await checkSessionStatus();
        if (!isSessionValid) {
            console.log('🔴 Session expired, stopping auto-refresh');
            return;
        }
        if (!socket.connected) {
            console.log('🔄 Автоматик янгилаш: WebSocket узилган, маълумотлар янгиланмоқда...');
            await fetchOrders(false);
            await fetchProducts();
        } else {
            console.log('🔄 Автом abstain янгилаш: WebSocket фаол, фақат вақт янгиланмоқда');
            setLastUpdateTime(new Date());
        }
    };

    useEffect(() => {
        fetchOrders(true);
        fetchProducts();
        fetchKitchenUsers();
        checkSessionStatus();

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
            audio.play().catch((error) => console.error('❌ Audio playback error:', error.message));
            setOrders((prevOrders) => {
                const existingOrder = prevOrders.find((order) => order.id === newOrder.id);
                if (existingOrder) {
                    console.log('⚠️ Буюртма аллақачон мавжуд, қайта қўшилмайди');
                    return prevOrders;
                }
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
                audio.play().catch((error) => console.error('❌ Audio playback error:', error.message));
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
            audio.play().catch((error) => console.error('❌ Audio playback error:', error.message));
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
            fetchOrders(false);
            fetchProducts();
        });

        const pollInterval = setInterval(() => {
            if (!socket.connected) {
                console.log('🔄 WebSocket узилган, polling ишлатилмоқда...');
                fetchOrders(false);
                fetchProducts();
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

    // Filter products based on isFinished and selectedUsername, aligned with KitchenPanel
    const filteredProducts = products.filter(product =>
        (filter === 'finished' ? product.isFinished : !product.isFinished) &&
        (!selectedUsername ||
            (product.assignedTo && product.assignedTo.username === selectedUsername))
    );

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
                        Буюртмалар
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
            <div className="filter-buttons">
                <button
                    className={`filter-btn ${filter === 'unfinished' ? 'active' : ''}`}
                    onClick={() => setFilter('unfinished')}
                >
                    Мавжуд
                </button>
                <button
                    className={`filter-btn ${filter === 'finished' ? 'active' : ''}`}
                    onClick={() => setFilter('finished')}
                >
                    Тугалланган
                </button>
            </div>
            <div className="products-list">
                {isLoading ? (
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">Юкланмоқда...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>

                        <p className="no-products">Ҳозирча махсулотлар мавжуд эмас.</p>                        
                    </div>
                ) : (
                    <ul className="product-items">
                        {filteredProducts.map((product) => (
                            <li key={product.id} className="product-item">
                                <div className="product-details">
                                    <span className="product-name">{product.name || 'Номаълум махсулот'}</span>
                                    
                                    <button
                                        onClick={() => toggleProductStatus(product.id, product.isFinished)}
                                        className={`toggle-btn ${product.isFinished ? 'unfinish' : 'finish'}`}
                                        disabled={updatingItems.has(product.id)}
                                    >
                                        {updatingItems.has(product.id) ? (
                                            <span>Янгиланмоқда...</span>
                                        ) : (
                                            <span>{product.isFinished ? 'Қайта очмоқ' : 'Тугатиш'}</span>
                                        )}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <SessionExpiredModal
                isOpen={showSessionExpiredModal}
                onConfirm={handleSessionExpiredConfirm}
            />
        </div>
    );
}

export default Maxsulotlar;