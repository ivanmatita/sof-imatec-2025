
import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceType, InvoiceStatus, Purchase } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { printDocument, downloadExcel } from "../utils/exportUtils";
import { Calendar, Printer, Search, X, ShoppingCart, TrendingUp, Download } from 'lucide-react';

interface TaxCalculationMapProps {
  invoices: Invoice[];
  purchases?: Purchase[]; // Added purchases prop
}

const TaxCalculationMap: React.FC<TaxCalculationMapProps> = ({ invoices, purchases = [] }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'SALES' | 'PURCHASES'>('SALES'); // Mode toggle

  // Data processing for Tax Map
  const processedData = useMemo(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // SALES LOGIC
      if (viewMode === 'SALES') {
          const filtered = invoices.filter(i => {
              const d = new Date(i.date);
              const isInRange = d >= start && d <= end;
              const isCertified = i.isCertified;
              return isInRange && isCertified;
          });

          const rows = filtered.map(inv => {
              let credito = 0;
              let debito = 0;
              let iva = 0;
              let total = 0;

              const isReturn = inv.type === InvoiceType.NC || inv.status === InvoiceStatus.CANCELLED;
              const amount = inv.currency === 'AOA' ? inv.total : inv.contraValue || inv.total;
              const tax = inv.currency === 'AOA' ? inv.taxAmount : (inv.taxAmount * inv.exchangeRate);
              const base = amount - tax;

              if (isReturn) {
                  debito = base;
                  iva = -tax; // Tax reduces liability
                  total = -amount;
              } else {
                  credito = base;
                  iva = tax;
                  total = amount;
              }

              return {
                  id: inv.id,
                  date: inv.date,
                  docNumber: inv.number,
                  state: inv.status,
                  entity: inv.clientName,
                  nif: inv.clientNif || '999999999',
                  baseAmount: isReturn ? debito : credito, // For display in simple columns
                  ivaAmount: iva,
                  totalAmount: total,
                  // Raw data for complex columns if needed (kept previous logic)
                  credito,
                  debito,
                  iva,
                  total
              };
          });

          const totals = rows.reduce((acc, row) => ({
              credito: acc.credito + row.credito,
              debito: acc.debito + row.debito,
              iva: acc.iva + row.iva,
              total: acc.total + row.total
          }), { credito: 0, debito: 0, iva: 0, total: 0 });

          return { rows, totals };
      } 
      
      // PURCHASES LOGIC
      else {
          // REMOVED PENDING FILTER - Include all recorded purchases
          const filtered = purchases.filter(p => {
              const d = new Date(p.date);
              const isInRange = d >= start && d <= end;
              return isInRange;
          });

          const rows = filtered.map(pur => {
              // Purchases are typically Debits (Costs) and Deductible IVA
              // In this map structure:
              // Debito = Base Cost
              // IVA = Deductible Tax (Positive value in context of asset/cost, but reduces tax liability)
              
              const total = pur.total;
              const tax = pur.taxAmount;
              const base = pur.subtotal;

              return {
                  id: pur.id,
                  date: pur.date,
                  docNumber: pur.documentNumber,
                  state: pur.status,
                  entity: pur.supplier,
                  nif: pur.nif,
                  baseAmount: base,
                  ivaAmount: tax,
                  totalAmount: total,
                  // Use debito for cost
                  credito: 0,
                  debito: base,
                  iva: tax,
                  total: total
              };
          });

          const totals = rows.reduce((acc, row) => ({
              credito: acc.credito + row.credito,
              debito: acc.debito + row.debito,
              iva: acc.iva + row.iva,
              total: acc.total + row.total
          }), { credito: 0, debito: 0, iva: 0, total: 0 });

          return { rows, totals };
      }

  }, [invoices, purchases, startDate, endDate, viewMode]);

  return (
    <div className="bg-white min-h-screen p-6 animate-in fade-in pb-20" id="taxCalcContainer">
        
        {/* Toggle / Header Area */}
        <div className="flex justify-between items-center mb-6 print:hidden">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={24} className="text-blue-600"/>
                Cálculo de Impostos
                <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded ml-2">
                    {viewMode === 'SALES' ? 'VENDAS (SAÍDAS)' : 'COMPRAS (ENTRADAS)'}
                </span>
            </h1>
            <div className="flex gap-4">
                <button 
                    onClick={() => setViewMode('SALES')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition shadow-sm ${viewMode === 'SALES' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                >
                    <TrendingUp size={18}/> Vendas
                </button>
                <button 
                    onClick={() => setViewMode('PURCHASES')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition shadow-sm ${viewMode === 'PURCHASES' ? 'bg-orange-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                >
                    <ShoppingCart size={18}/> Imposto sobre as compras
                </button>
            </div>
        </div>

        {/* Paper Container matching image structure */}
        <div className="bg-slate-100 rounded-t-lg border border-slate-300 p-4 shadow-sm mb-4">
             <div className="text-center mb-6">
                 <h1 className="text-xl font-bold uppercase text-slate-800">C & V - COMERCIO GERAL E PRESTAÇAO DE SERVIÇOS, LDA</h1>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                     {viewMode === 'SALES' ? 'Mapa de Impostos Liquidado (Vendas)' : 'Mapa de Impostos Suportado (Compras)'}
                 </p>
             </div>
             
             {/* Summary Bar */}
             <div className="flex flex-wrap items-end justify-between gap-4 text-sm">
                 <div className="flex flex-col">
                     <span className="font-bold border-b border-slate-400 mb-1 pb-1 w-full block">Movimentos</span>
                     <span className="text-lg">
                         {viewMode === 'SALES' ? 'IVA Liquidado' : 'IVA Dedutível'}
                     </span>
                 </div>

                 <div className="flex flex-col items-center">
                     <span className="font-bold border-b border-slate-400 mb-1 pb-1 w-full text-center block">Periodo Contabilistico</span>
                     <div className="flex items-center gap-2">
                         <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent font-mono font-bold text-slate-700" />
                         <span>a</span>
                         <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent font-mono font-bold text-slate-700" />
                     </div>
                 </div>

                 {viewMode === 'SALES' ? (
                     <>
                        <div className="flex flex-col items-end">
                            <span className="font-bold border-b border-slate-400 mb-1 pb-1 w-full text-right block">Total Creditos</span>
                            <span className="text-lg font-mono">{formatCurrency(processedData.totals.credito)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="font-bold border-b border-slate-400 mb-1 pb-1 w-full text-right block">Total Débitos (Dev)</span>
                            <span className="text-lg font-mono">{formatCurrency(processedData.totals.debito)}</span>
                        </div>
                     </>
                 ) : (
                     <div className="flex flex-col items-end">
                        <span className="font-bold border-b border-slate-400 mb-1 pb-1 w-full text-right block">Total Base (Custo)</span>
                        <span className="text-lg font-mono">{formatCurrency(processedData.totals.debito)}</span>
                    </div>
                 )}

                 <div className="flex flex-col items-end">
                     <span className="font-bold border-b border-slate-400 mb-1 pb-1 w-full text-right block">Total IVA</span>
                     <span className={`text-lg font-mono font-bold ${viewMode === 'SALES' ? 'text-blue-900' : 'text-orange-700'}`}>
                         {formatCurrency(processedData.totals.iva)}
                     </span>
                 </div>
             </div>
        </div>

        <div className="flex justify-between mb-2">
             <span className="text-xs text-slate-500 italic">
                 {viewMode === 'SALES' ? '* Inclui Faturas, Recibos e Notas de Crédito/Débito' : '* Inclui Compras e Despesas Registadas'}
             </span>
             <span className="font-bold text-xs uppercase">Movimentos Gerais</span>
        </div>

        {/* Table */}
        <div className="border-t-2 border-black">
            <table className="w-full text-xs text-left" id="taxTable">
                <thead>
                    <tr className="border-b border-black font-bold uppercase bg-white">
                        <th className="py-2 pl-2">ID</th>
                        <th className="py-2">Data</th>
                        <th className="py-2">Doc Nº</th>
                        <th className="py-2">NIF</th>
                        <th className="py-2">{viewMode === 'SALES' ? 'Cliente' : 'Fornecedor'}</th>
                        {viewMode === 'SALES' ? (
                            <>
                                <th className="py-2 text-right">Credito (Venda)</th>
                                <th className="py-2 text-right">Debito (Dev)</th>
                            </>
                        ) : (
                            <th className="py-2 text-right">Base Incidência</th>
                        )}
                        <th className="py-2 text-right">IVA ({viewMode === 'SALES' ? 'Liq' : 'Ded'})</th>
                        <th className="py-2 text-right pr-2">Total Doc</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {processedData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 pl-2 font-mono text-slate-500">{row.id.substring(0,6)}</td>
                            <td className="py-2">{formatDate(row.date)}</td>
                            <td className="py-2 font-bold">{row.docNumber}</td>
                            <td className="py-2 font-mono">{row.nif}</td>
                            <td className="py-2 truncate max-w-[200px]">{row.entity}</td>
                            
                            {viewMode === 'SALES' ? (
                                <>
                                    <td className="py-2 text-right text-slate-700">{row.credito > 0 ? formatCurrency(row.credito).replace('Kz','') : ''}</td>
                                    <td className="py-2 text-right text-red-600">{row.debito > 0 ? formatCurrency(row.debito).replace('Kz','') : ''}</td>
                                </>
                            ) : (
                                <td className="py-2 text-right font-medium text-slate-700">{formatCurrency(row.debito).replace('Kz','')}</td>
                            )}

                            <td className={`py-2 text-right font-medium ${viewMode === 'SALES' ? 'text-blue-600' : 'text-orange-600'}`}>
                                {formatCurrency(row.iva).replace('Kz','')}
                            </td>
                            <td className="py-2 text-right pr-2 font-bold">{formatCurrency(row.total).replace('Kz','')}</td>
                        </tr>
                    ))}
                    {processedData.rows.length === 0 && (
                        <tr><td colSpan={viewMode === 'SALES' ? 9 : 8} className="py-8 text-center text-slate-400 italic">Sem movimentos no período.</td></tr>
                    )}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-slate-300 font-bold text-sm bg-slate-50">
                        <td colSpan={5} className="py-4 text-center uppercase">Totais Consolidados</td>
                        {viewMode === 'SALES' ? (
                            <>
                                <td className="py-4 text-right">{formatCurrency(processedData.totals.credito).replace('Kz','')}</td>
                                <td className="py-4 text-right text-red-600">{formatCurrency(processedData.totals.debito).replace('Kz','')}</td>
                            </>
                        ) : (
                             <td className="py-4 text-right">{formatCurrency(processedData.totals.debito).replace('Kz','')}</td>
                        )}
                        <td className={`py-4 text-right ${viewMode === 'SALES' ? 'text-blue-800' : 'text-orange-800'}`}>
                            {formatCurrency(processedData.totals.iva).replace('Kz','')}
                        </td>
                        <td className="py-4 text-right pr-2">{formatCurrency(processedData.totals.total).replace('Kz','')}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div className="mt-6 flex justify-end gap-3 print:hidden">
            <button onClick={() => downloadExcel("taxTable", `Tax_Map_${viewMode}.xlsx`)} className="bg-white border border-slate-300 text-slate-600 px-4 py-2 rounded flex items-center gap-2 text-sm font-bold hover:bg-slate-50 transition">
                <Download size={16}/> Exportar Excel
            </button>
            <button onClick={() => printDocument("taxCalcContainer")} className="bg-slate-800 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-bold hover:bg-black transition shadow-lg">
                <Printer size={16}/> Imprimir Mapa Oficial
            </button>
        </div>
    </div>
  );
};

export default TaxCalculationMap;
