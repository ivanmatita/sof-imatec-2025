
import React, { useState, useMemo } from 'react';
import { Invoice, Purchase, InvoiceType, PurchaseType } from '../types';
import { FileJson, Download, Calendar, CheckCircle, AlertCircle, PieChart, FileText, List } from 'lucide-react';
import { formatCurrency } from '../utils';

interface SaftExportProps {
  invoices: Invoice[];
  purchases: Purchase[];
}

const SaftExport: React.FC<SaftExportProps> = ({ invoices, purchases }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [saftType, setSaftType] = useState<'SALES' | 'PURCHASE'>('SALES');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter Logic using accountingDate
  const filteredInvoices = invoices.filter(i => {
      const d = new Date(i.accountingDate || i.date);
      return d >= new Date(startDate) && d <= new Date(endDate) && i.isCertified;
  });

  const filteredPurchases = purchases.filter(p => {
      const d = new Date(p.date);
      return d >= new Date(startDate) && d <= new Date(endDate);
  });

  const salesDocTypeSummary = useMemo(() => {
      const summary: Record<string, { count: number, total: number }> = {};
      Object.values(InvoiceType).forEach(type => { summary[type] = { count: 0, total: 0 }; });
      filteredInvoices.forEach(inv => {
          if (!summary[inv.type]) summary[inv.type] = { count: 0, total: 0 };
          summary[inv.type].count += 1;
          summary[inv.type].total += (inv.currency === 'AOA' ? inv.total : inv.contraValue || inv.total);
      });
      return Object.entries(summary).filter(([_, data]) => data.count > 0).map(([type, data]) => ({ type, count: data.count, total: data.total }));
  }, [filteredInvoices]);

  const purchaseDocTypeSummary = useMemo(() => {
      const summary: Record<string, { count: number, total: number }> = {};
      Object.values(PurchaseType).forEach(type => { summary[type] = { count: 0, total: 0 }; });
      filteredPurchases.forEach(pur => {
          if (!summary[pur.type]) summary[pur.type] = { count: 0, total: 0 };
          summary[pur.type].count += 1;
          summary[pur.type].total += pur.total;
      });
      return Object.entries(summary).filter(([_, data]) => data.count > 0).map(([type, data]) => ({ type, count: data.count, total: data.total }));
  }, [filteredPurchases]);

  const activeSummary = saftType === 'SALES' ? salesDocTypeSummary : purchaseDocTypeSummary;
  const recordCount = saftType === 'SALES' ? filteredInvoices.length : filteredPurchases.length;
  const totalValue = saftType === 'SALES' 
      ? filteredInvoices.reduce((acc, i) => acc + (i.currency === 'AOA' ? i.total : i.contraValue || i.total), 0)
      : filteredPurchases.reduce((acc, p) => acc + p.total, 0);

  const handleDownload = () => {
      setIsGenerating(true);
      setTimeout(() => {
          const fileName = `SAFT_${saftType}_${startDate}_${endDate}.xml`;
          const dummyContent = `<?xml version="1.0" encoding="Windows-1252"?><AuditFile><Header><CompanyName>C & V - COMERCIO GERAL</CompanyName><StartDate>${startDate}</StartDate><EndDate>${endDate}</EndDate></Header></AuditFile>`;
          const blob = new Blob([dummyContent], { type: 'text/xml' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = fileName; a.click();
          window.URL.revokeObjectURL(url);
          setIsGenerating(false);
      }, 1500);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in">
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                    <div><h1 className="text-2xl font-bold flex items-center gap-3"><FileJson size={32}/> Ficheiro SAFT-AO</h1><p className="text-slate-400 mt-1">Exportação baseada na Data Contabilística</p></div>
                    <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700"><span className="text-xs font-bold uppercase text-slate-400 block">Versão Validador</span><span className="font-mono font-bold text-green-400">1.01_01</span></div>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div><label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Ficheiro</label><div className="grid grid-cols-2 gap-4"><button onClick={() => setSaftType('SALES')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${saftType === 'SALES' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200'}`}><span className="font-bold">Faturação</span></button><button onClick={() => setSaftType('PURCHASE')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${saftType === 'PURCHASE' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200'}`}><span className="font-bold">Aquisição</span></button></div></div>
                        <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-slate-700 mb-2">Início</label><input type="date" className="w-full p-2.5 border rounded-lg" value={startDate} onChange={e => setStartDate(e.target.value)} /></div><div><label className="block text-sm font-bold text-slate-700 mb-2">Fim</label><input type="date" className="w-full p-2.5 border rounded-lg" value={endDate} onChange={e => setEndDate(e.target.value)} /></div></div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col justify-between">
                        <div><h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Resumo SAFT</h3><div className="space-y-3 text-sm"><div className="flex justify-between"><span>Registos:</span><span className="font-bold text-blue-600 text-lg">{recordCount}</span></div><div className="flex justify-between border-t pt-2"><span>Volume Total:</span><span className="font-bold text-slate-900 text-lg">{formatCurrency(totalValue)}</span></div></div></div>
                        <button onClick={handleDownload} disabled={isGenerating || recordCount === 0} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-6">{isGenerating ? 'A Processar...' : <><Download size={20}/> Gerar Ficheiro XML</>}</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SaftExport;
