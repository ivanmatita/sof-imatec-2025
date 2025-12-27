
import React, { useState, useEffect } from 'react';
import { Client, Invoice, InvoiceItem, InvoiceStatus, InvoiceType, Product, WorkLocation, PaymentMethod, CashRegister, DocumentSeries, Warehouse, Company } from '../types';
import { generateId, formatCurrency, formatDate, generateQrCodeUrl, numberToExtenso } from '../utils';
import { Plus, Trash, Save, ArrowLeft, Lock, FileText, List, X, Calendar, CreditCard, ChevronDown, Ruler, Users, Briefcase, Percent, DollarSign, RefreshCw, Scale } from 'lucide-react';

interface InvoiceFormProps {
  onSave: (invoice: Invoice, seriesId: string, action?: 'PRINT' | 'CERTIFY') => void;
  onCancel: () => void;
  onViewList: () => void;
  onAddWorkLocation: () => void; 
  onSaveClient: (client: Client) => void;
  onSaveWorkLocation: (wl: WorkLocation) => void;
  clients: Client[];
  products: Product[];
  workLocations: WorkLocation[];
  cashRegisters: CashRegister[];
  series: DocumentSeries[];
  warehouses?: Warehouse[];
  initialType?: InvoiceType;
  initialData?: Partial<Invoice>;
  currentUser?: string;
  currentUserId?: string;
  currentCompany?: Company;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
  onSave, onCancel, onViewList, onSaveClient, onSaveWorkLocation, clients, products, workLocations, cashRegisters, series, warehouses = [],
  initialType, initialData, currentUser, currentUserId, currentCompany
}) => {
  const isRestricted = initialData?.isCertified || false;

  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [clientId, setClientId] = useState(initialData?.clientId || '');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(initialType || initialData?.type || InvoiceType.FT);
  const [workLocationId, setWorkLocationId] = useState(initialData?.workLocationId || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(initialData?.paymentMethod || '');
  const [cashRegisterId, setCashRegisterId] = useState(initialData?.cashRegisterId || '');
  const [typology, setTypology] = useState('Geral');
  
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(initialData?.date || today);
  const [dueDate, setDueDate] = useState(initialData?.dueDate || today);
  const [accountingDate, setAccountingDate] = useState(initialData?.accountingDate || today);

  const [currency, setCurrency] = useState<string>(initialData?.currency || 'AOA');
  const [exchangeRate, setExchangeRate] = useState<number>(initialData?.exchangeRate || 1);

  // Retenções
  const [retentionType, setRetentionType] = useState<'NONE' | 'CAT_50' | 'CAT_100'>(initialData?.retentionType || 'NONE');
  const [hasWithholding, setHasWithholding] = useState<boolean>(!!initialData?.withholdingAmount);

  const [items, setItems] = useState<InvoiceItem[]>(() => {
      const rawItems = initialData?.items || [];
      return rawItems.map((i: any) => ({
          id: i.id || generateId(),
          productId: i.productId,
          description: i.description || '',
          reference: i.reference || '',
          quantity: i.quantity || 1,
          unit: i.unit || 'un',
          unitPrice: i.unitPrice || 0,
          discount: i.discount || 0,
          taxRate: i.taxRate !== undefined ? i.taxRate : 14,
          length: i.length || 1,
          width: i.width || 1,
          height: i.height || 1,
          showMetrics: i.showMetrics || false,
          total: i.total !== undefined ? i.total : ((i.quantity || 1) * (i.length || 1) * (i.width || 1) * (i.height || 1) * (i.unitPrice || 0) * (1 - (i.discount || 0)/100)),
          type: i.type || 'PRODUCT',
          expiryDate: i.expiryDate || ''
      }));
  });

  const [globalDiscount, setGlobalDiscount] = useState(initialData?.globalDiscount || 0); 
  const [notes, setNotes] = useState(initialData?.notes || '');

  useEffect(() => {
    if (series.length > 0 && !selectedSeriesId) {
        if (initialData?.seriesId) {
            setSelectedSeriesId(initialData.seriesId);
        } else {
            const defaultSeries = series.find(s => s.isActive);
            if(defaultSeries) setSelectedSeriesId(defaultSeries.id);
        }
    }
    if (initialType) setInvoiceType(initialType);
  }, [initialType, initialData, series]);

  useEffect(() => {
      if (currency === 'AOA') setExchangeRate(1);
      else if (currency === 'USD') setExchangeRate(850);
      else if (currency === 'EURO') setExchangeRate(920);
  }, [currency]);

  const calculateLineTotal = (qty: number, length: number = 1, width: number = 1, height: number = 1, price: number, discount: number) => {
      const actualLength = length > 0 ? length : 1;
      const actualWidth = width > 0 ? width : 1;
      const actualHeight = height > 0 ? height : 1;
      const base = qty * actualLength * actualWidth * actualHeight * price;
      const discAmount = base * (discount / 100);
      return base - discAmount;
  };

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const taxAmount = items.reduce((acc, item) => acc + (item.total * (item.taxRate / 100)), 0);
  
  // Cálculo de Retenções
  const withholdingAmount = hasWithholding ? subtotal * 0.065 : 0;
  let retentionAmount = 0;
  if (retentionType === 'CAT_50') retentionAmount = taxAmount * 0.5;
  if (retentionType === 'CAT_100') retentionAmount = taxAmount;

  const total = (subtotal + taxAmount) - (subtotal * (globalDiscount / 100)) - withholdingAmount - retentionAmount;
  const contraValue = total * exchangeRate;

  const handleAddItem = () => {
    if (isRestricted) return;
    setItems([...items, { id: generateId(), description: '', reference: '', quantity: 1, length: 1, width: 1, height: 1, unit: 'un', unitPrice: 0, discount: 0, taxRate: 14, total: 0, type: 'PRODUCT', expiryDate: '', showMetrics: false }]);
  };

  const handleProductSelect = (index: number, productId: string) => {
    if (isRestricted) return;
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      const unitPrice = product.price; 
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.name,
        reference: product.id.substring(0,6).toUpperCase(), 
        unit: product.unit || 'un',
        unitPrice: unitPrice,
        type: 'PRODUCT',
        total: calculateLineTotal(newItems[index].quantity, newItems[index].length, newItems[index].width, newItems[index].height, unitPrice, newItems[index].discount)
      };
      setItems(newItems);
    }
  };

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    if (isRestricted) return;
    const newItems = [...items];
    const item = newItems[index];
    (item as any)[field] = value;
    if (['quantity', 'unitPrice', 'discount', 'length', 'width', 'height'].includes(field as string)) {
        item.total = calculateLineTotal(item.quantity, item.length || 1, item.width || 1, item.height || 1, item.unitPrice, item.discount);
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (isRestricted) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = (action?: 'PRINT' | 'CERTIFY') => {
      if (!clientId || items.length === 0 || !selectedSeriesId) return alert("Preencha cliente, série e adicione itens.");

      const newInvoice: Invoice = {
          id: initialData?.id || generateId(),
          type: invoiceType,
          seriesId: selectedSeriesId,
          number: initialData?.number || 'DRAFT', 
          date,
          time: new Date().toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'}),
          dueDate,
          accountingDate,
          clientId,
          clientName: clients.find(c => c.id === clientId)?.name || 'Cliente Final',
          clientNif: clients.find(c => c.id === clientId)?.vatNumber,
          items,
          subtotal,
          globalDiscount,
          taxRate: 14, 
          taxAmount,
          withholdingAmount,
          retentionType,
          retentionAmount,
          total,
          currency,
          exchangeRate,
          contraValue,
          status: (invoiceType === InvoiceType.FR || invoiceType === InvoiceType.RG) ? InvoiceStatus.PAID : InvoiceStatus.PENDING,
          notes,
          isCertified: isRestricted, // Mantém o estado de certificação se já for restrito
          companyId: currentCompany?.id || '', 
          workLocationId,
          paymentMethod: paymentMethod || undefined,
          cashRegisterId,
          operatorName: currentUser,
          typology,
          source: 'MANUAL'
      };
      onSave(newInvoice, selectedSeriesId, action);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 animate-in fade-in duration-500 pb-20 relative px-4 sm:px-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={onCancel} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                <ArrowLeft size={20} /> <span className="font-medium hidden sm:inline">Voltar</span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {invoiceType === InvoiceType.FR ? <Lock size={20} className="text-emerald-500"/> : <FileText size={20} className="text-blue-500"/>}
                {invoiceType === InvoiceType.FR ? 'Nova Fatura/Recibo' : 'Novo Documento'}
            </h1>
        </div>
        <div className="flex gap-2">
            <button onClick={onViewList} className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border"><List size={18}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                    <FileText size={14} className="text-blue-600"/>
                    <h3 className="font-bold text-slate-700 text-sm uppercase">Dados e Datas do Documento</h3>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm font-bold" value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as InvoiceType)} disabled={isRestricted}>
                                {Object.values(InvoiceType).filter(t => t !== InvoiceType.RG).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Série</label>
                             <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm" value={selectedSeriesId} onChange={(e) => setSelectedSeriesId(e.target.value)} disabled={isRestricted}>
                                {series.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                            </select>
                         </div>
                         <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Local de Trabalho / Obra</label>
                            <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm font-bold" value={workLocationId} onChange={e => setWorkLocationId(e.target.value)} disabled={isRestricted}>
                                <option value="">Sem Local Associado</option>
                                {workLocations.map(wl => <option key={wl.id} value={wl.id}>{wl.name}</option>)}
                            </select>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Calendar size={10}/> Data Emissão</label>
                            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Calendar size={10}/> Data Contabilística</label>
                            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-blue-50" value={accountingDate} onChange={e => setAccountingDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Calendar size={10}/> Data Vencimento</label>
                            <input type="date" className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-orange-50" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                    </div>

                    {(invoiceType === InvoiceType.FR || invoiceType === InvoiceType.VD) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Forma Pagamento</label>
                                <select className="w-full p-2 border border-emerald-200 rounded-lg bg-emerald-50 text-sm font-bold outline-none" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                                    <option value="">Selecione...</option>
                                    <option value="CASH">Dinheiro (AOA)</option>
                                    <option value="MULTICAIXA">Multicaixa</option>
                                    <option value="MCX_EXPRESS">Multicaixa Express</option>
                                    <option value="TRANSFER">Transferência</option>
                                    <option value="OTHERS">Outros</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Caixa de Recebimento</label>
                                <select className="w-full p-2 border border-emerald-200 rounded-lg bg-emerald-50 text-sm font-bold outline-none" value={cashRegisterId} onChange={e => setCashRegisterId(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {cashRegisters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={14} className="text-green-600"/>
                        <h3 className="font-bold text-slate-700 text-sm uppercase">Seleção de Cliente da Cloud</h3>
                    </div>
                </div>
                <div className="p-5">
                    <select className="w-full p-3 border border-slate-200 rounded-xl text-base font-bold bg-white focus:ring-2 focus:ring-green-500 outline-none shadow-sm" value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={isRestricted}>
                        <option value="">-- SELECIONAR CLIENTE (GESTÃO DE CLIENTES) --</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} (NIF: {c.vatNumber})</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2"><List size={16}/> Itens do Documento</h3>
                    {!isRestricted && (
                        <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2">
                            <Plus size={14} /> Adicionar Linha
                        </button>
                    )}
                </div>
                
                <div className="flex-1 p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                            <tr>
                                <th className="p-3 w-10 text-center"></th>
                                <th className="p-3 w-20">Tipo</th>
                                <th className="p-3">Artigo Sincronizado / Descrição</th>
                                <th className="p-3 w-20 text-center">Qtd</th>
                                <th className="p-3 w-28 text-right">Preço Un.</th>
                                <th className="p-3 w-16 text-center">Desc%</th>
                                <th className="p-3 w-28 text-right">Total</th>
                                {!isRestricted && <th className="p-3 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    <tr className="hover:bg-blue-50/30 transition-colors">
                                        <td className="p-2 text-center">
                                            <button onClick={() => handleUpdateItem(index, 'showMetrics', !item.showMetrics)} className={`p-1.5 rounded-lg transition-all ${item.showMetrics ? 'bg-blue-100 text-blue-600 rotate-180' : 'text-slate-300 hover:text-blue-500'}`}>
                                                <Ruler size={16}/>
                                            </button>
                                        </td>
                                        <td className="p-2">
                                            <select className="w-full bg-transparent text-[10px] font-bold text-slate-600 outline-none" value={item.type} onChange={(e) => handleUpdateItem(index, 'type', e.target.value)} disabled={isRestricted}>
                                                <option value="PRODUCT">PROD</option>
                                                <option value="SERVICE">SERV</option>
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <div className="flex flex-col gap-1">
                                                {item.type === 'PRODUCT' && (
                                                    <select className="w-full p-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none font-bold text-blue-700 bg-blue-50" onChange={(e) => handleProductSelect(index, e.target.value)} value={item.productId || ''} disabled={isRestricted}>
                                                        <option value="">-- SELECIONAR DA GESTÃO DE ARTIGOS (BAIXA AUTO) --</option>
                                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                                                    </select>
                                                )}
                                                <input className="w-full p-1 bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none text-xs font-bold" placeholder="Descrição ou observação do item..." value={item.description} onChange={(e) => handleUpdateItem(index, 'description', e.target.value)} disabled={isRestricted} />
                                            </div>
                                        </td>
                                        <td className="p-2 text-center">
                                            <input type="number" className="w-full p-1.5 text-center border border-slate-200 rounded bg-white text-sm font-bold" value={item.quantity} onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value))} disabled={isRestricted} />
                                        </td>
                                        <td className="p-2 text-right">
                                            <input type="number" className="w-full p-1.5 text-right border border-slate-200 rounded bg-white text-sm font-bold" value={item.unitPrice} onChange={(e) => handleUpdateItem(index, 'unitPrice', Number(e.target.value))} disabled={isRestricted} />
                                        </td>
                                        <td className="p-2 text-center">
                                            <input type="number" className="w-full p-1.5 text-center border border-slate-200 rounded bg-white text-sm" value={item.discount} onChange={(e) => handleUpdateItem(index, 'discount', Number(e.target.value))} disabled={isRestricted} />
                                        </td>
                                        <td className="p-2 text-right font-black text-slate-700 text-sm">
                                            {formatCurrency(item.total).replace('Kz','')}
                                        </td>
                                        {!isRestricted && (
                                            <td className="p-2 text-center">
                                                <button onClick={() => handleRemoveItem(index)} className="text-slate-300 hover:text-red-500 p-1"><Trash size={16} /></button>
                                            </td>
                                        )}
                                    </tr>
                                    {item.showMetrics && (
                                        <tr className="bg-blue-50/50 animate-in slide-in-from-top-2">
                                            <td className="p-2 border-r border-blue-100"></td>
                                            <td colSpan={6} className="p-3">
                                                <div className="flex items-center gap-6">
                                                    <div className="flex items-center gap-2"><span className="text-[10px] font-black text-blue-600 uppercase">Métrica de Cálculo:</span><Ruler size={14} className="text-blue-400"/></div>
                                                    <div className="flex flex-wrap gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Comp (m)</label>
                                                            <input type="number" className="w-20 p-1 border border-blue-200 rounded bg-white text-xs font-bold" value={item.length || 1} onChange={e => handleUpdateItem(index, 'length', Number(e.target.value))} disabled={isRestricted} />
                                                        </div>
                                                        <div className="text-slate-300 font-bold">x</div>
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Larg (m)</label>
                                                            <input type="number" className="w-20 p-1 border border-blue-200 rounded bg-white text-xs font-bold" value={item.width || 1} onChange={e => handleUpdateItem(index, 'width', Number(e.target.value))} disabled={isRestricted} />
                                                        </div>
                                                        <div className="text-slate-300 font-bold">x</div>
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Alt (m)</label>
                                                            <input type="number" className="w-20 p-1 border border-blue-200 rounded bg-white text-xs font-bold" value={item.height || 1} onChange={e => handleUpdateItem(index, 'height', Number(e.target.value))} disabled={isRestricted} />
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-4">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Volume:</span>
                                                            <span className="text-xs font-black text-blue-700">{(Number(item.length || 1) * Number(item.width || 1) * Number(item.height || 1)).toFixed(2)} m3</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td></td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Observações Adicionais</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-lg h-20 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Notas do documento..." value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isRestricted}></textarea>
            </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden sticky top-24">
                <div className="bg-slate-800 text-white px-6 py-4 flex items-center gap-2"><CreditCard size={18}/><h3 className="font-bold">Resumo Financeiro</h3></div>
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                         <div className="grid grid-cols-1 gap-4">
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moeda</label>
                                <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold text-sm" value={currency} onChange={e => setCurrency(e.target.value)} disabled={isRestricted}>
                                    <option value="AOA">AOA (Kwanzas)</option>
                                    <option value="USD">USD (Dólares)</option>
                                    <option value="EURO">EURO (Euros)</option>
                                </select>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Câmbio</label>
                                    <input type="number" className="w-full p-2 border border-slate-200 rounded-lg bg-white font-black text-sm" value={exchangeRate} onChange={e => setExchangeRate(Number(e.target.value))} disabled={isRestricted} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contravalor ({currency})</label>
                                    <div className="w-full p-2 bg-slate-100 rounded-lg font-black text-sm text-slate-600 truncate border border-slate-200">
                                        {formatCurrency(contraValue).replace('Kz', currency)}
                                    </div>
                                </div>
                             </div>
                         </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-100 pt-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1"><Scale size={12}/> Retenção na Fonte (6,5%)</label>
                            <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                <input type="checkbox" checked={hasWithholding} onChange={e => setHasWithholding(e.target.checked)} className="w-4 h-4" disabled={isRestricted}/>
                                <span className="text-xs font-bold text-indigo-700">Aplicar Retenção 6,5%</span>
                            </label>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1"><Scale size={12}/> Cativação de IVA</label>
                            <select className="w-full p-2 border border-indigo-200 rounded-lg bg-indigo-50 font-bold text-sm" value={retentionType} onChange={e => setRetentionType(e.target.value as any)} disabled={isRestricted}>
                                <option value="NONE">Sem Cativação</option>
                                <option value="CAT_50">Cativação 50%</option>
                                <option value="CAT_100">Cativação 100%</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-slate-100">
                        <div className="flex justify-between text-slate-600 text-sm"><span>Subtotal</span><span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span></div>
                        <div className="flex justify-between text-slate-600 text-sm pt-2"><span>Imposto (IVA)</span><span className="font-bold text-slate-800">{formatCurrency(taxAmount)}</span></div>
                        
                        {hasWithholding && (
                            <div className="flex justify-between text-red-600 text-sm font-bold">
                                <span>Retenção na Fonte (6,5%)</span>
                                <span>-{formatCurrency(withholdingAmount)}</span>
                            </div>
                        )}
                        {retentionAmount > 0 && (
                            <div className="flex justify-between text-red-600 text-sm font-bold">
                                <span>Cativação IVA ({retentionType === 'CAT_50' ? '50%' : '100%'})</span>
                                <span>-{formatCurrency(retentionAmount)}</span>
                            </div>
                        )}

                        <div className="pt-4 mt-4 border-t-2 border-slate-800">
                            <div className="flex justify-between items-end"><span className="font-bold text-base text-slate-500">A PAGAR</span><span className="font-black text-3xl text-blue-600 tracking-tight">{formatCurrency(total)}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleSave()} className="py-4 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-xl flex items-center justify-center gap-2 transition-all"><Save size={20} /> Emitir Documento</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;
