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
    Save
} from 'lucide-react';
import { ActivityChart } from './components/DashboardCharts';
import { DEFAULT_USERS, User, IsinEntry, TimeFrame } from './types';
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

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
            active 
            ? 'bg-blue-50 text-blue-600 font-medium' 
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
        <span>{label}</span>
    </button>
);

const StatCard = ({ label, value, subtext, icon: Icon, highlight = false }: any) => (
    <div className={`p-6 rounded-2xl border ${highlight ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className={`text-sm font-medium ${highlight ? 'text-blue-100' : 'text-gray-500'}`}>{label}</p>
                <h3 className="text-3xl font-bold mt-1">{value}</h3>
            </div>
            <div className={`p-2 rounded-lg ${highlight ? 'bg-white/20' : 'bg-gray-50'}`}>
                <Icon size={20} className={highlight ? 'text-white' : 'text-gray-400'} />
            </div>
        </div>
        {subtext && <p className={`text-sm ${highlight ? 'text-blue-200' : 'text-green-600'} flex items-center`}>
            {subtext}
        </p>}
    </div>
);

// --- Main App ---

export default function App() {
    const [view, setView] = useState<'dashboard' | 'entry' | 'history' | 'users'>('entry');
    const [entries, setEntries] = useState<IsinEntry[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USERS[0]);
    const [timeFrame, setTimeFrame] = useState<TimeFrame>('day');
    
    // Form State
    const [isinInput, setIsinInput] = useState('');
    const [entryStatus, setEntryStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [lastAdded, setLastAdded] = useState<string | null>(null);

    // AI State
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    // User Management State
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [userNameInput, setUserNameInput] = useState('');
    const [isAddingUser, setIsAddingUser] = useState(false);

    // Load data
    useEffect(() => {
        setEntries(storage.getEntries());
        const loadedUsers = storage.getUsers();
        setUsers(loadedUsers);
        
        // Ensure current user exists in the loaded users list, otherwise fallback
        const savedUser = storage.getCurrentUser();
        const validUser = loadedUsers.find(u => u.id === savedUser.id) || loadedUsers[0];
        setCurrentUser(validUser);
    }, []);

    // Change User
    const handleUserChange = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) {
            setCurrentUser(user);
            storage.setCurrentUser(userId);
        }
    };

    // User Management Handlers
    const handleSaveUser = () => {
        if (!userNameInput.trim()) return;

        let newUsers = [...users];
        
        if (editingUser) {
            // Edit existing
            newUsers = newUsers.map(u => u.id === editingUser ? { ...u, name: userNameInput.trim() } : u);
            setEditingUser(null);
        } else {
            // Add new
            const newUser: User = {
                id: crypto.randomUUID(),
                name: userNameInput.trim(),
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userNameInput.trim())}`
            };
            newUsers.push(newUser);
            setIsAddingUser(false);
        }

        setUsers(newUsers);
        storage.saveUsers(newUsers);
        setUserNameInput('');
        
        // Update current user if we just edited them
        if (editingUser === currentUser.id) {
            setCurrentUser(newUsers.find(u => u.id === editingUser)!);
        }
    };

    const handleDeleteUser = (userId: string) => {
        if (users.length <= 1) {
            alert("Debe haber al menos un usuario.");
            return;
        }
        if (confirm("¿Estás seguro de eliminar este usuario? Sus registros históricos permanecerán pero no podrá registrar nuevos productos.")) {
            const newUsers = users.filter(u => u.id !== userId);
            setUsers(newUsers);
            storage.saveUsers(newUsers);

            // If we deleted the active user, switch to the first available
            if (currentUser.id === userId) {
                const nextUser = newUsers[0];
                setCurrentUser(nextUser);
                storage.setCurrentUser(nextUser.id);
            }
        }
    };

    const startEditUser = (user: User) => {
        setUserNameInput(user.name);
        setEditingUser(user.id);
        setIsAddingUser(true);
    };

    // Filter Logic
    const filteredEntries = useMemo(() => {
        const now = new Date();
        const start = getStartOfPeriod(now, timeFrame);
        return entries.filter(e => e.timestamp >= start.getTime());
    }, [entries, timeFrame]);

    // Leaderboard Logic
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

    // Chart Data Logic
    const chartData = useMemo(() => {
        const data: Record<string, number> = {};
        filteredEntries.forEach(e => {
            const key = formatDate(e.dateStr); 
            data[key] = (data[key] || 0) + 1;
        });

        const sortedKeys = Object.keys(data).sort((a,b) => 0); // Simplified sort
        return sortedKeys.map(key => ({ label: key, value: data[key] }));
    }, [filteredEntries]);

    // Handlers for Entries
    const handleAddEntry = (e: React.FormEvent) => {
        e.preventDefault();
        const cleaned = isinInput.trim().toUpperCase();

        if (cleaned.length < 8) { 
            setEntryStatus('error');
            setTimeout(() => setEntryStatus('idle'), 2000);
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
        setEntries(updated);
        storage.saveEntry(newEntry);

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

    const handleExportCsv = () => {
        if (entries.length === 0) return;

        const headers = ['Fecha', 'Hora', 'ISIN', 'Usuario', 'ID Usuario'];
        const rows = entries.map(entry => {
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
        link.setAttribute('download', `ibspot_registros_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // --- Views ---

    const renderEntryView = () => (
        <div className="max-w-xl mx-auto mt-10">
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Registrar Producto</h2>
                    <p className="text-gray-500 mt-2">Ingresa el código ISIN del producto subido a Ibspot.</p>
                </div>

                <form onSubmit={handleAddEntry} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">Código ISIN</label>
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
                                      entryStatus === 'success' ? 'border-green-300 focus:border-green-500 focus:ring-green-100 bg-green-50' : 
                                      'border-gray-200 focus:border-blue-500 focus:ring-blue-100 bg-gray-50'}`}
                                autoFocus
                            />
                        </div>
                        {entryStatus === 'error' && (
                            <p className="text-center text-red-500 text-sm mt-2 flex justify-center items-center gap-1">
                                <AlertCircle size={14}/> Código demasiado corto o inválido.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!isinInput}
                        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <PlusCircle size={24} />
                        <span>Registrar Ahora</span>
                    </button>
                </form>

                {entryStatus === 'success' && (
                    <div className="mt-8 p-4 bg-green-50 rounded-2xl flex items-center justify-center gap-3 animate-fade-in-up">
                        <div className="bg-green-100 p-2 rounded-full">
                            <CheckCircle2 className="text-green-600" size={24} />
                        </div>
                        <div>
                            <p className="text-green-800 font-medium">¡Registrado con éxito!</p>
                            <p className="text-green-600 text-sm">ISIN: {lastAdded}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-8 text-center text-sm text-gray-400">
                <p>Estás registrando como <span className="font-semibold text-gray-600">{currentUser.name}</span></p>
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Panel de Control</h2>
                    <p className="text-gray-500">Rendimiento y contabilidad</p>
                </div>
                <div className="bg-white p-1 rounded-lg border border-gray-200 inline-flex shadow-sm overflow-x-auto max-w-full">
                    {(['day', 'week', 'month', 'year'] as TimeFrame[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => {
                                setTimeFrame(tf);
                                setAiInsight(null); // Reset AI on change
                            }}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                                timeFrame === tf 
                                ? 'bg-slate-900 text-white shadow-sm' 
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {tf === 'day' ? 'Hoy' : 
                             tf === 'week' ? 'Semana' : 
                             tf === 'month' ? 'Mes' : 'Año'}
                        </button>
                    ))}
                </div>
            </div>

            {/* AI Insight */}
            {aiInsight ? (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl border border-blue-100 relative">
                    <button onClick={() => setAiInsight(null)} className="absolute top-4 right-4 text-blue-400 hover:text-blue-700">
                        <X size={18} />
                    </button>
                    <div className="flex items-start gap-4">
                        <div className="bg-white p-2 rounded-full shadow-sm">
                            <Sparkles className="text-indigo-500" size={20} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-indigo-900 text-sm mb-1">Análisis IA</h4>
                            <p className="text-indigo-800 leading-relaxed text-sm md:text-base">"{aiInsight}"</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex justify-end">
                     <button 
                        onClick={handleGenerateInsight}
                        disabled={isGeneratingAi}
                        className="text-xs flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50"
                    >
                        <Sparkles size={14} />
                        {isGeneratingAi ? 'Analizando...' : 'Generar reporte inteligente'}
                    </button>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    label="Registros Totales" 
                    value={filteredEntries.length} 
                    subtext="En el periodo seleccionado"
                    icon={TrendingUp}
                    highlight={true}
                />
                <StatCard 
                    label="Usuario Destacado" 
                    value={leaderboard.length > 0 ? leaderboard[0].user?.name.split(' ')[0] : '-'} 
                    subtext={leaderboard.length > 0 ? `${leaderboard[0].count} registros` : ''}
                    icon={Trophy}
                />
                <StatCard 
                    label="Promedio Diario" 
                    value={Math.round(filteredEntries.length / (chartData.length || 1))} 
                    subtext="Registros por día activo"
                    icon={BarChart3}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6">Tendencia de Cargas</h3>
                    <ActivityChart data={chartData} />
                </div>

                {/* Leaderboard Section */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Users size={18} className="text-blue-500"/> Ranking
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
                                              idx === 1 ? 'bg-gray-100 text-gray-700' : 
                                              idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-400 border border-gray-100'}
                                        `}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <img src={item.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown'} alt={item.user?.name} className="w-8 h-8 rounded-full bg-gray-200 object-cover" />
                                            <span className={`text-sm font-medium ${idx === 0 ? 'text-gray-900' : 'text-gray-600'}`}>
                                                {item.user?.name || 'Desconocido'}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-md">
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
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Historial Completo</h2>
                <button
                    onClick={handleExportCsv}
                    disabled={entries.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium text-sm"
                >
                    <Download size={16} />
                    Exportar CSV
                </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hora/Fecha</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ISIN</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {entries.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                                    No hay registros todavía.
                                </td>
                            </tr>
                        ) : (
                            entries.slice(0, 50).map((entry) => { 
                                const user = users.find(u => u.id === entry.userId);
                                return (
                                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(entry.timestamp).toLocaleString('es-ES')}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono font-medium text-slate-800">
                                            {entry.isin}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 flex items-center gap-2">
                                            {user ? (
                                                <img src={user.avatar} className="w-5 h-5 rounded-full" alt="" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-gray-200"></div>
                                            )}
                                            {user?.name || 'Usuario Eliminado'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {entries.length > 50 && (
                <p className="text-center text-gray-400 text-sm mt-4">Mostrando los últimos 50 registros.</p>
            )}
        </div>
    );

    const renderUsersView = () => (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
                    <p className="text-gray-500 mt-1">Añade o modifica los miembros del equipo.</p>
                </div>
                <button 
                    onClick={() => {
                        setUserNameInput('');
                        setEditingUser(null);
                        setIsAddingUser(!isAddingUser);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition-all shadow-md active:scale-95 ${isAddingUser ? 'bg-gray-400 hover:bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isAddingUser ? <X size={20} /> : <PlusCircle size={20} />}
                    {isAddingUser ? 'Cancelar' : 'Nuevo Usuario'}
                </button>
            </div>

            {/* Add/Edit Form */}
            {isAddingUser && (
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 mb-8 animate-fade-in-up">
                    <h3 className="font-bold text-gray-800 mb-4">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                    <div className="flex gap-3">
                        <input 
                            type="text" 
                            value={userNameInput}
                            onChange={(e) => setUserNameInput(e.target.value)}
                            placeholder="Nombre del usuario (ej. Laura Méndez)"
                            className="flex-1 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                            autoFocus
                        />
                        <button 
                            onClick={handleSaveUser}
                            disabled={!userNameInput.trim()}
                            className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
                        >
                            <Save size={20} /> Guardar
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map(user => (
                    <div key={user.id} className={`p-4 rounded-2xl border bg-white flex items-center justify-between group transition-all hover:shadow-md ${user.id === currentUser.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-4">
                            <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full bg-gray-100 object-cover" />
                            <div>
                                <h4 className="font-bold text-gray-900">{user.name}</h4>
                                {user.id === currentUser.id && <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">Activo ahora</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => startEditUser(user)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar nombre"
                            >
                                <Pencil size={18} />
                            </button>
                            <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar usuario"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
            {/* Sidebar */}
            <aside className="bg-white border-r border-gray-200 w-full md:w-64 flex-shrink-0 z-20">
                <div className="p-6 flex items-center gap-2 border-b border-gray-100">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <TrendingUp className="text-white" size={18} />
                    </div>
                    <span className="text-xl font-bold text-gray-900 tracking-tight">Ibspot<span className="text-blue-600">Tracker</span></span>
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
                </div>

                <div className="p-4 mt-auto border-t border-gray-100">
                    <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-3">Usuario Actual</p>
                    <div className="relative group">
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left">
                            <img src={currentUser.avatar} alt={currentUser.name} className="w-9 h-9 rounded-full border border-gray-200 object-cover" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                                <p className="text-xs text-gray-500">Cambiar usuario</p>
                            </div>
                        </button>
                        
                        {/* User Dropdown (Simplified for demo: shown on hover/focus within group) */}
                        <div className="hidden group-hover:block absolute bottom-full left-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl mb-2 overflow-hidden z-50">
                            {users.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => handleUserChange(u.id)}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 ${u.id === currentUser.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                                >
                                    <img src={u.avatar} className="w-6 h-6 rounded-full" />
                                    {u.name}
                                </button>
                            ))}
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
            </main>
        </div>
    );
}