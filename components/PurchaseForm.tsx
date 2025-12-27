
import React, { useState, useEffect } from 'react';
import { Purchase, PurchaseItem, Product, PurchaseType, WorkLocation, CashRegister, PaymentMethod, Supplier, Warehouse } from '../types';
import { generateId, formatCurrency } from '../utils';
import { Plus, Trash, Save, ArrowLeft, FileText, List, Calculator, CreditCard, Eraser, UserPlus, QrCode, X, Box, Info } from 'lucide-react';

interface PurchaseFormProps {
  onSave: (purchase: Purchase) => void;
  onCancel: () => void;
  products: Product[];
  workLocations?: WorkLocation[];
  cashRegisters?: CashRegister[];
  suppliers: Supplier[];
  onSaveSupplier: (supplier: Supplier) => void;
  warehouses?: Warehouse[]; 
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({ onSave, onCancel, products, workLocations = [], cashRegisters = [], suppliers, onSaveSupplier, warehouses = [] }) => {
  const [purchaseType, setPurchaseType] = useState<PurchaseType>(PurchaseType.FT);
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [nif, setNif] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [notes, setNotes] = useState('');
  const [hash, setHash] = useState(''); 
  
  const [workLocationId, setWorkLocationId] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses.length > 0 ? warehouses[0].id : ''); 
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [cashRegisterId, setCashRegisterId] = useState('');
  const [retentionType, setRetentionType] = useState<'NONE' | 'CAT_50' | 'CAT_100'>('NONE');
  const [globalDiscount, setGlobalDiscount] = useState(0);

  const [taxRate, setTaxRate] = useState(14);
  const [useAutoCalc, setUseAutoCalc] = useState(true);
  const [manualTaxAmount, setManualTaxAmount] = useState(0);

