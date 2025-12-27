
import React, { useState, useMemo } from 'react';
import { Invoice, Purchase, InvoiceStatus, InvoiceType } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { 
  X, Printer, ArrowLeft, Calendar, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle, PieChart, BarChart2, DollarSign, 
  Activity, Lightbulb 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell 
} from 'recharts';

interface BusinessOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  invoices: Invoice[];
  purchases: Purchase[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const BusinessOverviewModal: React.FC<BusinessOverviewModalProps> = ({ 
  isOpen, onClose, onBack, invoices, purchases 
}) => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const data = useMemo(() => {
    const filteredInvoices = invoices.filter(i => {
      const d = new Date(i.date);
      return d >= new Date(startDate) && d <= new Date(endDate) && i.isCertified && i.status !== InvoiceStatus.CANCELLED;
    });

    const filteredPurchases = purchases.filter(p => {
      const d = new Date(p.date);
      return d >= new Date(startDate) && d <= new Date(endDate);
    });

    const totalSales = filteredInvoices.reduce((acc, i) => acc + (i.currency === 'AOA' ? i.total : i.contraValue || i.total), 0);
    const totalPurchases = filteredPurchases.reduce((acc, p) => acc + p.total, 0);

    const dailyMap = new Map<string, { date: string, sales: number, purchases: number }>();
    filteredInvoices.forEach(i => {
       const dateKey = formatDate(i.date);
       const curr = dailyMap.get(dateKey) || { date: dateKey, sales: 0, purchases: 0 };
       curr.sales += (i.currency === 'AOA' ? i.total : i.contraValue || i.total);
       dailyMap.set(dateKey, curr);
    });
    filteredPurchases.forEach(p => {
       const dateKey = formatDate(p.date);
       const curr = dailyMap.get(dateKey) || { date: dateKey, sales: 0, purchases: 0 };
       curr.purchases += p.total;
       dailyMap.set(dateKey, curr);
    });

    const chartData = Array.from(dailyMap.values());
    const salesByType = [
        { name: 'Produtos', value: filteredInvoices.flatMap(i => i.items).filter(item => item.type === 'PRODUCT').reduce((acc, item) => acc + item.total, 0) },
        { name: 'Serviços', value: filteredInvoices.flatMap(i => i.items).filter(item => item.type === 'SERVICE').reduce((acc, item) => acc + item.total, 0) },
    ].filter(i => i.value > 0);

    return { totalSales, totalPurchases, chartData, salesByType };
  }, [invoices, purchases, startDate, endDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 overflow-y-auto animate-in fade-in duration-300">
        <div className="bg-slate-900 text-white p-4 sticky top-0 z-50 flex justify-between items-center shadow-lg">
            <h1 className="text-xl font-bold uppercase">Visão de Negócio Inteligente</h1>
            <div className="flex gap-2">
                <button onClick={onClose} className="p-2 hover:bg-red-600 rounded-lg transition-colors"><X/></button>
            </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-8 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Vendas Acumuladas</p>
                    <h3 className="text-3xl font-black text-blue-600">{formatCurrency(data.totalSales)}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Compras Acumuladas</p>
                    <h3 className="text-3xl font-black text-orange-600">{formatCurrency(data.totalPurchases)}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow border border-slate-200">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Margem Bruta Estimada</p>
                    <h3 className="text-3xl font-black text-emerald-600">{formatCurrency(data.totalSales - data.totalPurchases)}</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow border border-slate-200 overflow-hidden">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BarChart2 className="text-blue-600"/> Comparativo Diário</h3>
                    <div className="w-full h-80 min-h-[350px] relative">
                        <ResponsiveContainer width="100%" height={350} minWidth={0} minHeight={0}>
                            <BarChart data={data.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="date" tick={{fontSize: 10}}/>
                                <YAxis tick={{fontSize: 10}}/>
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="sales" name="Vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="purchases" name="Compras" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow border border-slate-200 overflow-hidden">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><PieChart className="text-purple-600"/> Origem da Receita</h3>
                    <div className="w-full h-80 min-h-[350px] relative">
                        <ResponsiveContainer width="100%" height={350} minWidth={0} minHeight={0}>
                            <RePieChart>
                                <Pie data={data.salesByType} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {data.salesByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom"/>
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default BusinessOverviewModal;
