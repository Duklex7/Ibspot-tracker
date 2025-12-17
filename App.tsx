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

    const handleSaveCloudConfig = () => {
        try {
            const input = firebaseConfigInput.trim();
            const config: any = {};
            const regex = /(?:["']?(\w+)["']?)\s*:\s*(["'])(.*?)\2/g;
            
            let match;
            let foundAny = false;
            
            while ((match = regex.exec(input)) !== null) {
                const key = match[1];
                const value = match[3];
                config[key] = value;
                foundAny = true;
            }
            
            if (!foundAny) {
                 try {
                     let cleanInput = input;
                     if (cleanInput.endsWith(';')) cleanInput = cleanInput.slice(0, -1);
                     if (!cleanInput.startsWith('{')) cleanInput = `{${cleanInput}}`;
                     const jsonParse = JSON.parse(cleanInput);
                     Object.assign(config, jsonParse);
                 } catch (e) {
                 }
            }

            if (!config.apiKey || !config.projectId) {
                throw new Error("No se encontraron 'apiKey' o 'projectId' válidos.");
            }

            storage.saveFirebaseConfig(config);
            setIsCloudConnected(true);
            setView('dashboard');
            alert("¡Conexión establecida con éxito! La página se recargará ahora.");
            window.location.reload(); 
        } catch (e) {
            console.error(e);
            alert("No se pudo interpretar el código. \n\nPor favor, copia todo el bloque de configuración (incluyendo o excluyendo llaves, no importa).");
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
                                <li>Ve a Configuración del Proyecto y copia la configuración del SDK (botón "Configuración Web").</li>
                                <li>Pega el código abajo (acepta cualquier formato).</li>
                            </ol>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Configuración Firebase</label>
                            <textarea
                                value={firebaseConfigInput}
                                onChange={(e) => setFirebaseConfigInput(e.target.value)}
                                placeholder='Pega aquí lo que copiaste. Ejemplo: apiKey: "...", projectId: "..."'
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
                                                    <button onClick={() => handleDeleteEntry(entry.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2">
                                                        <Trash2 size={18} />
                                                    </button>
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
                    <p className="text-gray-500 dark:text-gray-400">Gestiona los usuarios y accesos.</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingUser(null);
                        setUserNameInput('');
                        setCustomAvatar(null);
                        setIsAddingUser(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-opacity font-medium shadow-lg shadow-slate-200 dark:shadow-none"
                >
                    <PlusCircle size={18} />
                    <span className="hidden sm:inline">Nuevo Usuario</span>
                </button>
            </div>

            {isAddingUser && (
                <div className="mb-8 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl animate-fade-in-up">
                    <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative group cursor-pointer">
                                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 hover:border-red-500 transition-colors flex items-center justify-center">
                                    {customAvatar ? (
                                        <img src={customAvatar} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="text-gray-400 group-hover:text-red-500" size={24} />
                                    )}
                                </div>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                            <span className="text-xs text-gray-400">Click para foto</span>
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Completo</label>
                                <input 
                                    type="text" 
                                    value={userNameInput}
                                    onChange={(e) => setUserNameInput(e.target.value)}
                                    placeholder="Ej. Ana García"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 focus:ring-2 focus:ring-red-500 outline-none dark:text-white"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button 
                                    onClick={() => setIsAddingUser(false)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSaveUser}
                                    disabled={!userNameInput.trim()}
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
                                >
                                    {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => startEditUser(user)}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Editar"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button 
                                    onClick={() => handleToggleUserStatus(user.id, user.active)}
                                    className={`p-2 rounded-lg transition-colors ${user.active ? 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                                    title={user.active ? "Desactivar" : "Activar"}
                                >
                                    <Power size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white font-sans transition-colors duration-200">
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
                    <img src={currentUser.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200" />
                </div>
            </header>

            <div className="flex h-screen overflow-hidden">
                {/* Desktop Sidebar */}
                <aside className="hidden md:flex w-64 flex-col bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 z-10">
                    <div className="p-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-red-200 dark:shadow-none">I</div>
                        <div>
                            <h1 className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">Ibspot</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Productividad</p>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4 px-4">Menu</div>
                        <SidebarItem icon={PlusCircle} label="Registrar" active={view === 'entry'} onClick={() => setView('entry')} />
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
                        <SidebarItem icon={History} label="Historial" active={view === 'history'} onClick={() => setView('history')} />
                        
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-8 px-4">Administración</div>
                        <SidebarItem icon={Users} label="Equipo" active={view === 'users'} onClick={() => setView('users')} />
                        <SidebarItem 
                            icon={isCloudConnected ? Cloud : CloudOff} 
                            label="Nube / Sync" 
                            active={view === 'cloud'} 
                            onClick={() => setView('cloud')} 
                            extraClass={isCloudConnected ? "text-green-600 dark:text-green-400" : ""}
                        />
                    </nav>

                    <div className="p-4 border-t border-gray-100 dark:border-slate-700">
                         <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 flex items-center gap-3 mb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="Cambiar usuario">
                            <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full border border-white dark:border-slate-600" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{currentUser.name}</p>
                                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={toggleTheme} className="flex-1 py-2 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                            {/* Simple User Switcher for demo purposes */}
                             <div className="relative group flex-1">
                                <button className="w-full py-2 flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <UserCog size={18} />
                                </button>
                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-600 overflow-hidden hidden group-hover:block p-1">
                                    <p className="px-3 py-2 text-xs font-bold text-gray-400 uppercase">Cambiar Usuario</p>
                                    {users.filter(u => u.active && u.id !== currentUser.id).map(u => (
                                        <button key={u.id} onClick={() => handleUserChange(u.id)} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg flex items-center gap-2">
                                            <img src={u.avatar} className="w-5 h-5 rounded-full" /> {u.name}
                                        </button>
                                    ))}
                                </div>
                             </div>
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
                    </div>
                </main>
            </div>
        </div>
    );
}