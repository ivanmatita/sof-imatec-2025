
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart as RePieChart, Pie, Cell 
} from 'recharts';
import { Invoice, InvoiceStatus } from '../types';
import { 
  TrendingUp, Search, Landmark, 
  ShieldCheck, Briefcase, BookOpen, Layout, ShoppingCart, 
  HeartHandshake, Shield, Activity, DollarSign, PieChart 
} from 'lucide-react';

interface DashboardProps {
  invoices: Invoice[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard: React.FC<DashboardProps> = ({ invoices }) => {
  
  const dataByStatus = [
    { name: 'Pago', value: invoices.filter(i => i.status === InvoiceStatus.PAID).length },
    { name: 'Pendente', value: invoices.filter(i => i.status === InvoiceStatus.PENDING).length },
    { name: 'Vencido', value: invoices.filter(i => i.status === InvoiceStatus.OVERDUE).length },
    { name: 'Rascunho', value: invoices.filter(i => i.status === InvoiceStatus.DRAFT).length },
  ];

  const monthlyData = [
    { name: 'Jan', amount: 4000 },
    { name: 'Fev', amount: 3000 },
    { name: 'Mar', amount: 2000 },
    { name: 'Abr', amount: 2780 },
    { name: 'Mai', amount: 1890 },
    { name: 'Jun', amount: 2390 },
    { name: 'Jul', amount: 3490 },
  ];

  const usefulLinks = [
    { 
        label: "NIF AGT", 
        url: "https://portaldocontribuinte.minfin.gov.ao/consultar-nif-do-contribuinte", 
        icon: Search, 
        color: "bg-blue-700",
        tooltip: "Consultar NIF na AGT."
    },
    { 
        label: "CONTRIBUINTE", 
        url: "https://portaldocontribuinte.minfin.gov.ao/", 
        icon: Landmark, 
        color: "bg-indigo-700",
        tooltip: "Portal oficial da AGT."
    },
    { 
        label: "INSS", 
        url: "https://virtual.inss.gov.ao/", 
        icon: ShieldCheck, 
        color: "bg-emerald-700",
        tooltip: "Portal Segurança Social."
    },
    { 
        label: "RENT", 
        url: "https://www.inefop.gov.ao/auth/home", 
        icon: Briefcase, 
        color: "bg-amber-700",
        tooltip: "Portal Nacional de Emprego."
    },
    { 
        label: "LEGISLAÇÃO", 
        url: "#", 
        icon: BookOpen, 
        color: "bg-slate-800",
        tooltip: "Códigos de Imposto atualizados."
    },
  ];

  const showcaseSections = [
    { title: "Gestão Empresarial", subtitle: "Controle Total", image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800", icon: Activity },
    { title: "Software POS", subtitle: "Vendas Ágeis", image: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?auto=format&fit=crop&q=80&w=800", icon: ShoppingCart },
    { title: "Finanças & Caixa", subtitle: "Fluxo Seguro", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800", icon: DollarSign },
    { title: "Satisfação Cliente", subtitle: "Fidelização", image: "https://images.unsplash.com/photo-1521791136064-7986c2959443?auto=format&fit=crop&q=80&w=800", icon: HeartHandshake },
    { title: "Confiança IMATEC", subtitle: "Parceria Sólida", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800", icon: Shield },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-[1600px] mx-auto">
      
      {/* Horizontal Toolbar Section - Compact and High Contrast */}
      <div className="flex flex-wrap gap-2 mb-2 print:hidden justify-center md:justify-start bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
          {usefulLinks.map((link, idx) => (
              <a 
                key={idx} 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-300 hover:bg-white hover:border-blue-600 transition-all duration-200"
              >
                  <div className={`p-1.5 ${link.color} text-white rounded-lg shadow-sm transition-transform group-hover:scale-110`}>
                      <link.icon size={16} />
                  </div>
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">{link.label}</span>
              </a>
          ))}
      </div>

      {/* SHOWCASE SECTION */}
      <section className="space-y-6">
          <div className="text-left space-y-2 mb-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <Layout className="text-blue-600" size={20}/> Ecossistema de Gestão IMATEC
              </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {showcaseSections.map((item, idx) => (
                  <div key={idx} className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-200 h-64 flex flex-col">
                      <div className="h-2/3 w-full overflow-hidden relative">
                          <img 
                            src={item.image} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                          <div className="absolute bottom-3 left-3">
                              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg transform -rotate-6 group-hover:rotate-0 transition-transform">
                                  <item.icon size={16}/>
                              </div>
                          </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-center text-center bg-white">
                          <h4 className="font-black text-slate-800 text-xs uppercase leading-tight tracking-tight">{item.title}</h4>
                          <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1 opacity-70">{item.subtitle}</p>
                      </div>
                      
                      <div className="absolute inset-0 bg-blue-900/90 flex flex-col items-center justify-center p-6 text-white text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <item.icon size={32} className="mb-2 text-blue-400"/>
                          <h3 className="font-black text-sm uppercase tracking-tighter mb-1">{item.title}</h3>
                          <p className="text-[9px] font-bold leading-relaxed opacity-80 uppercase tracking-wide">
                              Módulo certificado integrado.
                          </p>
                      </div>
                  </div>
              ))}
          </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-tighter flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600"/> Tendência de Volume
          </h3>
          <div className="w-full h-64 min-h-[256px] relative">
            <ResponsiveContainer width="100%" height={256} minWidth={0} minHeight={0}>
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-tighter flex items-center gap-2">
            <PieChart size={18} className="text-indigo-600"/> Estados Documentais
          </h3>
          <div className="w-full h-64 min-h-[256px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height={256} minWidth={0} minHeight={0}>
              <RePieChart>
                <Pie data={dataByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                  {dataByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
