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
    UploadCloud
} from 'lucide-react';
import { ActivityChart, ComparisonChart } from './components/DashboardCharts';
import { DEFAULT_USERS, User, IsinEntry, TimeFrame, FirebaseConfig } from './types';
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
    const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USERS[0]);
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('day');
    
    // Cloud Config State
    const [isCloudConnected, setIsCloudConnected] = useState(false);
    const [firebaseConfigInput, setFirebaseConfigInput] = useState('');
    
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

    // User Management State
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [userNameInput, setUserNameInput] = useState('');
    const [customAvatar, setCustomAvatar] = useState<string | null>(null);
    const [isAddingUser, setIsAddingUser] = useState(false);

    // History Filter State
    const [historySearchIsin, setHistorySearchIsin] = useState('');
    const [historyUserFilter, setHistoryUserFilter] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Load data & Setup Subscriptions
    useEffect(() => {
        setIsCloudConnected(storage.isOnline());
        
        // Initial Load
        setEntries(storage.getEntries());
        
        // Setup Users
        const loadedUsers = storage.getUsers();
        setUsers(loadedUsers);
        const savedUser = storage.getCurrentUser();
        const validUser = loadedUsers.find(u => u.id === savedUser.id);
        if (validUser && validUser.active) {
            setCurrentUser(validUser);
        } else {
            const activeUser = loadedUsers.find(u => u.active) || loadedUsers[0];
            setCurrentUser(activeUser);
            storage.setCurrentUser(activeUser.id);
        }

        // Real-time Subscriptions (If online)
        const unsubEntries = storage.subscribeToEntries((newEntries) => {
            setEntries(newEntries);
        });

        const unsubUsers = storage.subscribeToUsers((newUsers) => {
            setUsers(newUsers);
            // Re-validate current user in case they were deactivated remotely
            const current = storage.getCurrentUser();
            const updatedCurrent = newUsers.find(u => u.id === current.id);
            if (updatedCurrent && !updatedCurrent.active) {
                // Switch to first active if I was deactivated
                const firstActive = newUsers.find(u => u.active) || newUsers[0];
                setCurrentUser(firstActive);
                storage.setCurrentUser(firstActive.id);
            }
        });

        return () => {
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

    // Change User
    const handleUserChange = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user && user.active) {
            setCurrentUser(user);
            storage.setCurrentUser(userId);
        }
    };

    // --- Handlers ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500000) { // Limit to 500KB
                alert("La imagen es demasiado grande. Por favor usa una imagen menor a 500KB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setCustomAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveUser = () => {
        if (!userNameInput.trim()) return;
        let newUsers = [...users];
        const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userNameInput.trim())}`;
        const finalAvatar = customAvatar || defaultAvatar;

        if (editingUser) {
            newUsers = newUsers.map(u => u.id === editingUser ? { ...u, name: userNameInput.trim(), avatar: finalAvatar } : u);
            setEditingUser(null);
        } else {
            const newUser: User = {
                id: crypto.randomUUID(),
                name: userNameInput.trim(),
                avatar: finalAvatar,
                active: true
            };
            newUsers.push(newUser);
            setIsAddingUser(false);
        }
        setUsers(newUsers);
        storage.saveUsers(newUsers);
        setUserNameInput('');
        setCustomAvatar(null);
        if (editingUser === currentUser.id) {
            setCurrentUser(newUsers.find(u => u.id === editingUser)!);
        }
    };

    const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
        const activeCount = users.filter(u => u.active).length;
        if (currentStatus && activeCount <= 1) {
            alert("Debe haber al menos un usuario activo.");
            return;
        }
        if (userId === currentUser.id && currentStatus) {
             if (!confirm("Estás a punto de desactivar tu usuario actual. La sesión cambiará a otro usuario disponible. ¿Continuar?")) {
                 return;
             }
        }
        const newUsers = users.map(u => u.id === userId ? { ...u, active: !currentStatus } : u);
        setUsers(newUsers);
        storage.saveUsers(newUsers);

        if (userId === currentUser.id && currentStatus) {
            const nextUser = newUsers.find(u => u.active);
            if (nextUser) {
                setCurrentUser(nextUser);
                storage.setCurrentUser(nextUser.id);
            }
        }
    };

    const startEditUser = (user: User) => {
        setUserNameInput(user.name);
        setEditingUser(user.id);
        const isGenerated = user.avatar.includes('api.dicebear.com');
        setCustomAvatar(isGenerated ? null : user.avatar);
        setIsAddingUser(true);
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
        await storage.saveEntry(newEntry);

        setIsinInput('');
        setLastAdded(cleaned);
        setEntryStatus('success');

        setTimeout(() => {
            setEntryStatus('idle');
            setLastAdded(null);
        }, 3000);
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

    const handleSaveCloudConfig = () => {
        try {
            let input = firebaseConfigInput.trim();
            
            // Remove "const firebaseConfig =" wrapper if present
            if (input.includes('=')) {
                input = input.split('=')[1].trim();
            }
            
            // Remove trailing semicolon
            if (input.endsWith(';')) {
                input = input.slice(0, -1).trim();
            }

            // Relaxed JSON parsing
            const jsonLike = input
                .replace(/\/\/.*$/gm, '') // Remove comments
                .replace(/(\w+)\s*:/g, '"$1":') // Quote keys
                .replace(/'/g, '"') // Replace single quotes with double quotes
                .replace(/,(\s*})/g, '$1'); // Remove trailing commas

            const config = JSON.parse(jsonLike);
            
            // Validation
            if (!config.apiKey || !config.projectId) {
                throw new Error("Configuración incompleta");
            }

            storage.saveFirebaseConfig(config);
            setIsCloudConnected(true);
            setView('dashboard');
            alert("¡Conexión establecida con éxito! La página se recargará para aplicar los cambios.");
            window.location.reload(); 
        } catch (e) {
            console.error(e);
            alert("Error al interpretar el código. \n\nIntenta copiar SOLO lo que está entre las llaves { ... }, o asegúrate de que el formato sea correcto.");
        }
    };

    // --- Render Views ---

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
                <p>Estás registrando como <span className="font-semibold text-gray-600 dark:text-gray-300">{currentUser.name}</span></p>
            </div>
        </div>
    );

    const renderCloudConfig = () => (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Conexión Online</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
                Para que todos los usuarios vean los datos en tiempo real, conecta la aplicación a una base de datos de Firebase.
            </p>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                {isCloudConnected ? (
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                            <Cloud size={40} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Conectado a la Nube</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">
                                Los registros se sincronizan automáticamente entre todos los dispositivos conectados.
                            </p>
                        </div>
                        <div className="flex gap-4 justify-center">
                            <button 
                                onClick={() => storage.syncLocalToCloud()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <UploadCloud size={18} /> Subir datos locales
                            </button>
                            <button 
                                onClick={() => storage.clearFirebaseConfig()}
                                className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
                            >
                                <CloudOff size={18} /> Desconectar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 text-sm text-blue-800 dark:text-blue-300">
                            <strong>Instrucciones:</strong>
                            <ol className="list-decimal ml-5 mt-2 space-y-1">
                                <li>Ve a <a href="https://console.firebase.google.com" target="_blank" className="underline">console.firebase.google.com</a> y crea un proyecto.</li>
                                <li>Crea una base de datos <strong>Firestore</strong> (en modo prueba o producción).</li>
                                <li>Ve a Configuración del Proyecto y copia la configuración del SDK.</li>
                                <li>Pégala abajo (acepta el formato con "const" y sin comillas en las claves).</li>
                            </ol>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Configuración Firebase</label>
                            <textarea
                                value={firebaseConfigInput}
                                onChange={(e) => setFirebaseConfigInput(e.target.value)}
                                placeholder='Pega aquí el código que copiaste de Firebase (ej: const firebaseConfig = { ... })'
                                className="w-full h-40 p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                            ></textarea>
                        </div>

                        <button 
                            onClick={handleSaveCloudConfig}
                            disabled={!firebaseConfigInput}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            Conectar y Sincronizar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    // Reuse existing render logic for Dashboard, History, Users (no change needed in logic, just routing)
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

    const renderHistory = () => (
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Historial</h2>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar ISIN..."
                            value={historySearchIsin}
                            onChange={(e) => setHistorySearchIsin(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30 focus:border-red-500 outline-none text-slate-800 dark:text-white"
                        />
                    </div>
                    
                    <div className="relative flex-1 md:w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select
                            value={historyUserFilter}
                            onChange={(e) => setHistoryUserFilter(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30 focus:border-red-500 outline-none appearance-none cursor-pointer text-slate-800 dark:text-white"
                        >
                            <option value="">Todos los usuarios</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 dark:bg-red-600 text-white rounded-xl hover:bg-slate-700 dark:hover:bg-red-700 transition-colors shadow-sm font-medium text-sm"
                        >
                            <Download size={16} />
                            <span className="hidden lg:inline">Exportar</span>
                            <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`}/>
                        </button>
                        {showExportMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)}></div>
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                                    <button 
                                        onClick={() => handleExportCsv('filtered')}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                                    >
                                        <FileSpreadsheet size={16} /> Vista Actual
                                    </button>
                                    <button 
                                        onClick={() => handleExportCsv('all')}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 flex items-center gap-2 border-t border-gray-100 dark:border-slate-700"
                                    >
                                        <Archive size={16} /> Base de datos completa
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
                        <tr>
                            <th className="w-16 px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Tipo</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hora/Fecha</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ISIN</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuario</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {entries
                            .filter(entry => {
                                const matchesIsin = entry.isin.toLowerCase().includes(historySearchIsin.toLowerCase());
                                const matchesUser = historyUserFilter ? entry.userId === historyUserFilter : true;
                                return matchesIsin && matchesUser;
                            })
                            .slice(0, 50)
                            .map((entry) => { 
                                const user = users.find(u => u.id === entry.userId);
                                return (
                                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 text-center">
                                            <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-slate-700 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
                                                <FileText size={16} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            {new Date(entry.timestamp).toLocaleString('es-ES')}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono font-medium text-slate-800 dark:text-slate-200">
                                            {entry.isin}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                            {user ? (
                                                <img src={user.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-600"></div>
                                            )}
                                            {user?.name || 'Usuario Eliminado'}
                                        </td>
                                    </tr>
                                );
                            })}
                        {entries.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No hay registros todavía.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderUsersView = () => (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Añade o modifica los miembros del equipo.</p>
                </div>
                <button 
                    onClick={() => {
                        setUserNameInput('');
                        setEditingUser(null);
                        setCustomAvatar(null);
                        setIsAddingUser(!isAddingUser);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition-all shadow-md active:scale-95 ${isAddingUser ? 'bg-gray-400 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-700'}`}
                >
                    {isAddingUser ? <X size={20} /> : <PlusCircle size={20} />}
                    {isAddingUser ? 'Cancelar' : 'Nuevo Usuario'}
                </button>
            </div>

            {isAddingUser && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-red-100 dark:border-slate-700 mb-8 animate-fade-in-up">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="relative group shrink-0">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-slate-600 group-hover:border-red-500 transition-colors bg-gray-50 dark:bg-slate-700">
                                 <img 
                                    src={customAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userNameInput.trim() || 'placeholder')}`} 
                                    alt="Preview" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity">
                                <Camera size={24} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>

                        <div className="flex-1 w-full flex flex-col gap-3">
                             <input 
                                type="text" 
                                value={userNameInput}
                                onChange={(e) => setUserNameInput(e.target.value)}
                                placeholder="Nombre del usuario (ej. Laura Méndez)"
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30 focus:border-red-500 outline-none"
                                autoFocus
                            />
                            <div className="flex justify-between items-center mt-2">
                                 <button 
                                    onClick={() => setCustomAvatar(null)}
                                    className={`text-xs flex items-center gap-1 hover:text-red-500 transition-colors ${customAvatar ? 'text-gray-500' : 'text-transparent pointer-events-none'}`}
                                    title="Quitar foto personalizada"
                                    disabled={!customAvatar}
                                 >
                                    <RotateCcw size={12} /> Restablecer
                                 </button>
                                <button 
                                    onClick={handleSaveUser}
                                    disabled={!userNameInput.trim()}
                                    className="bg-green-600 text-white px-6 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2 shadow-sm"
                                >
                                    <Save size={20} /> Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map(user => {
                    const isActive = user.active !== false; 
                    return (
                        <div key={user.id} className={`relative p-4 rounded-2xl border flex items-center justify-between group transition-all hover:shadow-md ${user.id === currentUser.id ? 'bg-white dark:bg-slate-800 border-red-500 ring-1 ring-red-500 dark:ring-red-600 dark:border-red-600' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'} ${!isActive ? 'opacity-60 bg-gray-50 dark:bg-slate-800/50' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <img src={user.avatar} alt={user.name} className={`w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 object-cover ${!isActive && 'grayscale'}`} />
                                    {!isActive && <div className="absolute -bottom-1 -right-1 bg-gray-500 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-800"><Power size={10} /></div>}
                                </div>
                                <div>
                                    <h4 className={`font-bold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{user.name}</h4>
                                    <div className="flex gap-2 items-center">
                                        {user.id === currentUser.id && <span className="text-xs text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">Activo ahora</span>}
                                        {!isActive && <span className="text-xs text-gray-500 font-medium bg-gray-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">Inactivo</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => startEditUser(user)}
                                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button 
                                    onClick={() => handleToggleUserStatus(user.id, isActive)}
                                    className={`p-2 rounded-lg transition-colors ${isActive ? 'text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-700' : 'text-green-500 hover:text-green-600 hover:bg-green-50'}`}
                                >
                                    {isActive ? <Archive size={18} /> : <CheckCircle2 size={18} />}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Sidebar */}
            <aside className="bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 w-full md:w-64 flex-shrink-0 z-20 transition-colors">
                <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center">
                             <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">ibspot</span>
                             <div className="relative flex items-center justify-center w-6 h-6 ml-1 mt-1">
                                <div className="absolute inset-0 bg-red-600 rounded-full rounded-bl-none transform rotate-45"></div>
                                <div className="absolute inset-0 bg-red-600 rounded-full rounded-bl-none transform rotate-45 animate-pulse opacity-50"></div>
                             </div>
                        </div>
                    </div>
                </div>
                
                <div className="p-4 space-y-1">
                    <SidebarItem 
                        icon={PlusCircle} 
                        label="Registrar" 
                        active={view === 'entry'} 
                        onClick={() => setView('entry')} 
                    />
                    <SidebarItem 
                        icon={LayoutDashboard} 
                        label="Dashboard" 
                        active={view === 'dashboard'} 
                        onClick={() => setView('dashboard')} 
                    />
                    <SidebarItem 
                        icon={History} 
                        label="Historial" 
                        active={view === 'history'} 
                        onClick={() => setView('history')} 
                    />
                    <SidebarItem 
                        icon={UserCog} 
                        label="Usuarios" 
                        active={view === 'users'} 
                        onClick={() => setView('users')} 
                    />
                    <div className="pt-4 border-t border-gray-100 dark:border-slate-700 mt-4">
                        <SidebarItem 
                            icon={isCloudConnected ? Cloud : CloudOff} 
                            label="Conexión Online" 
                            active={view === 'cloud'} 
                            onClick={() => setView('cloud')}
                            extraClass={isCloudConnected ? "text-green-600 dark:text-green-400" : ""}
                            badge={!isCloudConnected ? "NUEVO" : null}
                        />
                    </div>
                </div>

                <div className="mt-auto border-t border-gray-100 dark:border-slate-700">
                    {/* Dark Mode Toggle */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tema</span>
                        <button 
                            onClick={toggleTheme}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>

                    <div className="p-4">
                        <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-3">Usuario Actual</p>
                        <div className="relative group">
                            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left">
                                <img src={currentUser.avatar} alt={currentUser.name} className="w-9 h-9 rounded-full border border-gray-200 dark:border-slate-600 object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{currentUser.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Cambiar usuario</p>
                                </div>
                            </button>
                            
                            <div className="hidden group-hover:block absolute bottom-full left-0 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl mb-2 overflow-hidden z-50">
                                {users.filter(u => u.active !== false).map(u => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleUserChange(u.id)}
                                        className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 ${u.id === currentUser.id ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                        <img src={u.avatar} className="w-6 h-6 rounded-full object-cover" />
                                        {u.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8">
                {view === 'entry' && renderEntryView()}
                {view === 'dashboard' && renderDashboard()}
                {view === 'history' && renderHistory()}
                {view === 'users' && renderUsersView()}
                {view === 'cloud' && renderCloudConfig()}
            </main>
        </div>
    );
}