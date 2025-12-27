
import React, { useState, useMemo } from 'react';
import { Invoice, Purchase, VatSettlement } from '../types';
import { formatCurrency, formatDate, generateId } from '../utils';
import { Calculator, Save, History, Printer, CheckCircle } from 'lucide-react';

interface VatSettlementMapProps {
  invoices: Invoice[];
  purchases: Purchase[];
  onSaveSettlement: (settlement: VatSettlement) => void;
  history: VatSettlement[];
}

const VatSettlementMap: React.FC<VatSettlementMapProps> = ({ invoices, purchases, onSaveSettlement, history }) => {
  const [view, setView] = useState<'CALCULATE' | 'HISTORY'>('CALCULATE');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [manualAdjustments, setManualAdjustments] = useState({
      salesAdjust: 0,
      purchaseAdjust: 0
  });

  const months = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' }, 
    { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' }, 
    { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
  ];

  // Calculate Logic
  const calculation = useMemo(() => {
      const targetDate = new Date(year, month - 1);
      
      const filteredInvoices = invoices.filter(i => {
          const d = new Date(i.date);
          return d.getMonth() + 1 === month && d.getFullYear() === year && i.isCertified;
      });

      const filteredPurchases = purchases.filter(p => {
          const d = new Date(p.date);
          return d.getMonth() + 1 === month && d.getFullYear() === year && p.status === 'PAID';
      });

      // 34.5.3.1 - IVA Liquidado (Sales)
      const ivaLiquidado = filteredInvoices.reduce((acc, i) => acc + i.taxAmount, 0);
      
      // 34.5.2.1 - IVA Dedutível (Purchases)
      const ivaDedutivel = filteredPurchases.reduce((acc, p) => acc + p.taxAmount, 0);

      // Adjustments (Manual input)
      const totalDebit = ivaDedutivel + manualAdjustments.purchaseAdjust;
      const totalCredit = ivaLiquidado + manualAdjustments.salesAdjust;

      // Balance: Liquidado (Credit) - Dedutivel (Debit)
      // Positive = Favor Estado (To Pay)
      // Negative = Favor Sujeito Passivo (To Recover)
      const balance = totalCredit - totalDebit;

      return {
          stockValue: 0, // Placeholder
          ivaDedutivel,
          ivaLiquidado,
          totalDebit,
          totalCredit,
          balance,
          filteredInvoices,
          filteredPurchases
      };
  }, [invoices, purchases, month, year, manualAdjustments]);

  const handleRegister = () => {
      if (view === 'HISTORY') return;
      
      const settlement: VatSettlement = {
          id: generateId(),
          month,
          year,
          dateProcessed: new Date().toISOString(),
          totalDebit: calculation.totalDebit,
          totalCredit: calculation.totalCredit,
          balance: calculation.balance,
          status: 'PROCESSED',
          details: {
              salesAdjust: manualAdjustments.salesAdjust,
              purchaseAdjust: manualAdjustments.purchaseAdjust
          }
      };

      onSaveSettlement(settlement);
      setView('HISTORY');
      alert("Apuramento registado com sucesso!");
  };

  const f = (n: number) => formatCurrency(n).replace('Kz', '').trim();

  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in pb-20">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Calculator className="text-blue-600"/> Apuramento de IVA
                </h1>
                <p className="text-xs text-slate-500">Gestão mensal do Imposto sobre Valor Acrescentado</p>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setView('CALCULATE')} 
                    className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 ${view === 'CALCULATE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <Calculator size={16}/> Novo Apuramento
                </button>
                <button 
                    onClick={() => setView('HISTORY')} 
                    className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 ${view === 'HISTORY' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <History size={16}/> Efetuados
                </button>
            </div>
        </div>

        {view === 'CALCULATE' && (
            <div className="space-y-6">
                {/* Controls */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 flex gap-4 items-end">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mês</label>
                        <select className="border p-2 rounded w-40 text-sm font-bold" value={month} onChange={e => setMonth(Number(e.target.value))}>
                            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ano</label>
                        <select className="border p-2 rounded w-24 text-sm font-bold" value={year} onChange={e => setYear(Number(e.target.value))}>
                            <option value={2023}>2023</option>
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                        </select>
                    </div>
                    <div className="ml-auto">
                        <button onClick={handleRegister} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 shadow-md transition">
                            <Save size={18}/> REGISTAR APURAMENTO
                        </button>
                    </div>
                </div>

                {/* Calculation Map */}
                <div className="bg-white border border-slate-300 rounded shadow-lg overflow-hidden">
                    <div className="bg-slate-100 p-2 border-b border-slate-300 font-bold text-xs uppercase text-slate-600">Cálculo de Saldos do Período</div>
                    
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs">
                            <tr>
                                <th className="p-3 text-left w-32 border-r">Conta</th>
                                <th className="p-3 text-left border-r">Descrição</th>
                                <th className="p-3 text-right w-40 border-r">Débito</th>
                                <th className="p-3 text-right w-40 border-r">Crédito</th>
                                <th className="p-3 text-right w-40 border-r">Saldo Débito</th>
                                <th className="p-3 text-right w-40">Saldo Crédito</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {/* Stock - Placeholder logic */}
                            <tr>
                                <td className="p-3 font-mono border-r">34.5.1.1</td>
                                <td className="p-3 border-r">Existências</td>
                                <td className="p-3 text-right border-r">0,00</td>
                                <td className="p-3 text-right border-r">0,00</td>
                                <td className="p-3 text-right border-r">0,00</td>
                                <td className="p-3 text-right">0,00</td>
                            </tr>
                            
                            {/* 34.5.3.1 - Operações Gerais (Output Tax) */}
                            <tr>
                                <td className="p-3 font-mono border-r">34.5.3.1</td>
                                <td className="p-3 border-r">Operações Gerais (Vendas)</td>
                                <td className="p-3 text-right border-r font-medium">0,00</td>
                                <td className="p-3 text-right border-r font-medium">{f(calculation.ivaLiquidado)}</td>
                                <td className="p-3 text-right border-r">0,00</td>
                                <td className="p-3 text-right">0,00</td>
                            </tr>

                            {/* 34.5.2.1 - Dedutivel (Input Tax) */}
                            <tr>
                                <td className="p-3 font-mono border-r">34.5.2.1</td>
                                <td className="p-3 border-r">IVA Dedutível (Compras)</td>
                                <td className="p-3 text-right border-r font-medium">{f(calculation.ivaDedutivel)}</td>
                                <td className="p-3 text-right border-r font-medium">0,00</td>
                                <td className="p-3 text-right border-r">0,00</td>
                                <td className="p-3 text-right">0,00</td>
                            </tr>

                            {/* 34.5.7.1 - Apuramento (The Result Line) */}
                            <tr className="bg-yellow-50 font-bold">
                                <td className="p-3 font-mono border-r text-blue-800">34.5.7.1</td>
                                <td className="p-3 border-r text-blue-800">IVA a recuperar de apuramento</td>
                                <td className="p-3 text-right border-r text-slate-400">-</td>
                                <td className="p-3 text-right border-r text-slate-400">-</td>
                                <td className="p-3 text-right border-r text-blue-800">
                                    {calculation.balance < 0 ? f(Math.abs(calculation.balance)) : '0,00'}
                                </td>
                                <td className="p-3 text-right text-blue-800">
                                    {calculation.balance > 0 ? f(calculation.balance) : '0,00'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Apuramento Results Section */}
                <div className="bg-white border border-slate-300 rounded shadow-lg overflow-hidden">
                    <div className="bg-blue-100 p-2 border-b border-blue-200 font-bold text-xs uppercase text-blue-900">Apuramento de Resultados do Período (Movimentos)</div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs">
                            <tr>
                                <th className="p-3 text-left w-32 border-r">Conta</th>
                                <th className="p-3 text-left border-r">Descrição</th>
                                <th className="p-3 text-right w-40 border-r">Débito</th>
                                <th className="p-3 text-right w-40">Crédito</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            <tr>
                                <td className="p-3 font-mono border-r">34.5.1.1</td>
                                <td className="p-3 border-r">Existências</td>
                                <td className="p-3 text-right border-r">0,00</td>
                                <td className="p-3 text-right">0,00</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-mono border-r">34.5.2</td>
                                <td className="p-3 border-r">Iva dedutivel</td>
                                <td className="p-3 text-right border-r font-bold text-slate-700">{f(calculation.ivaDedutivel)}</td>
                                <td className="p-3 text-right">0,00</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-mono border-r">34.5.3.1</td>
                                <td className="p-3 border-r">Operações Gerais</td>
                                <td className="p-3 text-right border-r">0,00</td>
                                <td className="p-3 text-right font-bold text-slate-700">{f(calculation.ivaLiquidado)}</td>
                            </tr>
                            
                            {/* Manual Adjustment Rows (Editable) */}
                            <tr>
                                <td className="p-3 font-mono border-r text-orange-600">34.5.x</td>
                                <td className="p-3 border-r text-orange-600">Ajustes Manuais (A Favor Estado)</td>
                                <td className="p-3 text-right border-r">0,00</td>
                                <td className="p-0 text-right">
                                    <input 
                                        type="number" 
                                        className="w-full h-full text-right p-3 bg-orange-50 outline-none text-orange-800 font-bold"
                                        value={manualAdjustments.salesAdjust}
                                        onChange={e => setManualAdjustments({...manualAdjustments, salesAdjust: Number(e.target.value)})}
                                    />
                                </td>
                            </tr>
                             <tr>
                                <td className="p-3 font-mono border-r text-orange-600">34.5.x</td>
                                <td className="p-3 border-r text-orange-600">Ajustes Manuais (A Favor Sujeito)</td>
                                <td className="p-0 text-right border-r">
                                     <input 
                                        type="number" 
                                        className="w-full h-full text-right p-3 bg-orange-50 outline-none text-orange-800 font-bold"
                                        value={manualAdjustments.purchaseAdjust}
                                        onChange={e => setManualAdjustments({...manualAdjustments, purchaseAdjust: Number(e.target.value)})}
                                    />
                                </td>
                                <td className="p-3 text-right">0,00</td>
                            </tr>

                            {/* Result */}
                            <tr className="bg-slate-200 font-black border-t-2 border-slate-400 text-slate-900">
                                <td className="p-3 font-mono border-r">34.5.5.1</td>
                                <td className="p-3 border-r">Apuramento do Regime IVA Normal</td>
                                <td className="p-3 text-right border-r">{f(calculation.totalDebit)}</td>
                                <td className="p-3 text-right">{f(calculation.totalCredit)}</td>
                            </tr>
                            
                            {/* Status */}
                            <tr className="bg-white">
                                <td colSpan={2} className="p-4 text-right font-bold uppercase text-slate-500">Situação do Período:</td>
                                <td colSpan={2} className={`p-4 text-center font-black text-lg ${calculation.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {calculation.balance > 0 ? `A PAGAR: ${f(calculation.balance)}` : `A RECUPERAR: ${f(Math.abs(calculation.balance))}`}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {view === 'HISTORY' && (
            <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 font-bold text-slate-600 border-b">
                        <tr>
                            <th className="p-4">Período</th>
                            <th className="p-4 text-right">Total Débito (Dedutível)</th>
                            <th className="p-4 text-right">Total Crédito (Liquidado)</th>
                            <th className="p-4 text-right">Saldo Final</th>
                            <th className="p-4 text-center">Estado</th>
                            <th className="p-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {history.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold">{months.find(m => m.value === item.month)?.label} / {item.year}</td>
                                <td className="p-4 text-right">{f(item.totalDebit)}</td>
                                <td className="p-4 text-right">{f(item.totalCredit)}</td>
                                <td className={`p-4 text-right font-bold ${item.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {item.balance > 0 ? f(item.balance) : `(${f(Math.abs(item.balance))})`}
                                </td>
                                <td className="p-4 text-center">
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase">Processado</span>
                                </td>
                                <td className="p-4 text-center">
                                    <button className="text-slate-400 hover:text-blue-600"><Printer size={18}/></button>
                                </td>
                            </tr>
                        ))}
                        {history.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Sem histórico de apuramentos.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
    </div>
  );
};

export default VatSettlementMap;
