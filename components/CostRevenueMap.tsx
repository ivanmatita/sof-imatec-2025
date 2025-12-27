
import React, { useState, useMemo } from 'react';
import { Invoice, Purchase, InvoiceStatus } from '../types';
import { formatCurrency } from '../utils';
import { printDocument, downloadExcel } from "../utils/exportUtils";
import { Printer, Calendar } from 'lucide-react';

interface CostRevenueMapProps {
  invoices: Invoice[]; // Only certified invoices passed here
  purchases: Purchase[]; // Only valid purchases passed here
}

const CostRevenueMap: React.FC<CostRevenueMapProps> = ({ invoices, purchases }) => {
  const [year, setYear] = useState(new Date().getFullYear());

  // Data Aggregation Logic
  const matrix = useMemo(() => {
      const months = Array.from({length: 12}, (_, i) => i); // 0..11
      
      const getData = (monthIndex: number) => {
          // Filter Docs for this month/year
          const monthInvoices = invoices.filter(i => {
              const d = new Date(i.date);
              return d.getFullYear() === year && d.getMonth() === monthIndex;
          });
          const monthPurchases = purchases.filter(p => {
              const d = new Date(p.date);
              return d.getFullYear() === year && d.getMonth() === monthIndex;
          });

          // 1. PROVEITOS
          // Faturação S/ Imposto (Base)
          const billingNoTax = monthInvoices.reduce((acc, i) => acc + i.subtotal, 0);
          // Imposto Recebido (Tax)
          const taxReceived = monthInvoices.reduce((acc, i) => acc + i.taxAmount, 0);
          // Faturação c/ Imposto (Total)
          const billingWithTax = billingNoTax + taxReceived;

          // 2. CUSTOS
          // Custos Aceites S/ Imposto (Purchases Base)
          const costsAccepted = monthPurchases.reduce((acc, p) => acc + p.subtotal, 0);
          // Fornecedores S/ Imposto (Simplified, same as costs for this mock)
          const suppliersNoTax = costsAccepted; 
          // IVA Suportado
          const vatSupported = monthPurchases.reduce((acc, p) => acc + p.taxAmount, 0);
          // Salários (Assuming generic mock value or 0 if not linked yet, placeholder for HR integration)
          const salaries = 0; 
          // INSS (Employer Part 8%)
          const inss = 0; 
          
          const totalCosts = costsAccepted + vatSupported + salaries + inss;

          // 3. MARGEM
          const margin = billingWithTax - totalCosts;

          // 4. TAXES (Provisional)
          // Industrial Tax (Example: 1.2% on turnover)
          const impIndustrial = billingWithTax * 0.012; 
          
          return {
              billingNoTax,
              taxReceived,
              billingWithTax,
              costsAccepted,
              suppliersNoTax,
              vatSupported,
              salaries,
              inss,
              totalCosts,
              margin,
              impIndustrial
          };
      };

      const monthlyData = months.map(m => getData(m));
      
      // Calculate Totals
      const totals = monthlyData.reduce((acc, curr) => ({
          billingNoTax: acc.billingNoTax + curr.billingNoTax,
          taxReceived: acc.taxReceived + curr.taxReceived,
          billingWithTax: acc.billingWithTax + curr.billingWithTax,
          costsAccepted: acc.costsAccepted + curr.costsAccepted,
          suppliersNoTax: acc.suppliersNoTax + curr.suppliersNoTax,
          vatSupported: acc.vatSupported + curr.vatSupported,
          salaries: acc.salaries + curr.salaries,
          inss: acc.inss + curr.inss,
          totalCosts: acc.totalCosts + curr.totalCosts,
          margin: acc.margin + curr.margin,
          impIndustrial: acc.impIndustrial + curr.impIndustrial
      }), {
          billingNoTax: 0, taxReceived: 0, billingWithTax: 0,
          costsAccepted: 0, suppliersNoTax: 0, vatSupported: 0,
          salaries: 0, inss: 0, totalCosts: 0, margin: 0, impIndustrial: 0
      });

      return { monthlyData, totals };
  }, [invoices, purchases, year]);

  const monthsLabels = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // Formatter short
  const f = (val: number) => new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in" id="costRevenueContainer">
         {/* Header Controls */}
         <div className="flex justify-between items-center mb-6 print:hidden">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <Calendar size={24}/>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Mapas Custos e Proveitos</h1>
                    <p className="text-xs text-slate-500">Análise financeira mensal (Apenas Documentos Certificados)</p>
                </div>
             </div>
             <div className="flex gap-2">
                 <select className="p-2 border rounded font-bold bg-white shadow-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
                     <option value={2023}>Exercício 2023</option>
                     <option value={2024}>Exercício 2024</option>
                     <option value={2025}>Exercício 2025</option>
                 </select>
                 <button onClick={() => printDocument("costRevenueContainer")} className="bg-slate-800 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-black transition shadow-sm"><Printer size={16}/> Imprimir Mapa</button>
             </div>
         </div>

         {/* The Table View */}
         <div className="bg-white border shadow-xl overflow-x-auto rounded-sm">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                  <h2 className="font-bold text-sm uppercase text-slate-700">Movimentos Gerais Gestao Proveitos/Custos (Ordenados por Data Valor)</h2>
                  <span className="font-bold text-xs text-slate-500">Exercício de {year}</span>
              </div>
              
              <table className="w-full text-xs border-collapse">
                  <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-300">
                          <th className="text-left p-2 border-r min-w-[200px] font-bold">Proveitos</th>
                          {monthsLabels.map(m => <th key={m} className="p-2 text-right border-r w-[100px] font-bold">{m}</th>)}
                          <th className="p-2 text-right font-black w-[120px] bg-slate-200">Total</th>
                      </tr>
                  </thead>
                  <tbody>
                      {/* PROVEITOS */}
                      <tr className="border-b border-slate-100 hover:bg-blue-50">
                          <td className="p-2 border-r font-medium text-slate-700">Facturação S/ imposto (a)</td>
                          {matrix.monthlyData.map((d, i) => <td key={i} className="p-2 text-right border-r">{f(d.billingNoTax)}</td>)}
                          <td className="p-2 text-right font-bold bg-slate-50">{f(matrix.totals.billingNoTax)}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-blue-50">
                          <td className="p-2 border-r font-medium text-slate-700">Imposto Recebido</td>
                          {matrix.monthlyData.map((d, i) => <td key={i} className="p-2 text-right border-r">{f(d.taxReceived)}</td>)}
                          <td className="p-2 text-right font-bold bg-slate-50">{f(matrix.totals.taxReceived)}</td>
                      </tr>
                      <tr className="border-b-2 border-slate-300 bg-slate-50 font-bold">
                          <td className="p-2 border-r text-blue-800">Facturação c/ imposto</td>
                          {matrix.monthlyData.map((d, i) => <td key={i} className="p-2 text-right border-r text-blue-800">{f(d.billingWithTax)}</td>)}
                          <td className="p-2 text-right font-black text-blue-900 bg-slate-200">{f(matrix.totals.billingWithTax)}</td>
                      </tr>

                      {/* CUSTOS HEADER */}
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-300">
                          <th className="text-left p-2 border-r font-bold" colSpan={14}>Custos</th>
                      </tr>

                      <tr className="border-b border-slate-100 hover:bg-red-50">
                          <td className="p-2 border-r font-medium text-slate-700">Custos Aceites S/ Imposto</td>
                          {matrix.monthlyData.map((d, i) => <td key={i} className="p-2 text-right border-r">{f(d.costsAccepted)}</td>)}
                          <td className="p-2 text-right font-bold bg-slate-50">{f(matrix.totals.costsAccepted)}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-red-50">
                          <td className="p-2 border-r font-medium text-slate-700">Fornecedores S/ imposto(b)</td>
                          {matrix.monthlyData.map((d, i) => <td key={i} className="p-2 text-right border-r">{f(d.suppliersNoTax)}</td>)}
                          <td className="p-2 text-right font-bold bg-slate-50">{f(matrix.totals.suppliersNoTax)}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-red-50">
                          <td className="p-2 border-r font-medium text-slate-700">Iva Suportado</td>
                          {matrix.monthlyData.map((d, i) => <td key={i} className="p-2 text-right border-r">{f(d.vatSupported)}</td>)}
                          <td className="p-2 text-right font-bold bg-slate-50">{f(matrix.totals.vatSupported)}</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-red-50">
                          <td className="p-2 border-r font-medium text-slate-700 italic">Salarios(c)</td>
                          {matrix.monthlyData.map((d, i) => <td key={i} className="p-2 text-right border-r text-slate-500">{f(d.salaries)}</td>)}
                          <td className="p-2 text-right font-bold bg-slate-50">{f(matrix.totals.salaries)}</td>
                      </tr>
                      <tr className="border-b-2 border-slate-300 hover:bg-red-50">
                          <td className="p-2 border-r font-medium text-slate-700 italic">INSS 8%(d)</td>
                          {matrix.monthlyData.map((d, i) => <td key={i} className="p-2 text-right border-r text-slate-500">{f(d.inss)}</td>)}
                          <td className="p-2 text-right font-bold bg-slate-50">{f(matrix.totals.inss)}</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold border-b-2 border-slate-800">
                          <td className="p-2 border-r text-red-800">Totais Custos</td>
                          {matrix.monthlyData.map((d, i) => <td key={i} className="p-2 text-right border-r text-red-800">{f(d.totalCosts)}</td>)}
                          <td className="p-2 text-right font-black text-red-900 bg-slate-200">{f(matrix.totals.totalCosts)}</td>
                      </tr>

                      {/* MARGIN */}
                      <tr className="bg-white font-black text-sm border-b-2 border-black">
                          <td className="p-3 border-r uppercase">Margem</td>
                          {matrix.monthlyData.map((d, i) => <td key={i} className={`p-3 text-right border-r ${d.margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>{f(d.margin)}</td>)}
                          <td className={`p-3 text-right bg-slate-200 ${matrix.totals.margin >= 0 ? 'text-green-900' : 'text-red-900'}`}>{f(matrix.totals.margin)}</td>
                      </tr>
                  </tbody>
              </table>

              {/* FOOTER INFO */}
              <div className="p-4 grid grid-cols-2 gap-8 text-[10px] text-slate-600 bg-slate-50">
                  <div>
                      <p className="font-bold mb-1">Obs:</p>
                      <p>Imposto Industrial Previsional (Pode diferir do imposto real a pagar. Não contempla os impostos já pagos e considera as facturas não aceites fiscalmente)</p>
                      <p>O Imposto previsional Contab pode diferir do imposto real a pagar . Não contempla os impostos já pagos e considera apenas os custos aceites fiscalmente.</p>
                  </div>
                  <div className="text-right space-y-1">
                      <div className="flex justify-between border-b border-slate-300 pb-1">
                          <span className="font-bold">Imp Previsional Gestão (1.2% Faturação)</span>
                          <span className="font-mono font-bold text-slate-800">{f(matrix.totals.impIndustrial)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="font-bold">Imp Previsional Contab (Est. 25% Lucro)</span>
                          <span className="font-mono font-bold text-slate-800">{f(Math.max(0, matrix.totals.margin * 0.25))}</span>
                      </div>
                  </div>
              </div>
         </div>
    </div>
  );
};

export default CostRevenueMap;
