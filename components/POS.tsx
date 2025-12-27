import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Client, Invoice, InvoiceItem, InvoiceType, InvoiceStatus, PaymentMethod, CashRegister, DocumentSeries, POSConfig, Company, User } from '../types';
import { formatCurrency, generateId, generateInvoiceHash, formatDate, numberToExtenso, generateQrCodeUrl } from '../utils';
import { Search, ShoppingCart, Trash2, Plus, Minus, User as UserIcon, Settings, X, CreditCard, Monitor, CornerUpLeft, Printer, RefreshCw, AlertTriangle, Image as ImageIcon } from 'lucide-react';

interface POSProps {
  products: Product[];
  clients: Client[];
  invoices: Invoice[];
  series: DocumentSeries[];
  cashRegisters: CashRegister[];
  config: POSConfig;
  onSaveInvoice: (invoice: Invoice, seriesId: string, action?: 'PRINT' | 'CERTIFY') => void;
  onGoBack: () => void;
  currentUser: User;
  company: Company;
}

const POS: React.FC<POSProps> = ({ 
  products, clients, invoices, series, cashRegisters, config, 
  onSaveInvoice, onGoBack, currentUser, company
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(config.defaultSeriesId || '');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(config.defaultPaymentMethod);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  
  // Printing state
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Focus ref for search
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize defaults
  useEffect(() => {
      if (!selectedSeriesId && series.length > 0) {
          const posSeries = series.find(s => s.code.includes('POS') || s.code.includes('VD')) || series[0];
          setSelectedSeriesId(posSeries.id);
      }
      if (!selectedClient && config.defaultClientId) {
          const defClient = clients.find(c => c.id === config.defaultClientId);
          if(defClient) setSelectedClient(defClient);
      }
  }, [series, clients, config]);

  // Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'F1') {
              e.preventDefault();
              searchInputRef.current?.focus();
          } else if (e.key === 'F2') {
              e.preventDefault();
              if (cart.length > 0) setShowPaymentModal(true);
          } else if (e.key === 'F3') {
              e.preventDefault();
              if (confirm('Cancelar venda atual?')) setCart([]);
          } else if (e.key === 'Escape') {
              if (showPaymentModal) setShowPaymentModal(false);
              else if (showReceipt) setShowReceipt(false);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal, showReceipt]);

  const categories = useMemo(() => {
      const cats = new Set(products.map(p => p.category || 'Geral'));
      return ['ALL', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
      return products.filter(p => {
          const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (p.barcode && p.barcode.includes(searchTerm)) ||
                              p.id.includes(searchTerm);
          const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
          return matchSearch && matchCat;
      });
  }, [products, searchTerm, selectedCategory]);

  const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);
  const changeAmount = Math.max(0, receivedAmount - cartTotal);

  const addToCart = (product: Product) => {
      const existing = cart.find(i => i.productId === product.id);
      if (existing) {
          updateQuantity(existing.id, existing.quantity + 1);
      } else {
          const newItem: InvoiceItem = {
              id: generateId(),
              productId: product.id,
              type: 'PRODUCT',
              description: product.name,
              quantity: 1,
              unitPrice: product.price,
              discount: 0,
              taxRate: 14,
              total: product.price,
              rubrica: '61.1'
          };
          setCart([...cart, newItem]);
      }
  };

  const updateQuantity = (itemId: string, newQty: number) => {
      if (newQty <= 0) {
          removeFromCart(itemId);
          return;
      }
      setCart(cart.map(item => {
          if (item.id === itemId) {
              const total = newQty * item.unitPrice * (1 - item.discount / 100);
              return { ...item, quantity: newQty, total };
          }
          return item;
      }));
  };

  const removeFromCart = (itemId: string) => {
      setCart(cart.filter(item => item.id !== itemId));
  };

  const handleFinalize = () => {
      if (cart.length === 0) return;
      if (!selectedSeriesId) return alert("Selecione uma série de documento.");

      // REGRA: Todos os documentos POS são agora Fatura/Recibo (FR)
      const docType = InvoiceType.FR;
      
      /* Fix: Added mandatory accountingDate to the new POS invoice object */
      const newInvoice: Invoice = {
          id: generateId(),
          type: docType,
          seriesId: selectedSeriesId,
          number: 'POS-Gen',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString(),
          dueDate: new Date().toISOString().split('T')[0],
          accountingDate: new Date().toISOString().split('T')[0],
          clientId: selectedClient?.id || 'CONSUMIDOR_FINAL',
          clientName: selectedClient?.name || 'Consumidor Final',
          clientNif: selectedClient?.vatNumber || '999999999',
          items: cart,
          subtotal: cartTotal,
          globalDiscount: 0,
          taxRate: 0,
          taxAmount: cart.reduce((acc, i) => acc + (i.total * (i.taxRate/100)), 0),
          withholdingAmount: 0,
          retentionAmount: 0,
          total: cartTotal,
          paidAmount: cartTotal,
          currency: 'AOA',
          exchangeRate: 1,
          status: InvoiceStatus.PAID,
          isCertified: true,
          companyId: company.id,
          workLocationId: currentUser.workLocationId || '',
          paymentMethod: paymentMethod,
          cashRegisterId: cashRegisters.find(c => c.status === 'OPEN')?.id,
          operatorName: currentUser.name,
          source: 'POS'
      };

      onSaveInvoice(newInvoice, selectedSeriesId, 'CERTIFY');
      
      const s = series.find(ser => ser.id === selectedSeriesId);
      const nextNum = s ? `${s.code}${s.year}/${(s.sequences[docType] || 0) + 1}` : '####';
      
      setLastInvoice({ ...newInvoice, number: nextNum });
      
      setCart([]);
      setReceivedAmount(0);
      setSearchTerm('');
      setShowPaymentModal(false);
      // REGRA: Não desaparece automaticamente, só fecha quando clicar no X ou no botão Fechar
      setShowReceipt(true);
  };

  const ReceiptView = () => {
      if (!lastInvoice) return null;
      
      const taxSummary: Record<string, {rate: number, base: number, amount: number}> = {};
      lastInvoice.items.forEach(item => {
          const rate = item.taxRate;
          const key = rate.toString();
          if(!taxSummary[key]) taxSummary[key] = { rate, base: 0, amount: 0 };
          let lineTotal = item.quantity * item.unitPrice;
          let lineDiscount = lineTotal * (item.discount / 100);
          let lineNet = lineTotal - lineDiscount;
          let lineTax = lineNet * (rate / 100);
          taxSummary[key].base += lineNet;
          taxSummary[key].amount += lineTax;
      });

      return (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
              <div className="bg-white p-4 rounded-lg shadow-2xl h-full max-h-[90vh] overflow-y-auto w-full max-w-[400px]">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="font-bold text-slate-800">Impressão P80</h3>
                      <button onClick={() => setShowReceipt(false)} className="hover:bg-slate-100 p-1 rounded-full transition-colors text-slate-500"><X/></button>
                  </div>
                  
                  <div className="bg-white p-2 w-full font-sans text-[10px] leading-tight text-black mx-auto" id="pos-receipt-print">
                      <div className="text-center mb-4">
                          <h2 className="font-bold text-sm uppercase">{company.name}</h2>
                          <div className="text-[9px] space-y-0.5">
                              <p>NIF: {company.nif}</p>
                              <p>{company.address}</p>
                              <p>Tel: {company.phone}</p>
                              <p>{company.email}</p>
                          </div>
                      </div>

                      <div className="border-b border-black pb-2 mb-2">
                          <p className="font-bold">Cliente: <span className="font-normal">{lastInvoice.clientName}</span></p>
                          <p className="font-bold">NIF: <span className="font-normal">{lastInvoice.clientNif}</span></p>
                      </div>

                      <div className="flex justify-between font-bold mb-1 text-[11px]">
                          <span>{lastInvoice.type}</span>
                          <span>{lastInvoice.number}</span>
                      </div>
                      
                      <div className="flex justify-between mb-2 text-[9px]">
                          <span>Data: {formatDate(lastInvoice.date)} {lastInvoice.time}</span>
                          <span>Op: {lastInvoice.operatorName}</span>
                      </div>

                      <table className="w-full text-left mb-4 border-collapse">
                          <thead className="border-b border-black font-bold">
                              <tr>
                                  <th className="py-1">Artigo</th>
                                  <th className="py-1 text-center">Qtd</th>
                                  <th className="py-1 text-right">Total</th>
                              </tr>
                          </thead>
                          <tbody>
                              {lastInvoice.items.map((item, i) => (
                                  <tr key={i} className="border-b border-dashed border-gray-300">
                                      <td className="py-1 pr-1">
                                          <div className="font-bold">{item.description}</div>
                                          <div className="text-[9px] text-gray-500">
                                              {formatCurrency(item.unitPrice).replace('Kz','')} {item.discount > 0 ? `(-${item.discount}%)` : ''}
                                          </div>
                                      </td>
                                      <td className="py-1 text-center align-top">{item.quantity}</td>
                                      <td className="py-1 text-right align-top font-bold">{formatCurrency(item.total).replace('Kz','')}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>

                      <div className="flex justify-between text-[11px] font-bold border-t border-black pt-1 mt-1">
                          <span>TOTAL A PAGAR</span>
                          <span>{formatCurrency(lastInvoice.total)}</span>
                      </div>
                      
                      <div className="mt-4 border-t border-dashed border-gray-400 pt-2">
                          <p className="font-bold text-[9px] mb-1">Resumo de Impostos</p>
                          <table className="w-full text-[8px]">
                              <thead>
                                  <tr>
                                      <th className="text-left">Taxa</th>
                                      <th className="text-right">Base</th>
                                      <th className="text-right">IVA</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {Object.entries(taxSummary).map(([rate, vals]) => (
                                      <tr key={rate}>
                                          <td>{rate}%</td>
                                          <td className="text-right">{formatCurrency(vals.base).replace('Kz','')}</td>
                                          <td className="text-right">{formatCurrency(vals.amount).replace('Kz','')}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>

                      <div className="mt-4 text-center">
                          <img src={generateQrCodeUrl(lastInvoice.hash || 'POS')} alt="QR" className="w-16 h-16 mx-auto mb-1"/>
                          <p className="font-mono text-[9px] font-bold">{lastInvoice.hash ? `${lastInvoice.hash.substring(0,4)}-${lastInvoice.hash.substring(4,8)}-${lastInvoice.hash.substring(8,12)}-${lastInvoice.hash.substring(12,16)}` : '####-####'}</p>
                          <p className="text-[8px] mt-1">Processado por IMATEC SOFTWARE</p>
                          <p className="text-[8px]">Software Certificado nº 25/AGT/2019</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                      <button 
                        onClick={() => {
                            const content = document.getElementById('pos-receipt-print');
                            const pri = window.open('', '', 'height=600, width=400');
                            if(pri && content) {
                                pri.document.write('<html><head><title>Recibo P80</title>');
                                pri.document.write('<style>body{font-family:sans-serif; margin:0; padding:10px;}</style>');
                                pri.document.write('</head><body>');
                                pri.document.write(content.innerHTML);
                                pri.document.write('<script>setTimeout(()=>{window.print();window.close()},1000)</script>');
                                pri.document.write('</body></html>');
                                pri.document.close();
                                pri.focus();
                            }
                        }} 
                        className="bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                      >
                          <Printer size={16}/> Imprimir
                      </button>
                      <button onClick={() => setShowReceipt(false)} className="bg-slate-200 text-slate-800 py-2 rounded font-bold hover:bg-slate-300 text-sm">
                          Fechar
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {ReceiptView()}

      <div className="w-2/3 flex flex-col border-r border-slate-300">
          <div className="bg-white p-3 border-b border-slate-200 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                  <button onClick={onGoBack} className="flex items-center gap-1 text-slate-600 hover:text-blue-600 font-bold bg-slate-100 px-3 py-1.5 rounded transition">
                      <CornerUpLeft size={18}/> Menu Principal
                  </button>
                  <div className="h-6 w-px bg-slate-300"></div>
                  <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 text-slate-400" size={18}/>
                      <input 
                        ref={searchInputRef}
                        className="w-full pl-9 pr-2 py-2 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Pesquisar (F1)..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                  </div>
              </div>
              <div className="flex gap-2 overflow-x-auto max-w-md pb-1 custom-scrollbar">
                  {categories.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-blue-600 text-white shadow' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}
                      >
                          {cat === 'ALL' ? 'Todos' : cat}
                      </button>
                  ))}
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredProducts.map(product => (
                      <div 
                        key={product.id} 
                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition transform hover:-translate-y-1 group"
                        onClick={() => addToCart(product)}
                      >
                          <div className="h-28 bg-slate-200 relative overflow-hidden">
                              {product.imageUrl ? (
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover"/>
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                      <ImageIcon size={32}/>
                                  </div>
                              )}
                              <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 rounded font-bold backdrop-blur-sm">
                                  {product.stock} un
                              </div>
                          </div>
                          <div className="p-3">
                              <h3 className="font-bold text-slate-700 text-sm leading-tight line-clamp-2 h-10">{product.name}</h3>
                              <div className="mt-2 flex justify-between items-center">
                                  <span className="text-blue-600 font-black text-lg">{formatCurrency(product.price).replace('Kz','')}</span>
                                  <div className="bg-blue-50 text-blue-600 p-1.5 rounded-full group-hover:bg-blue-600 group-hover:text-white transition">
                                      <Plus size={16}/>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      <div className="w-1/3 bg-white flex flex-col shadow-xl z-10">
          <div className="p-4 bg-slate-900 text-white">
              <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/10 rounded-lg"><Monitor size={20}/></div>
                      <div>
                          <h2 className="font-bold text-sm uppercase">Ponto de Venda</h2>
                          <p className="text-[10px] text-slate-400">Operador: {currentUser.name}</p>
                      </div>
                  </div>
                  <div className="text-right">
                      <div className="text-xs text-slate-400">Série Atual</div>
                      <div className="font-mono font-bold text-yellow-400">
                          {series.find(s => s.id === selectedSeriesId)?.code || '---'}
                      </div>
                  </div>
              </div>
              
              <div className="bg-white/10 p-2 rounded flex items-center gap-2 cursor-pointer hover:bg-white/20 transition">
                  <UserIcon size={18} className="text-slate-300"/>
                  <select 
                    className="bg-transparent w-full outline-none text-sm font-bold text-white cursor-pointer"
                    value={selectedClient?.id || ''}
                    onChange={(e) => {
                        const c = clients.find(cli => cli.id === e.target.value);
                        setSelectedClient(c || null);
                    }}
                  >
                      <option value="" className="text-slate-800">Consumidor Final</option>
                      {clients.map(c => <option key={c.id} value={c.id} className="text-slate-800">{c.name}</option>)}
                  </select>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50">
              {cart.map(item => (
                  <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center group">
                      <div className="flex-1 min-w-0 pr-2">
                          <h4 className="font-bold text-slate-700 text-sm truncate">{item.description}</h4>
                          <div className="text-xs text-slate-500 mt-0.5">
                              {formatCurrency(item.unitPrice)} x {item.quantity}
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="flex items-center border border-slate-300 rounded bg-slate-50">
                              <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-slate-200 text-slate-600"><Minus size={12}/></button>
                              <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-slate-200 text-slate-600"><Plus size={12}/></button>
                          </div>
                          <div className="font-bold text-slate-800 w-20 text-right">
                              {formatCurrency(item.total).replace('Kz','')}
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-300 hover:text-red-500 transition">
                              <Trash2 size={16}/>
                          </button>
                      </div>
                  </div>
              ))}
          </div>

          <div className="bg-white p-4 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <div className="flex justify-between items-end mb-4">
                  <span className="text-sm font-bold text-slate-500 uppercase">Total a Pagar</span>
                  <span className="text-4xl font-black text-slate-900 tracking-tight">{formatCurrency(cartTotal)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-2">
                  <button 
                    className="bg-red-50 text-red-600 font-bold py-3 rounded-lg hover:bg-red-100 transition text-sm flex items-center justify-center gap-2"
                    onClick={() => setCart([])}
                  >
                      <X size={18}/> Cancelar (F3)
                  </button>
                  <button className="bg-slate-100 text-slate-600 font-bold py-3 rounded-lg hover:bg-slate-200 transition text-sm flex items-center justify-center gap-2">
                      <Settings size={18}/> Opções
                  </button>
              </div>
              <button 
                onClick={() => setShowPaymentModal(true)}
                disabled={cart.length === 0}
                className="w-full bg-green-600 text-white font-black py-4 rounded-xl text-xl hover:bg-green-700 transition shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 primary-action"
              >
                  <CreditCard size={24}/> FINALIZAR (F2)
              </button>
          </div>
      </div>

      {showPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                      <h2 className="text-xl font-bold flex items-center gap-2"><CreditCard/> Pagamento</h2>
                      <button onClick={() => setShowPaymentModal(false)} className="hover:bg-slate-800 p-1 rounded-full"><X/></button>
                  </div>
                  <div className="p-8">
                      <div className="text-center mb-8">
                          <p className="text-slate-500 text-xs font-bold uppercase mb-1">Valor Total</p>
                          <h1 className="text-5xl font-black text-slate-800">{formatCurrency(cartTotal)}</h1>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                          <button onClick={() => setPaymentMethod('CASH')} className={`p-4 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-2 transition ${paymentMethod === 'CASH' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 hover:border-slate-300'}`}>
                              <span className="text-2xl">💵</span> Dinheiro
                          </button>
                          <button onClick={() => setPaymentMethod('MULTICAIXA')} className={`p-4 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-2 transition ${paymentMethod === 'MULTICAIXA' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}>
                              <span className="text-2xl">💳</span> Multicaixa
                          </button>
                          <button onClick={() => setPaymentMethod('TRANSFER')} className={`p-4 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-2 transition ${paymentMethod === 'TRANSFER' ? 'border-purple-500 bg-purple-700 text-purple-700' : 'border-slate-200 hover:border-slate-300'}`}>
                              <span className="text-2xl">🏦</span> Transferência
                          </button>
                          <button onClick={() => setPaymentMethod('CREDIT_ACCOUNT')} className={`p-4 rounded-xl border-2 font-bold text-sm flex flex-col items-center gap-2 transition ${paymentMethod === 'CREDIT_ACCOUNT' ? 'border-orange-500 bg-orange-700 text-orange-700' : 'border-slate-200 hover:border-slate-300'}`}>
                              <span className="text-2xl">👤</span> Conta Corrente
                          </button>
                      </div>

                      {paymentMethod === 'CASH' && (
                          <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Valor Entregue</label>
                              <input 
                                type="number" 
                                autoFocus
                                className="w-full text-3xl font-bold p-2 bg-white border border-slate-300 rounded-lg text-right outline-none focus:ring-2 focus:ring-blue-500"
                                value={receivedAmount || ''}
                                onChange={e => setReceivedAmount(Number(e.target.value))}
                                placeholder={cartTotal.toString()}
                              />
                              <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                                  <span className="font-bold text-slate-500 uppercase text-sm">Troco</span>
                                  <span className={`text-2xl font-black ${changeAmount > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                      {formatCurrency(changeAmount)}
                                  </span>
                              </div>
                          </div>
                      )}

                      <button 
                        onClick={handleFinalize}
                        className="w-full bg-green-600 text-white font-bold py-4 rounded-xl text-lg hover:bg-green-700 shadow-lg transition transform active:scale-95 primary-action"
                      >
                          CONFIRMAR PAGAMENTO
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default POS;