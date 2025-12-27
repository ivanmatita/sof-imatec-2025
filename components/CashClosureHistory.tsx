
import React from 'react';
import { CashClosure } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Printer, Search, Calendar, FileText } from 'lucide-react';

interface CashClosureHistoryProps {
  closures: CashClosure[];
}

const CashClosureHistory: React.FC<CashClosureHistoryProps> = ({ closures }) => {
  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText/> Histórico de Fechos de Caixa</h1>
            <div className="flex gap-2">
                <input type="date" className="p-2 border rounded text-sm"/>
                <button className="bg-white border p-2 rounded hover:bg-slate-50"><Search size={18}/></button>
            </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs border-b">
                    <tr>
                        <th className="p-4">Data/Hora</th>
                        <th className="p-4">Operador</th>
                        <th className="p-4 text-right">Vendas</th>
                        <th className="p-4 text-right">Saldo Inicial</th>
                        <th className="p-4 text-right">Saldo Final</th>
                        <th className="p-4 text-right">Diferença</th>
                        <th className="p-4 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {closures.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                            <td className="p-4">
                                <div className="font-bold text-slate-700">{formatDate(c.date)}</div>
                                <div className="text-xs text-slate-400">{new Date(c.date).toLocaleTimeString()}</div>
                            </td>
                            <td className="p-4">{c.operatorName}</td>
                            <td className="p-4 text-right font-mono">{formatCurrency(c.totalSales)}</td>
                            <td className="p-4 text-right text-slate-500">{formatCurrency(c.initialBalance)}</td>
                            <td className="p-4 text-right font-bold">{formatCurrency(c.finalBalance)}</td>
                            <td className={`p-4 text-right font-bold ${c.difference === 0 ? 'text-slate-400' : c.difference > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(c.difference)}
                            </td>
                            <td className="p-4 text-center">
                                <button className="text-slate-500 hover:text-blue-600 p-2" title="Imprimir Relatório"><Printer size={18}/></button>
                            </td>
                        </tr>
                    ))}
                    {closures.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-slate-400">Nenhum fecho registado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default CashClosureHistory;
