import { IsinEntry, User, DEFAULT_USERS, FirebaseConfig } from '../types';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    Firestore, 
    doc,
    setDoc,
    getDocs,
    updateDoc,
    deleteDoc
} from 'firebase/firestore';

const STORAGE_KEY_ENTRIES = 'ibspot_entries';
const STORAGE_KEY_USER = 'ibspot_current_user_id';
const STORAGE_KEY_USERS = 'ibspot_users_list';
const STORAGE_KEY_FIREBASE_CONFIG = 'ibspot_firebase_config';

// CONFIGURACIÓN COMPARTIDA (Hardcoded para acceso público inmediato)
const SHARED_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyAUWszewP2GYwK-O3EsY_Jg1wb1jbD0uPM",
  authDomain: "ibspot-tracker.firebaseapp.com",
  projectId: "ibspot-tracker",
  storageBucket: "ibspot-tracker.firebasestorage.app",
  messagingSenderId: "127138134154",
  appId: "1:127138134154:web:0be3ed1cf2b03474fe9573"
};

// Global Cloud State
let firebaseApp: FirebaseApp | null = null;
let db: Firestore | null = null;
let isCloudEnabled = false;

// --- Initialization ---

export const getFirebaseConfig = (): FirebaseConfig | null => {
    const raw = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    return raw ? JSON.parse(raw) : SHARED_CONFIG;
};

export const saveFirebaseConfig = (config: FirebaseConfig) => {
    localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
    initializeCloud(config);
};

export const clearFirebaseConfig = () => {
    localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
    firebaseApp = null;
    db = null;
    isCloudEnabled = false;
    window.location.reload(); 
};

export const initializeCloud = (config: FirebaseConfig) => {
    try {
        if (!firebaseApp) {
            firebaseApp = initializeApp(config);
            db = getFirestore(firebaseApp);
            isCloudEnabled = true;
            console.log("Ibspot Cloud Connected");
        }
    } catch (e) {
        console.error("Error connecting to cloud:", e);
        isCloudEnabled = false;
    }
};

const configToLoad = getFirebaseConfig();
if (configToLoad) {
    initializeCloud(configToLoad);
}

export const isOnline = () => isCloudEnabled;

// --- Subscriptions (Real-time) ---

export const subscribeToEntries = (callback: (entries: IsinEntry[]) => void) => {
    if (!isCloudEnabled || !db) return () => {};

    const q = query(collection(db, "entries"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snapshot) => {
        const entries: IsinEntry[] = [];
        snapshot.forEach((doc) => {
            entries.push({ ...doc.data(), id: doc.id } as IsinEntry);
        });
        localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
        callback(entries);
    }, (error) => {
        console.error("Cloud Sync Error:", error);
    });
};

export const subscribeToUsers = (callback: (users: User[]) => void) => {
    if (!isCloudEnabled || !db) return () => {};

    const q = query(collection(db, "users"));
    return onSnapshot(q, (snapshot) => {
        const users: User[] = [];
        snapshot.forEach((doc) => {
            users.push({ ...doc.data(), id: doc.id } as User);
        });
        if (users.length > 0) {
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
            callback(users);
        }
    });
};

// --- Entries ---

export const saveEntry = async (entry: IsinEntry): Promise<void> => {
    const existing = getEntriesLocal();
    const updated = [entry, ...existing];
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(updated));

    if (isCloudEnabled && db) {
        try {
            const { id, ...data } = entry;
            await setDoc(doc(db, "entries", id), data);
        } catch (e) {
            console.error("Error saving to cloud", e);
        }
    }
};

export const deleteEntry = async (id: string): Promise<void> => {
    const existing = getEntriesLocal();
    const updated = existing.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(updated));

    if (isCloudEnabled && db) {
        try {
            await deleteDoc(doc(db, "entries", id));
        } catch (e) {
            console.error("Error deleting from cloud", e);
        }
    }
};

const getEntriesLocal = (): IsinEntry[] => {
    const raw = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
};

export const getEntries = (): IsinEntry[] => {
    return getEntriesLocal();
};

// --- Users ---

export const getUsers = (): User[] => {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
    }
    try {
        const parsed = JSON.parse(raw);
        return parsed.map((u: any) => ({
            ...u,
            active: u.active !== undefined ? u.active : true
        }));
    } catch (e) {
        return DEFAULT_USERS;
    }
};

export const saveUsers = async (users: User[]): Promise<void> => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));

    if (isCloudEnabled && db) {
        try {
            for (const user of users) {
                await setDoc(doc(db, "users", user.id), user);
            }
        } catch (e) {
            console.error("Error syncing users to cloud", e);
        }
    }
};

export const getCurrentUser = (): User => {
    const users = getUsers();
    const id = localStorage.getItem(STORAGE_KEY_USER);
    const user = users.find(u => u.id === id);
    const firstActive = users.find(u => u.active) || users[0];
    return user || firstActive;
};

export const setCurrentUser = (userId: string): void => {
    localStorage.setItem(STORAGE_KEY_USER, userId);
};

export const clearData = (): void => {
    localStorage.removeItem(STORAGE_KEY_ENTRIES);
}

// --- Migration Tool ---
export const syncLocalToCloud = async (silent: boolean = false) => {
    if (!isCloudEnabled || !db) return;

    const localEntries = getEntriesLocal();
    const localUsers = getUsers();

    try {
        console.log("Iniciando auto-sincronización...");
        // Sync Users
        for (const user of localUsers) {
            await setDoc(doc(db, "users", user.id), user);
        }
        // Sync Entries
        // Upload recent ones first
        const entryBatch = localEntries.slice(0, 500); 
        for (const entry of entryBatch) {
            await setDoc(doc(db, "entries", entry.id), {
                isin: entry.isin,
                userId: entry.userId,
                timestamp: entry.timestamp,
                dateStr: entry.dateStr
            });
        }
        console.log("Auto-sincronización completada.");
        if (!silent) {
            alert("Sincronización completada: Datos locales subidos a la nube.");
        }
    } catch (e) {
        console.error("Sync error", e);
        if (!silent) {
            alert("Hubo un error al subir los datos locales.");
        }
    }
};