import React, { useState, useEffect, useMemo } from 'react';
import { 
    LayoutDashboard, 
    PlusCircle, 
    Trophy, 
    History, 
    CheckCircle2, 
    TrendingUp, 
    BarChart3, 
    Users,
    Sparkles,
    AlertCircle,
    X,
    Download,
    Settings,
    UserCog,
    Trash2,
    Pencil,
    Save,
    Search,
    Filter,
    Moon,
    Sun,
    Camera,
    RotateCcw,
    Archive,
    Power,
    Info,
    FileText,
    ChevronDown,
    FileSpreadsheet,
    LineChart as LineChartIcon,
    Cloud,
    CloudOff,
    UploadCloud,
    RefreshCw,
    LogOut,
    LogIn,
    UserPlus,
    Mail,
    Lock,
    User as UserIcon,
    Loader2,
    Edit3
} from 'lucide-react';
import { ActivityChart, ComparisonChart } from './components/DashboardCharts';
import { User, IsinEntry, TimeFrame } from './types';
import * as storage from './services/storageService';
import * as geminiService from './services/geminiService';

// --- Utility Functions ---

const getStartOfPeriod = (date: Date, period: TimeFrame): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    switch (period) {
        case 'day': return d;
        case 'week': {
            const day = d.getDay() || 7; 
            if (day !== 1) d.setHours(-24 * (day - 1)); 
            return d;
        }
        case 'month': return new Date(d.getFullYear(), d.getMonth(), 1);
        case 'quarter': {
            const q = Math.floor(d.getMonth() / 3);
            return new Date(d.getFullYear(), q * 3, 1);
        }
        case 'semester': {
             const s = d.getMonth() < 6 ? 0 : 6;
             return new Date(d.getFullYear(), s, 1);
        }
        case 'year': return new Date(d.getFullYear(), 0, 1);
        default: return d;
    }
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', { 
        day: 'numeric', month: 'short' 
    });
};

// --- Components ---

const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

const EditProfileModal = ({ user, onClose, onSave }: { user: User, onClose: () => void, onSave: (u: Partial<User>) => void }) => {
    const [name, setName] = useState(user.name);
    const [avatar, setAvatar] = useState(user.avatar);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setAvatar(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold dark:text-white">Editar Perfil</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20}/></button>
                </div>
                
                <div className="flex justify-center mb-6">
                    <div className="relative group cursor-pointer">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700 border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center">
                            <img src={avatar} className="w-full h-full object-cover" alt="Profile" />
                        </div>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <div className="absolute bottom-0 right-0 bg-red-600 p-1.5 rounded-full text-white shadow-sm pointer-events-none">
                            <Pencil size={12} />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                        />
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
                    <button onClick={() => onSave({ name, avatar })} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-colors">Guardar</button>
                </div>
            </div>
        </div>
    );
};

