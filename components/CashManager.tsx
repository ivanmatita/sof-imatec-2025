
import React, { useState, useEffect } from 'react';
import { CashRegister, CashMovement, Invoice, Purchase, InvoiceStatus, User } from '../types';
import { formatCurrency, formatDate, generateId } from '../utils';
import { CreditCard, Plus, ArrowRightLeft, TrendingUp, TrendingDown, DollarSign, Wallet, Calendar, Search, Filter, Edit2, X, User as UserIcon, AlertCircle, RefreshCw, Save } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface CashManagerProps {
  cashRegisters: CashRegister[];
  onUpdateCashRegister: (cr: CashRegister) => void;
  movements: CashMovement[];
  onAddMovement: (m: CashMovement) => void;
  invoices: Invoice[];
  purchases: Purchase[];
}

const CashManager: React.FC<CashManagerProps> = ({ cashRegisters: propRegisters, onUpdateCashRegister, movements, onAddMovement, invoices, purchases }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'REGISTERS' | 'OPERATIONS' | 'HISTORY'>('DASHBOARD');
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [dbRegisters, setDbRegisters] = useState<CashRegister[]>([]);
  
  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingRegister, setEditingRegister] = useState<Partial<CashRegister>>({});
  
  const [showOperationModal, setShowOperationModal] = useState(false);
  const [operationType, setOperationType] = useState<'ENTRY' | 'EXIT' | 'TRANSFER'>('ENTRY');
  const [opAmount, setOpAmount] = useState<number>(0);
  const [opDesc, setOpDesc] = useState('');
  const [opSourceId, setOpSourceId] = useState('');
  const [opTargetId, setOpTargetId] = useState('');

  // Fetch Cloud Data on Mount
  useEffect(() => {
      fetchCloudData();
  }, []);

  async function fetchCloudData() {
      setIsLoadingCloud(true);
      try {
          // 1. Fetch Users for the responsible selector
          const { data: usersData } = await supabase.from('utilizadores').select('id, nome, utilizador');
          if (usersData) setSystemUsers(usersData);

          // 2. Fetch Registers
          const { data: regsData, error: regsError } = await supabase
            .from('caixas')
            .select('*')
            .order('created_at', { ascending: false });

          if (regsError) {
              console.error("Schema Cache Error / Fetch Error:", regsError.message);
          } else if (regsData) {
              const mapped: CashRegister[] = regsData.map(r => ({
                  id: r.id,
                  name: r.titulo,
                  status: r.status as any,
                  operatorId: r.responsavel_id,
                  initialBalance: Number(r.saldo_abertura || 0),
                  balance: Number(r.balance || 0),
                  notes: r.observacoes
              }));
              setDbRegisters(mapped);
          }
      } catch (err) {
          console.error("Supabase Connection Error:", err);
      } finally {
          setIsLoadingCloud(false);
      }
  }

  // Merge Prop registers and DB registers
  const cashRegisters = [...dbRegisters, ...propRegisters].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  // Automatic movements from Sales/Purchases
  const salesMovements: CashMovement[] = invoices
    .filter(i => i.status === InvoiceStatus.PAID && i.paymentMethod && i.cashRegisterId)
    .map(i => ({
        id: `sale-${i.id}`,
        date: i.date,
        type: 'ENTRY',
        amount: i.currency === 'AOA' ? i.total : i.contraValue || i.total,
        description: `Venda ${i.type} ${i.number}`,
        cashRegisterId: i.cashRegisterId!,
        documentRef: i.number,
        operatorName: i.operatorName || 'System',
        source: 'SALES'
    }));

  const purchaseMovements: CashMovement[] = purchases
    .filter(p => p.status === 'PAID' && p.paymentMethod && p.cashRegisterId)
    .map(p => ({
        id: `purch-${p.id}`,
        date: p.date,
        type: 'EXIT',
        amount: p.total,
        description: `Pagamento Compra ${p.documentNumber}`,
        cashRegisterId: p.cashRegisterId!,
        documentRef: p.documentNumber,
        operatorName: 'System',
        source: 'PURCHASES'
    }));

  const allMovements = [...movements, ...salesMovements, ...purchaseMovements].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSaveRegister = async () => {
      if (!editingRegister.name) return alert("Título da Caixa é obrigatório");
      
      setIsLoadingCloud(true);
      const isNew = !editingRegister.id;
      const regId = editingRegister.id || generateId();
      
      const payload = {
          titulo: editingRegister.name,
          responsavel_id: editingRegister.operatorId,
          status: editingRegister.status || 'CLOSED',
          saldo_abertura: Number(editingRegister.initialBalance || 0),
          balance: isNew ? Number(editingRegister.initialBalance || 0) : Number(editingRegister.balance || 0),
          observacoes: editingRegister.notes,
          empresa_id: '00000000-0000-0000-0000-000000000001'
      };

      try {
          const { error } = await supabase
            .from('caixas')
            .upsert(isNew ? payload : { ...payload, id: regId });

          if (error) throw error;

          const updated: CashRegister = {
              id: regId,
              name: editingRegister.name!,
              status: editingRegister.status || 'CLOSED',
              balance: payload.balance,
              initialBalance: payload.saldo_abertura,
              operatorId: editingRegister.operatorId,
              notes: editingRegister.notes
          };
          
          onUpdateCashRegister(updated);
          await fetchCloudData();
          setShowRegisterModal(false);
          setEditingRegister({});
          alert("Caixa salvo com sucesso na Cloud!");
      } catch (err: any) {
          alert("Erro ao salvar na Cloud: " + err.message);
      } finally {
          setIsLoadingCloud(false);
      }
  };

  const handleOperation = () => {
      if (opAmount <= 0) return alert("Valor inválido");
      if (!opSourceId) return alert("Selecione caixa de origem/destino");
      if (operationType === 'TRANSFER' && !opTargetId) return alert("Selecione caixa de destino");

      const movement: CashMovement = {
          id: generateId(),
          date: new Date().toISOString(),
          type: operationType === 'TRANSFER' ? 'TRANSFER_OUT' : operationType,
          amount: opAmount,
          description: opDesc || (operationType === 'ENTRY' ? 'Reforço de Caixa' : operationType === 'EXIT' ? 'Saída de Caixa' : 'Transferência'),
          cashRegisterId: opSourceId,
          targetCashRegisterId: opTargetId,
          operatorName: 'Admin',
          source: 'MANUAL'
      };
      onAddMovement(movement);

      const sourceReg = cashRegisters.find(c => c.id === opSourceId);
      if (sourceReg) {
          const newBalance = operationType === 'ENTRY' ? sourceReg.balance + opAmount : sourceReg.balance - opAmount;
          onUpdateCashRegister({ ...sourceReg, balance: newBalance });
      }

      if (operationType === 'TRANSFER') {
          const targetReg = cashRegisters.find(c => c.id === opTargetId);
          if (targetReg) {
              onUpdateCashRegister({ ...targetReg, balance: targetReg.balance + opAmount });
              onAddMovement({
                  id: generateId(),
                  date: new Date().toISOString(),
                  type: 'TRANSFER_IN',
                  amount: opAmount,
                  description: `Transf. de ${sourceReg?.name}`,
                  cashRegisterId: opTargetId,
                  operatorName: 'Admin',
                  source: 'MANUAL'
              });
          }
      }

      setShowOperationModal(false);
      setOpAmount(0);
      setOpDesc('');
  };

  const getTotalBalance = () => cashRegisters.reduce((acc, c) => acc + c.balance, 0);

  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in pb-20">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Wallet/> Gestão de Caixa {isLoadingCloud && <RefreshCw size={16} className="animate-spin text-blue-500"/>}</h1>
                <p className="text-xs text-slate-500">Controlo de tesouraria e movimentos Cloud</p>
            </div>
            <div className="flex gap-2">
                {['DASHBOARD', 'REGISTERS', 'OPERATIONS', 'HISTORY'].map(t => (
                    <button 
                        key={t}
                        onClick={() => setActiveTab(t as any)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm border transition ${activeTab === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {t === 'DASHBOARD' ? 'Visão Geral' : t === 'REGISTERS' ? 'Caixas' : t === 'OPERATIONS' ? 'Operações' : 'Movimentos'}
                    </button>
                ))}
            </div>
        </div>

        {activeTab === 'DASHBOARD' && (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-xs uppercase font-bold">Saldo Total (Todas Caixas)</p>
                            <h2 className="text-3xl font-black text-blue-600">{formatCurrency(getTotalBalance())}</h2>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Wallet size={32}/></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-xs uppercase font-bold">Entradas Hoje</p>
                            <h2 className="text-2xl font-bold text-emerald-600">
                                {formatCurrency(allMovements.filter(m => (m.type === 'ENTRY' || m.type === 'TRANSFER_IN') && new Date(m.date).toDateString() === new Date().toDateString()).reduce((a, b) => a + b.amount, 0))}
                            </h2>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={24}/></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 text-xs uppercase font-bold">Saídas Hoje</p>
                            <h2 className="text-2xl font-bold text-red-600">
                                {formatCurrency(allMovements.filter(m => (m.type === 'EXIT' || m.type === 'TRANSFER_OUT') && new Date(m.date).toDateString() === new Date().toDateString()).reduce((a, b) => a + b.amount, 0))}
                            </h2>
                        </div>
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg"><TrendingDown size={24}/></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Saldos por Caixa</h3>
                        <div className="space-y-3">
                            {cashRegisters.map(c => (
                                <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${c.status === 'OPEN' ? 'bg-green-500' : c.status === 'SUSPENDED' ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-700">{c.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase">
                                                {c.status === 'OPEN' ? 'Aberto' : c.status === 'SUSPENDED' ? 'Suspenso' : 'Fechado'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-mono font-bold text-slate-800">{formatCurrency(c.balance)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Últimos Movimentos</h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {allMovements.slice(0, 5).map(m => (
                                <div key={m.id} className="flex justify-between items-center text-xs p-2 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                    <div className="flex items-center gap-2">
                                        {m.type.includes('ENTRY') || m.type.includes('IN') ? <TrendingUp size={14} className="text-green-500"/> : <TrendingDown size={14} className="text-red-500"/>}
                                        <div>
                                            <p className="font-bold text-slate-700">{m.description}</p>
                                            <p className="text-slate-400">{formatDate(m.date)}</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold ${m.type.includes('ENTRY') || m.type.includes('IN') ? 'text-green-600' : 'text-red-600'}`}>
                                        {m.type.includes('ENTRY') || m.type.includes('IN') ? '+' : '-'} {formatCurrency(m.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'REGISTERS' && (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <button onClick={() => { setEditingRegister({ status: 'CLOSED', initialBalance: 0 }); setShowRegisterModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold hover:bg-blue-700 shadow-lg">
                        <Plus size={16}/> Criar Caixa Cloud
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {cashRegisters.map(c => (
                        <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-slate-800">{c.name}</h3>
                                <button onClick={() => { setEditingRegister(c); setShowRegisterModal(true); }} className="text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                            </div>
                            <div className="mb-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${c.status === 'OPEN' ? 'bg-green-100 text-green-700' : c.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                    {c.status === 'OPEN' ? 'CAIXA ABERTO' : c.status === 'SUSPENDED' ? 'CAIXA SUSPENSO' : 'CAIXA FECHADO'}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 mb-4 line-clamp-2 italic h-8">{c.notes || 'Sem observações.'}</div>
                            <div className="flex justify-between items-end border-t pt-4">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Saldo Atual</p>
                                    <p className="text-2xl font-black text-slate-800">{formatCurrency(c.balance)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Responsável</p>
                                    <p className="text-xs font-medium text-slate-600 truncate max-w-[100px]">{systemUsers.find(u => u.id === c.operatorId)?.nome || 'Não definido'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Create/Edit Register Modal - UPDATED FIELDS */}
        {showRegisterModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                    <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                        <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter"><Wallet className="text-blue-400"/> {editingRegister.id ? 'Editar Caixa' : 'Criar Novo Caixa'}</h3>
                        <button onClick={() => setShowRegisterModal(false)} className="hover:bg-slate-800 p-2 rounded-full transition"><X size={24}/></button>
                    </div>
                    <div className="p-8 space-y-5">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Título da Caixa <span className="text-red-500">*</span></label>
                            <input 
                                className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-500 outline-none transition" 
                                placeholder="Ex: Caixa Frontal Loja 01" 
                                value={editingRegister.name || ''} 
                                onChange={e => setEditingRegister({...editingRegister, name: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Responsável da Caixa</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3 text-slate-400" size={18}/>
                                <select 
                                    className="w-full pl-10 p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-500 outline-none appearance-none"
                                    value={editingRegister.operatorId || ''}
                                    onChange={e => setEditingRegister({...editingRegister, operatorId: e.target.value})}
                                >
                                    <option value="">Selecionar Utilizador...</option>
                                    {systemUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.nome} (@{u.utilizador})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Status</label>
                                <select 
                                    className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-500 outline-none" 
                                    value={editingRegister.status} 
                                    onChange={e => setEditingRegister({...editingRegister, status: e.target.value as any})}
                                >
                                    <option value="CLOSED">Fechado</option>
                                    <option value="OPEN">Aberto</option>
                                    <option value="SUSPENDED">Suspenso</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Saldo de Abertura</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-3 text-slate-400" size={18}/>
                                    <input 
                                        type="number" 
                                        className="w-full pl-10 p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-black focus:border-blue-500 outline-none" 
                                        placeholder="0.00" 
                                        value={editingRegister.initialBalance || 0} 
                                        onChange={e => setEditingRegister({...editingRegister, initialBalance: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Observações</label>
                            <textarea 
                                className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-medium focus:border-blue-500 outline-none transition h-24 resize-none" 
                                placeholder="Notas internas sobre o caixa..."
                                value={editingRegister.notes || ''}
                                onChange={e => setEditingRegister({...editingRegister, notes: e.target.value})}
                            ></textarea>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                            <AlertCircle className="text-blue-600 mt-0.5" size={18}/>
                            <p className="text-[10px] text-blue-800 font-bold leading-relaxed uppercase tracking-tight">
                                Este caixa ficará disponível para operações financeiras e Ponto de Venda. Os dados serão sincronizados na Cloud em tempo real.
                            </p>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-900 flex justify-end gap-3 border-t-4 border-slate-800">
                        <button onClick={() => setShowRegisterModal(false)} className="px-10 py-4 border-2 border-slate-700 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition">Cancelar</button>
                        <button 
                            onClick={handleSaveRegister} 
                            disabled={isLoadingCloud}
                            className="px-16 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-blue-500 transition transform active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoadingCloud ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} GRAVAR NA CLOUD
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* OPERATIONS & HISTORY TABS - Mantidos conforme original */}
        {activeTab === 'OPERATIONS' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in zoom-in-95">
                <button onClick={() => { setOperationType('ENTRY'); setShowOperationModal(true); }} className="bg-emerald-50 border border-emerald-200 p-8 rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-emerald-100 transition group">
                    <div className="p-4 bg-white rounded-full text-emerald-600 shadow-sm group-hover:scale-110 transition"><Plus size={32}/></div>
                    <h3 className="font-bold text-emerald-800 text-lg">Entrada / Reforço</h3>
                    <p className="text-xs text-emerald-600 text-center">Inserir dinheiro manualmente no caixa</p>
                </button>
                <button onClick={() => { setOperationType('EXIT'); setShowOperationModal(true); }} className="bg-red-50 border border-red-200 p-8 rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-red-100 transition group">
                    <div className="p-4 bg-white rounded-full text-red-600 shadow-sm group-hover:scale-110 transition"><TrendingDown size={32}/></div>
                    <h3 className="font-bold text-red-800 text-lg">Saída / Sangria</h3>
                    <p className="text-xs text-red-600 text-center">Retirar dinheiro manualmente</p>
                </button>
                <button onClick={() => { setOperationType('TRANSFER'); setShowOperationModal(true); }} className="bg-blue-50 border border-blue-200 p-8 rounded-xl flex flex-col items-center justify-center gap-4 hover:bg-blue-100 transition group">
                    <div className="p-4 bg-white rounded-full text-blue-600 shadow-sm group-hover:scale-110 transition"><ArrowRightLeft size={32}/></div>
                    <h3 className="font-bold text-blue-800 text-lg">Transferência Intercaixas</h3>
                    <p className="text-xs text-blue-600 text-center">Mover valores entre caixas</p>
                </button>
            </div>
        )}

        {activeTab === 'HISTORY' && (
            <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden animate-in fade-in">
                <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 text-sm">Histórico Geral de Movimentos</h3>
                    <div className="flex gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded flex items-center gap-1"><TrendingUp size={12}/> Vendas</span>
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded flex items-center gap-1"><TrendingDown size={12}/> Compras</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded flex items-center gap-1"><Edit2 size={12}/> Manual</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700 text-white font-bold text-xs uppercase">
                            <tr>
                                <th className="p-3">Data</th>
                                <th className="p-3">Descrição</th>
                                <th className="p-3">Caixa</th>
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Origem</th>
                                <th className="p-3 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {allMovements.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50 text-xs">
                                    <td className="p-3 font-mono">{formatDate(m.date)}</td>
                                    <td className="p-3 font-medium">{m.description}</td>
                                    <td className="p-3">{cashRegisters.find(c => c.id === m.cashRegisterId)?.name}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${m.type.includes('ENTRY') || m.type.includes('IN') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                            {m.type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-[10px] uppercase font-bold text-slate-400">{m.source}</td>
                                    <td className="p-3 text-right font-black font-mono">{formatCurrency(m.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Operation Modal - Mantido conforme original */}
        {showOperationModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl w-full max-w-sm shadow-xl animate-in zoom-in-95">
                    <h3 className="font-bold text-lg mb-4 p-4 border-b">
                        {operationType === 'ENTRY' ? 'Entrada de Valores' : operationType === 'EXIT' ? 'Saída de Valores' : 'Transferência'}
                    </h3>
                    <div className="p-4 space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Valor</label>
                            <input type="number" className="w-full border p-2 rounded text-lg font-bold" placeholder="0.00" value={opAmount} onChange={e => setOpAmount(Number(e.target.value))}/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">{operationType === 'ENTRY' ? 'Caixa Destino' : 'Caixa Origem'}</label>
                            <select className="w-full border p-2 rounded" value={opSourceId} onChange={e => setOpSourceId(e.target.value)}>
                                <option value="">Selecione...</option>
                                {cashRegisters.map(c => <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.balance)})</option>)}
                            </select>
                        </div>
                        {operationType === 'TRANSFER' && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Caixa Destino</label>
                                <select className="w-full border p-2 rounded" value={opTargetId} onChange={e => setOpTargetId(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {cashRegisters.filter(c => c.id !== opSourceId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Motivo / Descrição</label>
                            <input className="w-full border p-2 rounded" placeholder="Justificação" value={opDesc} onChange={e => setOpDesc(e.target.value)}/>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 p-4 bg-slate-50 rounded-b-xl border-t">
                        <button onClick={() => setShowOperationModal(false)} className="px-4 py-2 border rounded">Cancelar</button>
                        <button onClick={handleOperation} className="px-4 py-2 bg-blue-600 text-white rounded font-bold shadow-md">Confirmar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default CashManager;
