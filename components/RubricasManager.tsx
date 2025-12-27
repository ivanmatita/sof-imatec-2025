import React, { useState, useMemo } from 'react';
import { Invoice, PGCAccount, Purchase, PurchaseItem } from '../types';
import { formatDate, formatCurrency } from '../utils';
import { Search, Check, ListTree } from 'lucide-react';

interface RubricasManagerProps {
  invoices: Invoice[];
  purchases?: Purchase[]; // Added for Purchase Mode
  pgcAccounts: PGCAccount[];
  onUpdateInvoice: (invoice: Invoice) => void;
  onUpdatePurchase?: (purchase: Purchase) => void; // Added for Purchase Mode
  mode?: 'SALES' | 'PURCHASES'; // New Mode Prop
}

interface MovementRow {
  uniqueId: string;
  parentId: string; // Invoice or Purchase ID
  itemId: string;
  date: string;
  docNumber: string;
  entity: string;
  rubrica: string;
  article: string;
  quantity: number;
  unit: string;
  unitValue: number;
  total: number;
}

const RubricasManager: React.FC<RubricasManagerProps> = ({ invoices, purchases = [], pgcAccounts, onUpdateInvoice, onUpdatePurchase, mode = 'SALES' }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGlobalRubrica, setSelectedGlobalRubrica] = useState('');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showGlobalDropdown, setShowGlobalDropdown] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredGlobalAccounts = useMemo(() => {
      return pgcAccounts.filter(a => 
          (a.code.includes(globalSearchTerm) || a.description.toLowerCase().includes(globalSearchTerm.toLowerCase()))
      ).slice(0, 50);
  }, [pgcAccounts, globalSearchTerm]);

  const movements: MovementRow[] = useMemo(() => {
      const rows: MovementRow[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (mode === 'SALES') {
          invoices.forEach(inv => {
              const d = new Date(inv.date);
              if (d >= start && d <= end && inv.status !== 'CANCELLED') {
                  inv.items.forEach(item => {
                      const defaultRubrica = item.rubrica || (item.type === 'PRODUCT' ? '61.1' : '62.1');
                      rows.push({
                          uniqueId: `${inv.id}-${item.id}`,
                          parentId: inv.id,
                          itemId: item.id,
                          date: inv.date,
                          docNumber: inv.number,
                          entity: inv.clientName,
                          rubrica: defaultRubrica,
                          article: item.description,
                          quantity: item.quantity,
                          unit: item.type === 'PRODUCT' ? 'Un' : 'Mês',
                          unitValue: item.unitPrice,
                          total: item.total
                      });
                  });
              }
          });
      } else {
          // PURCHASES MODE
          purchases.forEach(pur => {
              const d = new Date(pur.date);
              if (d >= start && d <= end && pur.status !== 'PENDING') {
                  pur.items.forEach(item => {
                      // Default rubrica for purchases (Cost or Asset)
                      const defaultRubrica = item.rubrica || '71.1'; 
                      rows.push({
                          uniqueId: `${pur.id}-${item.id}`,
                          parentId: pur.id,
                          itemId: item.id,
                          date: pur.date,
                          docNumber: pur.documentNumber,
                          entity: pur.supplier,
                          rubrica: defaultRubrica,
                          article: item.description,
                          quantity: item.quantity,
                          unit: 'Un',
                          unitValue: item.unitPrice,
                          total: item.total
                      });
                  });
              }
          });
      }
      return rows.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, purchases, startDate, endDate, mode]);

  const totalValue = movements.reduce((sum, m) => sum + m.total, 0);

  const handleUpdateRubrica = (parentId: string, itemId: string, newCode: string) => {
      if (mode === 'SALES') {
          const invoice = invoices.find(i => i.id === parentId);
          if (!invoice) return;
          const updatedItems = invoice.items.map(item => item.id === itemId ? { ...item, rubrica: newCode } : item);
          onUpdateInvoice({ ...invoice, items: updatedItems });
      } else {
          const purchase = purchases.find(p => p.id === parentId);
          if (!purchase || !onUpdatePurchase) return;
          const updatedItems = purchase.items.map(item => item.id === itemId ? { ...item, rubrica: newCode } : item);
          onUpdatePurchase({ ...purchase, items: updatedItems });
      }
  };

  const handleGlobalSelect = (account: PGCAccount) => {
      setSelectedGlobalRubrica(account.code);
      setGlobalSearchTerm(`${account.code} - ${account.description}`);
      setShowGlobalDropdown(false);
  };

  const handleApplyGlobalRubrica = () => {
      if (!selectedGlobalRubrica) return alert("Selecione uma conta PGC primeiro.");
      if (selectedIds.size === 0) return alert("Selecione movimentos na lista.");

      if(confirm(`Aplicar conta ${selectedGlobalRubrica} a ${selectedIds.size} movimentos selecionados?`)) {
          // Group by parent ID to batch updates per document
          const updatesMap = new Map<string, string[]>();
          
          selectedIds.forEach(uniqueId => {
              const [parentId, itemId] = uniqueId.split('-');
              if (!updatesMap.has(parentId)) updatesMap.set(parentId, []);
              updatesMap.get(parentId)?.push(itemId);
          });

          // Perform Updates
          updatesMap.forEach((itemIds, parentId) => {
              if (mode === 'SALES') {
                  const invoice = invoices.find(i => i.id === parentId);
                  if (invoice) {
                      const updatedItems = invoice.items.map(item => itemIds.includes(item.id) ? { ...item, rubrica: selectedGlobalRubrica } : item);
                      onUpdateInvoice({ ...invoice, items: updatedItems });
                  }
              } else {
                  const purchase = purchases.find(p => p.id === parentId);
                  if (purchase && onUpdatePurchase) {
                      const updatedItems = purchase.items.map(item => itemIds.includes(item.id) ? { ...item, rubrica: selectedGlobalRubrica } : item);
                      onUpdatePurchase({ ...purchase, items: updatedItems });
                  }
              }
          });
          
          setSelectedIds(new Set());
          alert("Atualização concluída com sucesso!");
      }
  };

  const toggleSelection = (uniqueId: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(uniqueId)) newSet.delete(uniqueId);
      else newSet.add(uniqueId);
      setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === movements.length) {
          setSelectedIds(new Set());
      } else {
          const newSet = new Set<string>();
          movements.forEach(m => newSet.add(m.uniqueId));
          setSelectedIds(newSet);
      }
  };

  const RowRubricaSelector = ({ currentRubrica, onChange }: { currentRubrica: string, onChange: (code: string) => void }) => {
      const [term, setTerm] = useState(currentRubrica);
      const [show, setShow] = useState(false);
      const filtered = pgcAccounts.filter(a => a.code.startsWith(term) || a.description.toLowerCase().includes(term.toLowerCase())).slice(0, 10); 

      return (
          <div className="relative">
              <input 
                  className="w-full bg-transparent border-b border-dashed border-slate-400 focus:border-blue-600 outline-none text-xs font-bold text-center"
                  value={term}
                  onFocus={() => setShow(true)}
                  onChange={(e) => setTerm(e.target.value)}
                  onBlur={() => setTimeout(() => setShow(false), 200)}
              />
              {show && filtered.length > 0 && (
                  <div className="absolute top-full left-0 w-64 bg-white border border-slate-300 shadow-xl z-50 max-h-48 overflow-y-auto rounded-md">
                      {filtered.map(acc => (
                          <div 
                              key={acc.id} 
                              className="p-2 hover:bg-blue-50 cursor-pointer text-xs flex flex-col border-b border-slate-100 last:border-0"
                              onMouseDown={() => { setTerm(acc.code); onChange(acc.code); setShow(false); }}
                          >
                              <span className="font-bold text-blue-800">{acc.code}</span>
                              <span className="text-slate-600 truncate">{acc.description}</span>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in">
        <div className={`bg-gradient-to-b ${mode === 'SALES' ? 'from-blue-50 to-blue-100' : 'from-orange-50 to-orange-100'} border-b border-slate-300 p-2 shadow-sm`}>
            <h1 className={`text-center font-bold ${mode === 'SALES' ? 'text-blue-800' : 'text-orange-800'} text-sm uppercase flex items-center justify-center gap-2`}>
                <ListTree size={16}/> Ajustamento de Rubricas - {mode === 'SALES' ? 'VENDAS' : 'COMPRAS'}
            </h1>
        </div>

        <div className="bg-white p-4 border-b border-slate-200 flex flex-wrap gap-6 items-end text-xs">
            <div className="flex flex-col gap-1">
                <span className="font-bold text-slate-600">Período</span>
                <div className="flex gap-2">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-1 rounded bg-slate-50"/>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-1 rounded bg-slate-50"/>
                </div>
            </div>

            <div className="flex-1 min-w-[300px] relative bg-slate-50 p-2 rounded border border-slate-200">
                <label className="block font-bold text-slate-700 mb-1">Aplicação em Massa ({selectedIds.size} selecionados):</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            className="w-full p-2 border border-slate-300 rounded shadow-sm focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="Pesquisar Conta PGC..."
                            value={globalSearchTerm}
                            onChange={(e) => { setGlobalSearchTerm(e.target.value); setShowGlobalDropdown(true); }}
                            onFocus={() => setShowGlobalDropdown(true)}
                            onBlur={() => setTimeout(() => setShowGlobalDropdown(false), 200)}
                        />
                        <Search className="absolute right-2 top-2.5 text-slate-400" size={14}/>
                        
                        {showGlobalDropdown && filteredGlobalAccounts.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white border border-slate-300 shadow-xl z-50 max-h-60 overflow-y-auto rounded-b-md mt-1">
                                {filteredGlobalAccounts.map(acc => (
                                    <div key={acc.id} className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0" onMouseDown={() => handleGlobalSelect(acc)}>
                                        <div className="font-bold text-blue-800">{acc.code}</div>
                                        <div className="text-slate-600 text-[10px]">{acc.description}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={handleApplyGlobalRubrica}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded font-bold border border-blue-700 flex items-center gap-2 shadow-sm"
                    >
                        <Check size={16}/> AJUSTAR
                    </button>
                </div>
            </div>

            <div className="text-right ml-auto">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Total Movimentos</div>
                <div className="flex gap-8 border-t border-slate-800 pt-1">
                    <span className="font-mono text-lg font-bold text-slate-800">{formatCurrency(totalValue).replace('Kz','')}</span>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-auto bg-white">
            <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 sticky top-0 z-10 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                        <th className="p-2 w-8 text-center border-r border-slate-300">
                            <input type="checkbox" checked={movements.length > 0 && selectedIds.size === movements.length} onChange={toggleSelectAll} className="rounded border-slate-400"/>
                        </th>
                        <th className="p-2 w-20 border-r border-slate-300">Data</th>
                        <th className="p-2 w-24 border-r border-slate-300">Doc No</th>
                        <th className="p-2 w-48 border-r border-slate-300">{mode === 'SALES' ? 'Cliente' : 'Fornecedor'}</th>
                        <th className="p-2 w-32 text-center border-r border-slate-300 bg-yellow-50 text-yellow-900 border-b-2 border-yellow-300">Rubrica (Editável)</th>
                        <th className="p-2 min-w-[200px] border-r border-slate-300">Artigo / Descrição</th>
                        <th className="p-2 w-16 text-center border-r border-slate-300">Qtd</th>
                        <th className="p-2 w-16 text-center border-r border-slate-300">Unid</th>
                        <th className="p-2 w-24 text-right border-r border-slate-300">Valor Unit</th>
                        <th className="p-2 w-24 text-right border-r border-slate-300">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {movements.map((row) => (
                        <tr key={row.uniqueId} className={`hover:bg-blue-50 group ${selectedIds.has(row.uniqueId) ? 'bg-blue-50' : ''}`}>
                            <td className="p-2 text-center border-r border-slate-100">
                                <input type="checkbox" checked={selectedIds.has(row.uniqueId)} onChange={() => toggleSelection(row.uniqueId)} className="rounded border-slate-300"/>
                            </td>
                            <td className="p-2 border-r border-slate-100">{formatDate(row.date)}</td>
                            <td className="p-2 border-r border-slate-100 font-medium">{row.docNumber}</td>
                            <td className="p-2 border-r border-slate-100 truncate max-w-[150px]" title={row.entity}>{row.entity}</td>
                            <td className="p-2 border-r border-slate-100 bg-yellow-50/50">
                                <RowRubricaSelector 
                                    currentRubrica={row.rubrica} 
                                    onChange={(newCode) => handleUpdateRubrica(row.parentId, row.itemId, newCode)} 
                                />
                            </td>
                            <td className="p-2 border-r border-slate-100 truncate max-w-[200px]" title={row.article}>{row.article}</td>
                            <td className="p-2 text-center border-r border-slate-100">{row.quantity}</td>
                            <td className="p-2 text-center border-r border-slate-100">{row.unit}</td>
                            <td className="p-2 text-right border-r border-slate-100">{formatCurrency(row.unitValue).replace('Kz','')}</td>
                            <td className="p-2 text-right font-bold border-r border-slate-100 text-slate-700">{formatCurrency(row.total).replace('Kz','')}</td>
                        </tr>
                    ))}
                    {movements.length === 0 && (
                        <tr><td colSpan={10} className="p-10 text-center text-slate-400 italic">Sem movimentos para o período selecionado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default RubricasManager;