  const [currency, setCurrency] = useState<'AOA' | 'USD' | 'EUR' | 'BRL'>('AOA');
  const [exchangeRate, setExchangeRate] = useState(1);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSup, setNewSup] = useState<Partial<Supplier>>({ city: 'Luanda', province: 'Luanda' });

  useEffect(() => {
      if (currency === 'AOA') setExchangeRate(1);
      if (currency === 'USD') setExchangeRate(850);
      if (currency === 'EUR') setExchangeRate(920);
      if (currency === 'BRL') setExchangeRate(170);
  }, [currency]);

  useEffect(() => {
      if (supplierId) {
          const s = suppliers.find(sup => sup.id === supplierId);
          if (s) {
              setSupplierName(s.name);
              setNif(s.vatNumber);
          }
      }
  }, [supplierId, suppliers]);

  useEffect(() => {
      if (warehouses.length > 0 && !warehouseId) {
          setWarehouseId(warehouses[0].id);
      }
  }, [warehouses, warehouseId]);

  const calculateLineTotal = (qty: number, price: number, discount: number) => {
      const base = qty * price;
      const discAmount = base * (discount / 100);
      return base - discAmount;
  }

  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const globalDiscountAmount = subtotal * (globalDiscount / 100);
  const taxableAmount = subtotal - globalDiscountAmount;
  
  const taxAmount = useAutoCalc ? (taxableAmount * (taxRate / 100)) : manualTaxAmount;
  
  let retentionAmount = 0;
  if (retentionType === 'CAT_50') retentionAmount = taxAmount * 0.5;
  if (retentionType === 'CAT_100') retentionAmount = taxAmount;

  const total = taxableAmount + taxAmount - retentionAmount;

  const handleAddItem = () => {
    setItems([...items, { id: generateId(), description: '', quantity: 1, unitPrice: 0, discount: 0, total: 0 }]);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.name,
        unitPrice: product.costPrice,
        total: calculateLineTotal(newItems[index].quantity, product.costPrice, newItems[index].discount || 0)
      };
      setItems(newItems);
    }
  };

  const handleUpdateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    (item as any)[field] = value;
    item.total = calculateLineTotal(item.quantity, item.unitPrice, item.discount || 0);
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveSupplier = () => {
      if (!newSup.name || !newSup.vatNumber) return alert("Preencha Nome e NIF");
      const supplier: Supplier = {
          id: generateId(),
          name: newSup.name!,
          vatNumber: newSup.vatNumber!,
          email: newSup.email || '',
          phone: newSup.phone || '',
          address: newSup.address || '',
          city: newSup.city || 'Luanda',
          province: newSup.province || 'Luanda',
          accountBalance: 0,
          transactions: []
      };
      onSaveSupplier(supplier);
      setSupplierId(supplier.id);
      setShowSupplierModal(false);
      setNewSup({ city: 'Luanda', province: 'Luanda' });
  }

  const handleScanQR = () => {
      const simulatedScan = "AGTHASH123456789*2024-05-20*150000*500123999*Fornecedor QR Lda*FT QR/2024/99";
      const parts = simulatedScan.split('*');
      if (parts.length >= 6) {
          const [qrHash, qrDate, qrTotal, qrNif, qrSupplier, qrDoc] = parts;
          setTimeout(() => {
              setSupplierName(qrSupplier);
              setNif(qrNif);
              setDocumentNumber(qrDoc);
              setDate(qrDate);
              setHash(qrHash);
              setItems([{
                  id: generateId(),
                  description: 'Mercadoria Diversa (QR Scan Auto)',
                  quantity: 1,
                  unitPrice: Number(qrTotal),
                  discount: 0,
                  total: Number(qrTotal)
              }]);
              alert("Fatura lida com sucesso via Código QR! Dados preenchidos.");
          }, 1000);
      } else {
          alert("QR Code inválido ou formato desconhecido.");
      }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName || items.length === 0 || !documentNumber) {
        alert("Preencha o fornecedor, nº do documento e adicione itens.");
        return;
    }
    if ((purchaseType === PurchaseType.FR || purchaseType === PurchaseType.REC) && (!paymentMethod || !cashRegisterId)) {
        alert("Para Fatura/Recibo ou Recibo, selecione a Forma de Pagamento e Caixa.");
        return;
    }

    if (!warehouseId) {
        alert("Selecione o armazém de entrada.");
        return;
    }

    const newPurchase: Purchase = {
      id: generateId(),
      type: purchaseType,
      supplierId: supplierId || undefined,
      supplier: supplierName,
      nif: nif || '999999999',
      date,
      dueDate: dueDate || date,
      documentNumber: documentNumber,
      items,
      subtotal,
      globalDiscount,
      taxAmount,
      total,
      status: (purchaseType === PurchaseType.FR || purchaseType === PurchaseType.REC) ? 'PAID' : 'PENDING',
      notes,
      currency,
      exchangeRate,
      workLocationId: workLocationId || undefined,
      paymentMethod: paymentMethod || undefined,
      cashRegisterId: cashRegisterId || undefined,
      retentionType,
      retentionAmount,
      warehouseId: warehouseId, 
      hash: hash || undefined 
    };
    onSave(newPurchase);
  };

  const showPaymentFields = purchaseType === PurchaseType.FR || purchaseType === PurchaseType.REC;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20 relative">
      
      {showSupplierModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center sticky top-0 z-10">
                      <h3 className="font-bold text-lg flex items-center gap-2"><UserPlus size={20}/> Novo Fornecedor</h3>
                      <button onClick={() => setShowSupplierModal(false)} className="hover:bg-slate-800 p-1 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Nome / Empresa <span className="text-red-500">*</span></label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="Nome do Fornecedor" value={newSup.name || ''} onChange={e => setNewSup({...newSup, name: e.target.value})} />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">NIF <span className="text-red-500">*</span></label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="NIF" value={newSup.vatNumber || ''} onChange={e => setNewSup({...newSup, vatNumber: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Endereço Completo</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="Morada" value={newSup.address || ''} onChange={e => setNewSup({...newSup, address: e.target.value})} />
                      </div>
                      <div>
                           <label className="text-xs font-bold text-slate-500 uppercase">Cidade</label>
                           <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="Cidade" value={newSup.city || ''} onChange={e => setNewSup({...newSup, city: e.target.value})} />
                      </div>
                      <div>
                           <label className="text-xs font-bold text-slate-500 uppercase">Província</label>
                           <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="Província" value={newSup.province || ''} onChange={e => setNewSup({...newSup, province: e.target.value})} />
                      </div>
                      <div>
                           <label className="text-xs font-bold text-slate-500 uppercase">Telefone</label>
                           <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="Telefone" value={newSup.phone || ''} onChange={e => setNewSup({...newSup, phone: e.target.value})} />
                      </div>
                      <div>
                           <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                           <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="Email" value={newSup.email || ''} onChange={e => setNewSup({...newSup, email: e.target.value})} />
                      </div>
                  </div>
                  <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-10">
                      <button onClick={() => setShowSupplierModal(false)} className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-white transition-colors">Cancelar</button>
                      <button onClick={handleSaveSupplier} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">Salvar Fornecedor</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={onCancel} className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
                <ArrowLeft size={16} /> Voltar
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 text-sm">Entrada de Mercadoria / Despesas</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Registar Compra</h1>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={onCancel}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border border-slate-300 transition"
            >
                <List size={18} />
                <span className="hidden sm:inline">Ver Lista de Compras</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <FileText size={18} className="text-blue-500"/> Dados do Documento
                      </h3>
                      <button onClick={handleScanQR} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded flex items-center gap-2 hover:bg-black transition font-bold shadow-md">
                          <QrCode size={16} /> Ler QR Code
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Documento</label>
                          <select 
                            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-medium"
                            value={purchaseType}
                            onChange={(e) => setPurchaseType(e.target.value as PurchaseType)}
                          >
                              {Object.values(PurchaseType).map(t => (
                                  <option key={t} value={t}>{t}</option>
                              ))}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nº do Documento</label>
                          <input 
                            type="text" 
                            value={documentNumber}
                            onChange={(e) => setDocumentNumber(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg"
                            placeholder="Ex: FT 2024/001"
                          />
                      </div>
                      
                      <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                              Código Hash
                              <div className="group relative">
                                  <Info size={14} className="text-blue-500 cursor-help"/>
                                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-slate-800 text-white text-xs p-2 rounded shadow-lg z-50">
                                      O Código Hash confirma que a fatura de compra é certificada pela AGT. Documentos sem Código Hash não aparecem na contabilidade.
                                  </div>
                              </div>
                          </label>
                          <input 
                            type="text" 
                            value={hash}
                            onChange={(e) => setHash(e.target.value)}
                            className="w-full p-2 border-2 border-blue-100 rounded-lg font-mono text-sm focus:border-blue-500 outline-none transition-colors"
                            placeholder="Insira o Hash de 4 caracteres ou completo..."
                          />
                      </div>

                      <div className="md:col-span-2 flex gap-2 items-end">
                          <div className="flex-1">
                              <label className="block text-sm font-medium text-slate-700 mb-1">Fornecedor</label>
                              <select 
                                className="w-full p-2 border border-slate-200 rounded-lg"
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                              >
                                  <option value="">Selecione Fornecedor...</option>
                                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.vatNumber})</option>)}
                              </select>
                          </div>
                          <button onClick={() => setShowSupplierModal(true)} className="p-2 bg-green-100 text-green-600 rounded-lg border border-green-200 hover:bg-green-200 h-[42px]" title="Novo Fornecedor">
                                 <UserPlus size={20} />
                          </button>
                          <div className="w-1/3">
                              <label className="block text-sm font-medium text-slate-700 mb-1">NIF</label>
                              <input 
                                type="text" 
                                value={nif}
                                onChange={(e) => setNif(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg"
                                placeholder="500..."
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Data Emissão</label>
                          <input 
                              type="date" 
                              value={date} 
                              onChange={(e) => setDate(e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento</label>
                          <input 
                              type="date" 
                              value={dueDate} 
                              onChange={(e) => setDueDate(e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg"
                          />
                      </div>
                      
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Local de Trabalho</label>
                         <select className="w-full p-2 border border-slate-200 rounded-lg" value={workLocationId} onChange={e => setWorkLocationId(e.target.value)}>
                             <option value="">Selecione Local...</option>
                             {workLocations.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1 text-blue-700 font-bold flex items-center gap-1">
                             <Box size={14}/> Armazém de Entrada (Stock)
                         </label>
                         <select className="w-full p-2 border border-blue-200 rounded-lg bg-blue-50" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                             <option value="">Selecione...</option>
                             {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                         </select>
                         <p className="text-[10px] text-blue-500 mt-1">Os produtos entrarão neste armazém.</p>
                      </div>

                      {showPaymentFields && (
                          <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Forma Pagamento</label>
                                <select className="w-full p-2 border rounded" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}>
                                    <option value="">Selecione...</option>
                                    <option value="CASH">Numerário</option>
                                    <option value="MULTICAIXA">Multicaixa</option>
                                    <option value="TRANSFER">Transferência</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Caixa de Pagamento</label>
                                <select className="w-full p-2 border rounded" value={cashRegisterId} onChange={e => setCashRegisterId(e.target.value)}>
                                    <option value="">Selecione Caixa...</option>
                                    {cashRegisters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                          </>
                      )}
                  </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-800">Itens / Produtos</h3>
                      <button onClick={handleAddItem} className="text-sm text-blue-600 font-bold hover:underline flex items-center gap-1">
                          <Plus size={16} /> Adicionar Linha
                      </button>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={item.id} className="flex flex-wrap md:flex-nowrap gap-2 items-start bg-slate-50 p-3 rounded-lg border border-slate-200">
                             <div className="w-full md:w-4/12">
                                <div className="flex flex-col gap-1">
                                    <select 
                                        className="w-full p-1 border rounded text-sm mb-1"
                                        onChange={(e) => handleProductSelect(index, e.target.value)}
                                        value={item.productId || ''}
                                    >
                                        <option value="">-- Selecionar do Stock --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input 
                                        className="w-full p-1 border rounded text-sm"
                                        placeholder="Descrição do item"
                                        value={item.description}
                                        onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                                    />
                                </div>
                             </div>
                             <div className="w-1/2 md:w-2/12">
                                <input 
                                    type="number" min="1" 
                                    className="w-full p-2 border rounded text-center"
                                    placeholder="Qtd"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value))}
                                />
                             </div>
                             <div className="w-1/2 md:w-3/12">
                                <input 
                                    type="number" min="0" 
                                    className="w-full p-2 border rounded text-right"
                                    placeholder="Custo Unit."
                                    value={item.unitPrice}
                                    onChange={(e) => handleUpdateItem(index, 'unitPrice', Number(e.target.value))}
                                />
                             </div>
                             <div className="w-1/2 md:w-1/12">
                                <input 
                                    type="number" min="0" max="100"
                                    className="w-full p-2 border rounded text-center"
                                    placeholder="Desc%"
                                    value={item.discount || 0}
                                    onChange={(e) => handleUpdateItem(index, 'discount', Number(e.target.value))}
                                />
                             </div>
                             <div className="w-1/2 md:w-2/12 text-right font-bold pt-2 text-slate-700">
                                {formatCurrency(item.total)}
                            </div>
                            <button onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-600 pt-2">
                                <Trash size={16} />
                            </button>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded-lg">
                            Nenhum item adicionado. Clique em "Adicionar Linha".
                        </div>
                    )}
                  </div>
              </div>
          </div>

          <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CreditCard size={18}/> Financeiro</h3>
                  
                  <div className="mb-4 bg-slate-50 p-3 rounded border">
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Moeda do Documento</label>
                        <div className="flex gap-2 mb-2">
                            {['AOA', 'USD', 'EUR', 'BRL'].map(c => (
                                <button 
                                    key={c} 
                                    onClick={() => setCurrency(c as any)}
                                    className={`flex-1 py-1 text-xs font-bold rounded ${currency === c ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                        {currency !== 'AOA' && (
                            <div>
                                    <label className="block text-xs text-slate-500 mb-1">Taxa de Câmbio</label>
                                    <input 
                                    type="number" 
                                    className="w-full p-1 border rounded text-right" 
                                    value={exchangeRate} 
                                    onChange={e => setExchangeRate(Number(e.target.value))}
                                    />
                            </div>
                        )}
                  </div>

                  <div className="space-y-3">
                      <div className="flex justify-between text-slate-600">
                          <span>Subtotal (Base)</span>
                          <span>{formatCurrency(subtotal)}</span>
                      </div>
                      
                      <div className="bg-slate-50 p-3 rounded border space-y-2">
                          <div className="flex justify-between items-center text-sm">
                              <label className="flex items-center gap-2">
                                  <input type="checkbox" checked={useAutoCalc} onChange={() => setUseAutoCalc(!useAutoCalc)} />
                                  Calc. Automático IVA
                              </label>
                              {useAutoCalc && (
                                  <select className="p-1 border rounded text-xs" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}>
                                      <option value="14">14%</option>
                                      <option value="7">7%</option>
                                      <option value="5">5%</option>
                                      <option value="0">Isento</option>
                                  </select>
                              )}
                          </div>
                          <div className="flex justify-between items-center">
                              <span>Desc. Global (%)</span>
                              <input 
                                  type="number" min="0" max="100"
                                  className="w-16 p-1 border rounded text-right text-xs"
                                  value={globalDiscount}
                                  onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                              />
                          </div>
                          {globalDiscount > 0 && (
                              <div className="flex justify-between text-red-500 text-xs">
                                  <span>Valor Desconto</span>
                                  <span>- {formatCurrency(globalDiscountAmount)}</span>
                              </div>
                          )}
                          
                          <div className="flex justify-between items-center pt-2">
                              <span className="text-slate-600 font-medium">IVA / Imposto</span>
                              {useAutoCalc ? (
                                  <span className="font-bold">{formatCurrency(taxAmount)}</span>
                              ) : (
                                  <input 
                                    type="number" 
                                    className="w-24 text-right p-1 border rounded"
                                    value={manualTaxAmount} 
                                    onChange={e => setManualTaxAmount(Number(e.target.value))}
                                  />
                              )}
                          </div>
                      </div>

                      <div className="border-t pt-2 mt-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Cativação de IVA</label>
                        <select 
                            className="w-full p-1 border rounded text-xs mb-1"
                            value={retentionType}
                            onChange={(e) => setRetentionType(e.target.value as any)}
                            disabled={taxAmount === 0}
                        >
                            <option value="NONE">Sem Cativação</option>
                            <option value="CAT_50">Cativação 50%</option>
                            <option value="CAT_100">Cativação 100%</option>
                        </select>
                        {retentionAmount > 0 && (
                             <div className="flex justify-between text-red-600 font-bold bg-red-50 p-1 rounded text-sm">
                                 <span>Cativação IVA</span>
                                 <span>- {formatCurrency(retentionAmount)}</span>
                             </div>
                        )}
                      </div>

                      <div className="pt-4 mt-2 border-t border-slate-200">
                          <div className="flex justify-between items-end">
                              <span className="font-bold text-xl text-slate-800">Total</span>
                              <span className="font-bold text-2xl text-blue-600">
                                  {total.toLocaleString('pt-AO', { style: 'currency', currency: currency })}
                              </span>
                          </div>
                      </div>
                  </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Observações</label>
                  <textarea 
                      className="w-full p-2 border border-slate-200 rounded-lg h-24 text-sm"
                      placeholder="Detalhes do pagamento ou notas internas..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <button onClick={onCancel} className="py-3 px-4 border border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-50 flex items-center justify-center gap-2">
                      <Eraser size={20} /> Cancelar
                  </button>
                  <button onClick={handleSubmit} className="py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                      <Save size={20} /> Gravar
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default PurchaseForm;
