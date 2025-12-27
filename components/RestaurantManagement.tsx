
import React, { useState, useMemo } from 'react';
// Fix: Added ShoppingCart to the lucide-react imports
import { 
  UtensilsCrossed, Table, CookingPot, ScrollText, Plus, Search, 
  ChevronRight, Filter, Clock, CheckCircle, AlertTriangle, 
  Trash2, Edit3, Pizza, Coffee, Wine, Package, User, 
  DollarSign, Receipt, X, Save, Printer, Download, BarChart3, 
  ChevronLeft, PlusCircle, MinusCircle, LayoutDashboard, Monitor, ShoppingCart
} from 'lucide-react';
import { RestaurantTable, ViewState, Product, PaymentMethod } from '../types';
import { formatCurrency, formatDate, generateId } from '../utils';

interface RestaurantManagementProps {
  currentSubView: ViewState;
}

interface RestaurantOrder {
  id: string;
  tableId: string;
  tableNumber: number;
  waiterName: string;
  type: 'SALAO' | 'BALCAO' | 'DELIVERY';
  items: RestaurantOrderItem[];
  status: 'PREPARING' | 'READY' | 'SERVED' | 'PAID';
  createdAt: string;
  clientName?: string;
}

interface RestaurantOrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  observations?: string;
  status: 'PENDING' | 'PREPARING' | 'READY';
}

