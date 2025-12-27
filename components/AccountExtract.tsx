import React, { useState, useMemo } from 'react';
import { PGCAccount, Company, Invoice, OpeningBalance } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { ArrowLeft, Search, X, Edit2, Check } from 'lucide-react';

interface AccountExtractProps {
  company: Company;
  accountCode: string;
  year: number;
  pgcAccounts: PGCAccount[];
  openingBalances: OpeningBalance[];
  invoices: Invoice[];
  onBack: () => void;
  onUpdateAccountCode: (oldCode: string, newCode: string) => void;
  onUpdateBalance: (balance: OpeningBalance) => void; // New prop for saving changes
}

const AccountExtract: React.FC<AccountExtractProps> = ({ 
  company, accountCode, year, pgcAccounts, openingBalances, invoices, onBack, onUpdateAccountCode, onUpdateBalance
}) => {
  const [currentAccountCode, setCurrentAccountCode] = useState(accountCode);
  const [showPgcModal, setShowPgcModal] = useState(false);
  const [pgcSearch, setPgcSearch] = useState('');
  const [editingField, setEditingField] = useState<'MAIN' | string | null>(null); 

  // Get Account Details
  const accountDetails = pgcAccounts.find(a => a.code === currentAccountCode);

  // Generate Movements
  const movements = useMemo(() => {
      const rows: any[] = [];
      let balance = 0;

      // 1. Opening Balance
      const ob = openingBalances.find(b => b.accountCode === currentAccountCode && b.year === year);
      if (ob) {
          const debit = ob.balanceType === 'DEBIT' ? (ob.debit || ob.credit) : 0;
          const credit = ob.balanceType === 'CREDIT' ? (ob.credit || ob.debit) : 0;
          balance += (debit - credit);
          
          rows.push({
              id: ob.id,
              ord: 1,
              num: 1,
              diario: '0000',
              mov: 1,
              dataValor: year,
              dataDoc: year,
              conta: currentAccountCode,
              designacao: ob.description,
              descricao: 'Movimento de Abertura',
              debito: debit,
              credito: credit,
              saldo: balance,
              type: 'OB', // Identifies editable row
              originalObject: ob // Pass original for updates
          });
      }

      // 2. Invoices (Simplified linking logic based on PGC mapping assumption)
      if (currentAccountCode.startsWith('31')) {
          invoices.filter(i => new Date(i.date).getFullYear() === year && i.isCertified).forEach((inv, idx) => {
              const debit = inv.total; 
              const credit = 0;
              balance += (debit - credit);

              rows.push({
                  id: inv.id,
                  ord: rows.length + 1,
                  num: inv.number.split('/')[1] || idx + 2,
                  diario: '0001',
                  mov: idx + 2,
                  dataValor: inv.date,
                  dataDoc: inv.date,
                  conta: currentAccountCode, 
                  designacao: inv.clientName,
                  descricao: `Venda ${inv.number}`,
                  debito: debit,
                  credito: credit,
                  saldo: balance,
                  type: 'INV'
              });
          });
      }

      return rows;
  }, [currentAccountCode, year, openingBalances, invoices]);

  const totalDebit = movements.reduce((acc, m) => acc + m.debito, 0);
  const totalCredit = movements.reduce((acc, m) => acc + m.credito, 0);
  const finalBalance = totalDebit - totalCredit;

  const handleAccountSelect = (acc: PGCAccount) => {
      if (editingField === 'MAIN') {
          setCurrentAccountCode(acc.code);
          onUpdateAccountCode(accountCode, acc.code); 
      } else if (editingField) {
          // If we were editing a specific row's account (not fully implemented in UI but logic placeholder)
      }
      setShowPgcModal(false);
      setEditingField(null);
  };

  const handleUpdateMovement = (original: OpeningBalance, field: keyof OpeningBalance, value: any) => {
      const updated = { ...original, [field]: value };
      // Recalculate balance type if debit/credit changed
      if (field === 'debit' || field === 'credit') {
          updated.balanceType = (updated.debit || 0) > (updated.credit || 0) ? 'DEBIT' : 'CREDIT';
      }
      onUpdateBalance(updated);
  };

  const filteredPgc = pgcAccounts.filter(a => a.code.includes(pgcSearch) || a.description.toLowerCase().includes(pgcSearch.toLowerCase())).slice(0, 50);

  return (
    <div className="bg-slate-100 min-h-screen p-4 flex flex-col font-sans animate-in fade-in">
        <div className="max-w-[1400px] mx-auto w-full bg-white shadow-xl rounded-lg overflow-hidden border border-slate-300">
            
            {/* Top Toolbar */}
            <div className="bg-slate-50 p-2 border-b border-slate-200 flex justify-between items-center print:hidden">
                <button onClick={onBack} className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm font-bold text-slate-700">
                    <ArrowLeft size={16}/> Voltar
                </button>
                <div className="text-xs text-slate-500">Visualização de Extrato de Conta</div>
            </div>

            {/* HEADER SECTION */}
            <div className="bg-gradient-to-b from-gray-100 to-gray-200 p-4 border-b border-slate-400">
                <div className="text-center font-bold text-lg text-slate-900 uppercase mb-4">
                    {company.name}
                </div>
                
                <div className="flex flex-wrap items-end justify-between text-xs gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="border-b border-slate-400 mb-1 pb-1 font-bold text-slate-700">Movimentos da Conta</div>
                        <div 
                            className="text-lg font-bold text-slate-900 cursor-pointer hover:bg-white hover:ring-1 ring-blue-400 rounded px-1 flex items-center gap-2"
                            onClick={() => { setEditingField('MAIN'); setShowPgcModal(true); }}
                        >
                            {currentAccountCode}
                            <Edit2 size={12} className="text-slate-400"/>
                        </div>
                        <div className="text-slate-600 italic">{accountDetails?.description || 'Descrição não encontrada'}</div>
                    </div>

                    <div className="flex-1 text-center min-w-[200px]">
                        <div className="border-b border-slate-400 mb-1 pb-1 font-bold text-slate-700">Periodo Contabilistico</div>
                        <div className="text-sm font-mono">{`01-01-${year}  a  31-12-${year}`}</div>
                    </div>

                    <div className="flex gap-8 text-right">
                        <div>
                            <div className="border-b border-slate-400 mb-1 pb-1 font-bold text-slate-700">Total Débitos</div>
                            <div className="text-sm font-mono">{formatCurrency(totalDebit).replace('Kz','')}</div>
                        </div>
                        <div>
                            <div className="border-b border-slate-400 mb-1 pb-1 font-bold text-slate-700">Total Creditos</div>
                            <div className="text-sm font-mono">{formatCurrency(totalCredit).replace('Kz','')}</div>
                        </div>
                        <div>
                            <div className="border-b border-slate-400 mb-1 pb-1 font-bold text-slate-700">Saldo</div>
                            <div className="text-sm font-mono font-bold text-slate-900">{formatCurrency(finalBalance).replace('Kz','')}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DETAILED TABLE */}
            <div className="p-4">
                <h3 className="text-right font-bold text-xs uppercase mb-1">Extrato detalhado de conta</h3>
                <div className="border-t-2 border-black">
                    <table className="w-full text-[10px] text-left">
                        <thead>
                            <tr className="border-b border-black font-bold uppercase text-slate-700">
                                <th className="py-1">Ord</th>
                                <th className="py-1">Num</th>
                                <th className="py-1">Diario</th>
                                <th className="py-1">Mov</th>
                                <th className="py-1">Data Valor</th>
                                <th className="py-1">Data Doc.</th>
                                <th className="py-1 text-blue-800">Conta</th>
                                <th className="py-1">Designação</th>
                                <th className="py-1">Descrição</th>
                                <th className="py-1 text-right w-24">Debito</th>
                                <th className="py-1 text-right w-24">Credito</th>
                                <th className="py-1 text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {movements.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-1 font-mono text-slate-500">{row.ord}</td>
                                    <td className="py-1">{row.num}</td>
                                    <td className="py-1">{row.diario}</td>
                                    <td className="py-1">{row.mov}</td>
                                    <td className="py-1">{typeof row.dataValor === 'number' ? row.dataValor : formatDate(row.dataValor)}</td>
                                    <td className="py-1">{typeof row.dataDoc === 'number' ? row.dataDoc : formatDate(row.dataDoc)}</td>
                                    <td className="py-1 text-blue-700 font-bold">{row.conta}</td>
                                    <td className="py-1">
                                        {row.type === 'OB' ? (
                                            <input 
                                                className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none"
                                                value={row.designacao}
                                                onChange={(e) => handleUpdateMovement(row.originalObject, 'description', e.target.value)}
                                            />
                                        ) : (
                                            <span className="truncate max-w-[150px] block" title={row.designacao}>{row.designacao}</span>
                                        )}
                                    </td>
                                    <td className="py-1 truncate max-w-[200px]">{row.descricao}</td>
                                    
                                    {/* Editable Debit/Credit for OB type */}
                                    <td className="py-1 text-right font-mono">
                                        {row.type === 'OB' ? (
                                            <input 
                                                type="number"
                                                className="w-full text-right bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none font-bold"
                                                value={row.debito}
                                                onChange={(e) => handleUpdateMovement(row.originalObject, 'debit', Number(e.target.value))}
                                            />
                                        ) : (
                                            formatCurrency(row.debito).replace('Kz','')
                                        )}
                                    </td>
                                    <td className="py-1 text-right font-mono">
                                        {row.type === 'OB' ? (
                                            <input 
                                                type="number"
                                                className="w-full text-right bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none font-bold"
                                                value={row.credito}
                                                onChange={(e) => handleUpdateMovement(row.originalObject, 'credit', Number(e.target.value))}
                                            />
                                        ) : (
                                            formatCurrency(row.credito).replace('Kz','')
                                        )}
                                    </td>
                                    
                                    <td className="py-1 text-right font-mono font-bold text-slate-900">
                                        {formatCurrency(row.saldo).replace('Kz','')} {row.saldo >= 0 ? 'D' : 'C'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t-2 border-black font-bold bg-slate-50">
                            <tr>
                                <td colSpan={12} className="py-1 text-right text-slate-500 italic">Fim de Listagem</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>

        {/* PGC SELECTION MODAL */}
        {showPgcModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-md h-[500px] flex flex-col animate-in zoom-in-95">
                    <div className="p-4 border-b bg-slate-100 flex justify-between items-center rounded-t-lg">
                        <h3 className="font-bold text-slate-800">Selecionar Conta PGC</h3>
                        <button onClick={() => setShowPgcModal(false)}><X size={20}/></button>
                    </div>
                    <div className="p-2 border-b">
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
                                className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center text-sm group"
                                onClick={() => handleAccountSelect(acc)}
                            >
                                <div>
                                    <span className="font-bold text-blue-700 mr-2">{acc.code}</span>
                                    <span className="text-slate-700">{acc.description}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase hidden group-hover:block">Selecionar</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default AccountExtract;