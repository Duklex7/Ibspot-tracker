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
    getDoc,
    updateDoc
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
    signInWithPopup,
    updateProfile
} from 'firebase/auth';

const STORAGE_KEY_ENTRIES = 'ibspot_entries';
const STORAGE_KEY_USERS = 'ibspot_users_list';
const STORAGE_KEY_LOCAL_USER = 'ibspot_local_active_user';

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
            try {
                db = getFirestore(firebaseApp);
                auth = getAuth(firebaseApp);
                isCloudEnabled = true;
                console.log("Ibspot Cloud & Auth Connected");
            } catch (serviceError) {
                console.error("Firebase Service Initialization Failed - Switching to Offline Mode:", serviceError);
                isCloudEnabled = false;
            }
        }
    } catch (e) {
        console.error("Error connecting to cloud - Switching to Offline Mode:", e);
        isCloudEnabled = false;
    }
};

initializeCloud();

export const isOnline = () => isCloudEnabled;

// --- Helpers for Local Mode ---
const setLocalUser = (user: User | null) => {
    if (user) {
        localStorage.setItem(STORAGE_KEY_LOCAL_USER, JSON.stringify(user));
    } else {
        localStorage.removeItem(STORAGE_KEY_LOCAL_USER);
    }
    window.dispatchEvent(new Event('ibspot_auth_change'));
};

const getLocalUser = (): User | null => {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_USER);
    return raw ? JSON.parse(raw) : null;
};

// --- Authentication ---

export const subscribeToAuth = (callback: (user: User | null) => void) => {
    // 1. Check Local User first (Offline Mode Priority)
    const localUser = getLocalUser();
    if (localUser) {
        callback(localUser);
    }

    // 2. Listen for Local Auth Changes
    const localListener = () => {
        const u = getLocalUser();
        if (u) callback(u);
        else if (!auth) callback(null); 
    };
    window.addEventListener('ibspot_auth_change', localListener);

    // 3. Setup Firebase Listener if available
    let unsubFirebase = () => {};
    if (auth) {
        unsubFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                if (db) {
                    try {
                        const userDocRef = doc(db, "users", firebaseUser.uid);
                        const userDoc = await getDoc(userDocRef);
                        if (userDoc.exists()) {
                            callback(userDoc.data() as User);
                        } else {
                            const newUser: User = {
                                id: firebaseUser.uid,
                                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
                                email: firebaseUser.email || '',
                                avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                                active: true,
                                role: 'user'
                            };
                            setDoc(userDocRef, newUser).catch(console.error);
                            callback(newUser);
                        }
                    } catch (e) {
                         const fallbackUser: User = {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || 'Usuario',
                            email: firebaseUser.email || '',
                            avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                            active: true,
                            role: 'user'
                        };
                        callback(fallbackUser);
                    }
                } else {
                     const fallbackUser: User = {
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || 'Usuario',
                        email: firebaseUser.email || '',
                        avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                        active: true,
                        role: 'user'
                    };
                    callback(fallbackUser);
                }
            } else {
                const u = getLocalUser();
                callback(u); 
            }
        });
    } else {
        if (!localUser) callback(null);
    }

    return () => {
        window.removeEventListener('ibspot_auth_change', localListener);
        unsubFirebase();
    };
};

export const loginUser = async (email: string, pass: string) => {
    if (auth) {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            return;
        } catch (e) {
            console.error("Firebase login failed:", e);
            throw e; 
        }
    }
    
    // Offline Mode Login Logic - STRICT EMAIL MATCHING
    const localUsers = getUsersLocal();
    const existingUser = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existingUser) {
        setLocalUser(existingUser);
    } else {
        // Create new based on INPUT email, not random
        const mockUser: User = {
            id: 'local-' + Date.now(),
            name: email.split('@')[0],
            email: email, // Use actual email
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            active: true,
            role: 'user'
        };
        const updatedUsers = [...localUsers, mockUser];
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
        setLocalUser(mockUser);
    }
};

export const loginWithGoogle = async () => {
    if (!auth) {
         throw { code: 'auth/offline-mode-simulation' };
    }

    const provider = new GoogleAuthProvider();
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        if (db) {
            const userDocRef = doc(db, "users", user.uid);
            let userDoc;
            try { userDoc = await getDoc(userDocRef); } catch(e){}

            if (!userDoc || !userDoc.exists()) {
                const newUser: User = {
                    id: user.uid,
                    name: user.displayName || "Usuario Google",
                    email: user.email || "",
                    avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                    active: true,
                    role: 'user'
                };
                await setDoc(userDocRef, newUser);
            }
        }
    } catch (error: any) {
        if (error.code === 'auth/unauthorized-domain' || error.code === 'auth/operation-not-allowed') {
            throw error;
        }
        throw error;
    }
};

