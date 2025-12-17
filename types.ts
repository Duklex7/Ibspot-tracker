export interface User {
    id: string;
    name: string;
    avatar: string;
    active: boolean;
}

export interface IsinEntry {
    id: string;
    isin: string;
    userId: string;
    timestamp: number;
    dateStr: string; // YYYY-MM-DD for easier indexing
}

export type TimeFrame = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year';

export interface DashboardStats {
    total: number;
    trend: number; // Percentage change
    dataPoints: { label: string; value: number }[];
}

export const DEFAULT_USERS: User[] = [
    { id: 'u1', name: 'Ana García', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana', active: true },
    { id: 'u2', name: 'Carlos Ruiz', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos', active: true },
    { id: 'u3', name: 'Maria Lopez', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria', active: true },
    { id: 'u4', name: 'Juan Perez', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juan', active: true },
];