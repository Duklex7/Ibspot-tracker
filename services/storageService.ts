import { IsinEntry, User, DEFAULT_USERS, FirebaseConfig } from '../types';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    query, 
    orderBy, 
    Firestore, 
    doc,
    setDoc,
    deleteDoc,
    getDoc
} from 'firebase/firestore';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    User as FirebaseUser,
    Auth,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';

const STORAGE_KEY_ENTRIES = 'ibspot_entries';
const STORAGE_KEY_USERS = 'ibspot_users_list';

// CONFIGURACIÓN COMPARTIDA
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
let auth: Auth | null = null;
let isCloudEnabled = false;

// --- Initialization ---

export const initializeCloud = () => {
    try {
        if (!firebaseApp) {
            firebaseApp = initializeApp(SHARED_CONFIG);
            db = getFirestore(firebaseApp);
            auth = getAuth(firebaseApp);
            isCloudEnabled = true;
            console.log("Ibspot Cloud & Auth Connected");
        }
    } catch (e) {
        console.error("Error connecting to cloud:", e);
        isCloudEnabled = false;
    }
};

// Auto-init on load
initializeCloud();

export const isOnline = () => isCloudEnabled;

// --- Authentication ---

export const subscribeToAuth = (callback: (user: User | null) => void) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // Get user profile from Firestore
            if (db) {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    callback(userDoc.data() as User);
                } else {
                    // Fallback / Auto-repair profile from Auth data
                    const newUser: User = {
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
                        email: firebaseUser.email || '',
                        avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                        active: true
                    };
                    callback(newUser);
                }
            }
        } else {
            callback(null);
        }
    });
};

export const loginUser = async (email: string, pass: string) => {
    if (!auth) throw new Error("No hay conexión");
    await signInWithEmailAndPassword(auth, email, pass);
};

export const loginWithGoogle = async () => {
    if (!auth || !db) throw new Error("No hay conexión");
    const provider = new GoogleAuthProvider();
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user profile exists in Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            // Create new profile automatically using Google data
            const newUser: User = {
                id: user.uid,
                name: user.displayName || "Usuario Google",
                email: user.email || "",
                avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                active: true
            };
            await setDoc(userDocRef, newUser);
        }
    } catch (error) {
        console.error("Google Login Error", error);
        throw error;
    }
};

export const registerUser = async (email: string, pass: string, name: string, avatarDataUrl?: string) => {
    if (!auth || !db) throw new Error("No hay conexión");
    
    // 1. Create Auth User
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = userCredential.user.uid;
    
    // 2. Create Firestore Profile
    const newUser: User = {
        id: uid,
        name: name,
        email: email,
        avatar: avatarDataUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        active: true
    };
    
    await setDoc(doc(db, "users", uid), newUser);
    return newUser;
};

export const logoutUser = async () => {
    if (!auth) return;
    await signOut(auth);
};

// --- Subscriptions (Real-time Data) ---

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

// --- Entries Operations ---

export const saveEntry = async (entry: IsinEntry): Promise<void> => {
    // 1. Save Local (Optimistic UI)
    const existing = getEntriesLocal();
    const updated = [entry, ...existing];
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(updated));

    // 2. Save Cloud
    if (isCloudEnabled && db) {
        try {
            const { id, ...data } = entry;
            await setDoc(doc(db, "entries", id), data);
        } catch (e) {
            console.error("Error saving to cloud", e);
            throw e; 
        }
    }
};

export const deleteEntry = async (id: string): Promise<void> => {
    // 1. Local
    const existing = getEntriesLocal();
    const updated = existing.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(updated));

    // 2. Cloud
    if (isCloudEnabled && db) {
        try {
            await deleteDoc(doc(db, "entries", id));
        } catch (e) {
            console.error("Error deleting from cloud", e);
        }
    }
};

// --- Local Helpers ---

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

export const getUsers = (): User[] => {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) return DEFAULT_USERS;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return DEFAULT_USERS;
    }
};

export const syncLocalToCloud = async (silent: boolean = false) => {
    // Deprecated for data, but kept for legacy cleanups if needed.
    // With Auth, we trust Firestore as source of truth.
};