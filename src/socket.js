import io from 'socket.io-client';

const socket = io('https://suddocs.uz', {
  path: '/socket.io',
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('🟢 WebSocket connected');
});

socket.on('connect_error', (error) => {
  console.error('❌ WebSocket connection error:', error);
});

socket.on('reconnect', (attempt) => {
  console.log(`🔄 WebSocket reconnected after ${attempt} attempts`);
});

socket.on('reconnect_failed', () => {
  console.error('❌ WebSocket reconnection failed');
});

export { socket };