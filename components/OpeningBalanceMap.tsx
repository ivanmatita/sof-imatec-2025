import React, { useState, useMemo, useEffect } from 'react';
import { OpeningBalance, PGCAccount } from '../types';
import { formatCurrency, generateId } from '../utils';
import { Save, Plus, Trash2, ArrowLeft, Eye, Search, X, Check } from 'lucide-react';

interface OpeningBalanceMapProps {
  accounts: PGCAccount[];
  savedBalances: OpeningBalance[];
  onSaveBalances: (balances: OpeningBalance[]) => void;
  onBack: () => void;
  onViewAccount: (accountCode: string) => void; 
}

const OpeningBalanceMap: React.FC<OpeningBalanceMapProps> = ({ accounts, savedBalances, onSaveBalances, onBack, onViewAccount }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showPgcModal, setShowPgcModal] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [pgcSearch, setPgcSearch] = useState('');
  
  // Local state for editing rows
  const [rows, setRows] = useState<Partial<OpeningBalance>[]>([]);

  // Sync rows with savedBalances whenever year or savedBalances prop changes
  useEffect(() => {
      const existing = savedBalances.filter(b => b.year === year);
      if (existing.length > 0) {
          setRows(existing);
      } else {
          // Default empty structure if no data exists
          setRows([
              { id: generateId(), accountCode: '11', description: 'Imobilizações Corpóreas', debit: 0, credit: 0 },
              { id: generateId(), accountCode: '31.1', description: 'Clientes Conta Corrente', debit: 0, credit: 0 },
              { id: generateId(), accountCode: '32.1', description: 'Fornecedores Conta Corrente', debit: 0, credit: 0 },
              { id: generateId(), accountCode: '34.5', description: 'Estado (IVA)', debit: 0, credit: 0 },
              { id: generateId(), accountCode: '43', description: 'Depósitos à Ordem', debit: 0, credit: 0 },
              { id: generateId(), accountCode: '45', description: 'Caixa', debit: 0, credit: 0 },
              { id: generateId(), accountCode: '51', description: 'Capital Social', debit: 0, credit: 0 },
              { id: generateId(), accountCode: '81', description: 'Resultados Transitados', debit: 0, credit: 0 },
          ]);
      }
  }, [year, savedBalances]);

  const handleRowChange = (id: string, field: keyof OpeningBalance, value: any) => {
      setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleAccountSelect = (acc: PGCAccount) => {
      if (activeRowId) {
          setRows(prev => prev.map(r => r.id === activeRowId ? { ...r, accountCode: acc.code, description: acc.description } : r));
          setShowPgcModal(false);
          setActiveRowId(null);
      }
  };

  const openPgcPicker = (rowId: string) => {
      setActiveRowId(rowId);
      setPgcSearch('');
      setShowPgcModal(true);
  };

  const handleAddRow = () => {
      const newId = generateId();
      setRows([...rows, { id: newId, accountCode: '', description: '', debit: 0, credit: 0 }]);
  };

  const handleDeleteRow = (id: string) => {
      setRows(rows.filter(r => r.id !== id));
  };

  const handleSave = () => {
      const totalDebit = rows.reduce((acc, r) => acc + (r.debit || 0), 0);
      const totalCredit = rows.reduce((acc, r) => acc + (r.credit || 0), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
          alert(`O Balancete não está quadrado!\nDébito: ${totalDebit}\nCrédito: ${totalCredit}\nDiferença: ${totalDebit - totalCredit}`);
          return;
      }

      const validRows = rows.filter(r => r.accountCode && ((r.debit || 0) > 0 || (r.credit || 0) > 0)).map(r => ({
          ...r,
          year,
          balanceType: (r.debit || 0) > (r.credit || 0) ? 'DEBIT' : 'CREDIT'
      } as OpeningBalance));

      onSaveBalances(validRows);
      alert("Balancete de Abertura registado com sucesso! Os movimentos foram lançados na contabilidade.");
  };

  const totalDebit = rows.reduce((acc, r) => acc + (r.debit || 0), 0);
  const totalCredit = rows.reduce((acc, r) => acc + (r.credit || 0), 0);
  const difference = totalDebit - totalCredit;

  const filteredPgc = useMemo(() => {
      if (!pgcSearch) return accounts.slice(0, 50);
      return accounts.filter(a => a.code.includes(pgcSearch) || a.description.toLowerCase().includes(pgcSearch.toLowerCase())).slice(0, 50);
  }, [accounts, pgcSearch]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 animate-in fade-in relative">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full"><ArrowLeft size={24}/></button>
                    <div>
                        <h1 className="text-xl font-bold">Balancete de Abertura (Saldos Iniciais)</h1>
                        <p className="text-slate-400 text-xs">Registo de movimentos de anos anteriores (Lei Fiscal Angola)</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-800 px-4 py-2 rounded-lg">
                        <label className="text-xs text-slate-400 uppercase font-bold block">Ano de Abertura</label>
                        <select className="bg-transparent font-bold text-lg outline-none cursor-pointer" value={year} onChange={e => setYear(Number(e.target.value))}>
                            <option value={2023}>2023</option>
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                        </select>
                    </div>
                    <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg transition transform hover:-translate-y-0.5">
                        <Save size={18}/> Salvar Balancete
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="p-6">
                <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-3 border-b w-10 text-center">Ver</th>
                            <th className="p-3 border-b text-left w-40">Conta</th>
                            <th className="p-3 border-b text-left">Descrição</th>
                            <th className="p-3 border-b text-right w-40">Débito</th>
                            <th className="p-3 border-b text-right w-40">Crédito</th>
                            <th className="p-3 border-b text-right w-40 bg-slate-200">Saldo</th>
                            <th className="p-3 border-b w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((row, idx) => {
                            const bal = (row.debit || 0) - (row.credit || 0);
                            return (
                                <tr key={row.id || idx} className="hover:bg-slate-50 group">
                                    <td className="p-2 text-center">
                                        <button 
                                            onClick={() => row.accountCode && onViewAccount(row.accountCode)}
                                            className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50"
                                            title="Ver Extrato Detalhado da Conta"
                                            disabled={!row.accountCode}
                                        >
                                            <Eye size={18}/>
                                        </button>
                                    </td>
                                    <td className="p-2 border-r relative">
                                        <input 
                                            className="w-full p-1 border rounded bg-slate-50 font-mono text-xs cursor-pointer hover:border-blue-400" 
                                            value={row.accountCode} 
                                            onClick={() => openPgcPicker(row.id!)}
                                            readOnly
                                            placeholder="Clique para selecionar"
                                        />
                                    </td>
                                    <td className="p-2 border-r">
                                        <input 
                                            className="w-full p-1 border rounded bg-white" 
                                            value={row.description} 
                                            onChange={e => handleRowChange(row.id!, 'description', e.target.value)}
                                            placeholder="Descrição da conta"
                                        />
                                    </td>
                                    <td className="p-2 border-r">
                                        <input 
                                            type="number"
                                            className="w-full p-1 border rounded text-right font-mono" 
                                            value={row.debit} 
                                            onChange={e => handleRowChange(row.id!, 'debit', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="p-2 border-r">
                                        <input 
                                            type="number"
                                            className="w-full p-1 border rounded text-right font-mono" 
                                            value={row.credit} 
                                            onChange={e => handleRowChange(row.id!, 'credit', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="p-2 border-r text-right font-bold text-slate-700 bg-slate-50">
                                        {formatCurrency(bal).replace('Kz', '')}
                                    </td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => handleDeleteRow(row.id!)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            );
                        })}
                        <tr>
                            <td colSpan={7} className="p-2">
                                <button onClick={handleAddRow} className="text-blue-600 font-bold text-xs flex items-center gap-1 hover:underline">
                                    <Plus size={14}/> Adicionar Linha
                                </button>
                            </td>
                        </tr>
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                        <tr>
                            <td colSpan={3} className="p-3 text-right uppercase">Totais</td>
                            <td className="p-3 text-right text-blue-800">{formatCurrency(totalDebit)}</td>
                            <td className="p-3 text-right text-green-800">{formatCurrency(totalCredit)}</td>
                            <td className={`p-3 text-right ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                                {Math.abs(difference) < 0.01 ? 'QUADRADO' : `Dif: ${formatCurrency(difference)}`}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        {/* PGC Modal */}
        {showPgcModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg h-[600px] flex flex-col animate-in zoom-in-95">
                    <div className="p-4 border-b bg-slate-100 rounded-t-xl flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Selecionar Conta PGC</h3>
                        <button onClick={() => setShowPgcModal(false)}><X size={20}/></button>
                    </div>
                    <div className="p-3 border-b bg-white">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                            <input 
                                className="w-full pl-9 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                placeholder="Pesquisar código ou descrição..."
                                value={pgcSearch}
                                onChange={e => setPgcSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {filteredPgc.map(acc => (
                            <div 
                                key={acc.id} 
                                className="flex items-center justify-between p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 group"
                                onClick={() => handleAccountSelect(acc)}
                            >
                                <div>
                                    <div className="font-bold text-blue-700">{acc.code}</div>
                                    <div className="text-xs text-slate-600">{acc.description}</div>
                                </div>
                                {activeRowId && (
                                    <div className="hidden group-hover:block text-blue-600">
                                        <Check size={16}/>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default OpeningBalanceMap;