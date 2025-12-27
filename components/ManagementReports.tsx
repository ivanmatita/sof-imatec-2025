
import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceType, Product, InvoiceStatus } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { printDocument, downloadPDF, downloadExcel } from "../utils/exportUtils";
import { Search, Printer, Filter, Calendar } from 'lucide-react';

interface ManagementReportsProps {
  invoices: Invoice[];
  products: Product[];
}

const ManagementReports: React.FC<ManagementReportsProps> = ({ invoices, products }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDoc, setFilterDoc] = useState('Todos');

  // --- DATA PROCESSING ---

  // 1. Filter Invoices by Date
  const periodInvoices = useMemo(() => {
    return invoices.filter(i => {
        const d = new Date(i.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return d >= start && d <= end && i.isCertified;
    });
  }, [invoices, startDate, endDate]);

  // 2. Extract Items for "Produtos Vendidos" (Sales) vs "Devolvidos" (Credit Notes)
  const salesItems: any[] = [];
  const returnItems: any[] = [];

  periodInvoices.forEach(inv => {
      const isReturn = inv.type === InvoiceType.NC;
      const targetArray = isReturn ? returnItems : salesItems;

      inv.items.forEach((item, idx) => {
          targetArray.push({
              ln: idx + 1,
              serial: item.productId ? item.productId.substring(0, 5).toUpperCase() : 'N/A',
              description: item.description,
              quantity: item.quantity,
              unit: 'un', // Mock unit, usually comes from product
              unitPrice: item.unitPrice,
              net: item.total, // Base
              tax: item.total * (item.taxRate / 100),
              total: item.total * (1 + item.taxRate / 100),
              docNumber: inv.number,
              docType: inv.type,
              date: inv.date,
              client: inv.clientName
          });
      });
  });

  // 3. "Produtos mais vendidos" (Top Selling)
  const topSelling = useMemo(() => {
      const map = new Map<string, { desc: string, serial: string, qty: number, unit: string }>();
      salesItems.forEach(item => {
          const key = item.description;
          const current = map.get(key) || { desc: key, serial: item.serial, qty: 0, unit: item.unit };
          current.qty += item.quantity;
          map.set(key, current);
      });
      return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [salesItems]);

  // 4. Totals
  const totalSalesNet = salesItems.reduce((acc, i) => acc + i.net, 0);
  const totalSalesTax = salesItems.reduce((acc, i) => acc + i.tax, 0);
  const totalSalesGross = salesItems.reduce((acc, i) => acc + i.total, 0);

  const totalReturnsNet = returnItems.reduce((acc, i) => acc + i.net, 0);
  const totalReturnsTax = returnItems.reduce((acc, i) => acc + i.tax, 0);
  const totalReturnsGross = returnItems.reduce((acc, i) => acc + i.total, 0);

  const grandTotalNet = totalSalesNet - totalReturnsNet;
  const grandTotalTax = totalSalesTax - totalReturnsTax;
  const grandTotalGross = totalSalesGross - totalReturnsGross;

  return (
    <div className="bg-white min-h-screen p-6 animate-in fade-in text-slate-800 font-sans text-xs" id="reportsContainer">
        {/* Header Section */}
        <div className="flex flex-col gap-4 mb-6 border-b border-slate-300 pb-4">
            <div className="flex justify-between items-center">
                <h1 className="text-lg font-bold uppercase text-slate-700">Relatório de Gestão Comercial</h1>
                <div className="flex gap-2 print:hidden">
                    <button onClick={() => printDocument("reportsContainer")} className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-black transition">
                        <Printer size={14}/> Imprimir
                    </button>
                    <button onClick={() => downloadExcel("salesTable", "Relatorio_Gestao.xlsx")} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700 transition">
                        Baixar Excel
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-12 gap-4 bg-slate-50 p-3 rounded border border-slate-200">
                <div className="col-span-3">
                    <label className="block font-bold text-slate-500 mb-1">Período</label>
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-1 rounded w-full"/>
                        <span>a</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-1 rounded w-full"/>
                    </div>
                </div>
                <div className="col-span-2">
                    <label className="block font-bold text-slate-500 mb-1">Documentos</label>
                    <select className="border p-1 rounded w-full font-bold">
                        <option>Todos</option>
                        <option>Faturas</option>
                        <option>Notas Crédito</option>
                    </select>
                </div>
                <div className="col-span-2">
                    <label className="block font-bold text-slate-500 mb-1">Série</label>
                    <div className="font-bold text-slate-700 pt-1">Todas</div>
                </div>
                <div className="col-span-2">
                    <label className="block font-bold text-slate-500 mb-1">Armazém</label>
                    <div className="font-bold text-slate-700 pt-1">Todos</div>
                </div>
                <div className="col-span-3 text-right">
                     <label className="block font-bold text-slate-500 mb-1">Operador</label>
                     <div className="font-bold text-slate-700 pt-1">Todos</div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
            
            {/* LEFT COLUMN (Main Data) */}
            <div className="col-span-8 space-y-6">
                
                {/* SALES TABLE */}
                <div>
                    <h3 className="font-bold text-slate-700 mb-2 border-b border-slate-400 pb-1">Produtos Vendidos</h3>
                    <div className="border border-slate-300 rounded overflow-hidden">
                        <table className="w-full border-collapse text-[10px]" id="salesTable">
                            <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-300">
                                <tr>
                                    <th className="p-1.5 text-left w-8">Ln</th>
                                    <th className="p-1.5 text-left w-16">Serial</th>
                                    <th className="p-1.5 text-left">Descrição</th>
                                    <th className="p-1.5 text-center w-12">Qtd</th>
                                    <th className="p-1.5 text-center w-8">Unit</th>
                                    <th className="p-1.5 text-right w-20">Unit Price</th>
                                    <th className="p-1.5 text-right w-20">Net</th>
                                    <th className="p-1.5 text-right w-16">IVA</th>
                                    <th className="p-1.5 text-right w-20">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesItems.map((item, idx) => (
                                    <tr key={`sale-${idx}`} className="border-b border-slate-100 hover:bg-yellow-50">
                                        <td className="p-1 text-slate-500">{idx + 1}</td>
                                        <td className="p-1 font-mono text-slate-500">{item.serial}</td>
                                        <td className="p-1 font-medium text-slate-700">{item.description}</td>
                                        <td className="p-1 text-center">{item.quantity}</td>
                                        <td className="p-1 text-center text-slate-500">{item.unit}</td>
                                        <td className="p-1 text-right">{formatCurrency(item.unitPrice).replace('Kz','')}</td>
                                        <td className="p-1 text-right">{formatCurrency(item.net).replace('Kz','')}</td>
                                        <td className="p-1 text-right">{formatCurrency(item.tax).replace('Kz','')}</td>
                                        <td className="p-1 text-right font-bold">{formatCurrency(item.total).replace('Kz','')}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                                <tr>
                                    <td colSpan={6} className="p-1 text-right uppercase text-slate-600">Valores Totais Brutos</td>
                                    <td className="p-1 text-right">{formatCurrency(totalSalesNet).replace('Kz','')}</td>
                                    <td className="p-1 text-right">{formatCurrency(totalSalesTax).replace('Kz','')}</td>
                                    <td className="p-1 text-right">{formatCurrency(totalSalesGross).replace('Kz','')}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* RETURNS TABLE */}
                <div>
                    <h3 className="font-bold text-slate-700 mb-2 border-b border-slate-400 pb-1">Produtos Devolvidos</h3>
                    <div className="border border-slate-300 rounded overflow-hidden">
                        <table className="w-full border-collapse text-[10px]">
                            <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-300">
                                <tr>
                                    <th className="p-1.5 text-left w-8">Ln</th>
                                    <th className="p-1.5 text-left w-16">Serial</th>
                                    <th className="p-1.5 text-left">Descrição</th>
                                    <th className="p-1.5 text-center w-12">Qtd</th>
                                    <th className="p-1.5 text-center w-8">Unit</th>
                                    <th className="p-1.5 text-right w-20">Unit Price</th>
                                    <th className="p-1.5 text-right w-20">Net</th>
                                    <th className="p-1.5 text-right w-16">IVA</th>
                                    <th className="p-1.5 text-right w-20">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnItems.map((item, idx) => (
                                    <tr key={`ret-${idx}`} className="border-b border-slate-100 hover:bg-red-50 text-red-700">
                                        <td className="p-1 text-slate-500">{idx + 1}</td>
                                        <td className="p-1 font-mono text-slate-500">{item.serial}</td>
                                        <td className="p-1 font-medium">{item.description}</td>
                                        <td className="p-1 text-center">{item.quantity}</td>
                                        <td className="p-1 text-center text-slate-500">{item.unit}</td>
                                        <td className="p-1 text-right">{formatCurrency(item.unitPrice).replace('Kz','')}</td>
                                        <td className="p-1 text-right">{formatCurrency(item.net).replace('Kz','')}</td>
                                        <td className="p-1 text-right">{formatCurrency(item.tax).replace('Kz','')}</td>
                                        <td className="p-1 text-right font-bold">{formatCurrency(item.total).replace('Kz','')}</td>
                                    </tr>
                                ))}
                                {returnItems.length === 0 && (
                                    <tr><td colSpan={9} className="p-4 text-center text-slate-400 italic">Sem devoluções no período</td></tr>
                                )}
                            </tbody>
                            <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                                <tr>
                                    <td colSpan={6} className="p-1 text-right uppercase text-slate-600">Valores Totais Brutos</td>
                                    <td className="p-1 text-right">{formatCurrency(totalReturnsNet).replace('Kz','')}</td>
                                    <td className="p-1 text-right">{formatCurrency(totalReturnsTax).replace('Kz','')}</td>
                                    <td className="p-1 text-right">{formatCurrency(totalReturnsGross).replace('Kz','')}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN (Stats) */}
            <div className="col-span-4 space-y-6">
                <div>
                    <h3 className="font-bold text-slate-700 mb-2 border-b border-slate-400 pb-1 text-center">Produtos mais vendidos</h3>
                    <div className="border border-slate-300 rounded overflow-hidden">
                        <table className="w-full border-collapse text-[10px]">
                            <thead className="bg-slate-100 font-bold text-slate-600 border-b border-slate-300">
                                <tr>
                                    <th className="p-1.5 text-left w-8">Ln</th>
                                    <th className="p-1.5 text-left w-12">Serial</th>
                                    <th className="p-1.5 text-left">Descrição</th>
                                    <th className="p-1.5 text-right w-12">Qtd</th>
                                    <th className="p-1.5 text-center w-8">Unit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topSelling.map((item, idx) => (
                                    <tr key={`top-${idx}`} className="border-b border-slate-100">
                                        <td className="p-1 text-slate-500">{idx + 1}</td>
                                        <td className="p-1 font-mono text-slate-500">{item.serial}</td>
                                        <td className="p-1 font-medium text-slate-700 truncate max-w-[120px]">{item.desc}</td>
                                        <td className="p-1 text-right font-bold text-blue-700">{item.qty}</td>
                                        <td className="p-1 text-center text-slate-500">{item.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary Box */}
                <div className="bg-slate-800 text-white p-4 rounded shadow-lg">
                    <h4 className="font-bold border-b border-slate-600 pb-2 mb-2 text-center text-xs uppercase tracking-wider">RESUMO DO PERÍODO</h4>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Total Vendas (Líq)</span>
                            <span className="font-mono">{formatCurrency(totalSalesNet)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Total Devoluções</span>
                            <span className="font-mono text-red-400">({formatCurrency(totalReturnsNet)})</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-600 pt-2 font-bold text-lg">
                            <span>TOTAL LÍQUIDO</span>
                            <span>{formatCurrency(grandTotalNet)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300 font-bold">
                            <span>TOTAL IVA</span>
                            <span>{formatCurrency(grandTotalTax)}</span>
                        </div>
                        <div className="flex justify-between text-yellow-400 font-black text-xl pt-2 border-t border-slate-600">
                            <span>TOTAL GERAL</span>
                            <span>{formatCurrency(grandTotalGross)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* BOTTOM TOTALS TABLE */}
        <div className="mt-8">
             <h3 className="font-bold text-slate-700 mb-2 border-b border-slate-400 pb-1">Valores Totais Liquidos do Periodo</h3>
             <div className="border border-slate-300 rounded overflow-hidden">
                 <table className="w-full border-collapse text-[10px]">
                     <thead className="bg-slate-200 font-bold text-slate-700">
                         <tr>
                             <th className="p-2 border border-slate-300 w-8">Ln</th>
                             <th className="p-2 border border-slate-300 w-20">Data</th>
                             <th className="p-2 border border-slate-300 w-24">Doc Nº</th>
                             <th className="p-2 border border-slate-300">Cliente</th>
                             <th className="p-2 border border-slate-300 w-20">Serial</th>
                             <th className="p-2 border border-slate-300">Descrição</th>
                             <th className="p-2 border border-slate-300 w-10">IN</th>
                             <th className="p-2 border border-slate-300 w-10">OUT</th>
                             <th className="p-2 border border-slate-300 w-10">Unit</th>
                             <th className="p-2 border border-slate-300 w-20 text-right">V.Unit</th>
                             <th className="p-2 border border-slate-300 w-24 text-right">Net</th>
                             <th className="p-2 border border-slate-300 w-20 text-right">IVA</th>
                             <th className="p-2 border border-slate-300 w-24 text-right">Total</th>
                         </tr>
                     </thead>
                     <tbody>
                         {[...salesItems, ...returnItems].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 15).map((item, idx) => (
                             <tr key={`total-${idx}`} className="border border-slate-200">
                                 <td className="p-1 border-r text-center">{idx+1}</td>
                                 <td className="p-1 border-r text-center">{formatDate(item.date)}</td>
                                 <td className="p-1 border-r text-center font-bold">{item.docNumber}</td>
                                 <td className="p-1 border-r truncate max-w-[150px]">{item.client}</td>
                                 <td className="p-1 border-r text-center font-mono text-slate-500">{item.serial}</td>
                                 <td className="p-1 border-r truncate max-w-[200px]">{item.description}</td>
                                 <td className="p-1 border-r text-center bg-slate-50">{item.docType === 'NC' ? item.quantity : 0}</td>
                                 <td className="p-1 border-r text-center bg-slate-50">{item.docType !== 'NC' ? item.quantity : 0}</td>
                                 <td className="p-1 border-r text-center">{item.unit}</td>
                                 <td className="p-1 border-r text-right">{formatCurrency(item.unitPrice).replace('Kz','')}</td>
                                 <td className="p-1 border-r text-right">{formatCurrency(item.net).replace('Kz','')}</td>
                                 <td className="p-1 border-r text-right">{formatCurrency(item.tax).replace('Kz','')}</td>
                                 <td className="p-1 text-right font-bold">{formatCurrency(item.total).replace('Kz','')}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
             <div className="text-right text-[10px] text-slate-400 mt-1 italic">Fim de Listagem (Amostra 15 registos)</div>
        </div>
    </div>
  );
};

export default ManagementReports;
