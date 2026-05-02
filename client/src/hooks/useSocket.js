import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

const offlineValue = { socket: null, connected: false, deviceEvents: [] };

/**
 * Fora do SocketProvider (ex.: perfil gestor de convites), retorna estado offline
 * para o Header e demais telas não quebrarem.
 */
export function useSocket() {
    const context = useContext(SocketContext);
    return context ?? offlineValue;
}
