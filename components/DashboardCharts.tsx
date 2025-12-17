import React from 'react';
import { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Cell, Legend, Area, AreaChart 
} from 'recharts';

interface ChartProps {
    data: any[];
    isDarkMode?: boolean;
}

export const ActivityChart: React.FC<ChartProps> = ({ data, isDarkMode = false }) => {
    if (!data || data.length === 0) {
        return (
            <div className={`h-64 flex items-center justify-center rounded-xl border border-dashed ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                Sin datos suficientes para graficar
            </div>
        );
    }

    const axisColor = isDarkMode ? '#94a3b8' : '#6B7280'; // slate-400 vs gray-500
    const gridColor = isDarkMode ? '#334155' : '#E5E7EB'; // slate-700 vs gray-200
    const tooltipBg = isDarkMode ? '#1e293b' : '#ffffff';
    const tooltipText = isDarkMode ? '#f1f5f9' : '#1f2937';

    // Ibspot Red: #DC2626 (red-600 in tailwind)
    const activeBarColor = '#DC2626'; 
    // Neutral Gray for history
    const historyBarColor = isDarkMode ? '#475569' : '#cbd5e1';

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis 
                        dataKey="label" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: axisColor, fontSize: 12 }} 
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: axisColor, fontSize: 12 }} 
                    />
                    <Tooltip 
                        cursor={{ fill: isDarkMode ? '#334155' : '#F3F4F6' }}
                        contentStyle={{ 
                            borderRadius: '8px', 
                            border: 'none', 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            backgroundColor: tooltipBg,
                            color: tooltipText
                        }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                        {data.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={index === data.length - 1 ? activeBarColor : historyBarColor} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const ComparisonChart: React.FC<ChartProps> = ({ data, isDarkMode = false }) => {
    const axisColor = isDarkMode ? '#94a3b8' : '#6B7280';
    const gridColor = isDarkMode ? '#334155' : '#E5E7EB';
    const tooltipBg = isDarkMode ? '#1e293b' : '#ffffff';
    const tooltipText = isDarkMode ? '#f1f5f9' : '#1f2937';

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis 
                        dataKey="day" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: axisColor, fontSize: 12 }} 
                        dy={10}
                        interval={2} // Show every 3rd day to avoid clutter
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: axisColor, fontSize: 12 }} 
                    />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: '8px', 
                            border: 'none', 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            backgroundColor: tooltipBg,
                            color: tooltipText
                        }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line 
                        type="monotone" 
                        dataKey="anterior" 
                        name="Mes Anterior"
                        stroke={isDarkMode ? '#64748b' : '#9ca3af'} 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={{ r: 6 }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="actual" 
                        name="Mes Actual"
                        stroke="#DC2626" 
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 8, fill: '#DC2626' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};