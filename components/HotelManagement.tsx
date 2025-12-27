
import React, { useState, useMemo } from 'react';
import { 
  Building2, BedDouble, Calendar, CheckCircle, X, Search, 
  MapPin, UserPlus, LogIn, LogOut, Brush, Waves, CreditCard,
  ChevronRight, Filter, ShieldCheck, ListChecks, Info, 
  DollarSign, Receipt, Save, Printer, Download, BarChart3, 
  Clock, AlertTriangle, Coffee, ShoppingCart, User
} from 'lucide-react';
import { HotelRoom, HotelReservation, HotelConsumption, ViewState } from '../types';
import { formatDate, formatCurrency, generateId } from '../utils';

interface HotelManagementProps {
  currentSubView: ViewState;
}

const HotelManagement: React.FC<HotelManagementProps> = ({ currentSubView }) => {
  // --- STATE ---
  const [activeInternalView, setActiveInternalView] = useState<'DASHBOARD' | 'RESERVATION_FORM' | 'CHECKIN_LIST' | 'GOVERNANCE' | 'CHECKOUT' | 'REPORTS'>('DASHBOARD');
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<HotelReservation | null>(null);
  
  // Mock Data
  const [rooms, setRooms] = useState<HotelRoom[]>([
    { id: '101', number: '101', type: 'SINGLE', status: 'AVAILABLE', dailyRate: 15000 },
    { id: '102', number: '102', type: 'DOUBLE', status: 'OCCUPIED', dailyRate: 25000 },
    { id: '103', number: '103', type: 'SUITE', status: 'CLEANING', dailyRate: 45000 },
    { id: '201', number: '201', type: 'DOUBLE', status: 'RESERVED', dailyRate: 25000 },
    { id: '202', number: '202', type: 'MASTER', status: 'AVAILABLE', dailyRate: 75000 },
    { id: '203', number: '203', type: 'SUITE', status: 'AVAILABLE', dailyRate: 45000 },
  ]);

  const [reservations, setReservations] = useState<HotelReservation[]>([
    { id: 'RES-001', guestName: 'Ricardo Pereira', roomId: '102', checkIn: '2024-05-20', checkOut: '2024-05-25', guestCount: 2, status: 'CHECKED_IN', totalValue: 125000 },
    { id: 'RES-002', guestName: 'Ana Silva', roomId: '201', checkIn: '2024-05-22', checkOut: '2024-05-24', guestCount: 1, status: 'CONFIRMED', totalValue: 50000 }
  ]);

  const [consumptions, setConsumptions] = useState<HotelConsumption[]>([
    { id: 'c1', reservationId: 'RES-001', description: 'Pequeno Almoço VIP', category: 'RESTAURANT', quantity: 1, unitPrice: 3500, total: 3500, date: '2024-05-21' },
    { id: 'c2', reservationId: 'RES-001', description: 'Lavandaria (Camisas)', category: 'LAUNDRY', quantity: 2, unitPrice: 2000, total: 4000, date: '2024-05-21' }
  ]);

  // --- ACTIONS ---

  const handleCreateReservation = (data: Partial<HotelReservation>) => {
      const newRes: HotelReservation = {
          id: `RES-${Math.floor(1000 + Math.random() * 9000)}`,
          guestName: data.guestName!,
          guestDoc: data.guestDoc,
          roomId: data.roomId!,
          checkIn: data.checkIn!,
          checkOut: data.checkOut!,
          guestCount: data.guestCount || 1,
          status: 'CONFIRMED',
          totalValue: data.totalValue || 0
      };
      setReservations([...reservations, newRes]);
      setRooms(rooms.map(r => r.id === data.roomId ? { ...r, status: 'RESERVED' } : r));
      setActiveInternalView('DASHBOARD');
      alert("Reserva confirmada com sucesso!");
  };

  const handleCheckIn = (resId: string) => {
      const res = reservations.find(r => r.id === resId);
      if (!res) return;
      setReservations(reservations.map(r => r.id === resId ? { ...r, status: 'CHECKED_IN' } : r));
      setRooms(rooms.map(r => r.id === res.roomId ? { ...r, status: 'OCCUPIED' } : r));
      alert(`Check-in realizado para ${res.guestName}. Quarto ${res.roomId} ocupado.`);
  };

  const handleCheckOut = (resId: string) => {
      const res = reservations.find(r => r.id === resId);
      if (!res) return;
      setReservations(reservations.map(r => r.id === resId ? { ...r, status: 'CHECKED_OUT' } : r));
      setRooms(rooms.map(r => r.id === res.roomId ? { ...r, status: 'CLEANING' } : r));
      setActiveInternalView('DASHBOARD');
      alert("Check-out finalizado. Quarto enviado para Governança.");
  };

  const handleSetRoomClean = (roomId: string) => {
      setRooms(rooms.map(r => r.id === roomId ? { ...r, status: 'AVAILABLE' } : r));
      alert(`Quarto ${roomId} marcado como LIMPO e liberado para uso.`);
  };

  // --- SUB-VIEWS ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Quick Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quartos Livres</p>
              <h3 className="text-3xl font-black text-emerald-600">{rooms.filter(r => r.status === 'AVAILABLE').length}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ocupados</p>
              <h3 className="text-3xl font-black text-blue-600">{rooms.filter(r => r.status === 'OCCUPIED').length}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reservas Hoje</p>
              <h3 className="text-3xl font-black text-purple-600">{reservations.filter(r => r.status === 'CONFIRMED').length}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Em Limpeza</p>
              <h3 className="text-3xl font-black text-orange-500">{rooms.filter(r => r.status === 'CLEANING').length}</h3>
          </div>
      </div>

      {/* Main Actions Panel */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white grid grid-cols-1 md:grid-cols-4 gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl"></div>
          <button onClick={() => setActiveInternalView('RESERVATION_FORM')} className="bg-white/10 hover:bg-white/20 p-6 rounded-2xl flex flex-col items-center gap-4 transition group border border-white/5">
              <UserPlus size={32} className="text-blue-400 group-hover:scale-110 transition-transform"/>
              <span className="font-black uppercase text-xs tracking-widest">Nova Reserva</span>
          </button>
          <button onClick={() => setActiveInternalView('CHECKIN_LIST')} className="bg-white/10 hover:bg-white/20 p-6 rounded-2xl flex flex-col items-center gap-4 transition group border border-white/5">
              <LogIn size={32} className="text-emerald-400 group-hover:scale-110 transition-transform"/>
              <span className="font-black uppercase text-xs tracking-widest">Check-in</span>
          </button>
          <button onClick={() => setActiveInternalView('GOVERNANCE')} className="bg-white/10 hover:bg-white/20 p-6 rounded-2xl flex flex-col items-center gap-4 transition group border border-white/5">
              <Brush size={32} className="text-orange-400 group-hover:scale-110 transition-transform"/>
              <span className="font-black uppercase text-xs tracking-widest">Governança</span>
          </button>
          <button onClick={() => setActiveInternalView('REPORTS')} className="bg-white/10 hover:bg-white/20 p-6 rounded-2xl flex flex-col items-center gap-4 transition group border border-white/5">
              <BarChart3 size={32} className="text-purple-400 group-hover:scale-110 transition-transform"/>
              <span className="font-black uppercase text-xs tracking-widest">Relatórios</span>
          </button>
      </div>

      {/* Room Map Dashboard */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><MapPin className="text-blue-600"/> Mapa de Quartos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {rooms.map(room => (
                <div 
                    key={room.id}
                    onClick={() => {
                        if (room.status === 'OCCUPIED') {
                            const res = reservations.find(r => r.roomId === room.id && r.status === 'CHECKED_IN');
                            if (res) { setSelectedReservation(res); setActiveInternalView('CHECKOUT'); }
                        }
                    }}
                    className={`
                        p-5 rounded-3xl border-4 flex flex-col transition-all cursor-pointer hover:scale-105 shadow-md group h-40
                        ${room.status === 'AVAILABLE' ? 'bg-white border-slate-50 hover:border-emerald-500' : 
                            room.status === 'OCCUPIED' ? 'bg-blue-50 border-blue-200 hover:border-blue-500' :
                            room.status === 'RESERVED' ? 'bg-purple-50 border-purple-200' :
                            room.status === 'CLEANING' ? 'bg-orange-50 border-orange-200 hover:border-orange-500' :
                            'bg-red-50 border-red-200'}
                    `}
                >
                    <div className="flex justify-between items-start mb-auto">
                        <span className="text-2xl font-black text-slate-800">{room.number}</span>
                        <span className="text-[9px] font-black uppercase bg-slate-800/10 px-2 py-0.5 rounded">{room.type}</span>
                    </div>
                    
                    <div className="mt-auto">
                        {room.status === 'OCCUPIED' ? (
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">Ocupado</p>
                                <p className="text-[10px] font-bold text-slate-600 truncate">{reservations.find(r => r.roomId === room.id && r.status === 'CHECKED_IN')?.guestName}</p>
                            </div>
                        ) : room.status === 'AVAILABLE' ? (
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Disponível</p>
                        ) : room.status === 'RESERVED' ? (
                            <p className="text-[9px] font-black text-purple-600 uppercase tracking-tighter">Reservado</p>
                        ) : (
                            <p className="text-[9px] font-black text-orange-600 uppercase tracking-tighter">Em Limpeza</p>
                        )}
                        <p className="font-black text-slate-700 mt-1">{formatCurrency(room.dailyRate)}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderReservationForm = () => {
    const [guestName, setGuestName] = useState('');
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [roomId, setRoomId] = useState('');
    const [guestCount, setGuestCount] = useState(1);

    const availableRooms = rooms.filter(r => r.status === 'AVAILABLE');

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-right duration-300">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2"><Calendar className="text-blue-400"/> Nova Reserva</h2>
                <button onClick={() => setActiveInternalView('DASHBOARD')} className="p-2 hover:bg-slate-800 rounded-full transition"><X/></button>
            </div>
            <div className="p-10 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nome do Hóspede *</label>
                        <input className="w-full p-4 border-2 border-slate-100 rounded-2xl text-lg font-bold outline-none focus:border-blue-600 transition" placeholder="Nome Completo" value={guestName} onChange={e => setGuestName(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Entrada (Check-in)</label>
                        <input type="date" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Saída (Check-out)</label>
                        <input type="date" className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Quantidade de Hóspedes</label>
                        <input type="number" className="w-full p-4 border-2 border-slate-100 rounded-2xl text-center font-black" value={guestCount} onChange={e => setGuestCount(Number(e.target.value))} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Quarto Disponível</label>
                        <select className="w-full p-4 border-2 border-slate-100 rounded-2xl font-bold bg-slate-50" value={roomId} onChange={e => setRoomId(e.target.value)}>
                            <option value="">Seleccione o Quarto...</option>
                            {availableRooms.map(r => <option key={r.id} value={r.id}>Quarto {r.number} - {r.type} ({formatCurrency(r.dailyRate)})</option>)}
                        </select>
                    </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100 flex items-start gap-4">
                    <Info className="text-blue-600 mt-1" size={24}/>
                    <div>
                        <h4 className="font-black text-blue-900 uppercase text-xs mb-1">Verificação Automática</h4>
                        <p className="text-sm text-blue-700 leading-relaxed">O sistema verifica conflitos de datas e capacidade máxima do quarto selecionado em tempo real.</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => setActiveInternalView('DASHBOARD')} className="flex-1 py-5 border-4 border-slate-100 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-xs hover:bg-slate-50 transition">Cancelar</button>
                    <button 
                        onClick={() => handleCreateReservation({ guestName, checkIn, checkOut, roomId, guestCount, totalValue: (rooms.find(r => r.id === roomId)?.dailyRate || 0) * 2 })}
                        disabled={!guestName || !roomId || !checkIn || !checkOut}
                        className="flex-[2] py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl transition transform active:scale-95 disabled:opacity-50"
                    >
                        Confirmar Reserva
                    </button>
                </div>
            </div>
        </div>
    );
  };

  const renderCheckInList = () => (
      <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><LogIn className="text-emerald-600"/> Esperados para Hoje</h2>
              <div className="relative w-64">
                   <Search className="absolute left-2 top-2.5 text-slate-400" size={16}/>
                   <input className="w-full pl-8 p-2 border rounded-lg text-sm" placeholder="Pesquisar reserva..."/>
              </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
              {reservations.filter(r => r.status === 'CONFIRMED').map(res => (
                  <div key={res.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center group hover:shadow-xl transition-all">
                      <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl">{rooms.find(r => r.id === res.roomId)?.number}</div>
                          <div>
                              <h3 className="font-black text-lg text-slate-800">{res.guestName}</h3>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Check-in: {formatDate(res.checkIn)} • {res.guestCount} Hóspedes</p>
                          </div>
                      </div>
                      <div className="flex gap-3 mt-4 md:mt-0">
                          <button onClick={() => handleCheckIn(res.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition transform active:scale-95">Realizar Check-in</button>
                      </div>
                  </div>
              ))}
              {reservations.filter(r => r.status === 'CONFIRMED').length === 0 && (
                  <div className="py-20 text-center text-slate-400 font-black uppercase tracking-[5px] bg-white rounded-3xl border-4 border-dashed border-slate-100">Sem chegadas previstas</div>
              )}
          </div>
      </div>
  );

  const renderGovernance = () => (
      <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center">
              <div>
                  <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><Brush className="text-orange-500"/> Governança & Limpeza</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase mt-1">Gestão de estado de arrumação dos quartos</p>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.filter(r => r.status === 'CLEANING' || r.status === 'MAINTENANCE').map(room => (
                  <div key={room.id} className="bg-white rounded-3xl shadow-md border-t-8 border-orange-500 overflow-hidden">
                      <div className="p-6">
                          <div className="flex justify-between mb-4">
                              <span className="text-3xl font-black text-slate-800">{room.number}</span>
                              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{room.status}</span>
                          </div>
                          <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">Este quarto aguarda higienização completa para retornar ao status de disponível.</p>
                          <button onClick={() => handleSetRoomClean(room.id)} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition shadow-lg flex items-center justify-center gap-2">
                              <CheckCircle size={18}/> Marcar como Limpo
                          </button>
                      </div>
                  </div>
              ))}
              {rooms.filter(r => r.status === 'CLEANING' || r.status === 'MAINTENANCE').length === 0 && (
                  <div className="col-span-full py-20 text-center text-emerald-500 font-black uppercase tracking-[5px] bg-emerald-50 rounded-3xl border-4 border-dashed border-emerald-100 flex flex-col items-center gap-4">
                      <CheckCircle size={48}/>
                      Todos os quartos estão limpos
                  </div>
              )}
          </div>
      </div>
  );

  const renderCheckOut = () => {
      if (!selectedReservation) return null;
      const room = rooms.find(r => r.id === selectedReservation.roomId);
      const resConsumptions = consumptions.filter(c => c.reservationId === selectedReservation.id);
      const consumptionTotal = resConsumptions.reduce((acc, c) => acc + c.total, 0);
      const totalToPay = selectedReservation.totalValue + consumptionTotal;

      return (
          <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black">{room?.number}</div>
                      <div>
                          <h2 className="text-xl font-black uppercase tracking-widest">Encerramento de Estadia</h2>
                          <p className="text-xs text-blue-400 font-bold uppercase">{selectedReservation.guestName}</p>
                      </div>
                  </div>
                  <button onClick={() => setActiveInternalView('DASHBOARD')} className="p-2 hover:bg-slate-800 rounded-full transition"><X/></button>
              </div>

              <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-7 space-y-8">
                      <div>
                          <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b pb-2 mb-4 flex items-center gap-2"><Info size={16}/> Resumo de Estadia</h3>
                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-50 p-4 rounded-2xl border">
                                  <p className="text-[9px] font-black text-slate-400 uppercase">Check-in</p>
                                  <p className="font-bold text-slate-700">{formatDate(selectedReservation.checkIn)}</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl border">
                                  <p className="text-[9px] font-black text-slate-400 uppercase">Check-out</p>
                                  <p className="font-bold text-slate-700">{formatDate(selectedReservation.checkOut)}</p>
                              </div>
                              <div className="col-span-2 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center">
                                  <span className="font-bold text-blue-900">Total Diárias</span>
                                  <span className="font-black text-blue-900">{formatCurrency(selectedReservation.totalValue)}</span>
                              </div>
                          </div>
                      </div>

                      <div>
                          <div className="flex justify-between items-center border-b pb-2 mb-4">
                             <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2"><Coffee size={16}/> Consumo e Extras</h3>
                             <button className="text-blue-600 font-black text-[10px] uppercase hover:underline">+ Adicionar Consumo</button>
                          </div>
                          <div className="space-y-2">
                              {resConsumptions.map(c => (
                                  <div key={c.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border hover:border-blue-300 transition-colors">
                                      <div>
                                          <p className="font-bold text-slate-800">{c.description}</p>
                                          <p className="text-[10px] text-slate-400 font-bold uppercase">{c.category} • {c.date}</p>
                                      </div>
                                      <span className="font-black text-slate-700">{formatCurrency(c.total)}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="lg:col-span-5">
                      <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl space-y-6 sticky top-24">
                          <div className="space-y-4 border-b border-white/10 pb-6">
                              <div className="flex justify-between text-slate-400 text-xs font-bold uppercase"><span>Diárias</span><span>{formatCurrency(selectedReservation.totalValue)}</span></div>
                              <div className="flex justify-between text-slate-400 text-xs font-bold uppercase"><span>Consumo</span><span>{formatCurrency(consumptionTotal)}</span></div>
                              <div className="flex justify-between text-white text-2xl font-black uppercase pt-2"><span>Total</span><span>{formatCurrency(totalToPay)}</span></div>
                          </div>
                          
                          <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Forma de Pagamento</label>
                              <div className="grid grid-cols-2 gap-2">
                                  <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white hover:text-slate-900 transition font-black text-[10px] uppercase">💵 Dinheiro</button>
                                  <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white hover:text-slate-900 transition font-black text-[10px] uppercase">💳 Multicaixa</button>
                              </div>
                          </div>

                          <button onClick={() => handleCheckOut(selectedReservation.id)} className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-900/20 transition transform active:scale-95 flex items-center justify-center gap-3">
                              <DollarSign size={24}/> FECHAR CONTA
                          </button>
                          <button className="w-full py-3 text-slate-500 font-bold text-[10px] uppercase hover:text-white transition">Imprimir Extrato Prévio</button>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderReports = () => (
      <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex justify-between items-center">
              <div>
                  <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><BarChart3 className="text-blue-600"/> Inteligência Hoteleira</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase mt-1">Estatísticas de ocupação e performance financeira</p>
              </div>
              <div className="flex gap-2">
                  <button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200 flex items-center gap-2"><Download size={14}/> Excel</button>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-2"><Printer size={14}/> PDF</button>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b pb-2 flex items-center gap-2"><Waves className="text-blue-500"/> Taxa de Ocupação</h3>
                  <div className="flex items-center gap-6">
                      <div className="w-32 h-32 rounded-full border-[12px] border-blue-600 flex items-center justify-center">
                          <span className="text-2xl font-black text-slate-800">68%</span>
                      </div>
                      <div className="space-y-2 text-xs">
                          <p className="flex items-center gap-2 font-bold text-slate-600"><div className="w-3 h-3 bg-blue-600 rounded-full"></div> Ocupados: 4 Quartos</p>
                          <p className="flex items-center gap-2 font-bold text-slate-600"><div className="w-3 h-3 bg-slate-200 rounded-full"></div> Livres: 2 Quartos</p>
                          <p className="text-[10px] text-slate-400 italic mt-2">* Média do período selecionado</p>
                      </div>
                  </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest border-b pb-2 flex items-center gap-2"><DollarSign className="text-emerald-500"/> Faturamento por Tipo</h3>
                  <div className="space-y-4">
                      {['Suites', 'Double', 'Single'].map((type, i) => (
                          <div key={type} className="space-y-1">
                              <div className="flex justify-between text-[10px] font-black uppercase text-slate-500"><span>{type}</span><span>{80 - (i*15)}%</span></div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full bg-${i === 0 ? 'blue' : i === 1 ? 'emerald' : 'orange'}-500 transition-all`} style={{ width: `${80 - (i*15)}%` }}></div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
  );

  const renderContent = () => {
    switch (activeInternalView) {
      case 'RESERVATION_FORM': return renderReservationForm();
      case 'CHECKIN_LIST': return renderCheckInList();
      case 'GOVERNANCE': return renderGovernance();
      case 'CHECKOUT': return renderCheckOut();
      case 'REPORTS': return renderReports();
      default: return renderDashboard();
    }
  };

  return (
    <div className="space-y-6">
        {/* Navigation Breadcrumb inside Component */}
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            <Building2 size={12}/>
            <span>Hospedaria</span>
            <ChevronRight size={10}/>
            <span className="text-blue-600">{activeInternalView}</span>
        </div>
        
        {renderContent()}
    </div>
  );
};

export default HotelManagement;
