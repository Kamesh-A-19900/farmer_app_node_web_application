import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    const socketUrl = import.meta.env.VITE_SOCKET_URL
      || `http://${window.location.hostname}:5000`;
    socketRef.current = io(socketUrl, { auth: { token } });

    socketRef.current.on('user_connected', ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });
    socketRef.current.on('user_disconnected', ({ userId }) => {
      setOnlineUsers((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    });

    return () => { socketRef.current?.disconnect(); };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
