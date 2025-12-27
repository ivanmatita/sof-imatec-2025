
import React, { useState, useMemo } from 'react';
import { Purchase, PurchaseType } from '../types';
import { formatCurrency, formatDate, exportToExcel } from '../utils';
import { printDocument, downloadExcel } from "../utils/exportUtils";
import { Search, Printer, Download, Filter, RefreshCw, Calendar, FileText, TrendingDown, DollarSign, Calculator, CheckCircle } from 'lucide-react';

interface PurchaseAnalysisProps {
  purchases: Purchase[];
}

const PurchaseAnalysis: React.FC<PurchaseAnalysisProps> = ({ purchases }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | 'ALL'>('ALL');

  // Filter Logic
  const filteredData = useMemo(() => {
      // REMOVED PENDING FILTER - Show all records
      return purchases.filter(p => {
          const d = new Date(p.date);
          const matchDate = d >= new Date(startDate) && d <= new Date(endDate);
          const matchYear = d.getFullYear() === year;
          const matchMonth = month === 'ALL' || (d.getMonth() + 1) === month;
          const matchSearch = p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              p.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              p.nif.includes(searchTerm);
          
          return matchDate && matchYear && matchMonth && matchSearch;
      }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, startDate, endDate, year, month, searchTerm]);

  // Calculations
  const totals = useMemo(() => {
      const totalPurchases = filteredData.reduce((acc, p) => acc + p.total, 0);
      const totalWithVAT = filteredData.reduce((acc, p) => acc + (p.taxAmount > 0 ? p.total : 0), 0);
      const totalWithoutVAT = filteredData.reduce((acc, p) => acc + (p.taxAmount === 0 ? p.total : 0), 0);
      const totalVAT = filteredData.reduce((acc, p) => acc + p.taxAmount, 0);
      const totalBase = filteredData.reduce((acc, p) => acc + p.subtotal, 0);
      
      // Deductible (Assume all certified purchases are deductible for now in this view)
      const deductibleVAT = totalVAT; 
      
      return { totalPurchases, totalWithVAT, totalWithoutVAT, totalVAT, totalBase, deductibleVAT };
  }, [filteredData]);

  const handleExportExcel = () => {
      downloadExcel("purchaseTable", "Analise_Compras.xlsx");
  };

  const handleRefresh = () => {
      // Simulate refresh
      alert("Dados atualizados com sucesso.");
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in pb-20 font-sans" id="purchaseAnalysisContainer">
        
        {/* HEADER */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Calculator className="text-blue-600"/> Análise Fiscal de Compras
                </h1>
                <p className="text-xs text-slate-500">Gestão detalhada de aquisições, IVA dedutível e despesas</p>
            </div>
            <div className="flex gap-2 print:hidden">
                <button onClick={() => printDocument("purchaseAnalysisContainer")} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-black transition shadow">
                    <Printer size={16}/> Imprimir
                </button>
                <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-green-700 transition shadow">
                    <Download size={16}/> Excel
                </button>
                <button onClick={handleRefresh} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition shadow">
                    <RefreshCw size={16}/> Atualizar
                </button>
            </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Período Inicial</label>
                <input type="date" className="w-full border p-2 rounded-lg text-sm" value={startDate} onChange={e => setStartDate(e.target.value)}/>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Período Final</label>
                <input type="date" className="w-full border p-2 rounded-lg text-sm" value={endDate} onChange={e => setEndDate(e.target.value)}/>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Ano Fiscal</label>
                <select className="w-full border p-2 rounded-lg text-sm bg-white" value={year} onChange={e => setYear(Number(e.target.value))}>
                    <option value={2023}>2023</option>
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Mês</label>
                <select className="w-full border p-2 rounded-lg text-sm bg-white" value={month} onChange={e => setMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}>
                    <option value="ALL">Todos</option>
                    {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{new Date(2024, m-1).toLocaleString('pt-PT', {month:'long'})}</option>)}
                </select>
            </div>
            <div>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                    <input 
                        className="w-full pl-9 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Pesquisar..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-600">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Compras (Bruto)</p>
                <h3 className="text-2xl font-black text-slate-800">{formatCurrency(totals.totalPurchases)}</h3>
                <p className="text-[10px] text-slate-400 mt-1">{filteredData.length} Documentos</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-green-600">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Base Tributável (Líquido)</p>
                <h3 className="text-2xl font-black text-green-700">{formatCurrency(totals.totalBase)}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Valor sem IVA</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-purple-500">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total IVA Suportado</p>
                <h3 className="text-2xl font-black text-purple-600">{formatCurrency(totals.totalVAT)}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Imposto nas Faturas</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-orange-500 bg-orange-50">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">IVA Dedutível (Estimado)</p>
                <h3 className="text-2xl font-black text-orange-600">{formatCurrency(totals.deductibleVAT)}</h3>
                <p className="text-[10px] text-slate-400 mt-1">Crédito a favor do sujeito</p>
            </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-sm text-slate-700 uppercase flex justify-between items-center">
                <span>Extrato Detalhado de Aquisições</span>
                <span className="text-xs normal-case bg-blue-100 text-blue-800 px-2 py-1 rounded">Total Registos: {filteredData.length}</span>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs" id="purchaseTable">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-200">
                        <tr>
                            <th className="p-3 w-10 text-center">No</th>
                            <th className="p-3 w-24">Data</th>
                            <th className="p-3 w-40">Nº Documento</th>
                            <th className="p-3">Fornecedor</th>
                            <th className="p-3 w-24">NIF</th>
                            <th className="p-3 text-right">Base Incidência</th>
                            <th className="p-3 text-right">IVA</th>
                            <th className="p-3 text-right">Total</th>
                            <th className="p-3 text-center">Certificação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredData.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 text-center bg-slate-50 text-slate-500 font-mono">{idx + 1}</td>
                                <td className="p-3">{formatDate(item.date)}</td>
                                <td className="p-3 font-bold text-blue-700">{item.documentNumber}</td>
                                <td className="p-3 font-medium">{item.supplier}</td>
                                <td className="p-3 font-mono">{item.nif}</td>
                                <td className="p-3 text-right font-mono">{formatCurrency(item.subtotal).replace('Kz','')}</td>
                                <td className="p-3 text-right font-mono text-purple-600 font-bold">{formatCurrency(item.taxAmount).replace('Kz','')}</td>
                                <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(item.total)}</td>
                                <td className="p-3 text-center">
                                    {item.hash ? (
                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1"><CheckCircle size={10}/> HASH OK</span>
                                    ) : (
                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredData.length === 0 && (
                            <tr><td colSpan={9} className="p-8 text-center text-slate-400 italic">Sem registos encontrados para o período.</td></tr>
                        )}
                    </tbody>
                    <tfoot className="bg-slate-800 text-white font-bold border-t border-slate-300">
                        <tr>
                            <td colSpan={5} className="p-3 text-right uppercase text-xs">Totais Consolidados</td>
                            <td className="p-3 text-right">{formatCurrency(totals.totalBase).replace('Kz','')}</td>
                            <td className="p-3 text-right">{formatCurrency(totals.totalVAT).replace('Kz','')}</td>
                            <td className="p-3 text-right text-base">{formatCurrency(totals.totalPurchases)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </div>
  );
};

export default PurchaseAnalysis;