const RestaurantManagement: React.FC<RestaurantManagementProps> = ({ currentSubView }) => {
  // --- STATE ---
  const [activeInternalView, setActiveInternalView] = useState<'GRID' | 'ORDER_FORM' | 'COMANDA' | 'PAYMENT'>('GRID');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock Data
  const [tables, setTables] = useState<RestaurantTable[]>([
    { id: '1', number: 1, capacity: 4, status: 'OCCUPIED', currentOrderValue: 12500 },
    { id: '2', number: 2, capacity: 2, status: 'AVAILABLE' },
    { id: '3', number: 3, capacity: 6, status: 'AVAILABLE' },
    { id: '4', number: 4, capacity: 4, status: 'OCCUPIED', currentOrderValue: 5400 },
    { id: '5', number: 5, capacity: 4, status: 'AVAILABLE' },
    { id: '6', number: 6, capacity: 2, status: 'RESERVED' },
  ]);

  const [orders, setOrders] = useState<RestaurantOrder[]>([
    {
      id: 'ord1',
      tableId: '1',
      tableNumber: 1,
      waiterName: 'Carlos',
      type: 'SALAO',
      status: 'PREPARING',
      createdAt: new Date().toISOString(),
      items: [
        { id: 'i1', productId: 'p1', name: 'Pizza Calabresa G', quantity: 1, price: 8500, status: 'PREPARING', observations: 'Sem cebola' },
        { id: 'i2', productId: 'p2', name: 'Coca-Cola 1.5L', quantity: 1, price: 4000, status: 'READY' }
      ]
    },
    {
        id: 'ord2',
        tableId: '4',
        tableNumber: 4,
        waiterName: 'Marta',
        type: 'SALAO',
        status: 'SERVED',
        createdAt: new Date().toISOString(),
        items: [
          { id: 'i3', productId: 'p3', name: 'Hambúrguer Especial', quantity: 2, price: 2700, status: 'READY' }
        ]
      }
  ]);

  const menuItems: Partial<Product>[] = [
    { id: 'p1', name: 'Pizza Calabresa G', price: 8500, category: 'Pizzas' },
    { id: 'p2', name: 'Coca-Cola 1.5L', price: 4000, category: 'Bebidas' },
    { id: 'p3', name: 'Hambúrguer Especial', price: 2700, category: 'Lanches' },
    { id: 'p4', name: 'Cerveja Cuca', price: 1200, category: 'Bebidas' },
    { id: 'p5', name: 'Batata Frita L', price: 2500, category: 'Acompanhamentos' },
  ];

  // --- ACTIONS ---

  const handleTableClick = (table: RestaurantTable) => {
    setSelectedTable(table);
    if (table.status === 'AVAILABLE') {
      setActiveInternalView('ORDER_FORM');
    } else if (table.status === 'OCCUPIED') {
      setActiveInternalView('COMANDA');
    }
  };

  const handleSaveOrder = (newItems: RestaurantOrderItem[], waiter: string, type: any) => {
    if (!selectedTable) return;
    
    const newOrder: RestaurantOrder = {
      id: generateId(),
      tableId: selectedTable.id,
      tableNumber: selectedTable.number,
      waiterName: waiter,
      type: type,
      status: 'PREPARING',
      createdAt: new Date().toISOString(),
      items: newItems
    };

    setOrders([...orders, newOrder]);
    setTables(tables.map(t => t.id === selectedTable.id ? { ...t, status: 'OCCUPIED', currentOrderValue: newItems.reduce((acc, i) => acc + i.price * i.quantity, 0) } : t));
    setActiveInternalView('GRID');
    setSelectedTable(null);
    alert("Pedido enviado para a cozinha (KDS)!");
  };

  const handleCloseAccount = (orderId: string, method: PaymentMethod) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    setOrders(orders.filter(o => o.id !== orderId));
    setTables(tables.map(t => t.id === order.tableId ? { ...t, status: 'AVAILABLE', currentOrderValue: 0 } : t));
    setActiveInternalView('GRID');
    setSelectedTable(null);
    alert("Conta fechada com sucesso! Mesa liberada.");
  };

  // --- SUB-RENDERS ---

  const renderOrderForm = () => {
    const [waiter, setWaiter] = useState('Admin');
    const [orderType, setOrderType] = useState<'SALAO' | 'BALCAO' | 'DELIVERY'>('SALAO');
    const [cart, setCart] = useState<RestaurantOrderItem[]>([]);

    const addToCart = (product: any) => {
      const existing = cart.find(i => i.productId === product.id);
      if (existing) {
        setCart(cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        setCart([...cart, { id: generateId(), productId: product.id, name: product.name, quantity: 1, price: product.price, status: 'PENDING' }]);
      }
    };

    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
          <button onClick={() => setActiveInternalView('GRID')} className="flex items-center gap-2 hover:text-blue-400 transition">
            <ChevronLeft/> <span className="font-bold uppercase text-xs">Voltar às Mesas</span>
          </button>
          <h2 className="font-black uppercase tracking-tighter">Novo Pedido - Mesa {selectedTable?.number}</h2>
          <div className="w-20"></div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Header Data */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Garçom</label>
              <input className="w-full p-2 border rounded-lg" value={waiter} onChange={e => setWaiter(e.target.value)}/>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tipo de Serviço</label>
              <select className="w-full p-2 border rounded-lg font-bold" value={orderType} onChange={e => setOrderType(e.target.value as any)}>
                <option value="SALAO">Salão</option>
                <option value="BALCAO">Balcão / Take-away</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>
            <div>
               <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Cliente (Opcional)</label>
               <input className="w-full p-2 border rounded-lg" placeholder="Nome do cliente..."/>
            </div>
          </div>

          {/* Menu Selection */}
          <div className="lg:col-span-7 space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><ScrollText size={18}/> Selecionar Itens</h3>
                <div className="relative w-64">
                   <Search className="absolute left-2 top-2 text-slate-400" size={16}/>
                   <input className="w-full pl-8 p-1.5 border rounded-lg text-sm" placeholder="Pesquisar prato..."/>
                </div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                {menuItems.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => addToCart(item)}
                    className="bg-slate-50 p-4 rounded-xl border-2 border-transparent hover:border-blue-500 hover:bg-white cursor-pointer transition-all flex flex-col justify-between h-32"
                  >
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.category}</span>
                    <span className="font-bold text-slate-800 text-sm leading-tight">{item.name}</span>
                    <span className="font-black text-blue-600 mt-2">{formatCurrency(item.price!)}</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Cart / Summary */}
          <div className="lg:col-span-5 bg-slate-50 rounded-2xl border p-6 flex flex-col h-full min-h-[500px]">
             <h3 className="font-bold text-slate-700 mb-4 border-b pb-2 flex items-center gap-2"><ShoppingCart size={18}/> Resumo do Pedido</h3>
             <div className="flex-1 space-y-3 overflow-y-auto mb-4">
                {cart.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{item.quantity} x {formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className="font-black text-slate-700">{formatCurrency(item.price * item.quantity)}</span>
                       <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50">
                    <UtensilsCrossed size={48}/>
                    <p className="font-bold uppercase text-xs">Carrinho Vazio</p>
                  </div>
                )}
             </div>
             <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between font-bold text-slate-600"><span>Subtotal:</span><span>{formatCurrency(cart.reduce((a,b)=>a+(b.price*b.quantity), 0))}</span></div>
                <button 
                  onClick={() => handleSaveOrder(cart, waiter, orderType)}
                  disabled={cart.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-200 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <Save size={20}/> ENVIAR PARA COZINHA
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderComandaDetail = () => {
    if (!selectedTable) return null;
    const order = orders.find(o => o.tableId === selectedTable.id);
    if (!order) return <div className="text-center p-20 text-slate-400 font-bold uppercase">Mesa Ocupada sem comanda ativa (Erro de Sistema)</div>;

    return (
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black">{selectedTable.number}</div>
                <div>
                   <h2 className="text-xl font-black uppercase tracking-tighter">Detalhes da Comanda</h2>
                   <p className="text-xs text-blue-400 font-bold uppercase">Garçom: {order.waiterName} • Aberta há 25 min</p>
                </div>
            </div>
            <button onClick={() => { setActiveInternalView('GRID'); setSelectedTable(null); }} className="p-2 hover:bg-slate-800 rounded-full transition"><X/></button>
        </div>

        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2"><Receipt size={16}/> Consumo Registado</h3>
                <button className="text-blue-600 font-bold text-xs flex items-center gap-1 hover:underline"><Plus size={14}/> Adicionar mais itens</button>
            </div>

            <div className="space-y-3 mb-8">
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                        <div className="flex items-center gap-4">
                            <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center font-black border text-slate-500">{item.quantity}</div>
                            <div>
                               <p className="font-bold text-slate-800">{item.name}</p>
                               <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${item.status === 'READY' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                   {item.status === 'READY' ? 'Pronto para Servir' : 'Em Preparo'}
                               </span>
                            </div>
                        </div>
                        <div className="text-right">
                           <p className="font-black text-slate-700">{formatCurrency(item.price * item.quantity)}</p>
                           <p className="text-[10px] text-slate-400 italic">{item.observations || ''}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 text-white">
                <div className="flex justify-between items-center mb-6">
                   <div className="space-y-1">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Parcial</p>
                      <h4 className="text-4xl font-black">{formatCurrency(order.items.reduce((a,b)=>a+(b.price*b.quantity), 0))}</h4>
                   </div>
                   <div className="text-right space-y-2">
                       <button onClick={() => window.print()} className="flex items-center gap-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition-all"><Printer size={16}/> Imprimir Prévia</button>
                       <p className="text-[10px] text-slate-500 italic uppercase">Taxa de Serviço (10%) não inclusa</p>
                   </div>
                </div>
                <button 
                  onClick={() => setActiveInternalView('PAYMENT')}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-2xl text-xl shadow-2xl transition transform active:scale-95 flex items-center justify-center gap-3"
                >
                    <DollarSign size={24}/> FECHAR CONTA E RECEBER
                </button>
            </div>
        </div>
      </div>
    );
  };

  const renderPayment = () => {
    if (!selectedTable) return null;
    const order = orders.find(o => o.tableId === selectedTable.id);
    if (!order) return null;

    const subtotal = order.items.reduce((a,b)=>a+(b.price*b.quantity), 0);
    const serviceFee = subtotal * 0.10;
    const total = subtotal + serviceFee;

    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl border-4 border-slate-900 overflow-hidden animate-in fade-in duration-300">
         <div className="bg-slate-900 text-white p-6 text-center">
            <h2 className="text-xl font-black uppercase tracking-widest">Pagamento</h2>
            <p className="text-blue-400 font-bold text-xs">Mesa {selectedTable.number}</p>
         </div>
         <div className="p-8 space-y-6">
            <div className="space-y-2 border-b pb-4 border-dashed">
               <div className="flex justify-between text-sm text-slate-500"><span>Consumo</span><span>{formatCurrency(subtotal)}</span></div>
               <div className="flex justify-between text-sm text-slate-500"><span>Taxa Serviço (10%)</span><span>{formatCurrency(serviceFee)}</span></div>
               <div className="flex justify-between text-xl font-black text-slate-900 pt-2"><span>TOTAL</span><span>{formatCurrency(total)}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               {['CASH', 'MULTICAIXA', 'TRANSFER'].map(m => (
                 <button key={m} className="p-4 border-2 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition font-black text-[10px] uppercase text-slate-600">
                    {m === 'CASH' ? '💵 Dinheiro' : m === 'MULTICAIXA' ? '💳 Multicaixa' : '🏦 Transf.'}
                 </button>
               ))}
            </div>

            <button 
              onClick={() => handleCloseAccount(order.id, 'CASH')}
              className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-lg shadow-xl"
            >
               FINALIZAR PAGAMENTO
            </button>
            <button onClick={() => setActiveInternalView('COMANDA')} className="w-full text-slate-400 font-bold text-xs uppercase hover:text-slate-600 transition">Cancelar e Voltar</button>
         </div>
      </div>
    );
  };

  const renderKDS = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center shadow-lg">
            <h2 className="text-xl font-bold flex items-center gap-2"><CookingPot className="text-orange-400"/> Kitchen Display System (KDS)</h2>
            <div className="flex gap-4">
               <div className="text-xs font-bold bg-slate-800 px-3 py-1 rounded-full text-blue-400">{orders.length} Comandas Ativas</div>
               <div className="text-xs font-bold bg-slate-800 px-3 py-1 rounded-full text-green-400">92% Eficiência</div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((order, i) => (
                <div key={i} className={`bg-white rounded-2xl shadow-md border-t-8 ${order.status === 'PREPARING' ? 'border-orange-500' : 'border-emerald-500'} overflow-hidden h-fit`}>
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                        <div>
                           <span className="font-black text-lg">Mesa {order.tableNumber}</span>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Garçom: {order.waiterName}</p>
                        </div>
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1"><Clock size={14}/> 12:04</span>
                    </div>
                    <div className="p-4 space-y-2">
                        {order.items.map((it, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-sm font-medium border-b border-slate-50 pb-2 last:border-0">
                                <div className="mt-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div></div>
                                <div>
                                   <p className="text-slate-800">{it.name} <span className="font-black text-blue-600">x{it.quantity}</span></p>
                                   <p className="text-[10px] text-red-500 font-bold italic">{it.observations || ''}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-50 border-t grid grid-cols-2 gap-2">
                        <button className="bg-slate-200 text-slate-600 py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-slate-300">Em Preparo</button>
                        <button className="bg-emerald-600 text-white py-2 rounded-lg font-bold text-[10px] uppercase hover:bg-emerald-700 shadow-sm">Pronto</button>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
               <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="text-blue-600"/> Inteligência de Restaurante</h2>
               <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Relatórios Gerenciais e Performance</p>
            </div>
            <div className="flex gap-2">
                <button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200 flex items-center gap-2"><Download size={14}/> Excel</button>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-2"><Printer size={14}/> Imprimir Tudo</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 text-xs uppercase tracking-tighter">Vendas por Período</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <div><p className="text-[9px] font-bold text-slate-400 uppercase">Hoje</p><p className="text-lg font-black text-slate-800">{formatCurrency(45800)}</p></div>
                      <span className="text-[10px] text-emerald-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">+12%</span>
                   </div>
                   <div className="flex justify-between items-end">
                      <div><p className="text-[9px] font-bold text-slate-400 uppercase">Esta Semana</p><p className="text-lg font-black text-slate-800">{formatCurrency(312450)}</p></div>
                      <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full">-4%</span>
                   </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 text-xs uppercase tracking-tighter">Produtos mais Vendidos</h3>
                <div className="space-y-3">
                   {['Hambúrguer Especial', 'Pizza Calabresa G', 'Coca-Cola 1.5L'].map((p, i) => (
                     <div key={i} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-600">{i+1}º {p}</span>
                        <span className="font-black bg-slate-100 px-2 py-1 rounded">{80 - i*15} un</span>
                     </div>
                   ))}
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 text-xs uppercase tracking-tighter">Performance de Garçom</h3>
                <div className="space-y-3">
                   <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-600">Carlos (Turno A)</span>
                        <span className="font-black text-blue-600">{formatCurrency(125000)}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-600">Marta (Turno B)</span>
                        <span className="font-black text-blue-600">{formatCurrency(98400)}</span>
                   </div>
                </div>
            </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl">
             <div className="bg-slate-50 p-4 border-b font-bold uppercase text-xs text-slate-700">Relatório de Baixa de Stock Automática (Via Ficha Técnica)</div>
             <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-white font-bold uppercase text-[10px]">
                    <tr><th className="p-4">Artigo Vendido</th><th className="p-4">Qtd</th><th className="p-4">Ingrediente Baixado</th><th className="p-4">Armazém</th><th className="p-4 text-center">Status Stock</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <tr>
                       <td className="p-4 font-bold">Pizza Calabresa G</td>
                       <td className="p-4">1</td>
                       <td className="p-4">Massa (400g), Queijo (200g), Calabresa (150g)</td>
                       <td className="p-4">Cozinha Central</td>
                       <td className="p-4 text-center"><span className="text-emerald-600 font-bold bg-green-50 px-2 py-1 rounded">Normal</span></td>
                    </tr>
                    <tr>
                       <td className="p-4 font-bold">Hambúrguer Especial</td>
                       <td className="p-4">2</td>
                       <td className="p-4">Pão (2), Carne (2), Bacon (100g)</td>
                       <td className="p-4">Cozinha Central</td>
                       <td className="p-4 text-center"><span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">Baixo</span></td>
                    </tr>
                </tbody>
             </table>
        </div>
    </div>
  );

  const renderContent = () => {
    switch (currentSubView) {
      case 'RESTAURANT_TABLES':
        if (activeInternalView === 'ORDER_FORM') return renderOrderForm();
        if (activeInternalView === 'COMANDA') return renderComandaDetail();
        if (activeInternalView === 'PAYMENT') return renderPayment();
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Quick Action Dashboard Area */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
               <button onClick={() => { setSelectedTable(tables[0]); setActiveInternalView('ORDER_FORM'); }} className="bg-blue-600 text-white p-6 rounded-3xl flex flex-col items-center gap-3 shadow-xl shadow-blue-200 hover:scale-105 transition transform">
                  <PlusCircle size={32}/>
                  <span className="font-black uppercase text-xs tracking-widest">Novo Pedido</span>
               </button>
               <button onClick={() => setActiveInternalView('GRID')} className="bg-white text-slate-800 p-6 rounded-3xl flex flex-col items-center gap-3 shadow-md border border-slate-200 hover:bg-slate-50 transition">
                  <Monitor size={32} className="text-slate-400"/>
                  <span className="font-black uppercase text-xs tracking-widest">Monitor Mesas</span>
               </button>
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center">
                  <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Mesas Ocupadas</p>
                  <p className="text-3xl font-black text-slate-800">{tables.filter(t => t.status === 'OCCUPIED').length}</p>
               </div>
               <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center">
                  <p className="text-slate-400 text-[10px] font-black uppercase mb-1">Pedidos no KDS</p>
                  <p className="text-3xl font-black text-orange-500">{orders.length}</p>
               </div>
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Table className="text-blue-600"/> Mapa de Salão</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Clique em uma mesa para abrir pedido ou ver comanda</p>
                </div>
                <div className="flex gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-bold"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Livre</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Ocupada</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold"><div className="w-3 h-3 bg-slate-400 rounded-full"></div> Reservada</span>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {tables.map(table => (
                    <div 
                        key={table.id}
                        onClick={() => handleTableClick(table)}
                        className={`
                            p-6 rounded-2xl border-4 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer hover:scale-105 shadow-md group
                            ${table.status === 'AVAILABLE' ? 'bg-white border-slate-100 hover:border-emerald-500' : 
                                table.status === 'OCCUPIED' ? 'bg-red-50 border-red-200 hover:border-red-500' :
                                table.status === 'RESERVED' ? 'bg-slate-100 border-slate-200' :
                                'bg-slate-50 border-slate-200'}
                        `}
                    >
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-800 transition-colors">Mesa</span>
                        <span className={`text-5xl font-black ${table.status === 'OCCUPIED' ? 'text-red-600' : 'text-slate-800'}`}>{table.number}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{table.capacity} Lugares</span>
                        {table.currentOrderValue && table.currentOrderValue > 0 ? (
                            <div className="bg-red-600 text-white px-3 py-1 rounded-full text-[11px] font-black mt-2 shadow-lg animate-pulse">
                                {formatCurrency(table.currentOrderValue)}
                            </div>
                        ) : (
                           <div className="text-[10px] text-emerald-500 font-black uppercase mt-2">Disponível</div>
                        )}
                    </div>
                ))}
            </div>
          </div>
        );

      case 'RESTAURANT_KDS': return renderKDS();
      case 'RESTAURANT_PRODUCTION': return renderReports();
      default: return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
            <div onClick={() => {}} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center flex flex-col items-center gap-4 hover:shadow-xl transition-all group cursor-pointer">
                <div className="p-5 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><ScrollText size={40}/></div>
                <div><h3 className="text-xl font-black uppercase tracking-tighter">Cardápio Digital</h3><p className="text-sm text-slate-500 font-bold uppercase tracking-widest text-[10px]">Gestão de pratos e QR Code</p></div>
            </div>
            <div onClick={() => {}} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center flex flex-col items-center gap-4 hover:shadow-xl transition-all group cursor-pointer">
                <div className="p-5 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-colors"><Table size={40}/></div>
                <div><h3 className="text-xl font-black uppercase tracking-tighter">Mapa de Salão</h3><p className="text-sm text-slate-500 font-bold uppercase tracking-widest text-[10px]">Mesas e Comandas</p></div>
            </div>
            <div onClick={() => {}} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center flex flex-col items-center gap-4 hover:shadow-xl transition-all group cursor-pointer">
                <div className="p-5 bg-red-50 text-red-600 rounded-2xl group-hover:bg-red-600 group-hover:text-white transition-colors"><CookingPot size={40}/></div>
                <div><h3 className="text-xl font-black uppercase tracking-tighter">Cozinha</h3><p className="text-sm text-slate-500 font-bold uppercase tracking-widest text-[10px]">Monitor de Pedidos KDS</p></div>
            </div>
        </div>
      );
    }
  };

  return <div className="space-y-6">{renderContent()}</div>;
};

export default RestaurantManagement;
