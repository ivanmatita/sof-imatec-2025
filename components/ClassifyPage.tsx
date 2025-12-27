
import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, InvoiceType, PGCAccount, Client, Purchase, SalarySlip } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { Save, ArrowLeft, Wand2, Calculator, CheckCircle, AlertTriangle, Search } from 'lucide-react';

interface ClassifyPageProps {
  mode: 'SALES' | 'PURCHASES' | 'SALARY_PROC' | 'SALARY_PAY';
  invoices: Invoice[];
  purchases: Purchase[];
  payroll: SalarySlip[];
  pgcAccounts: PGCAccount[];
  clients: Client[];
  onBack: () => void;
  onSave: (classifiedIds: string[]) => void;
}

interface AccountingEntry {
  id: string; // Unique Row ID
  parentId: string; // Source ID (Invoice/Purchase/Employee)
  date: string;
  docNumber: string;
  description: string;
  entity: string;
  
  // Classification
  debitAccount: string;
  creditAccount: string;
  ivaAccount: string;
  
  debitAmount: number;
  creditAmount: number;
  ivaAmount: number;
  
  status: 'PENDING' | 'CLASSIFIED';
  selected: boolean;
}

const ClassifyPage: React.FC<ClassifyPageProps> = ({ mode, invoices, purchases, payroll, pgcAccounts, clients, onBack, onSave }) => {
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [isAutoClassifying, setIsAutoClassifying] = useState(false);
  const [filter, setFilter] = useState('');

  // Initial Load based on Mode
  useEffect(() => {
    const initialEntries: AccountingEntry[] = [];
    
    if (mode === 'SALES') {
        invoices.filter(i => i.isCertified).forEach(inv => {
            inv.items.forEach((item) => {
                const tax = item.total * (item.taxRate / 100);
                initialEntries.push({
                    id: `${inv.id}-${item.id}`,
                    parentId: inv.id,
                    date: inv.date,
                    docNumber: inv.number,
                    description: item.description,
                    entity: inv.clientName,
                    debitAccount: '', creditAccount: '', ivaAccount: '',
                    debitAmount: 0, creditAmount: 0, ivaAmount: tax,
                    status: 'PENDING', selected: false
                });
            });
        });
    } else if (mode === 'PURCHASES') {
        purchases.filter(p => p.status !== 'PENDING').forEach(pur => {
            pur.items.forEach((item) => {
                initialEntries.push({
                    id: `${pur.id}-${item.id}`,
                    parentId: pur.id,
                    date: pur.date,
                    docNumber: pur.documentNumber,
                    description: item.description,
                    entity: pur.supplier,
                    debitAccount: '', creditAccount: '', ivaAccount: '',
                    debitAmount: 0, creditAmount: 0, ivaAmount: 0,
                    status: 'PENDING', selected: false
                });
            });
        });
    } else if (mode === 'SALARY_PROC') {
        payroll.forEach((slip, idx) => {
            // Processing Salary: 1 row per employee typically summarized
            initialEntries.push({
                id: `${slip.employeeId}-${idx}`,
                parentId: slip.employeeId,
                date: new Date().toISOString().split('T')[0], // Mock date
                docNumber: `SAL/${idx}`,
                description: `Processamento Salarial - ${slip.employeeName}`,
                entity: slip.employeeName,
                debitAccount: '', creditAccount: '', ivaAccount: '',
                debitAmount: 0, creditAmount: 0, ivaAmount: 0,
                status: 'PENDING', selected: false
            });
        });
    } else if (mode === 'SALARY_PAY') {
        payroll.forEach((slip, idx) => {
            initialEntries.push({
                id: `PAY-${slip.employeeId}-${idx}`,
                parentId: slip.employeeId,
                date: new Date().toISOString().split('T')[0],
                docNumber: `PAG/${idx}`,
                description: `Pagamento Salarial - ${slip.employeeName}`,
                entity: slip.employeeName,
                debitAccount: '', creditAccount: '', ivaAccount: '',
                debitAmount: 0, creditAmount: 0, ivaAmount: 0,
                status: 'PENDING', selected: false
            });
        });
    }

    setEntries(initialEntries);
  }, [mode, invoices, purchases, payroll]);

  const handleAutoClassify = () => {
    setIsAutoClassifying(true);
    setTimeout(() => {
      const classifiedEntries = entries.map(entry => {
        if (entry.status === 'CLASSIFIED' || !entry.selected) return entry; // Only classify selected or pending if we want strict behavior, but usually 'All Pending'

        let debitAcc = '', creditAcc = '', ivaAcc = '';
        let debitVal = 0, creditVal = 0, ivaVal = 0;

        // --- SALES LOGIC ---
        if (mode === 'SALES') {
            const inv = invoices.find(i => i.id === entry.parentId);
            const itemId = entry.id.split('-')[1];
            const item = inv?.items.find(i => i.id === itemId);
            if (inv && item) {
                const base = item.total;
                const tax = item.total * (item.taxRate / 100);
                const total = base + tax;
                const clientSuffix = inv.clientId ? inv.clientId.substring(0, 3).replace(/\D/g, '') : '999';
                const clientAccount = `31.1.2.1.${clientSuffix || '1'}`;
                const revenueAccount = item.type === 'SERVICE' ? '62.1' : '61.1';

                if (inv.type === InvoiceType.NC) {
                    debitAcc = item.type === 'SERVICE' ? '62.9' : '61.2';
                    creditAcc = clientAccount;
                    debitVal = base; creditVal = total; ivaVal = tax;
                } else {
                    debitAcc = clientAccount;
                    creditAcc = revenueAccount;
                    ivaAcc = tax > 0 ? '34.5.3.1' : '';
                    debitVal = total; creditVal = base; ivaVal = tax;
                }
            }
        } 
        // --- PURCHASES LOGIC ---
        else if (mode === 'PURCHASES') {
            const pur = purchases.find(p => p.id === entry.parentId);
            const itemId = entry.id.split('-')[1];
            const item = pur?.items.find(i => i.id === itemId);
            if (pur && item) {
                const base = item.total; // Item total usually base in purchase entry context
                const tax = 0; // Simplified for item level, tax usually on header or calculated
                
                debitAcc = '71.1'; // Cost of Goods or 75.2 FSE
                creditAcc = '32.1'; // Supplier
                ivaAcc = '34.5.2.1'; // Deductible

                debitVal = base; creditVal = base; ivaVal = 0; // Simplified
            }
        }
        // --- SALARY PROCESS LOGIC ---
        else if (mode === 'SALARY_PROC') {
            // Find payroll slip from parentId (which is employeeId in this mock mapping)
            const slip = payroll.find(p => p.employeeId === entry.parentId || entry.id.includes(p.employeeId));
            if (slip) {
                debitAcc = '72.1'; // Remunerations (Cost)
                creditAcc = '36.1'; // Staff Payable (Net)
                // In a single line view, we can't show split credits (IRT/INSS). 
                // We'll map Debit=Gross Cost, Credit=Net Pay to simulate main flow
                debitVal = slip.grossTotal; 
                creditVal = slip.netTotal;
                ivaVal = 0; 
            }
        }
        // --- SALARY PAYMENT LOGIC ---
        else if (mode === 'SALARY_PAY') {
            const slip = payroll.find(p => p.employeeId === entry.parentId || entry.id.includes(p.employeeId));
            if (slip) {
                debitAcc = '36.1'; // Debit Payable (clearing liability)
                creditAcc = '43.1'; // Credit Bank
                debitVal = slip.netTotal;
                creditVal = slip.netTotal;
            }
        }

        return {
          ...entry,
          debitAccount: debitAcc, creditAccount: creditAcc, ivaAccount: ivaAcc,
          debitAmount: Number(debitVal.toFixed(2)),
          creditAmount: Number(creditVal.toFixed(2)),
          ivaAmount: Number(ivaVal.toFixed(2)),
          status: 'CLASSIFIED'
        };
      });

      setEntries(classifiedEntries);
      setIsAutoClassifying(false);
    }, 800);
  };

  const handleUpdateField = (id: string, field: keyof AccountingEntry, value: any) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const toggleSelectAll = () => {
      const allSelected = entries.every(e => e.selected);
      setEntries(prev => prev.map(e => ({ ...e, selected: !allSelected })));
  };

  const toggleSelect = (id: string) => {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
  };

  const handleSaveProcessing = () => {
    const classifiedIds = entries.filter(e => e.status === 'CLASSIFIED').map(e => e.parentId);
    onSave([...new Set(classifiedIds)]);
  };

  const filteredEntries = entries.filter(e => 
    e.docNumber.toLowerCase().includes(filter.toLowerCase()) || 
    e.entity.toLowerCase().includes(filter.toLowerCase())
  );

  const PgcInput = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder: string }) => {
      const [showSuggestions, setShowSuggestions] = useState(false);
      const suggestions = useMemo(() => {
          if (!value) return [];
          return pgcAccounts.filter(a => a.code.startsWith(value) || a.description.toLowerCase().includes(value.toLowerCase())).slice(0, 5);
      }, [value, pgcAccounts]);

      return (
          <div className="relative w-full h-full">
              <input 
                  className="w-full h-full bg-transparent p-2 outline-none font-mono text-xs focus:bg-white focus:ring-1 focus:ring-blue-500"
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder={placeholder}
              />
              {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 top-full w-64 bg-white border border-slate-300 shadow-xl rounded-b-md max-h-40 overflow-y-auto">
                      {suggestions.map(s => (
                          <div key={s.id} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0" onMouseDown={() => onChange(s.code)}>
                              <div className="font-bold text-blue-800">{s.code}</div>
                              <div className="text-[10px] text-slate-600 truncate">{s.description}</div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="bg-slate-100 min-h-screen flex flex-col font-sans animate-in fade-in fixed inset-0 z-50 overflow-hidden">
      <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={24}/></button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Calculator size={24} className="text-blue-600"/> Classificação Automática</h1>
            <p className="text-xs text-slate-500">Módulo: {mode}</p>
          </div>
        </div>
        <div className="text-right">
            <div className="text-xs font-black text-slate-800 tracking-widest uppercase">IMATEC SOFTWARE</div>
            <div className="text-[10px] text-slate-400">Accounting Intelligence</div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAutoClassify} disabled={isAutoClassifying} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md disabled:opacity-70 transition-all">
            {isAutoClassifying ? <Wand2 className="animate-spin" size={18}/> : <Wand2 size={18}/>}
            {isAutoClassifying ? 'A Classificar...' : 'Classificar Selecionados'}
          </button>
          <button onClick={handleSaveProcessing} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md transition-all">
            <Save size={18}/> Gravar
          </button>
        </div>
      </div>

      <div className="p-4 flex gap-4 bg-slate-50 border-b border-slate-200">
        <div className="bg-white p-2 rounded-lg border border-slate-200 flex-1 flex items-center gap-2 shadow-sm">
          <Search size={18} className="text-slate-400 ml-2"/>
          <input className="flex-1 outline-none text-sm" placeholder="Filtrar por Documento, Entidade ou Item..." value={filter} onChange={e => setFilter(e.target.value)}/>
        </div>
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2 px-4">
          <span className="text-xs font-bold text-slate-500 uppercase">Total: {entries.length}</span>
        </div>
      </div>

      <div className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
        <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 border-r border-slate-200 w-8 text-center"><input type="checkbox" onChange={toggleSelectAll} checked={entries.length > 0 && entries.every(e => e.selected)}/></th>
                <th className="p-3 border-r border-slate-200 w-10 text-center">St</th>
                <th className="p-3 border-r border-slate-200 w-24">Data</th>
                <th className="p-3 border-r border-slate-200 w-28">Doc</th>
                <th className="p-3 border-r border-slate-200 min-w-[150px]">Entidade</th>
                <th className="p-3 border-r border-slate-200 min-w-[200px]">Descrição</th>
                <th className="p-3 border-r border-slate-200 w-32 bg-blue-50 text-blue-800">Conta Débito</th>
                <th className="p-3 border-r border-slate-200 w-32 bg-red-50 text-red-800">Conta Crédito</th>
                <th className="p-3 border-r border-slate-200 w-32 bg-orange-50 text-orange-800">Conta IVA</th>
                <th className="p-3 border-r border-slate-200 w-24 text-right">Débito</th>
                <th className="p-3 border-r border-slate-200 w-24 text-right">Crédito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-2 border-r border-slate-200 text-center"><input type="checkbox" checked={entry.selected} onChange={() => toggleSelect(entry.id)}/></td>
                  <td className="p-2 border-r border-slate-200 text-center">{entry.status === 'CLASSIFIED' ? <CheckCircle size={16} className="text-green-500 mx-auto"/> : <AlertTriangle size={16} className="text-yellow-400 mx-auto"/>}</td>
                  <td className="p-2 border-r border-slate-200">{formatDate(entry.date)}</td>
                  <td className="p-2 border-r border-slate-200 font-bold text-slate-700">{entry.docNumber}</td>
                  <td className="p-2 border-r border-slate-200 truncate max-w-[150px]">{entry.entity}</td>
                  <td className="p-2 border-r border-slate-200 text-[10px] text-slate-600 font-medium">{entry.description}</td>
                  <td className="p-0 border-r border-slate-200 bg-blue-50/30"><PgcInput value={entry.debitAccount} onChange={(val) => handleUpdateField(entry.id, 'debitAccount', val)} placeholder="Débito"/></td>
                  <td className="p-0 border-r border-slate-200 bg-red-50/30"><PgcInput value={entry.creditAccount} onChange={(val) => handleUpdateField(entry.id, 'creditAccount', val)} placeholder="Crédito"/></td>
                  <td className="p-0 border-r border-slate-200 bg-orange-50/30"><PgcInput value={entry.ivaAccount} onChange={(val) => handleUpdateField(entry.id, 'ivaAccount', val)} placeholder="IVA"/></td>
                  <td className="p-2 border-r border-slate-200 text-right font-mono">{entry.debitAmount > 0 ? formatCurrency(entry.debitAmount).replace('Kz','') : '-'}</td>
                  <td className="p-2 border-r border-slate-200 text-right font-mono">{entry.creditAmount > 0 ? formatCurrency(entry.creditAmount).replace('Kz','') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClassifyPage;
