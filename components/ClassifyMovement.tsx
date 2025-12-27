
import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceType, Client, PGCAccount, Purchase, SalarySlip } from '../types';
import { formatCurrency, formatDate, exportToExcel } from '../utils';
import { Printer, RefreshCw, X, Eye, List } from 'lucide-react';
import ClassifyPage from './ClassifyPage';

interface ClassifyMovementProps {
  mode: 'SALES' | 'PURCHASES' | 'SALARY_PROC' | 'SALARY_PAY';
  invoices: Invoice[];
  purchases?: Purchase[];
  payroll?: SalarySlip[];
  clients: Client[];
  pgcAccounts: PGCAccount[];
  onOpenRubricas: () => void;
}

interface AccountingMovement {
  id: string; // ID of the source document
  diaryNo: string;
  movNo: number;
  valueDate: string;
  date: string;
  docNo: string;
  classification: 'PENDING' | 'DONE';
  checked: boolean;
  type: string;
  origin: string;
  accountId: string; // Suggested Main Account
  entityName: string;
  debit: number;
  credit: number;
  iva: number;
  sourceObject: any; // The original object (Invoice, Purchase, or Slip)
}

const ClassifyMovement: React.FC<ClassifyMovementProps> = ({ mode, invoices, purchases = [], payroll = [], clients, pgcAccounts, onOpenRubricas }) => {
  const [showClassifyPage, setShowClassifyPage] = useState(false); 
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  const months = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' }, 
    { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' }, 
    { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' }
  ];

  const getTitle = () => {
      switch(mode) {
          case 'SALES': return 'Classificar Vendas';
          case 'PURCHASES': return 'Classificar Compras';
          case 'SALARY_PROC': return 'Classificar Processamento Salarial';
          case 'SALARY_PAY': return 'Classificar Pagamento Salarial';
          default: return 'Classificação';
      }
  };

  const getDiaryCode = () => {
      switch(mode) {
          case 'SALES': return '0001'; // Vendas
          case 'PURCHASES': return '0002'; // Compras
          case 'SALARY_PROC': return '0003'; // Operações Diversas
          case 'SALARY_PAY': return '0004'; // Caixa/Bancos
          default: return '0000';
      }
  };

  // Logic to map Source Documents to Accounting Movements list
  const movements: AccountingMovement[] = useMemo(() => {
      const rows: AccountingMovement[] = [];
      let movCounter = 1;

      if (mode === 'SALES') {
          const filtered = invoices.filter(i => {
              const d = new Date(i.date);
              return i.isCertified && d.getFullYear() === year && (d.getMonth() + 1) >= startMonth && (d.getMonth() + 1) <= endMonth;
          }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          filtered.forEach(inv => {
              const total = inv.currency === 'AOA' ? inv.total : inv.contraValue || inv.total;
              const isCredit = inv.type === InvoiceType.FT || inv.type === InvoiceType.FR || inv.type === InvoiceType.VD || inv.type === InvoiceType.ND;
              
              rows.push({
                  id: inv.id,
                  diaryNo: '0001',
                  movNo: movCounter++,
                  valueDate: inv.date,
                  date: inv.date,
                  docNo: inv.number,
                  classification: processedIds.has(inv.id) ? 'DONE' : 'PENDING',
                  checked: false,
                  type: inv.type.substring(0, 2),
                  origin: 'FAT',
                  accountId: '31.1.2.1', // Default Client
                  entityName: inv.clientName,
                  debit: isCredit ? total : 0,
                  credit: !isCredit ? total : 0,
                  iva: inv.taxAmount,
                  sourceObject: inv
              });
          });
      } 
      else if (mode === 'PURCHASES') {
          const filtered = purchases.filter(p => {
              const d = new Date(p.date);
              return p.status !== 'PENDING' && d.getFullYear() === year && (d.getMonth() + 1) >= startMonth && (d.getMonth() + 1) <= endMonth;
          }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          filtered.forEach(pur => {
              rows.push({
                  id: pur.id,
                  diaryNo: '0002',
                  movNo: movCounter++,
                  valueDate: pur.date,
                  date: pur.date,
                  docNo: pur.documentNumber,
                  classification: processedIds.has(pur.id) ? 'DONE' : 'PENDING',
                  checked: false,
                  type: pur.type.substring(0, 2),
                  origin: 'COM',
                  accountId: '32.1.2.1', // Default Supplier
                  entityName: pur.supplier,
                  debit: 0, // Purchase is Credit to Supplier
                  credit: pur.total,
                  iva: pur.taxAmount,
                  sourceObject: pur
              });
          });
      }
      else if (mode === 'SALARY_PROC') {
          // One row per employee per month
          // Filter handled roughly
          payroll.forEach((slip, idx) => {
             // Mock date logic since slips don't have date directly in interface, assuming current context
             const dateStr = `${year}-${String(startMonth).padStart(2,'0')}-28`; 
             rows.push({
                 id: `${slip.employeeId}-${idx}`,
                 diaryNo: '0003',
                 movNo: movCounter++,
                 valueDate: dateStr,
                 date: dateStr,
                 docNo: `PROC/${String(startMonth).padStart(2,'0')}/${year}`,
                 classification: processedIds.has(`${slip.employeeId}-${idx}`) ? 'DONE' : 'PENDING',
                 checked: false,
                 type: 'PR',
                 origin: 'RH',
                 accountId: '72.1', // Staff Cost
                 entityName: slip.employeeName,
                 debit: slip.grossTotal, // Cost
                 credit: 0, 
                 iva: 0,
                 sourceObject: slip
             });
          });
      }
      else if (mode === 'SALARY_PAY') {
          payroll.forEach((slip, idx) => {
             const dateStr = `${year}-${String(startMonth).padStart(2,'0')}-30`;
             rows.push({
                 id: `PAY-${slip.employeeId}-${idx}`,
                 diaryNo: '0004',
                 movNo: movCounter++,
                 valueDate: dateStr,
                 date: dateStr,
                 docNo: `PAG/${String(startMonth).padStart(2,'0')}/${year}`,
                 classification: processedIds.has(`PAY-${slip.employeeId}-${idx}`) ? 'DONE' : 'PENDING',
                 checked: false,
                 type: 'PG',
                 origin: 'RH',
                 accountId: '36.1', // Remunerations Payable
                 entityName: slip.employeeName,
                 debit: slip.netTotal, // Debit Liability
                 credit: 0, // Bank Credit happens on contra-part
                 iva: 0,
                 sourceObject: slip
             });
          });
      }

      return rows;
  }, [mode, invoices, purchases, payroll, year, startMonth, endMonth, processedIds]);

  const handleProcess = () => {
      setIsProcessing(true);
      setTimeout(() => {
          const newIds = new Set(processedIds);
          movements.forEach(m => newIds.add(m.id));
          setProcessedIds(newIds);
          setIsProcessing(false);
          alert("Movimentos marcados como processados!");
      }, 1000);
  };

  const handleSaveClassifications = (ids: string[]) => {
      const newIds = new Set(processedIds);
      ids.forEach(id => newIds.add(id));
      setProcessedIds(newIds);
      setShowClassifyPage(false);
  };

  const renderDocPreview = () => {
      if (!selectedDoc) return null;
      // Simple generic preview
      return (
          <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded p-6 max-w-lg w-full">
                  <div className="flex justify-between mb-4">
                      <h3 className="font-bold text-lg">Visualizar Detalhe</h3>
                      <button onClick={() => setSelectedDoc(null)}><X/></button>
                  </div>
                  <pre className="bg-slate-100 p-4 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(selectedDoc, null, 2)}
                  </pre>
              </div>
          </div>
      );
  };

  // Switch to Classify Page
  if (showClassifyPage) {
      return (
          <ClassifyPage 
              mode={mode}
              invoices={invoices}
              purchases={purchases}
              payroll={payroll}
              clients={clients}
              pgcAccounts={pgcAccounts}
              onBack={() => setShowClassifyPage(false)}
              onSave={handleSaveClassifications}
          />
      );
  }

  return (
    <div className="bg-slate-100 min-h-screen p-4 flex flex-col font-sans text-xs animate-in fade-in">
        {renderDocPreview()}

        <div className="bg-white rounded-t-lg shadow-sm border border-slate-300 p-2 flex justify-between items-center mb-2">
            <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-2 rounded-lg text-white shadow">
                    <RefreshCw size={24}/>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-slate-700 uppercase">{getTitle()}</h2>
                    <p className="text-[10px] text-slate-500">Integração Contabilística</p>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button onClick={() => setShowClassifyPage(true)} className="flex flex-col items-center justify-center p-2 hover:bg-slate-50 rounded text-slate-600 group">
                    <div className="bg-indigo-100 p-1.5 rounded-full text-indigo-700 mb-1 group-hover:bg-indigo-600 group-hover:text-white transition"><List size={18}/></div>
                    <span className="text-[10px] font-bold text-indigo-800 group-hover:text-indigo-600">CLASSIFICAR</span>
                </button>
                <div className="w-px h-10 bg-slate-200 mx-1"></div>
                <button onClick={handleProcess} disabled={isProcessing || movements.length === 0} className="flex flex-col items-center justify-center p-2 hover:bg-slate-50 rounded text-slate-600 disabled:opacity-50">
                    <div className="bg-green-100 p-1.5 rounded-full text-green-700 mb-1"><RefreshCw size={18}/></div>
                    <span className="text-[10px] font-bold">Processar</span>
                </button>
                <button onClick={() => window.print()} className="flex flex-col items-center justify-center p-2 hover:bg-slate-50 rounded text-slate-600">
                    <div className="bg-blue-100 p-1.5 rounded-full text-blue-700 mb-1"><Printer size={18}/></div>
                    <span className="text-[10px] font-bold">Imprimir</span>
                </button>
            </div>
        </div>

        <div className="bg-white border-x border-slate-300 p-2 flex items-center justify-center gap-4 text-[11px] border-b">
             <div className="flex flex-col items-center">
                 <span className="font-bold text-slate-600 mb-1">Filtro de Período</span>
                 <span className="font-bold text-slate-800">de {months.find(m => m.value === startMonth)?.label} a {months.find(m => m.value === endMonth)?.label} - {year}</span>
             </div>
             <div className="flex gap-2 items-end">
                 <select className="border border-slate-300 rounded p-1" value={startMonth} onChange={e => setStartMonth(Number(e.target.value))}>
                     {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                 </select>
                 <select className="border border-slate-300 rounded p-1" value={endMonth} onChange={e => setEndMonth(Number(e.target.value))}>
                     {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                 </select>
                 <select className="border border-slate-300 rounded p-1 w-20" value={year} onChange={e => setYear(Number(e.target.value))}>
                     <option value={2023}>2023</option>
                     <option value={2024}>2024</option>
                     <option value={2025}>2025</option>
                 </select>
             </div>
        </div>

        <div className="flex-1 bg-white border border-slate-300 overflow-auto shadow-inner rounded-b-lg">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="p-2 border-r w-10 text-center">Nº</th>
                        <th className="p-2 border-r w-12 text-center">Diário</th>
                        <th className="p-2 border-r w-12 text-center">Mov</th>
                        <th className="p-2 border-r w-20 text-center">Data</th>
                        <th className="p-2 border-r w-24">DocNo</th>
                        <th className="p-2 border-r w-10 text-center">St</th>
                        <th className="p-2 border-r w-10 text-center">Tipo</th>
                        <th className="p-2 border-r min-w-[200px]">{mode === 'SALARY_PROC' || mode === 'SALARY_PAY' ? 'Colaborador' : 'Entidade'}</th>
                        <th className="p-2 border-r w-24 text-right">Débito</th>
                        <th className="p-2 border-r w-24 text-right">Crédito</th>
                        <th className="p-2 w-8 text-center"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                    {movements.map((m, idx) => (
                        <tr key={m.id} className="hover:bg-blue-50 group cursor-pointer transition-colors">
                            <td className="p-2 text-center border-r">{idx + 1}</td>
                            <td className="p-2 text-center border-r">{m.diaryNo}</td>
                            <td className="p-2 text-center border-r">{m.movNo}</td>
                            <td className="p-2 text-center border-r">{formatDate(m.date)}</td>
                            <td className="p-2 border-r font-bold text-blue-600 hover:underline" onClick={() => setSelectedDoc(m.sourceObject)}>
                                {m.docNo}
                            </td>
                            <td className="p-2 text-center border-r">
                                {m.classification === 'DONE' ? <div className="w-3 h-3 bg-green-500 rounded-full mx-auto" title="Classificado"></div> : <div className="w-3 h-3 bg-yellow-400 rounded-full mx-auto" title="Pendente"></div>}
                            </td>
                            <td className="p-2 text-center border-r">{m.type}</td>
                            <td className="p-2 border-r font-medium truncate max-w-[200px]">{m.entityName}</td>
                            <td className="p-2 text-right border-r">{m.debit > 0 ? formatCurrency(m.debit).replace('Kz','') : ''}</td>
                            <td className="p-2 text-right border-r">{m.credit > 0 ? formatCurrency(m.credit).replace('Kz','') : ''}</td>
                            <td className="p-2 text-center">
                                <input type="checkbox" className="rounded border-slate-300 w-3 h-3"/>
                            </td>
                        </tr>
                    ))}
                    {movements.length === 0 && (
                        <tr><td colSpan={11} className="p-10 text-center text-slate-400 italic">Sem movimentos para o período selecionado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default ClassifyMovement;
