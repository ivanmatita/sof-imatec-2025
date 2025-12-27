
import React, { useState, useMemo } from 'react';
import { UserActivityLog, Employee, User, DisciplinaryAction } from '../types';
import { formatDate, generateId } from '../utils';
import { printDocument, downloadPDF } from "../utils/exportUtils";
import { 
  Search, Download, Printer, Filter, BarChart3, Clock, FileText, 
  AlertTriangle, Upload, X, Shield, Activity, Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PerformanceAnalysisProps {
  logs: UserActivityLog[];
  employees: Employee[];
  users: User[];
}

const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({ logs, employees, users }) => {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'STATS' | 'DISCIPLINARY'>('LOGS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const filteredLogs = useMemo(() => {
      return logs.filter(log => {
          const matchUser = selectedUser === 'ALL' || log.userId === selectedUser;
          const matchSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase());
          const logDate = new Date(log.timestamp).toISOString().split('T')[0];
          return matchUser && matchSearch && logDate === dateFilter;
      }).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, selectedUser, searchTerm, dateFilter]);

  const stats = useMemo(() => {
      const userStats: Record<string, { docs: number, logins: number }> = {};
      logs.forEach(log => {
          if (!userStats[log.userId]) userStats[log.userId] = { docs: 0, logins: 0 };
          if (log.action === 'Login') userStats[log.userId].logins += 1;
          if (log.action.includes('Document')) userStats[log.userId].docs += 1;
      });
      const chartData = Object.keys(userStats).map(uid => ({
          name: users.find(user => user.id === uid)?.name || 'Desconhecido',
          docs: userStats[uid].docs,
          logins: userStats[uid].logins
      }));
      return { chartData };
  }, [logs, users]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in pb-20">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold flex items-center gap-2"><Activity className="text-blue-600"/> Análise de Performance</h1>
            <div className="flex gap-2">
                <button onClick={() => setActiveTab('LOGS')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'LOGS' ? 'bg-slate-800 text-white' : 'bg-white border'}`}>Logs</button>
                <button onClick={() => setActiveTab('STATS')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'STATS' ? 'bg-slate-800 text-white' : 'bg-white border'}`}>Estátisticas</button>
            </div>
        </div>

        {activeTab === 'STATS' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <h3 className="font-bold text-slate-800 mb-6">Produtividade por Utilizador</h3>
                <div className="w-full h-[400px] min-h-[400px] relative">
                    <ResponsiveContainer width="100%" height={400} minWidth={0} minHeight={0}>
                        <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="docs" name="Documentos Gerados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="logins" name="Acessos ao Sistema" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}

        {activeTab === 'LOGS' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b">
                        <tr>
                            <th className="p-4">Hora</th>
                            <th className="p-4">Utilizador</th>
                            <th className="p-4">Ação</th>
                            <th className="p-4">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredLogs.map(log => (
                            <tr key={log.id}>
                                <td className="p-4">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                <td className="p-4 font-bold">{log.userName}</td>
                                <td className="p-4 text-blue-700 font-medium">{log.action}</td>
                                <td className="p-4">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
  );
};

export default PerformanceAnalysis;
