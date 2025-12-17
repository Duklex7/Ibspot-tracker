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
            
            // Try initializing services individually to catch specific errors
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

// Auto-init on load
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
        else if (!auth) callback(null); // Clear if no auth service
    };
    window.addEventListener('ibspot_auth_change', localListener);

    // 3. Setup Firebase Listener if available
    let unsubFirebase = () => {};
    if (auth) {
        unsubFirebase = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Firebase Login Success
                if (db) {
                    try {
                        const userDocRef = doc(db, "users", firebaseUser.uid);
                        const userDoc = await getDoc(userDocRef);
                        if (userDoc.exists()) {
                            callback(userDoc.data() as User);
                        } else {
                            // Auto-repair
                            const newUser: User = {
                                id: firebaseUser.uid,
                                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
                                email: firebaseUser.email || '',
                                avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                                active: true
                            };
                            setDoc(userDocRef, newUser).catch(console.error);
                            callback(newUser);
                        }
                    } catch (e) {
                        // DB Error -> Use basic auth info
                         const fallbackUser: User = {
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || 'Usuario',
                            email: firebaseUser.email || '',
                            avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                            active: true
                        };
                        callback(fallbackUser);
                    }
                } else {
                     // Auth only (no DB)
                     const fallbackUser: User = {
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || 'Usuario',
                        email: firebaseUser.email || '',
                        avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                        active: true
                    };
                    callback(fallbackUser);
                }
            } else {
                // Firebase Logout -> Check local again (or null)
                const u = getLocalUser();
                callback(u); 
            }
        });
    } else {
        // If Auth is not initialized, we rely solely on local user
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
            // Only fall back if it's a connection error, not bad password
            console.error("Firebase login failed:", e);
            throw e; 
        }
    }
    
    // Offline Mode Login Logic
    // 1. Check if user already exists in our local list
    const localUsers = getUsersLocal();
    const existingUser = localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existingUser) {
        setLocalUser(existingUser);
    } else {
        // 2. Create new if not found
        const mockUser: User = {
            id: 'local-' + Date.now(),
            name: email.split('@')[0],
            email: email,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            active: true
        };
        // Add to the public list so they appear on leaderboards immediately
        const updatedUsers = [...localUsers, mockUser];
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
        
        setLocalUser(mockUser);
    }
};

export const loginWithGoogle = async () => {
    if (!auth) {
         // Force Offline Mode with "Smart" Check
         const email = 'google@local.com';
         const localUsers = getUsersLocal();
         const existingUser = localUsers.find(u => u.email === email);

         if (existingUser) {
             setLocalUser(existingUser);
         } else {
            const mockUser: User = {
                id: 'google-local-' + Date.now(),
                name: 'Usuario Google (Local)',
                email: email,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Google`,
                active: true
            };
            const updatedUsers = [...localUsers, mockUser];
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
            setLocalUser(mockUser);
         }
        return;
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
                    active: true
                };
                await setDoc(userDocRef, newUser);
            }
        }
    } catch (error: any) {
        console.error("Google Login Error", error);
        
        if (error.code === 'auth/unauthorized-domain' || error.code === 'auth/operation-not-allowed') {
            console.warn("Domain not authorized in Firebase. Switching to Local Demo Mode.");
            
            // Fallback Logic
            const email = 'demo@ibspot.local';
            const localUsers = getUsersLocal();
            const existingUser = localUsers.find(u => u.email === email);
            
            if (existingUser) {
                setLocalUser(existingUser);
            } else {
                const mockUser: User = {
                    id: 'google-local-fallback',
                    name: 'Usuario Demo (Local)',
                    email: email,
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Demo`,
                    active: true
                };
                const updatedUsers = [...localUsers, mockUser];
                localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
                setLocalUser(mockUser);
            }
            return;
        }
        throw error;
    }
};

export const registerUser = async (email: string, pass: string, name: string, avatarDataUrl?: string) => {
    // Try Cloud Registration
    if (auth) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const uid = userCredential.user.uid;
            
            const newUser: User = {
                id: uid,
                name: name,
                email: email,
                avatar: avatarDataUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
                active: true
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
        // Cloud unavailable -> Local Registration
        const newUser: User = {
            id: 'local-' + Date.now(),
            name: name,
            email: email,
            avatar: avatarDataUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
            active: true
        };
        // Update global list
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

    // 2. Update Local Global List (so leaderboards update)
    const localUsers = getUsersLocal();
    const updatedUsers = localUsers.map(u => u.id === userId ? { ...u, ...updates } : u);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));

    // 3. Update Cloud (if available)
    if (isCloudEnabled && db && auth && auth.currentUser) {
        try {
            await updateDoc(doc(db, "users", userId), updates);
            // Also update Auth profile if name changed
            if (updates.name) {
                await updateProfile(auth.currentUser, { displayName: updates.name });
            }
        } catch (e) {
            console.error("Error updating cloud profile:", e);
        }
    }
};

export const logoutUser = async () => {
    setLocalUser(null);
    if (auth) await signOut(auth);
};

// --- Subscriptions (Real-time Data) ---

export const subscribeToEntries = (callback: (entries: IsinEntry[]) => void) => {
    // Always load local data first
    const localEntries = getEntriesLocal();
    callback(localEntries);

    if (isCloudEnabled && db) {
        const q = query(collection(db, "entries"), orderBy("timestamp", "desc"));
        return onSnapshot(q, (snapshot) => {
            const entries: IsinEntry[] = [];
            snapshot.forEach((doc) => {
                entries.push({ ...doc.data(), id: doc.id } as IsinEntry);
            });
            // Update local storage to keep sync
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
    // 1. Save Local (Always works)
    const existing = getEntriesLocal();
    const updated = [entry, ...existing];
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(updated));

    // 2. Save Cloud (If available)
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
    // 1. Local
    const existing = getEntriesLocal();
    const updated = existing.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(updated));

    // 2. Cloud
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
    // Sync logic not strictly required for this robust fallback version
};