// Function for Manual Google Login Form (Offline/Domain restricted)
export const loginWithGoogleManual = async (email: string, name: string, avatarUrl?: string) => {
    const localUsers = getUsersLocal();
    const existingUser = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existingUser) {
        // Update existing user with new details if provided
        if (name && existingUser.name !== name) existingUser.name = name;
        if (avatarUrl && existingUser.avatar !== avatarUrl) existingUser.avatar = avatarUrl;
        
        const updatedList = localUsers.map(u => u.id === existingUser.id ? existingUser : u);
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedList));
        
        setLocalUser(existingUser);
    } else {
        // Create specific local user matching Google details
        const newUser: User = {
            id: 'google-manual-' + Date.now(),
            name: name || email.split('@')[0],
            email: email,
            avatar: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            active: true,
            role: 'user'
        };
        const updatedUsers = [...localUsers, newUser];
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
        setLocalUser(newUser);
    }
};

export const registerUser = async (email: string, pass: string, name: string, avatarDataUrl?: string) => {
    if (auth) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const uid = userCredential.user.uid;
            
            const newUser: User = {
                id: uid,
                name: name,
                email: email,
                avatar: avatarDataUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
                active: true,
                role: 'user'
            };
            
            if (db) {
                try {
                    await setDoc(doc(db, "users", uid), newUser);
                } catch (e) {
                    console.error("Profile save failed, but auth worked.", e);
                }
            }
            return newUser;
        } catch (e: any) {
            console.error("Cloud registration failed:", e);
            throw e;
        }
    } else {
        const newUser: User = {
            id: 'local-' + Date.now(),
            name: name,
            email: email,
            avatar: avatarDataUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
            active: true,
            role: 'user'
        };
        const localUsers = getUsersLocal();
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify([...localUsers, newUser]));
        
        setLocalUser(newUser);
        return newUser;
    }
};

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
    // 1. Update Local Session
    const currentUser = getLocalUser();
    if (currentUser && currentUser.id === userId) {
        const updated = { ...currentUser, ...updates };
        setLocalUser(updated);
    }

    // 2. Update Local Global List
    const localUsers = getUsersLocal();
    const updatedUsers = localUsers.map(u => u.id === userId ? { ...u, ...updates } : u);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));

    // 3. Update Cloud (if available)
    if (isCloudEnabled && db && auth && auth.currentUser) {
        try {
            await updateDoc(doc(db, "users", userId), updates);
            if (updates.name) {
                await updateProfile(auth.currentUser, { displayName: updates.name });
            }
        } catch (e) {
            console.error("Error updating cloud profile:", e);
        }
    }
};

// --- ADMIN FUNCTIONS ---

export const adminDeleteUser = async (userId: string) => {
    // 1. Local
    const localUsers = getUsersLocal();
    const updatedUsers = localUsers.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
    
    // Check if we deleted the current user
    const currentUser = getLocalUser();
    if (currentUser && currentUser.id === userId) {
        setLocalUser(null);
    }

    // 2. Cloud
    if (isCloudEnabled && db) {
        try {
            await deleteDoc(doc(db, "users", userId));
        } catch (e) {
            console.error("Cloud delete user failed", e);
        }
    }
};

export const adminToggleUserStatus = async (userId: string, active: boolean) => {
    await updateUserProfile(userId, { active });
};

export const adminUpdateUser = async (userId: string, data: Partial<User>) => {
    await updateUserProfile(userId, data);
};

export const logoutUser = async () => {
    setLocalUser(null);
    if (auth) await signOut(auth);
};

// --- Subscriptions (Real-time Data) ---

export const subscribeToEntries = (callback: (entries: IsinEntry[]) => void) => {
    const localEntries = getEntriesLocal();
    callback(localEntries);

    if (isCloudEnabled && db) {
        const q = query(collection(db, "entries"), orderBy("timestamp", "desc"));
        return onSnapshot(q, (snapshot) => {
            const entries: IsinEntry[] = [];
            snapshot.forEach((doc) => {
                entries.push({ ...doc.data(), id: doc.id } as IsinEntry);
            });
            localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
            callback(entries);
        }, (error) => {
            console.error("Cloud Sync Error (Entries) - Using Local Data:", error);
        });
    }
    return () => {};
};

export const subscribeToUsers = (callback: (users: User[]) => void) => {
    const localUsers = getUsersLocal();
    callback(localUsers);

    if (isCloudEnabled && db) {
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
        }, (error) => {
             console.error("Cloud Sync Error (Users) - Using Local Data:", error);
        });
    }
    return () => {};
};

// --- Entries Operations ---

export const saveEntry = async (entry: IsinEntry): Promise<void> => {
    const existing = getEntriesLocal();
    const updated = [entry, ...existing];
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(updated));

    if (isCloudEnabled && db) {
        try {
            const { id, ...data } = entry;
            await setDoc(doc(db, "entries", id), data);
        } catch (e) {
            console.error("Error saving to cloud (saved locally)", e);
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
            console.error("Error deleting from cloud (deleted locally)", e);
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

const getUsersLocal = (): User[] => {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) return DEFAULT_USERS;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return DEFAULT_USERS;
    }
};

export const getUsers = (): User[] => {
    return getUsersLocal();
};

export const syncLocalToCloud = async (silent: boolean = false) => {
};