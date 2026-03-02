import { createContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [deviceEvents, setDeviceEvents] = useState([]);

    const connect = useCallback(() => {
        const newSocket = io('/dashboard', {
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            console.log('📊 Dashboard connected to server');
            setConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('📊 Dashboard disconnected');
            setConnected(false);
        });

        // Listen for device status changes
        newSocket.on('device:status-change', (data) => {
            setDeviceEvents((prev) => [data, ...prev.slice(0, 49)]);
            // Dispatch custom event so components can react
            window.dispatchEvent(new CustomEvent('device-status-change', { detail: data }));
        });

        // Listen for relay state changes
        newSocket.on('relay:state-change', (data) => {
            window.dispatchEvent(new CustomEvent('relay-state-change', { detail: data }));
        });

        // Listen for command responses
        newSocket.on('command:response', (data) => {
            window.dispatchEvent(new CustomEvent('command-response', { detail: data }));
        });

        // Listen for input state changes
        newSocket.on('input:state-change', (data) => {
            window.dispatchEvent(new CustomEvent('input-state-change', { detail: data }));
        });

        // Listen for high-priority alerts
        newSocket.on('notification:alert', (data) => {
            window.dispatchEvent(new CustomEvent('notification-alert', { detail: data }));
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        const cleanup = connect();
        return cleanup;
    }, [connect]);

    return (
        <SocketContext.Provider value={{ socket, connected, deviceEvents }}>
            {children}
        </SocketContext.Provider>
    );
}
