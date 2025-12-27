
import React, { useState, useMemo } from 'react';
import { Invoice, Purchase, Company, InvoiceType, PurchaseType, InvoiceStatus } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Printer, FileText, ArrowRight, ArrowLeft, Table, Calculator, Download, Filter, HelpCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface Model7Props {
  invoices: Invoice[];
  purchases: Purchase[];
  company: Company;
}

type ModelView = 'GENERAL' | 'SIMPLIFIED' | 'ANNEX_SUPPLIERS' | 'ANNEX_REGULARIZATIONS';

const Model7: React.FC<Model7Props> = ({ invoices, purchases, company }) => {
  const [currentView, setCurrentView] = useState<ModelView>('GENERAL');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // --- DATA FILTERING BY ACCOUNTING DATE ---
  
  const validInvoices = useMemo(() => invoices.filter(i => {
      const d = new Date(i.accountingDate || i.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === month && i.status !== InvoiceStatus.CANCELLED;
  }), [invoices, year, month]);

  const cancelledInvoices = useMemo(() => invoices.filter(i => {
      const d = new Date(i.accountingDate || i.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === month && (i.status === InvoiceStatus.CANCELLED || i.type === InvoiceType.NC);
  }), [invoices, year, month]);

  const validPurchases = useMemo(() => purchases.filter(p => {
      const d = new Date(p.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === month && p.status !== 'PENDING';
  }), [purchases, year, month]);

  // --- CALCULATIONS FOR GENERAL REGIME ---

  const calcGeneral = useMemo(() => {
      const getBaseAndTax = (rate: number) => {
          const items = validInvoices.flatMap(i => i.items.filter(item => item.taxRate === rate));
          return {
              base: items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (1 - item.discount/100)), 0),
              tax: items.reduce((sum, item) => sum + (item.total * (item.taxRate/100)), 0)
          };
      };

      const sales14 = getBaseAndTax(14);
      const sales7 = getBaseAndTax(7);
      const sales5 = getBaseAndTax(5);
      const salesExempt = getBaseAndTax(0);

      const deductibleTax = validPurchases.reduce((acc, p) => acc + p.taxAmount, 0);

      const regularizationsSubject = cancelledInvoices.reduce((acc, i) => {
          if (i.type === InvoiceType.NC) return acc + i.taxAmount;
          if (i.status === InvoiceStatus.CANCELLED) return acc + i.taxAmount;
          return acc;
      }, 0);

      const totalFavorEstado = sales14.tax + sales7.tax + sales5.tax;
      const totalFavorSujeito = deductibleTax + regularizationsSubject;
      
      const toPay = Math.max(0, totalFavorEstado - totalFavorSujeito);
      const toRecover = Math.max(0, totalFavorSujeito - totalFavorEstado);

      return { sales14, sales7, sales5, salesExempt, deductibleTax, regularizationsSubject, totalFavorEstado, totalFavorSujeito, toPay, toRecover };
  }, [validInvoices, validPurchases, cancelledInvoices]);

  const calcSimplified = useMemo(() => {
      const cashDocs = validInvoices.filter(i => i.type === InvoiceType.RG || i.type === InvoiceType.VD || i.type === InvoiceType.FR);
      const turnover = cashDocs.reduce((acc, i) => acc + i.total, 0);
      const taxDue = turnover * 0.07;
      const exemptDocs = cashDocs.filter(i => i.items.some(t => t.taxRate === 0));
      const exemptBase = exemptDocs.reduce((acc, i) => acc + i.items.filter(t => t.taxRate === 0).reduce((s, x) => s + x.total, 0), 0);
      const exemptTax = exemptBase * 0.07;
      return { turnover, taxDue, exemptBase, exemptTax, totalPayable: taxDue };
  }, [validInvoices]);

  const HeaderControls = () => (
      <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden shadow-sm sticky top-0 z-10">
           <div className="flex gap-4 items-center">
               <div className="bg-slate-100 p-2 rounded border border-slate-200">
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ano Fiscal</label>
                   <select className="p-1 bg-transparent font-bold text-slate-800 outline-none cursor-pointer" value={year} onChange={e => setYear(Number(e.target.value))}>
                       <option value={2023}>2023</option><option value={2024}>2024</option><option value={2025}>2025</option>
                   </select>
               </div>
               <div className="bg-slate-100 p-2 rounded border border-slate-200">
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mês de Apuramento</label>
                   <select className="p-1 bg-transparent font-bold text-slate-800 outline-none w-32 cursor-pointer" value={month} onChange={e => setMonth(Number(e.target.value))}>
                       {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{new Date(2024, m-1).toLocaleString('pt-PT', {month:'long'}).toUpperCase()}</option>)}
                   </select>
               </div>
           </div>
           <div className="flex flex-wrap gap-2 justify-center">
               <button onClick={() => setCurrentView('ANNEX_SUPPLIERS')} className={`px-4 py-2 rounded text-xs font-bold border transition-all ${currentView === 'ANNEX_SUPPLIERS' ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Anexo Fornecedores</button>
               <button onClick={() => setCurrentView('ANNEX_REGULARIZATIONS')} className={`px-4 py-2 rounded text-xs font-bold border transition-all ${currentView === 'ANNEX_REGULARIZATIONS' ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Regularização Clientes</button>
               <div className="w-px bg-slate-300 mx-2 h-8 self-center"></div>
               <button onClick={() => setCurrentView('GENERAL')} className={`px-4 py-2 rounded text-xs font-bold border transition-all ${currentView === 'GENERAL' ? 'bg-blue-900 text-white border-blue-900 shadow-md transform scale-105' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Modelo 7 (Geral)</button>
               <button onClick={() => setCurrentView('SIMPLIFIED')} className={`px-4 py-2 rounded text-xs font-bold border transition-all ${currentView === 'SIMPLIFIED' ? 'bg-blue-900 text-white border-blue-900 shadow-md transform scale-105' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Modelo 7 (Simplificado)</button>
           </div>
           <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-2 text-xs hover:bg-emerald-700 shadow-md"><Printer size={16}/> Imprimir</button>
      </div>
  );

  const FormHeader = ({ title, subtitle, color = "blue" }: { title: string, subtitle?: string, color?: string }) => {
      const borderClass = color === 'blue' ? 'border-blue-900' : 'border-slate-800';
      const textClass = color === 'blue' ? 'text-blue-900' : 'text-slate-800';
      const bgClass = color === 'blue' ? 'bg-blue-900' : 'bg-slate-800';

      return (
        <div className={`border-2 ${borderClass} mb-4 bg-white print:break-inside-avoid`}>
            <div className="flex border-b-2 border-slate-400">
                <div className={`w-32 p-2 flex flex-col items-center justify-center border-r-2 border-slate-400 bg-slate-50`}>
                    <div className="mb-1"><Calculator className="text-slate-400" size={24}/></div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase">Powered By</div>
                    <div className="text-xs font-black text-slate-700">IMATEC SOFT</div>
                </div>
                <div className="flex-1 p-2 text-center flex flex-col justify-center">
                    <h1 className={`text-xl font-black ${textClass} uppercase tracking-tight`}>{title}</h1>
                    {subtitle && <p className={`text-sm font-bold ${textClass} opacity-80`}>{subtitle}</p>}
                </div>
                <div className="w-32 p-2 border-l-2 border-slate-400 flex items-center justify-center"><div className="border-4 border-double border-slate-300 rounded-full w-16 h-16 flex items-center justify-center font-serif font-bold text-slate-300 italic">IVA</div></div>
            </div>
            <div className="flex text-xs">
                <div className="w-5/12 border-r-2 border-slate-400">
                    <div className={`${bgClass} text-white px-2 py-0.5 font-bold text-[10px]`}>01 - PERIODO DE TRIBUTAÇÃO E NUMEROS DE IDENTIFICAÇÃO FISCAL</div>
                    <div className="p-3 flex gap-6 items-center justify-start bg-white">
                        <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-500 mb-0.5">Ano:</span><div className="border-2 border-slate-800 px-3 py-1 font-mono font-bold text-sm tracking-widest">{year}</div></div>
                        <div className="flex flex-col"><span className="text-[9px] font-bold text-slate-500 mb-0.5">Mês:</span><div className="border-2 border-slate-800 px-3 py-1 font-mono font-bold text-sm tracking-widest">{String(month).padStart(2, '0')}</div></div>
                    </div>
                </div>
                <div className="w-7/12">
                     <div className={`${bgClass} text-white px-2 py-0.5 font-bold text-[10px] text-right`}>03 - NÚMERO DE IDENTIFICAÇÃO FISCAL</div>
                     <div className="flex h-full items-center justify-end pr-6 gap-3 pb-4">
                         <span className="font-bold text-slate-600">NIF</span>
                         <div className="flex gap-1">{company.nif.split('').map((char, i) => <div key={i} className="border border-slate-800 w-7 h-8 flex items-center justify-center font-bold bg-white shadow-sm text-sm">{char}</div>)}</div>
                     </div>
                </div>
            </div>
            <div className="border-t-2 border-slate-400">
                <div className={`${bgClass} text-white px-2 py-0.5 font-bold text-[10px]`}>02 - NOME, DESIGN/SOCIAL DO SUJEITO PASSIVO DO REPRESENTANTE LEGAL</div>
                <div className="p-2 flex gap-4 items-center bg-white px-4"><span className={`text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap`}>NOME/DESIGNAÇÃO SOCIAL:</span><div className="flex-1 font-bold text-slate-900 uppercase tracking-wide text-sm border-b border-slate-200">{company.name}</div></div>
            </div>
        </div>
      );
  };

  const RenderSupplierAnnex = () => {
      const supplierData = validPurchases.map((p, idx) => ({ order: idx + 1, nif: p.nif, name: p.supplier, type: 'FR', date: p.date, docNum: p.documentNumber, total: p.total, base: p.subtotal, ivaSupported: p.taxAmount, ivaDeductibleVal: p.taxAmount, ivaDeductiblePerc: 100, typology: 'OBC' }));
      const totalBase = supplierData.reduce((acc, i) => acc + i.base, 0);
      const totalIva = supplierData.reduce((acc, i) => acc + i.ivaSupported, 0);
      const totalDeductible = supplierData.reduce((acc, i) => acc + i.ivaDeductibleVal, 0);
      const totalDoc = supplierData.reduce((acc, i) => acc + i.total, 0);

      return (
          <div className="max-w-[1200px] mx-auto bg-white p-6 shadow-xl min-h-[1123px] border-t-8 border-slate-700 animate-in fade-in">
              <FormHeader title="ANEXO DE FORNECEDORES" subtitle="Aquisição de Bens e Serviços" color="slate" />
              <div className="border-2 border-slate-800 mt-6">
                  <div className="bg-slate-100 text-slate-800 text-xs font-bold px-2 py-1 border-b-2 border-slate-800">03- OPERAÇÕES EFECTUADAS COM FORNECEDORES SUJEITAS A IVA</div>
                  <table className="w-full text-[10px] border-collapse">
                      <thead><tr className="border-b border-slate-800 font-bold text-center bg-slate-50"><th className="border-r border-slate-300 p-1 w-8">No ORDEM</th><th className="border-r border-slate-300 p-1 w-24">NIF</th><th className="border-r border-slate-300 p-1">NOME/FIRMA</th><th className="border-r border-slate-300 p-1 w-12">TIPO</th><th className="border-r border-slate-300 p-1 w-20">DATA</th><th className="border-r border-slate-300 p-1 w-24">NUMERO DOC</th><th className="border-r border-slate-300 p-1 w-24">VALOR DOC</th><th className="border-r border-slate-300 p-1 w-24">BASE</th><th className="border-r border-slate-300 p-1 w-20">IVA SUP.</th><th className="border-r border-slate-300 p-1 w-12">%</th><th className="border-r border-slate-300 p-1 w-20">IVA DED.</th><th className="p-1 w-12">TIPOLOGIA</th></tr></thead>
                      <tbody>{supplierData.map((row) => (<tr key={row.order} className="border-b border-slate-200 text-center"><td className="border-r border-slate-300 p-1 font-bold">{row.order}</td><td className="border-r border-slate-300 p-1 font-mono">{row.nif}</td><td className="border-r border-slate-300 p-1 text-left truncate font-medium">{row.name}</td><td className="border-r border-slate-300 p-1">{row.type}</td><td className="border-r border-slate-300 p-1">{formatDate(row.date)}</td><td className="border-r border-slate-300 p-1">{row.docNum}</td><td className="border-r border-slate-300 p-1 text-right">{formatCurrency(row.total).replace('Kz','')}</td><td className="border-r border-slate-300 p-1 text-right">{formatCurrency(row.base).replace('Kz','')}</td><td className="border-r border-slate-300 p-1 text-right">{formatCurrency(row.ivaSupported).replace('Kz','')}</td><td className="border-r border-slate-300 p-1">100</td><td className="border-r border-slate-300 p-1 text-right font-bold">{formatCurrency(row.ivaDeductibleVal).replace('Kz','')}</td><td className="p-1">{row.typology}</td></tr>))}</tbody>
                      <tfoot><tr className="border-t-2 border-black font-bold text-[10px] bg-slate-100"><td colSpan={6} className="text-right p-1 uppercase pr-3 border-r border-slate-300">TOTAL</td><td className="border-r border-slate-300 p-1 text-right">{formatCurrency(totalDoc).replace('Kz','')}</td><td className="border-r border-slate-300 p-1 text-right">{formatCurrency(totalBase).replace('Kz','')}</td><td className="border-r border-slate-300 p-1 text-right">{formatCurrency(totalIva).replace('Kz','')}</td><td className="border-r border-slate-300 p-1"></td><td className="border-r border-slate-300 p-1 text-right">{formatCurrency(totalDeductible).replace('Kz','')}</td><td></td></tr></tfoot>
                  </table>
              </div>
          </div>
      );
  };

  const RenderRegularizationAnnex = () => {
      const regDocs = cancelledInvoices.map((doc, idx) => ({ order: idx + 1, operation: 'Anulação', nif: doc.clientNif || '999999999', name: doc.clientName, type: doc.type, date: doc.date, number: doc.number, total: doc.total, base: doc.subtotal, iva: doc.taxAmount, refPeriod: `${year}-${String(month).padStart(2,'0')}`, destination: '26' }));
      const totalIva = regDocs.reduce((acc, r) => acc + r.iva, 0);

      return (
          <div className="max-w-[1200px] mx-auto bg-white p-6 shadow-xl min-h-[1123px] border-t-8 border-blue-800 animate-in fade-in">
              <FormHeader title="ANEXO CLIENTES - MODELO 7" subtitle="Regularizações" color="blue" />
              <div className="border-2 border-blue-900 mt-6">
                  <div className="bg-blue-900 text-white text-xs font-bold px-2 py-1">03- REGULARIZAÇÕES DE IVA LIQUIDADO</div>
                  <table className="w-full text-[9px] border-collapse">
                      <thead><tr className="border-b border-black font-bold text-center bg-slate-100"><th className="border-r border-slate-400 p-1 w-8">No ORDEM</th><th className="border-r border-slate-400 p-1 w-20">OPERAÇÕES</th><th className="border-r border-slate-400 p-1 w-20">NIF</th><th className="border-r border-slate-400 p-1">NOME/FIRMA</th><th className="border-r border-slate-400 p-1 w-12">TIPO</th><th className="border-r border-slate-400 p-1 w-20">DATA</th><th className="border-r border-slate-400 p-1 w-24">NUMERO DOC</th><th className="border-r border-slate-400 p-1 w-24">VALOR DOC</th><th className="border-r border-slate-400 p-1 w-24">BASE</th><th className="border-r border-slate-400 p-1 w-24">IVA LIQ.</th><th className="border-r border-slate-400 p-1 w-24">PERIODO REF</th><th className="border-r border-slate-400 p-1 w-16">DESTINO</th><th className="p-1 w-10">Movid</th></tr></thead>
                      <tbody>{regDocs.map((row) => (<tr key={row.order} className="border-b border-slate-300 hover:bg-slate-50 text-center"><td className="border-r border-slate-300 p-1">{row.order}</td><td className="border-r border-slate-300 p-1">{row.operation}</td><td className="border-r border-slate-300 p-1 font-mono">{row.nif}</td><td className="border-r border-slate-300 p-1 text-left truncate font-medium">{row.name}</td><td className="border-r border-slate-300 p-1">{row.type}</td><td className="border-r border-slate-300 p-1">{formatDate(row.date)}</td><td className="border-r border-slate-300 p-1">{row.number}</td><td className="border-r border-slate-300 p-1 text-right">{formatCurrency(row.total).replace('Kz','')}</td><td className="border-r border-slate-300 p-1 text-right">{formatCurrency(row.base).replace('Kz','')}</td><td className="border-r border-slate-300 p-1 text-right">{formatCurrency(row.iva).replace('Kz','')}</td><td className="border-r border-slate-300 p-1">{row.refPeriod}</td><td className="border-r border-slate-300 p-1">{row.destination}</td><td className="p-1">{row.order}</td></tr>))}</tbody>
                      <tfoot><tr className="border-t-2 border-black font-bold text-[10px] bg-slate-100"><td colSpan={9} className="text-right p-1 uppercase pr-3 border-r border-slate-400">Total IVA Regularizado</td><td className="border-r border-slate-400 p-1 text-right bg-white">{formatCurrency(totalIva).replace('Kz','')}</td><td colSpan={3}></td></tr></tfoot>
                  </table>
              </div>
          </div>
      );
  };

  const RenderGeneralRegime = () => {
      const { sales14, sales7, sales5, salesExempt, deductibleTax, regularizationsSubject, totalFavorEstado, totalFavorSujeito, toPay, toRecover } = calcGeneral;
      const LineRow = ({ label, codeBase, codeSubject, codeState, valBase, valSubject, valState, isMain = false }: any) => (
          <tr className="border-b border-slate-200 text-xs hover:bg-slate-50 h-8">
              <td className={`border-r border-slate-300 p-1 pl-2 text-slate-700 ${isMain ? 'font-bold' : ''}`}>{label}</td>
              <td className="border-r border-slate-300 p-0 relative w-24">{codeBase && <div className="flex justify-between items-center h-full"><span className="bg-blue-900 text-white text-[10px] px-1 h-full flex items-center font-bold min-w-[20px] justify-center">{codeBase}</span><span className="px-2 text-right flex-1">{typeof valBase === 'number' ? formatCurrency(valBase).replace('Kz', '') : valBase}</span></div>}</td>
              <td className="border-r border-slate-300 p-0 relative w-32">{codeSubject && <div className="flex justify-between items-center h-full"><span className="bg-blue-900 text-white text-[10px] px-1 h-full flex items-center font-bold min-w-[20px] justify-center">{codeSubject}</span><span className="px-2 text-right flex-1">{typeof valSubject === 'number' ? formatCurrency(valSubject).replace('Kz', '') : valSubject}</span></div>}</td>
              <td className="p-0 relative w-32">{codeState && <div className="flex justify-between items-center h-full"><span className="bg-blue-900 text-white text-[10px] px-1 h-full flex items-center font-bold min-w-[20px] justify-center">{codeState}</span><span className="px-2 text-right flex-1 font-bold text-slate-900">{typeof valState === 'number' ? formatCurrency(valState).replace('Kz', '') : valState}</span></div>}</td>
          </tr>
      );

      return (
          <div className="max-w-[1000px] mx-auto bg-white p-6 shadow-xl border-t-8 border-blue-900 animate-in fade-in">
              <FormHeader title="DECLARAÇÃO PERIÓDICA" subtitle="MODELO 7 - Regime Geral" color="blue" />
              <div className="border-2 border-black mb-6">
                  <div className="bg-slate-200 border-b-2 border-black p-1 text-xs font-bold uppercase text-center">09 - APURAMENTO DE IMPOSTO REFERENTE AO PERIODO A QUE RESPEITA A DECLARAÇÃO</div>
                  <table className="w-full border-collapse">
                      <thead className="text-[9px] font-bold text-center bg-slate-50 text-slate-600"><tr><th className="border-r border-slate-300 p-2">DESCRIÇÃO DAS OPERAÇÕES</th><th className="border-r border-slate-300 p-2 w-24">BASE TRIBUTAVEL</th><th className="border-r border-slate-300 p-2 w-32">IMPOSTO A FAVOR DO SUJEITO</th><th className="p-2 w-32">IMPOSTO A FAVOR DO ESTADO</th></tr></thead>
                      <tbody>
                          <LineRow label="1 - Transmissão de bens e de prestação de serviços em que liquidou imposto" codeBase="1" valBase={sales14.base} codeSubject="28" valSubject={deductibleTax} codeState="2" valState={sales14.tax} isMain />
                          <LineRow label="1.2 - Transmissão de bens e prestações de serviços em que liquidou imposto a taxa reduzida 5%" codeBase="1.2" valBase={sales5.base} codeState="2.2" valState={sales5.tax} />
                          <LineRow label="1.2 - Transmissão de bens e prestações de serviços em que liquidou imposto a taxa reduzida 7%" codeBase="1.2" valBase={sales7.base} codeState="2.3" valState={sales7.tax} />
                          <LineRow label="9 - Reguralizações de Imposto Cativo (Anulações)" codeSubject="26" valSubject={regularizationsSubject} codeState="27" valState={0} />
                          <tr className="bg-slate-800 text-white font-bold text-xs"><td colSpan={3} className="p-2 text-right uppercase">Total Imposto a Favor do Estado</td><td className="p-2 text-right font-mono text-sm bg-slate-900">{formatCurrency(totalFavorEstado).replace('Kz','')}</td></tr>
                          <tr className="bg-slate-700 text-white font-bold text-xs border-t border-slate-600"><td colSpan={3} className="p-2 text-right uppercase">Total Imposto a Favor do Sujeito Passivo</td><td className="p-2 text-right font-mono text-sm bg-slate-600">{formatCurrency(totalFavorSujeito).replace('Kz','')}</td></tr>
                      </tbody>
                  </table>
                  <div className="bg-blue-50 p-4 border-t-2 border-black"><div className="flex justify-between items-center"><div className="font-bold text-sm text-blue-900 uppercase flex items-center gap-2"><Calculator/> Apuramento Final</div><div className="flex gap-6 items-center"><div className="text-right"><div className="text-[10px] font-bold text-slate-500 uppercase">Imposto a Pagar</div><div className="text-2xl font-black text-slate-900">{toPay > 0 ? formatCurrency(toPay) : '0,00 Kz'}</div></div>{toRecover > 0 && <div className="text-right border-l pl-6 border-slate-300"><div className="text-[10px] font-bold text-green-600 uppercase">Crédito a Recuperar</div><div className="text-xl font-bold text-green-700">{formatCurrency(toRecover)}</div></div>}</div></div></div>
              </div>
          </div>
      );
  };

  const RenderSimplifiedRegime = () => {
      const { turnover, taxDue, exemptBase, exemptTax } = calcSimplified;
      const SimplifiedRow = ({ desc, tax = "7%", code, value = 0 }: any) => (<tr className="border-b border-slate-300 text-xs hover:bg-slate-50"><td className="p-2 border-r border-slate-300 font-medium">{desc}</td><td className="p-2 border-r border-slate-300 text-right w-40">{formatCurrency(value).replace('Kz','')}</td><td className="p-2 border-r border-slate-300 text-center font-bold">{code}</td><td className="p-2 border-r border-slate-300 text-center">{tax}</td><td className="p-2 text-right font-bold text-slate-800">{formatCurrency(value * 0.07).replace('Kz','')}</td></tr>);

      return (
          <div className="max-w-[1000px] mx-auto bg-white p-6 shadow-xl min-h-[1123px] border-t-8 border-slate-800 animate-in fade-in">
              <FormHeader title="DECLARAÇÃO PERIÓDICA" subtitle="MODELO 7 - Regime Simplificado" color="slate" />
              <div className="border-2 border-slate-800 mt-6">
                  <div className="bg-slate-800 text-white p-1 text-xs font-bold px-2">06 - SECTOR DE ACTIVIDADE E APURAMENTO DO IMPOSTO DEVIDO</div>
                  <table className="w-full text-xs border-collapse">
                      <thead className="bg-slate-100 font-bold text-slate-700"><tr><th className="border-b border-slate-400 p-2 text-left">Operações Sujeitas</th><th className="border-b border-slate-400 p-2 text-right">Volume Negócios</th><th className="border-b border-slate-400 p-2 w-24">Código</th><th className="border-b border-slate-400 p-2 w-16">Taxa</th><th className="border-b border-slate-400 p-2 text-right w-32">Imposto Devido</th></tr></thead>
                      <tbody><SimplifiedRow desc="4º OUTROS (Diversos)" code="OUTROS" value={turnover}/></tbody>
                  </table>
                  <div className="bg-slate-50 p-3 flex justify-between items-center border-t border-slate-300"><span className="font-bold text-slate-600 text-xs uppercase">Total Volume de Negócios (Base)</span><div className="font-mono font-bold text-lg text-slate-900">{formatCurrency(turnover)}</div></div>
              </div>
              <div className="mt-8 flex justify-end"><div className="bg-slate-800 text-white p-6 rounded-lg shadow-lg min-w-[300px]"><div className="text-xs uppercase mb-2 text-slate-400 font-bold tracking-wider">Total Geral a Pagar ao Estado</div><div className="text-4xl font-black">{formatCurrency(taxDue + exemptTax)}</div></div></div>
          </div>
      );
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen pb-20 animate-in fade-in">
        <HeaderControls />
        {currentView === 'GENERAL' && <RenderGeneralRegime />}
        {currentView === 'SIMPLIFIED' && <RenderSimplifiedRegime />}
        {currentView === 'ANNEX_SUPPLIERS' && <RenderSupplierAnnex />}
        {currentView === 'ANNEX_REGULARIZATIONS' && <RenderRegularizationAnnex />}
    </div>
  );
};

export default Model7;
