import React, { useState, useMemo } from 'react';
import { CashRegister, CashClosure as CashClosureType, Invoice, CashMovement } from '../types';
import { formatCurrency, generateId, formatDate } from '../utils';
import { Wallet, CheckCircle, Calculator, Printer, ArrowLeft, AlertCircle, Save, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface CashClosureProps {
  registers: CashRegister[];
  invoices: Invoice[];
  movements: CashMovement[]; // Manual movements
  onSaveClosure: (closure: CashClosureType) => void;
  onGoBack: () => void;
  currentUser: string;
  currentUserId: string;
}

const CashClosure: React.FC<CashClosureProps> = ({ registers, invoices, movements, onSaveClosure, onGoBack, currentUser, currentUserId }) => {
  const [selectedRegisterId, setSelectedRegisterId] = useState(registers[0]?.id || '');
  const [actualCash, setActualCash] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // REGRA: O saldo esperado agora considera o VALOR TOTAL DAS VENDAS NO POS (Dinheiro + Multicaixa + Transf + Crédito)
  const calculation = useMemo(() => {
      const targetDate = today;
      const register = registers.find(r => r.id === selectedRegisterId);
      
      // Filtrar faturas do dia para este caixa
      const dayInvoices = invoices.filter(i => 
          i.cashRegisterId === selectedRegisterId && 
          i.date === targetDate && 
          i.status === 'PAID'
      );

      const dayMovements = movements.filter(m => 
          m.cashRegisterId === selectedRegisterId && 
          m.date.startsWith(targetDate)
      );

      // Soma por método
      const salesCash = dayInvoices.filter(i => i.paymentMethod === 'CASH').reduce((sum, i) => sum + i.total, 0);
      const salesMulti = dayInvoices.filter(i => i.paymentMethod === 'MULTICAIXA').reduce((sum, i) => sum + i.total, 0);
      const salesTransfer = dayInvoices.filter(i => i.paymentMethod === 'TRANSFER').reduce((sum, i) => sum + i.total, 0);
      const salesCredit = dayInvoices.filter(i => i.paymentMethod === 'CREDIT_ACCOUNT').reduce((sum, i) => sum + i.total, 0);

      // Total de Vendas do Dia (Todas as formas de pagamento no POS)
      const totalSalesDay = salesCash + salesMulti + salesTransfer + salesCredit;

      const manualEntries = dayMovements.filter(m => m.type === 'ENTRY' || m.type === 'TRANSFER_IN').reduce((sum, m) => sum + m.amount, 0);
      const manualExits = dayMovements.filter(m => m.type === 'EXIT' || m.type === 'TRANSFER_OUT').reduce((sum, m) => sum + m.amount, 0);

      const initialBalance = register?.initialBalance || 0;
      
      // REGRA SOLICITADA: Saldo Esperado = Valor Total das Vendas + Saldo Inicial + Ajustes
      // Isso reflete o volume total gerido pelo ponto de venda no turno.
      const expectedCashReport = initialBalance + totalSalesDay + manualEntries - manualExits;

      return {
          salesCash, salesMulti, salesTransfer, salesCredit,
          manualEntries, manualExits, initialBalance,
          expectedCash: expectedCashReport,
          totalSales: totalSalesDay
      };
  }, [selectedRegisterId, invoices, movements, registers, today]);

  const difference = actualCash - calculation.expectedCash;

  const handleCloseRegister = async () => {
      if (!selectedRegisterId) return alert("Selecione um caixa.");
      
      setIsSaving(true);
      const closureId = generateId();
      const timestamp = new Date().toISOString();
      
      const closure: CashClosureType = {
          id: closureId,
          date: timestamp,
          openedAt: `${today} 08:00`, 
          closedAt: timestamp,
          operatorId: currentUserId,
          operatorName: currentUser,
          cashRegisterId: selectedRegisterId,
          
          expectedCash: calculation.expectedCash,
          expectedMulticaixa: calculation.salesMulti,
          expectedTransfer: calculation.salesTransfer,
          expectedCredit: calculation.salesCredit,
          totalSales: calculation.totalSales,
          
          actualCash: actualCash,
          difference: difference,
          
          initialBalance: calculation.initialBalance,
          finalBalance: actualCash, 
          
          status: 'CLOSED',
          notes
      };

      try {
          const { error } = await supabase.from('fechos_caixa').insert({
              aberto_em: closure.openedAt,
              fechado_em: closure.closedAt,
              operador_id: closure.operatorId,
              operador_nome: closure.operatorName,
              caixa_id: closure.cashRegisterId,
              esperado_dinheiro: closure.expectedCash,
              esperado_multicaixa: closure.expectedMulticaixa,
              esperado_transferencia: closure.expectedTransfer,
              esperado_credito: closure.expectedCredit,
              total_vendas: closure.totalSales,
              dinheiro_real: closure.actualCash,
              diferenca: closure.difference,
              saldo_inicial: closure.initialBalance,
              saldo_final: closure.finalBalance,
              status: closure.status,
              notas: closure.notes,
              empresa_id: '00000000-0000-0000-0000-000000000001'
          });

          if (error) throw new Error(error.message);

          onSaveClosure(closure);
          setShowSummary(true);
      } catch (err: any) {
          alert("Erro ao gravar fecho na cloud: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  const ClosureReport = () => (
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-lg mx-auto border border-slate-200 mt-6 print:border-0 print:shadow-none">
          <div className="text-center border-b pb-4 mb-4">
              <h2 className="text-2xl font-black text-slate-900 uppercase">Relatório de Fecho</h2>
              <p className="text-sm text-slate-500">Caixa: {registers.find(r => r.id === selectedRegisterId)?.name}</p>
              <p className="text-xs text-slate-400">{new Date().toLocaleString()}</p>
          </div>

          <div className="space-y-3 text-sm">
              <div className="flex justify-between font-bold">
                  <span>Operador</span>
                  <span>{currentUser}</span>
              </div>
              <div className="border-t border-dashed my-2"></div>
              
              <div className="flex justify-between">
                  <span>Vendas em Numerário</span>
                  <span>{formatCurrency(calculation.salesCash)}</span>
              </div>
              <div className="flex justify-between">
                  <span>Vendas em Multicaixa</span>
                  <span>{formatCurrency(calculation.salesMulti)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                  <span>Total de Vendas POS</span>
                  <span>{formatCurrency(calculation.totalSales)}</span>
              </div>
              
              <div className="border-t border-dashed my-2"></div>
              <div className="flex justify-between font-bold text-slate-600">
                  <span>Saldo Inicial</span>
                  <span>{formatCurrency(calculation.initialBalance)}</span>
              </div>
              <div className="flex justify-between font-bold text-blue-700 text-lg">
                  <span>Saldo Esperado (Total POS)</span>
                  <span>{formatCurrency(calculation.expectedCash)}</span>
              </div>
              <div className="bg-slate-100 p-2 rounded flex justify-between font-bold border border-slate-200">
                  <span>Contagem Física</span>
                  <span>{formatCurrency(actualCash)}</span>
              </div>
              
              <div className={`flex justify-between font-black text-lg p-2 rounded ${difference === 0 ? 'bg-green-100 text-green-700' : difference > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                  <span>{difference === 0 ? 'Regular' : difference > 0 ? 'SOBRA' : 'QUEBRA'}</span>
                  <span>{formatCurrency(difference)}</span>
              </div>
          </div>

          <div className="mt-8 flex gap-3 print:hidden">
              <button onClick={() => window.print()} className="flex-1 bg-slate-800 text-white py-2 rounded font-bold hover:bg-black flex items-center justify-center gap-2">
                  <Printer size={16}/> Imprimir
              </button>
              <button onClick={onGoBack} className="flex-1 border border-slate-300 py-2 rounded font-bold hover:bg-slate-50">
                  Voltar
              </button>
          </div>
      </div>
  );

  if (showSummary) return <div className="p-6 bg-slate-100 min-h-screen"><ClosureReport/></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans animate-in fade-in">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onGoBack} className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><ArrowLeft/></button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Wallet className="text-blue-600"/> Fecho de Caixa</h1>
                    <p className="text-sm text-slate-500">Contagem e encerramento de turno</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Selecionar Caixa</label>
                        <select 
                            className="w-full p-3 border rounded-lg bg-slate-50 font-bold"
                            value={selectedRegisterId}
                            onChange={e => setSelectedRegisterId(e.target.value)}
                        >
                            {registers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.status === 'OPEN' ? 'Aberto' : 'Fechado'})</option>)}
                        </select>
                    </div>

                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Calculator size={18}/> Movimentos do Sistema (Hoje)</h3>
                    
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                            <span className="text-slate-600">Vendas em Numerário</span>
                            <span className="font-bold">{formatCurrency(calculation.salesCash)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                            <span className="text-slate-600">Vendas Multicaixa</span>
                            <span className="font-bold text-blue-600">{formatCurrency(calculation.salesMulti)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 hover:bg-blue-50 rounded border border-blue-100">
                            <span className="text-blue-700 font-bold">Total de Vendas POS (Acumulado)</span>
                            <span className="font-bold text-blue-800">{formatCurrency(calculation.totalSales)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                            <span className="text-slate-600">Total Entradas Manuais</span>
                            <span className="font-bold text-green-600">+{formatCurrency(calculation.manualEntries)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 hover:bg-slate-50 rounded">
                            <span className="text-slate-600">Total Saídas Manuais</span>
                            <span className="font-bold text-red-600">-{formatCurrency(calculation.manualExits)}</span>
                        </div>
                        <div className="border-t pt-3 mt-2">
                            <div className="flex justify-between items-center text-base">
                                <span className="font-bold text-slate-800">Saldo Esperado em Caixa</span>
                                <span className="font-black text-slate-900 bg-slate-100 px-2 py-1 rounded">{formatCurrency(calculation.expectedCash)}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 text-right">Inclui saldo inicial + volume total de vendas POS</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-blue-900 mb-6 flex items-center gap-2"><CheckCircle size={18}/> Conferência Física</h3>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Valor Contado em Caixa (Dinheiro Físico)</label>
                            <input 
                                type="number" 
                                className="w-full p-4 text-3xl font-black text-right border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition"
                                value={actualCash || ''}
                                onChange={e => setActualCash(Number(e.target.value))}
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>

                        {actualCash > 0 && (
                            <div className={`p-4 rounded-lg mb-6 ${difference === 0 ? 'bg-green-50 text-green-800 border border-green-200' : difference > 0 ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                <div className="text-xs font-bold uppercase mb-1">Resultado da Conferência</div>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold">{difference === 0 ? 'Correto' : difference > 0 ? 'Sobra de Caixa' : 'Quebra de Caixa'}</span>
                                    <span className="text-2xl font-black">{formatCurrency(difference)}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Observações / Justificativa</label>
                            <textarea 
                                className="w-full border p-3 rounded-lg text-sm h-24 resize-none"
                                placeholder="Detalhes sobre quebras, sobras ou ocorrências do turno..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            ></textarea>
                        </div>
                    </div>

                    <button 
                        onClick={handleCloseRegister}
                        disabled={isSaving}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition shadow-lg flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
                    >
                        {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={20}/>} Confirmar Fecho
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default CashClosure;