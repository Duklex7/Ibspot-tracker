export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
    active: boolean;
    role?: 'admin' | 'user'; // Admin role support
}

export interface IsinEntry {
    id: string;
    isin: string;
    userId: string;
    timestamp: number;
    dateStr: string; // YYYY-MM-DD
}

export type TimeFrame = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year';

export interface DashboardStats {
    total: number;
    trend: number;
    dataPoints: { label: string; value: number }[];
}

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

export const DEFAULT_USERS: User[] = [
    { id: 'u1', name: 'Ana García', email: 'ana@ibspot.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana', active: true, role: 'user' },
    { id: 'u2', name: 'Carlos Ruiz', email: 'carlos@ibspot.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos', active: true, role: 'user' },
];