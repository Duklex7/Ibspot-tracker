import { IsinEntry, User, DEFAULT_USERS } from '../types';

const STORAGE_KEY_ENTRIES = 'ibspot_entries';
const STORAGE_KEY_USER = 'ibspot_current_user_id';
const STORAGE_KEY_USERS = 'ibspot_users_list';

// --- Entries ---

export const saveEntry = (entry: IsinEntry): void => {
    const existing = getEntries();
    const updated = [entry, ...existing];
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(updated));
};

export const getEntries = (): IsinEntry[] => {
    const raw = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error("Error parsing entries", e);
        return [];
    }
};

// --- Users ---

export const getUsers = (): User[] => {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
        // Initialize with default if empty
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
    }
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error("Error parsing users", e);
        return DEFAULT_USERS;
    }
};

export const saveUsers = (users: User[]): void => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
};

export const getCurrentUser = (): User => {
    const users = getUsers();
    const id = localStorage.getItem(STORAGE_KEY_USER);
    const user = users.find(u => u.id === id);
    return user || users[0];
};

export const setCurrentUser = (userId: string): void => {
    localStorage.setItem(STORAGE_KEY_USER, userId);
};

export const clearData = (): void => {
    localStorage.removeItem(STORAGE_KEY_ENTRIES);
    // Optional: We generally don't clear users on data clear, but could if requested.
}