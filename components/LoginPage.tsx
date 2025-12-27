
import React, { useState, useEffect } from 'react';
import { 
  Lock, Mail, CheckCircle, ArrowRight, BarChart3, Shield, 
  Smartphone, Globe, Users, Zap, Layout, Headphones, 
  Facebook, Instagram, Linkedin, Twitter,
  X, MapPin, Building2, Phone, User
} from 'lucide-react';
import { Company, User as UserType, LicensePlan } from '../types';
import { generateId } from '../utils';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  onRegister?: (company: Company, user: UserType) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LicensePlan | ''>('');
  const [regForm, setRegForm] = useState({
      companyName: '',
      nif: '',
      email: '',
      phone: '',
      address: '',
      adminName: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Simulate network delay for effect
    setTimeout(() => {
        if (!email || !password) {
            setError('Por favor, preencha todos os campos.');
            setIsLoading(false);
            return;
        }
        onLogin(email, password);
        // If login fails in parent, we might need a prop to signal error, 
        // but for now we reset loading if parent doesn't unmount
        setTimeout(() => setIsLoading(false), 1000); 
    }, 1500);
  };

  const openRegister = (plan: LicensePlan) => {
      setSelectedPlan(plan);
      setShowRegisterModal(true);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!regForm.companyName || !regForm.nif || !regForm.email || !regForm.adminName) {
          alert("Preencha todos os campos obrigatórios.");
          return;
      }

      if (!onRegister) {
          alert("Função de registo não disponível.");
          return;
      }

      const newCompany: Company = {
          id: generateId(),
          name: regForm.companyName,
          nif: regForm.nif,
          email: regForm.email,
          phone: regForm.phone,
          address: regForm.address || 'Luanda, Angola',
          regime: 'Geral',
          licensePlan: selectedPlan as LicensePlan,
          status: 'ACTIVE',
          validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          registrationDate: new Date().toISOString().split('T')[0]
      };

      const newAdmin: UserType = {
          id: generateId(),
          name: regForm.adminName,
          email: regForm.email,
          password: '123', // Default Password per requirements
          role: 'ADMIN',
          companyId: newCompany.id,
          permissions: [],
          createdAt: new Date().toISOString()
      };

      // Register and Auto Login
      onRegister(newCompany, newAdmin);
      onLogin(regForm.email, '123');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col relative">
      <style>{`
        @keyframes zoom-infinite {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-zoom-infinite {
          animation: zoom-infinite 30s infinite ease-in-out;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
        }
      `}</style>

      {/* HEADER / NAVIGATION */}
      <header className="fixed w-full top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-lg">
              IM
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">IMATEC</h1>
              <span className="text-[10px] font-bold text-blue-600 tracking-widest uppercase block">Software</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 uppercase tracking-wide">
            <a href="#inicio" className="hover:text-blue-600 transition-colors">Início</a>
            <a href="#sobre" className="hover:text-blue-600 transition-colors">Sobre Nós</a>
            <a href="#planos" className="hover:text-blue-600 transition-colors">Registar Empresa</a>
            <a href="#contacto" className="hover:text-blue-600 transition-colors">Contacto</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Consultoria</a>
            <a href="#login" className="hover:text-blue-600 transition-colors">Login</a>
            <a href="#" className="bg-slate-900 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors">ERP</a>
          </nav>

          <div className="hidden md:block">
             <button onClick={() => openRegister('STARTER')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5">
                Experimentar Grátis
             </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="inicio" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            <div 
                className="absolute inset-0 bg-cover bg-center animate-zoom-infinite"
                style={{ 
                    backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop")',
                }}
            ></div>
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/95 via-blue-900/80 to-transparent"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center h-full py-12">
            
            {/* Left Content */}
            <div className="text-white space-y-8 animate-in slide-in-from-left duration-700">
                <div className="inline-block px-3 py-1 rounded-full border border-blue-400 bg-blue-500/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wider mb-2">
                    Software Certificado AGT
                </div>
                
                <h1 className="text-5xl md:text-7xl font-black leading-tight">
                    Bem-vindo ao <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">IMATEC SOFTWARE</span>
                </h1>
                
                <p className="text-lg md:text-xl text-blue-100 max-w-xl leading-relaxed">
                    A solução completa para gestão empresarial em Angola. Faturação, Contabilidade, Stocks e Recursos Humanos numa plataforma moderna, segura e intuitiva.
                </p>

                <div className="flex flex-wrap gap-4">
                    <button onClick={() => window.location.href='#planos'} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-lg shadow-xl shadow-emerald-900/20 transition-all flex items-center gap-2 transform hover:-translate-y-1">
                        <Zap size={20}/> Registar Empresa
                    </button>
                    <button onClick={() => window.location.href='#login'} className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white rounded-lg font-bold text-lg backdrop-blur-sm transition-all flex items-center gap-2">
                        <Users size={20}/> Aceder ao Sistema
                    </button>
                </div>

                <div className="pt-8 border-t border-white/10 grid grid-cols-3 gap-8">
                    <div>
                        <div className="text-3xl font-black text-white mb-1">5k+</div>
                        <div className="text-xs uppercase font-bold text-blue-300">Empresas</div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white mb-1">99%</div>
                        <div className="text-xs uppercase font-bold text-blue-300">Satisfação</div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white mb-1">24/7</div>
                        <div className="text-xs uppercase font-bold text-blue-300">Suporte</div>
                    </div>
                </div>
            </div>

            {/* Right Content: Login Form */}
            <div id="login" className="flex justify-center lg:justify-end animate-in slide-in-from-right duration-700 delay-150">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative overflow-hidden group border border-slate-100">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
                    
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Aceder à Conta</h2>
                        <p className="text-slate-500 text-sm">Insira as suas credenciais para continuar.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium flex items-center gap-2 animate-in fade-in">
                                <Shield size={16}/> {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                            <div className="relative group-focus-within:text-blue-600 text-slate-400">
                                <Mail className="absolute left-3 top-3 transition-colors" size={20}/>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-800"
                                    placeholder="exemplo@imatec.ao"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Palavra-passe</label>
                            <div className="relative group-focus-within:text-blue-600 text-slate-400">
                                <Lock className="absolute left-3 top-3 transition-colors" size={20}/>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-800"
                                    placeholder="••••••••"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <Shield size={20}/> : <Shield size={20} className="opacity-50"/>}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                                <span className="text-slate-600">Lembrar-me</span>
                            </label>
                            <a href="#" className="text-blue-600 font-bold hover:underline">Esqueceu a senha?</a>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-black transition-all shadow-lg flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Entrar no Sistema <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-slate-500 text-sm">
                            Ainda não tem conta? <a href="#planos" className="text-emerald-600 font-bold hover:underline">Criar agora</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="sobre" className="py-24 bg-white">
          <div className="container mx-auto px-6">
              <div className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-2">Sobre Nós</h2>
                  <h3 className="text-4xl font-bold text-slate-900 mb-4">Tudo o que a sua empresa precisa para crescer</h3>
                  <p className="text-slate-500 text-lg">Sistema modular integrado que se adapta ao tamanho do seu negócio, desde a micro empresa à grande indústria.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                      { icon: <Shield size={32}/>, title: "100% Certificado", desc: "Software validado pela AGT (Angola) garantindo conformidade fiscal total." },
                      { icon: <BarChart3 size={32}/>, title: "Relatórios em Tempo Real", desc: "Acompanhe vendas, despesas e lucros em dashboards intuitivos e dinâmicos." },
                      { icon: <Smartphone size={32}/>, title: "Gestão POS Mobile", desc: "Venda em qualquer lugar com interface otimizada para tablets e telemóveis." },
                      { icon: <Globe size={32}/>, title: "Acesso na Nuvem", desc: "Aceda aos seus dados de forma segura a partir de qualquer dispositivo com internet." },
                      { icon: <Layout size={32}/>, title: "Multi-Empresa", desc: "Gerencie múltiplas empresas e filiais numa única plataforma centralizada." },
                      { icon: <Headphones size={32}/>, title: "Suporte Dedicado", desc: "Equipa de suporte pronta para ajudar a qualquer hora, todos os dias." },
                  ].map((feat, idx) => (
                      <div key={idx} className="p-8 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-xl transition-all duration-300 group">
                          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {feat.icon}
                          </div>
                          <h4 className="text-xl font-bold text-slate-800 mb-3">{feat.title}</h4>
                          <p className="text-slate-600 leading-relaxed">{feat.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* PLANS */}
      <section id="planos" className="py-24 bg-slate-900 text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-6 relative z-10">
              <div className="text-center mb-16">
                  <h2 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-2">Preços e Planos</h2>
                  <h3 className="text-4xl font-bold mb-4">Escolha o plano ideal para si</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  {/* Starter */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:border-white/30 transition-all">
                      <div className="mb-6">
                          <h4 className="text-xl font-bold mb-2">Starter</h4>
                          <p className="text-slate-400 text-sm">Para pequenos negócios e freelancers.</p>
                      </div>
                      <div className="text-4xl font-black mb-6">15.000 <span className="text-sm font-normal text-slate-400">Kz/mês</span></div>
                      <button onClick={() => openRegister('STARTER')} className="w-full py-3 rounded-lg border border-white/20 hover:bg-white hover:text-slate-900 font-bold transition-all mb-8">Começar Agora</button>
                      <ul className="space-y-4 text-sm text-slate-300">
                          <li className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-400"/> 1 Utilizador</li>
                          <li className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-400"/> Faturação Ilimitada</li>
                          <li className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-400"/> Suporte por Email</li>
                          <li className="flex items-center gap-3 text-slate-600"><X size={16}/> Gestão de Stock</li>
                      </ul>
                  </div>

                  {/* Professional */}
                  <div className="bg-gradient-to-b from-blue-900 to-slate-900 border border-blue-500 rounded-2xl p-8 transform md:-translate-y-4 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">Mais Popular</div>
                      <div className="mb-6">
                          <h4 className="text-xl font-bold mb-2 text-white">Profissional</h4>
                          <p className="text-blue-200 text-sm">Para empresas em crescimento.</p>
                      </div>
                      <div className="text-4xl font-black mb-6">35.000 <span className="text-sm font-normal text-blue-200">Kz/mês</span></div>
                      <button onClick={() => openRegister('PROFESSIONAL')} className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-bold transition-all mb-8 shadow-lg shadow-blue-900/50">Assinar Plano</button>
                      <ul className="space-y-4 text-sm text-blue-100">
                          <li className="flex items-center gap-3"><CheckCircle size={16} className="text-white"/> 5 Utilizadores</li>
                          <li className="flex items-center gap-3"><CheckCircle size={16} className="text-white"/> Gestão de Stock e Compras</li>
                          <li className="flex items-center gap-3"><CheckCircle size={16} className="text-white"/> Relatórios Avançados</li>
                          <li className="flex items-center gap-3"><CheckCircle size={16} className="text-white"/> Suporte Prioritário</li>
                      </ul>
                  </div>

                  {/* Enterprise */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:border-white/30 transition-all">
                      <div className="mb-6">
                          <h4 className="text-xl font-bold mb-2">Empresarial</h4>
                          <p className="text-slate-400 text-sm">Para grandes operações.</p>
                      </div>
                      <div className="text-4xl font-black mb-6">85.000 <span className="text-sm font-normal text-slate-400">Kz/mês</span></div>
                      <button onClick={() => openRegister('ENTERPRISE')} className="w-full py-3 rounded-lg border border-white/20 hover:bg-white hover:text-slate-900 font-bold transition-all mb-8">Contactar Vendas</button>
                      <ul className="space-y-4 text-sm text-slate-300">
                          <li className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-400"/> Utilizadores Ilimitados</li>
                          <li className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-400"/> Multi-armazém e Filiais</li>
                          <li className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-400"/> API de Integração</li>
                          <li className="flex items-center gap-3"><CheckCircle size={16} className="text-emerald-400"/> Gestor de Conta Dedicado</li>
                      </ul>
                  </div>
              </div>
          </div>
      </section>

      {/* FOOTER */}
      <footer id="contacto" className="bg-white border-t border-slate-200 pt-16 pb-8">
          <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                  <div className="col-span-1 md:col-span-1">
                      <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 bg-blue-900 rounded flex items-center justify-center text-white font-black">IM</div>
                          <span className="font-black text-slate-900 uppercase">IMATEC</span>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed">
                          Líderes em software de gestão em Angola. Simplificamos a sua faturação e contabilidade.
                      </p>
                  </div>
                  <div>
                      <h5 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-wider">Empresa</h5>
                      <ul className="space-y-2 text-sm text-slate-500">
                          <li><a href="#" className="hover:text-blue-600">Sobre Nós</a></li>
                          <li><a href="#" className="hover:text-blue-600">Carreiras</a></li>
                          <li><a href="#" className="hover:text-blue-600">Blog</a></li>
                          <li><a href="#" className="hover:text-blue-600">Imprensa</a></li>
                      </ul>
                  </div>
                  <div>
                      <h5 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-wider">Recursos</h5>
                      <ul className="space-y-2 text-sm text-slate-500">
                          <li><a href="#" className="hover:text-blue-600">Centro de Ajuda</a></li>
                          <li><a href="#" className="hover:text-blue-600">Documentação API</a></li>
                          <li><a href="#" className="hover:text-blue-600">Estado do Sistema</a></li>
                          <li><a href="#" className="hover:text-blue-600">Comunidade</a></li>
                      </ul>
                  </div>
                  <div>
                      <h5 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-wider">Contacto</h5>
                      <ul className="space-y-3 text-sm text-slate-500">
                          <li className="flex items-start gap-3">
                              <MapPin size={16} className="mt-0.5 text-blue-600"/>
                              <span>Rua Rainha Ginga, Edifício do Carmo, Luanda, Angola</span>
                          </li>
                          <li className="flex items-center gap-3">
                              <Smartphone size={16} className="text-blue-600"/>
                              <span>+244 923 000 000</span>
                          </li>
                          <li className="flex items-center gap-3">
                              <Mail size={16} className="text-blue-600"/>
                              <span>suporte@imatec.ao</span>
                          </li>
                      </ul>
                  </div>
              </div>

              <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                  <p className="text-xs text-slate-400">© 2025 Imatec Software. Todos os direitos reservados.</p>
                  <div className="flex gap-4">
                      <a href="#" className="text-slate-400 hover:text-blue-600 transition"><Facebook size={20}/></a>
                      <a href="#" className="text-slate-400 hover:text-pink-600 transition"><Instagram size={20}/></a>
                      <a href="#" className="text-slate-400 hover:text-blue-700 transition"><Linkedin size={20}/></a>
                      <a href="#" className="text-slate-400 hover:text-sky-500 transition"><Twitter size={20}/></a>
                  </div>
              </div>
          </div>
      </footer>

      {/* WHATSAPP FLOAT BUTTON */}
      <a 
        href="https://wa.me/244923000000" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[60] bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center animate-bounce"
        title="Fale Connosco no WhatsApp"
      >
          <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="css-i6dzq1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
      </a>

      {/* REGISTRATION MODAL */}
      {showRegisterModal && (
          <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                  <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                      <div>
                          <h3 className="font-bold text-xl flex items-center gap-2"><Building2 className="text-emerald-400"/> Registar Empresa</h3>
                          <p className="text-sm text-slate-400">Plano Selecionado: <span className="text-emerald-400 font-bold uppercase">{selectedPlan}</span></p>
                      </div>
                      <button onClick={() => setShowRegisterModal(false)} className="hover:bg-slate-800 p-2 rounded-full transition"><X size={24}/></button>
                  </div>
                  <form onSubmit={handleRegisterSubmit} className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="col-span-2 md:col-span-1">
                              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome da Empresa *</label>
                              <input required className="w-full border-2 border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition" placeholder="Sua Empresa Lda" value={regForm.companyName} onChange={e => setRegForm({...regForm, companyName: e.target.value})}/>
                          </div>
                          <div className="col-span-2 md:col-span-1">
                              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">NIF *</label>
                              <input required className="w-full border-2 border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition" placeholder="000000000" value={regForm.nif} onChange={e => setRegForm({...regForm, nif: e.target.value})}/>
                          </div>
                          <div className="col-span-2 md:col-span-1">
                              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Email (Login) *</label>
                              <input required type="email" className="w-full border-2 border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition" placeholder="admin@empresa.ao" value={regForm.email} onChange={e => setRegForm({...regForm, email: e.target.value})}/>
                          </div>
                          <div className="col-span-2 md:col-span-1">
                              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Telefone</label>
                              <input className="w-full border-2 border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition" placeholder="+244..." value={regForm.phone} onChange={e => setRegForm({...regForm, phone: e.target.value})}/>
                          </div>
                          <div className="col-span-2">
                              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Endereço</label>
                              <input className="w-full border-2 border-slate-200 rounded-lg p-3 outline-none focus:border-blue-500 transition" placeholder="Morada completa" value={regForm.address} onChange={e => setRegForm({...regForm, address: e.target.value})}/>
                          </div>
                          <div className="col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2"><User size={16}/> Administrador da Conta</h4>
                              <div>
                                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Responsável *</label>
                                  <input required className="w-full border-2 border-slate-200 rounded-lg p-3 bg-white outline-none focus:border-blue-500 transition" placeholder="Nome Completo" value={regForm.adminName} onChange={e => setRegForm({...regForm, adminName: e.target.value})}/>
                              </div>
                              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                  <Lock size={12}/> A palavra-passe padrão será: <strong>123</strong> (Altere após login)
                              </p>
                          </div>
                      </div>
                      <div className="pt-4 border-t flex justify-end gap-3">
                          <button type="button" onClick={() => setShowRegisterModal(false)} className="px-6 py-3 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
                          <button type="submit" className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-lg transition flex items-center gap-2">
                              <CheckCircle size={20}/> Concluir Registo
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default LoginPage;
