import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export const useSocket = (onAlert, onAlertUpdate, onCameraStatus) => {
  const handlersRef = useRef({ onAlert, onAlertUpdate, onCameraStatus });

  useEffect(() => {
    handlersRef.current = { onAlert, onAlertUpdate, onCameraStatus };
  });

  useEffect(() => {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || '';

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { token: localStorage.getItem('sai_token') },
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
    }

    const socket = socketInstance;

    socket.on('new_alert', (alert) => handlersRef.current.onAlert?.(alert));
    socket.on('alert_updated', (alert) => handlersRef.current.onAlertUpdate?.(alert));
    socket.on('camera_status', (data) => handlersRef.current.onCameraStatus?.(data));

    return () => {
      socket.off('new_alert');
      socket.off('alert_updated');
      socket.off('camera_status');
    };
  }, []);
};
