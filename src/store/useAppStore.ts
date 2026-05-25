import { create } from 'zustand';
import { Child, Alert } from '../types';

interface AppState {
    user: any | null;
    children: Child[];
    alerts: Alert[];
    selectedChild: Child | null;
    setUser: (user: any | null) => void;
    setChildren: (children: Child[]) => void;
    setAlerts: (alerts: Alert[]) => void;
    setSelectedChild: (child: Child | null) => void;
    clearState: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    user: null,
    children: [],
    alerts: [],
    selectedChild: null,
    setUser: (user) => set({ user }),
    setChildren: (children) => set({ children }),
    setAlerts: (alerts) => set({ alerts }),
    setSelectedChild: (selectedChild) => set({ selectedChild }),
    clearState: () => set({
        user: null,
        children: [],
        alerts: [],
        selectedChild: null
    })
}));