const LoginScreen = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500000) { 
                setError("La imagen es demasiado grande. Máx 500KB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => setAvatar(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setLoading(true);
        try {
            await storage.loginWithGoogle();
            onLoginSuccess();
        } catch (err: any) {
            console.error("Login Error:", err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError("Inicio de sesión cancelado.");
            } else if (err.code === 'auth/unauthorized-domain') {
                // This shouldn't be reached if storageService handles it, 
                // but as a fallback:
                setError("Dominio no autorizado. Verifica la consola de Firebase.");
            } else {
                setError(`Error de Google: ${err.message || 'Desconocido'}`);
            }
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isRegistering) {
                if (!name.trim()) throw new Error("El nombre es obligatorio");
                await storage.registerUser(email, password, name, avatar || undefined);
            } else {
                await storage.loginUser(email, password);
            }
            onLoginSuccess();
        } catch (err: any) {
            console.error("Submit Error:", err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError("Correo o contraseña incorrectos.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("Este correo ya está registrado.");
            } else if (err.code === 'auth/weak-password') {
                setError("La contraseña debe tener al menos 6 caracteres.");
            } else if (err.code === 'auth/network-request-failed') {
                 setError("Error de red. Verifica tu conexión a internet.");
            } else {
                setError(err.message || "Error al conectar. Intenta nuevamente.");
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8 border border-gray-100 dark:border-slate-700">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg shadow-red-200 dark:shadow-none">I</div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ibspot Tracker</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        {isRegistering ? 'Crea tu cuenta profesional' : 'Inicia sesión para continuar'}
                    </p>
                </div>

                {/* Google Sign In Button */}
                <button 
                    type="button" 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white dark:bg-slate-700 text-gray-700 dark:text-white font-medium py-3 rounded-xl border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center mb-6 shadow-sm"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" size={20}/> : <GoogleIcon />}
                    Continuar con Google
                </button>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-slate-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-slate-800 text-gray-500">O usa tu correo</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegistering && (
                        <>
                            <div className="flex justify-center mb-6">
                                <div className="relative group cursor-pointer">
                                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-700 border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center">
                                        {avatar ? (
                                            <img src={avatar} className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera className="text-gray-400" size={32} />
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    <p className="text-xs text-center mt-2 text-gray-400">Tu Foto (Opcional)</p>
                                </div>
                            </div>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3 text-gray-400" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Nombre Completo"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                                    required={isRegistering}
                                />
                            </div>
                        </>
                    )}
                    
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                            type="email" 
                            placeholder="Correo electrónico"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                            required
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                            type="password" 
                            placeholder="Contraseña"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
                            <AlertCircle size={16} className="shrink-0" /> <span className="break-words">{error}</span>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (isRegistering ? 'Registrarse' : 'Entrar')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        type="button"
                        onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                        {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SidebarItem = ({ icon: Icon, label, active, onClick, extraClass = "", badge = null }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
            active 
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium' 
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
        } ${extraClass}`}
    >
        <div className="flex items-center space-x-3">
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span>{label}</span>
        </div>
        {badge && (
            <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full ml-2">
                {badge}
            </span>
        )}
    </button>
);

const StatCard = ({ label, value, subtext, icon: Icon, highlight = false, tooltip = "" }: any) => (
    <div className={`p-6 rounded-2xl border transition-colors group relative ${
        highlight 
        ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-200 dark:shadow-none' 
        : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 shadow-sm'
    }`}>
        <div className="flex justify-between items-start mb-4">
            <div>
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${highlight ? 'text-red-100' : 'text-gray-500 dark:text-gray-400'}`}>{label}</p>
                    {tooltip && (
                        <div className="relative group/tooltip cursor-help">
                            <Info size={14} className={highlight ? 'text-red-200' : 'text-gray-400'} />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 text-center shadow-xl">
                                {tooltip}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                            </div>
                        </div>
                    )}
                </div>
                <h3 className={`text-3xl font-bold mt-1 ${!highlight && 'text-gray-900 dark:text-white'}`}>{value}</h3>
            </div>
            <div className={`p-2 rounded-lg ${highlight ? 'bg-white/20' : 'bg-gray-50 dark:bg-slate-700'}`}>
                <Icon size={20} className={highlight ? 'text-white' : 'text-gray-400 dark:text-gray-300'} />
            </div>
        </div>
        {subtext && <p className={`text-sm ${highlight ? 'text-red-100' : 'text-green-600 dark:text-green-400'} flex items-center`}>
            {subtext}
        </p>}
    </div>
);

// --- Main App ---

export default function App() {
    const [view, setView] = useState<'dashboard' | 'entry' | 'history' | 'users' | 'cloud'>('entry');
    const [entries, setEntries] = useState<IsinEntry[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('day');
    const [showProfileModal, setShowProfileModal] = useState(false);
    
    // Cloud Config State
    const [isCloudConnected, setIsCloudConnected] = useState(false);
    
    // Theme State
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' || 
                   (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    // Form State
    const [isinInput, setIsinInput] = useState('');
    const [entryStatus, setEntryStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
    const [lastAdded, setLastAdded] = useState<string | null>(null);

    // AI State
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    // History Filter State
    const [historySearchIsin, setHistorySearchIsin] = useState('');
    const [historyUserFilter, setHistoryUserFilter] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Load data & Setup Subscriptions
    useEffect(() => {
        setIsCloudConnected(storage.isOnline());
        
        // Initial Local Data Load
        setEntries(storage.getEntries());
        setUsers(storage.getUsers());

        // 1. Subscribe to Auth State
        const unsubAuth = storage.subscribeToAuth((user) => {
            setCurrentUser(user);
            setAuthLoading(false);
        });

        // 2. Subscribe to Data (Entries)
        const unsubEntries = storage.subscribeToEntries((newEntries) => {
            setEntries(newEntries);
        });

        // 3. Subscribe to Data (Users List for Leaderboard)
        const unsubUsers = storage.subscribeToUsers((cloudUsers) => {
            setUsers(cloudUsers);
        });

        return () => {
            unsubAuth && unsubAuth();
            unsubEntries && unsubEntries();
            unsubUsers && unsubUsers();
        };
    }, []);

    // Theme Effect
    useEffect(() => {
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    const handleLogout = async () => {
        if (confirm("¿Cerrar sesión?")) {
            await storage.logoutUser();
        }
    };

    const handleUpdateProfile = (updates: Partial<User>) => {
        if (currentUser) {
            storage.updateUserProfile(currentUser.id, updates);
            setShowProfileModal(false);
        }
    };

    const filteredEntries = useMemo(() => {
        const now = new Date();
        const start = getStartOfPeriod(now, timeFrame);
        return entries.filter(e => e.timestamp >= start.getTime());
    }, [entries, timeFrame]);

    const comparisonData = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = prevDate.getMonth();
        const prevYear = prevDate.getFullYear();

        const getMonthEntries = (m: number, y: number) => entries.filter(e => {
            const d = new Date(e.timestamp);
            return d.getMonth() === m && d.getFullYear() === y;
        });

        const currentEntries = getMonthEntries(currentMonth, currentYear);
        const prevEntries = getMonthEntries(prevMonth, prevYear);
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        const data = [];
        let currentRunningTotal = 0;
        let prevRunningTotal = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDayCount = currentEntries.filter(e => new Date(e.timestamp).getDate() === day).length;
            const prevDayCount = prevEntries.filter(e => new Date(e.timestamp).getDate() === day).length;
            prevRunningTotal += prevDayCount;

            const point: any = { day: day, anterior: prevRunningTotal };
            if (day <= now.getDate()) {
                currentRunningTotal += currentDayCount;
                point.actual = currentRunningTotal;
            }
            data.push(point);
        }
        return data;
    }, [entries]);

    const leaderboard = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredEntries.forEach(e => {
            counts[e.userId] = (counts[e.userId] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([userId, count]) => ({
                user: users.find(u => u.id === userId),
                count
            }))
            .sort((a, b) => b.count - a.count);
    }, [filteredEntries, users]);

    const chartData = useMemo(() => {
        const data: Record<string, number> = {};
        filteredEntries.forEach(e => {
            const key = formatDate(e.dateStr); 
            data[key] = (data[key] || 0) + 1;
        });
        const sortedKeys = Object.keys(data).sort((a,b) => 0); 
        return sortedKeys.map(key => ({ label: key, value: data[key] }));
    }, [filteredEntries]);

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        
        const cleaned = isinInput.trim().toUpperCase();

        if (cleaned.length < 8) { 
            setEntryStatus('error');
            setTimeout(() => setEntryStatus('idle'), 2000);
            return;
        }

        const isDuplicate = entries.some(entry => entry.isin === cleaned);
        if (isDuplicate) {
            setEntryStatus('duplicate');
            setTimeout(() => setEntryStatus('idle'), 3000);
            return;
        }

        const newEntry: IsinEntry = {
            id: crypto.randomUUID(),
            isin: cleaned,
            userId: currentUser.id,
            timestamp: Date.now(),
            dateStr: new Date().toISOString().split('T')[0]
        };

        const updated = [newEntry, ...entries];
        setEntries(updated); // Optimistic
        try {
            await storage.saveEntry(newEntry);
            setIsinInput('');
            setLastAdded(cleaned);
            setEntryStatus('success');

            setTimeout(() => {
                setEntryStatus('idle');
                setLastAdded(null);
            }, 3000);
        } catch (error) {
            alert("Error al guardar. Verifica tu conexión.");
        }
    };

    const handleDeleteEntry = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;
        
        const newEntries = entries.filter(e => e.id !== id);
        setEntries(newEntries);
        
        await storage.deleteEntry(id);
    };

    const handleGenerateInsight = async () => {
        setIsGeneratingAi(true);
        const text = await geminiService.generateAnalysis(
            entries, 
            users, 
            timeFrame, 
            leaderboard[0]?.user, 
            filteredEntries.length
        );
        setAiInsight(text);
        setIsGeneratingAi(false);
    };

    const handleExportCsv = (mode: 'filtered' | 'all') => {
        let dataToExport = mode === 'all' ? entries : entries.filter(entry => {
            const matchesIsin = entry.isin.toLowerCase().includes(historySearchIsin.toLowerCase());
            const matchesUser = historyUserFilter ? entry.userId === historyUserFilter : true;
            return matchesIsin && matchesUser;
        });

        if (dataToExport.length === 0) return;

        const headers = ['Fecha', 'Hora', 'ISIN', 'Usuario', 'ID Usuario'];
        const rows = dataToExport.map(entry => {
            const date = new Date(entry.timestamp);
            const user = users.find(u => u.id === entry.userId);
            return [
                date.toLocaleDateString('es-ES'),
                date.toLocaleTimeString('es-ES'),
                entry.isin,
                `"${user?.name || 'Usuario Eliminado'}"`,
                entry.userId
            ].join(',');
        });

        const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `ibspot_registros_${mode}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setShowExportMenu(false);
    };

    // --- Render Logic ---

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="animate-spin text-red-600" size={40} />
            </div>
        );
    }

    if (!currentUser) {
        return <LoginScreen onLoginSuccess={() => {}} />;
    }

    const renderEntryView = () => (
        <div className="max-w-xl mx-auto mt-10">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-slate-700 transition-colors">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Registrar Producto</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Ingresa el código ISIN del producto subido a Ibspot.</p>
                </div>

                <form onSubmit={handleAddEntry} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ml-1">Código ISIN</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={isinInput}
                                onChange={(e) => {
                                    setEntryStatus('idle');
                                    setIsinInput(e.target.value.toUpperCase());
                                }}
                                placeholder="US0378331005..."
                                className={`block w-full text-center text-3xl font-mono p-4 rounded-xl border-2 focus:ring-4 focus:outline-none transition-all uppercase tracking-wider
                                    ${entryStatus === 'error' ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50 text-red-900' : 
                                      entryStatus === 'duplicate' ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-100 bg-yellow-50 text-yellow-900' :
                                      entryStatus === 'success' ? 'border-green-300 focus:border-green-500 focus:ring-green-100 bg-green-50' : 
                                      'border-gray-200 dark:border-slate-600 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/30 bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white'}`}
                                autoFocus
                            />
                        </div>
                        {entryStatus === 'error' && (
                            <p className="text-center text-red-500 text-sm mt-2 flex justify-center items-center gap-1">
                                <AlertCircle size={14}/> Código demasiado corto o inválido.
                            </p>
                        )}
                        {entryStatus === 'duplicate' && (
                            <p className="text-center text-yellow-600 dark:text-yellow-500 text-sm mt-2 flex justify-center items-center gap-1 font-medium">
                                <AlertCircle size={14}/> ¡Atención! Este ISIN ya fue registrado previamente.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!isinInput}
                        className="w-full bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-lg font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <PlusCircle size={24} />
                        <span>Registrar Ahora</span>
                    </button>
                </form>

                {entryStatus === 'success' && (
                    <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center gap-3 animate-fade-in-up">
                        <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-full">
                            <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
                        </div>
                        <div>
                            <p className="text-green-800 dark:text-green-300 font-medium">¡Registrado con éxito!</p>
                            <p className="text-green-600 dark:text-green-400 text-sm">ISIN: {lastAdded}</p>
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-8 text-center text-sm text-gray-400 dark:text-gray-500">
                <p>Sesión iniciada como <span className="font-semibold text-gray-600 dark:text-gray-300">{currentUser?.name}</span></p>
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Panel de Control</h2>
                    <p className="text-gray-500 dark:text-gray-400">Rendimiento y contabilidad</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 inline-flex shadow-sm overflow-x-auto max-w-full">
                    {(['day', 'week', 'month', 'year'] as TimeFrame[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => {
                                setTimeFrame(tf);
                                setAiInsight(null); 
                            }}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                                timeFrame === tf 
                                ? 'bg-red-600 text-white shadow-sm' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            {tf === 'day' ? 'Hoy' : 
                             tf === 'week' ? 'Semana' : 
                             tf === 'month' ? 'Mes' : 'Año'}
                        </button>
                    ))}
                </div>
            </div>

            {aiInsight ? (
                <div className="bg-gray-50 dark:bg-slate-800 dark:border-slate-600 p-6 rounded-2xl border border-gray-200 relative">
                    <button onClick={() => setAiInsight(null)} className="absolute top-4 right-4 text-gray-400 hover:text-red-600 dark:text-slate-400 dark:hover:text-white">
                        <X size={18} />
                    </button>
                    <div className="flex items-start gap-4">
                        <div className="bg-white dark:bg-slate-700 p-2 rounded-full shadow-sm">
                            <Sparkles className="text-red-500 dark:text-red-400" size={20} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Análisis IA</h4>
                            <p className="text-gray-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">"{aiInsight}"</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex justify-end">
                     <button 
                        onClick={handleGenerateInsight}
                        disabled={isGeneratingAi}
                        className="text-xs flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                        <Sparkles size={14} />
                        {isGeneratingAi ? 'Analizando...' : 'Generar reporte inteligente'}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    label="Registros Totales" 
                    value={filteredEntries.length} 
                    subtext="En el periodo seleccionado"
                    icon={TrendingUp}
                    highlight={true}
                    tooltip="Cantidad total de códigos ISIN subidos en el rango de tiempo actual."
                />
                <StatCard 
                    label="Usuario Destacado" 
                    value={leaderboard.length > 0 ? leaderboard[0].user?.name.split(' ')[0] : '-'} 
                    subtext={leaderboard.length > 0 ? `${leaderboard[0].count} registros` : ''}
                    icon={Trophy}
                    tooltip="La persona que más registros ha realizado en este periodo."
                />
                <StatCard 
                    label="Promedio Diario" 
                    value={Math.round(filteredEntries.length / (chartData.length || 1))} 
                    subtext="Registros por día activo"
                    icon={BarChart3}
                    tooltip="Promedio de registros por cada día que hubo actividad."
                />
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
                <h3 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                    <LineChartIcon size={18} className="text-red-600"/> Progreso Mensual Acumulado
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Comparativa de crecimiento entre el mes actual y el mes anterior.</p>
                <ComparisonChart data={comparisonData} isDarkMode={isDarkMode} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-6">Tendencia de Cargas ({timeFrame === 'day' ? 'Hoy' : timeFrame})</h3>
                    <ActivityChart data={chartData} isDarkMode={isDarkMode} />
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                        <Users size={18} className="text-red-600"/> Ranking
                    </h3>
                    <div className="space-y-4">
                        {leaderboard.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">No hay datos aún.</p>
                        ) : (
                            leaderboard.map((item, idx) => (
                                <div key={item.user?.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                            ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                              idx === 1 ? 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300' : 
                                              idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white dark:bg-slate-700 text-gray-400 border border-gray-100 dark:border-slate-600'}
                                        `}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <img src={item.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown'} alt={item.user?.name} className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-700 object-cover" />
                                            <span className={`text-sm font-medium ${idx === 0 ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                {item.user?.name || 'Desconocido'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-md">
                                        {item.count}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderHistory = () => {
        const filteredHistory = entries.filter(e => {
            const matchesIsin = e.isin.toLowerCase().includes(historySearchIsin.toLowerCase());
            const matchesUser = historyUserFilter ? e.userId === historyUserFilter : true;
            return matchesIsin && matchesUser;
        }).sort((a, b) => b.timestamp - a.timestamp);

        return (
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    {/* Filters */}
                    <div className="flex gap-4 w-full md:w-auto flex-1">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Buscar ISIN..." 
                                value={historySearchIsin}
                                onChange={(e) => setHistorySearchIsin(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all dark:text-white"
                            />
                        </div>
                        <div className="relative w-48 hidden md:block">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select 
                                value={historyUserFilter}
                                onChange={(e) => setHistoryUserFilter(e.target.value)}
                                className="w-full pl-10 pr-8 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none dark:text-white"
                            >
                                <option value="">Todos los usuarios</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                        </div>
                    </div>
                    
                    {/* Export */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors font-medium"
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline">Exportar</span>
                        </button>
                         {showExportMenu && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-600 z-10 overflow-hidden">
                                <button onClick={() => handleExportCsv('all')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm dark:text-gray-200">
                                    <FileSpreadsheet size={16} className="text-green-600"/> Todo el historial
                                </button>
                                <button onClick={() => handleExportCsv('filtered')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm dark:text-gray-200">
                                    <Filter size={16} className="text-blue-600"/> Vista actual
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700">
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ISIN</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuario</th>
                                    <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                {filteredHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-400">No se encontraron registros.</td>
                                    </tr>
                                ) : (
                                    filteredHistory.map((entry) => {
                                        const user = users.find(u => u.id === entry.userId);
                                        return (
                                            <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {new Date(entry.timestamp).toLocaleString('es-ES')}
                                                </td>
                                                <td className="p-4 font-mono font-medium text-gray-900 dark:text-white">
                                                    {entry.isin}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <img src={user?.avatar} className="w-6 h-6 rounded-full bg-gray-200" alt=""/>
                                                        <span className="text-sm text-gray-700 dark:text-gray-200">{user?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    {entry.userId === currentUser.id && (
                                                        <button onClick={() => handleDeleteEntry(entry.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderUsers = () => (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Equipo</h2>
                    <p className="text-gray-500 dark:text-gray-400">Miembros activos en la plataforma.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map(user => (
                    <div key={user.id} className={`p-4 rounded-2xl border transition-all ${user.active ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700' : 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700/50 opacity-75'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img src={user.avatar} alt={user.name} className={`w-12 h-12 rounded-full object-cover border-2 ${user.active ? 'border-green-400' : 'border-gray-300'}`} />
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{user.name}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${user.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {user.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                        {currentUser.id === user.id && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-100 text-blue-700">
                                                Tú
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderCloudConfig = () => (
        <div className="max-w-2xl mx-auto">
             <div className="text-center py-8">
                 <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isCloudConnected ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                    {isCloudConnected ? <Cloud size={40} /> : <CloudOff size={40} />}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {isCloudConnected ? 'Conexión Segura Establecida' : 'Modo Local (Offline)'}
                </h3>
                <p className="text-gray-500 mt-2">
                    {isCloudConnected 
                        ? 'Tu cuenta está sincronizada en tiempo real. Todos los datos se guardan automáticamente en tu cuenta.' 
                        : 'Estás operando en modo local. Tus datos se guardan en este dispositivo. Esto ocurre si el dominio no está autorizado o no hay internet.'}
                </p>
                <div className="mt-8">
                    <p className="text-sm text-gray-400">ID de Sesión: <span className="font-mono">{currentUser.id}</span></p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-sans transition-colors duration-200">
            {/* Modal */}
            {showProfileModal && currentUser && (
                <EditProfileModal 
                    user={currentUser} 
                    onClose={() => setShowProfileModal(false)} 
                    onSave={handleUpdateProfile} 
                />
            )}

            {/* Mobile Header */}
            <header className="md:hidden bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">I</div>
                    <span className="font-bold text-lg tracking-tight">Ibspot</span>
                </div>
                <div className="flex items-center gap-3">
                     <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-gray-400">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button onClick={() => setShowProfileModal(true)}>
                        <img src={currentUser.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200" />
                    </button>
                </div>
            </header>

            <div className="flex h-screen overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 z-10">
                    <div className="p-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-red-200 dark:shadow-none">I</div>
                        <div>
                            <h1 className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">Ibspot</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Tracker Pro</p>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4 px-4">Principal</div>
                        <SidebarItem icon={PlusCircle} label="Registrar" active={view === 'entry'} onClick={() => setView('entry')} />
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
                        <SidebarItem icon={History} label="Historial" active={view === 'history'} onClick={() => setView('history')} />
                        
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-8 px-4">Comunidad</div>
                        <SidebarItem icon={Users} label="Equipo" active={view === 'users'} onClick={() => setView('users')} />
                        <SidebarItem 
                            icon={isCloudConnected ? Cloud : CloudOff} 
                            label={isCloudConnected ? "Estado Nube" : "Modo Local"}
                            active={view === 'cloud'} 
                            onClick={() => setView('cloud')} 
                            extraClass={isCloudConnected ? "text-green-600 dark:text-green-400" : "text-orange-500 dark:text-orange-400"}
                        />
                    </nav>

                    <div className="p-4 border-t border-gray-100 dark:border-slate-700">
                         <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 flex items-center gap-3 mb-3 relative group">
                            <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full border border-white dark:border-slate-600 object-cover" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{currentUser.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser.email}</p>
                            </div>
                            <button 
                                onClick={() => setShowProfileModal(true)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white dark:bg-slate-600 rounded-lg shadow-sm text-gray-500 dark:text-white hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Editar Perfil"
                            >
                                <Settings size={14} />
                            </button>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={toggleTheme} className="flex-1 py-2 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                            <button onClick={handleLogout} className="flex-1 py-2 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Cerrar Sesión">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-white/50 dark:bg-slate-900 relative scroll-smooth">
                    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
                        {view === 'entry' && renderEntryView()}
                        {view === 'dashboard' && renderDashboard()}
                        {view === 'history' && renderHistory()}
                        {view === 'users' && renderUsers()}
                        {view === 'cloud' && renderCloudConfig()}
                    </div>
                    
                    {/* Mobile Bottom Nav */}
                    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-6 py-3 flex justify-between items-center z-20 pb-safe">
                        <button onClick={() => setView('dashboard')} className={`p-2 rounded-xl ${view === 'dashboard' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-gray-400'}`}><LayoutDashboard size={24} /></button>
                        <button onClick={() => setView('entry')} className="p-4 bg-red-600 text-white rounded-full shadow-lg shadow-red-200 dark:shadow-none -mt-8 border-4 border-gray-50 dark:border-slate-900"><PlusCircle size={28} /></button>
                        <button onClick={() => setView('history')} className={`p-2 rounded-xl ${view === 'history' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-gray-400'}`}><History size={24} /></button>
                         <button onClick={handleLogout} className={`p-2 rounded-xl text-gray-400`}><LogOut size={24} /></button>
                    </div>
                </main>
            </div>
        </div>
    );
}