import React, { useState, useMemo, useEffect } from 'react';
import { Employee, WorkLocation, Profession } from '../types';
import { generateId, formatCurrency, calculateINSS, calculateIRT } from '../utils';
import { supabase } from '../services/supabaseClient';
import { 
  Users, UserPlus, Search, Filter, Printer, FileText, Trash2, Edit2, Eye, Ban, CheckCircle, 
  MapPin, Phone, Mail, Calendar, CreditCard, Building2, ChevronDown, X, Save, Upload, User, 
  RefreshCw, Database, AlertCircle, Info, Settings, Ruler, Gavel, Wallet, Gift, FileSignature, 
  UserCheck, UserMinus, MoreVertical, Calculator, ChevronRight
} from 'lucide-react';

interface EmployeesProps {
  employees: Employee[];
  onSaveEmployee: (emp: Employee) => void;
  workLocations: WorkLocation[];
  professions: Profession[];
  onIssueContract?: (emp: Employee) => void; 
}

const Employees: React.FC<EmployeesProps> = ({ employees, onSaveEmployee, workLocations, professions, onIssueContract }) => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState<Partial<Employee>>({
      status: 'Active',
      contractType: 'Determinado',
      nationality: 'Angolana',
      gender: 'M',
      maritalStatus: 'Solteiro',
      subsidyFood: 0,
      subsidyTransport: 0,
      baseSalary: 0
  });

  const ensureUUID = (id: string): string => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) return id;
    const hex = id.split('').map(c => c.charCodeAt(0).toString(16)).join('').padEnd(32, '0').substring(0, 32);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-a${hex.slice(15, 18)}-${hex.slice(18, 30)}`;
  };

  useEffect(() => {
    fetchEmployeesCloud();
  }, []);

  async function fetchEmployeesCloud() {
    setIsLoadingCloud(true);
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      if (data) {
        data.forEach(f => {
          const mapped: Employee = {
            id: f.id,
            employeeNumber: f.employee_number,
            name: f.nome,
            nif: f.nif,
            biNumber: f.bi_number,
            ssn: f.ssn,
            role: f.cargo,
            category: f.categoria,
            department: f.departamento,
            baseSalary: Number(f.salario_base || 0),
            status: (f.status === 'Active' || f.status === 'Terminated' || f.status === 'OnLeave') ? f.status : 'Active',
            admissionDate: f.data_admissao,
            terminationDate: f.data_demissao,
            email: f.email,
            phone: f.telefone,
            bankAccount: f.conta_bancaria,
            bankName: f.nome_banco,
            iban: f.iban,
            photoUrl: f.foto_url,
            contractType: f.tipo_contrato as any,
            subsidyTransport: Number(f.subs_transporte || 0),
            subsidyFood: Number(f.subs_alimentacao || 0),
            subsidyFamily: Number(f.subs_familia || 0),
            subsidyHousing: Number(f.subs_habitacao || 0),
            gender: f.genero as any,
            birthDate: f.data_nascimento,
            maritalStatus: f.estado_civil as any,
            nationality: f.nacionalidade,
            address: f.endereco,
            municipality: f.municipio,
            neighborhood: f.bairro,
            workLocationId: f.work_location_id,
            companyId: f.empresa_id,
            performanceScore: f.performance_score,
            turnoverRisk: f.turnover_risk
          };
          onSaveEmployee(mapped);
        });
      }
    } catch (err) {
      console.error("Erro ao carregar Cloud:", err);
    } finally {
      setIsLoadingCloud(false);
    }
  }

  const formCalculations = useMemo(() => {
      const base = Number(formData.baseSalary || 0);
      const subFood = Number(formData.subsidyFood || 0);
      const subTransport = Number(formData.subsidyTransport || 0);
      const subFamily = Number(formData.subsidyFamily || 0);
      const subHousing = Number(formData.subsidyHousing || 0);
      const subOther = Number(formData.subsidyOther || 0);
      
      const totalSubsidies = subFood + subTransport + subFamily + subHousing + subOther;
      const grossTotal = base + totalSubsidies; 
      const inssWorker = calculateINSS(base); 
      const irt = calculateIRT(base, inssWorker);
      const net = grossTotal - inssWorker - irt;

      return { totalSubsidies, grossTotal, inssWorker, irt, net };
  }, [formData]);

  const filteredEmployees = useMemo(() => {
      return employees.filter(e => {
          const matchSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (e.nif && e.nif.includes(searchTerm)) || 
                              (e.biNumber && e.biNumber.includes(searchTerm));
          const matchStatus = statusFilter === 'ALL' || 
                              (statusFilter === 'ACTIVE' && e.status === 'Active') ||
                              (statusFilter === 'INACTIVE' && e.status !== 'Active');
          const matchDept = deptFilter === 'ALL' || e.department === deptFilter;
          return matchSearch && matchStatus && matchDept;
      });
  }, [employees, searchTerm, statusFilter, deptFilter]);

  const departments = Array.from(new Set(employees.map(e => e.department))).filter(Boolean);

  const handleEdit = (emp: Employee) => {
      setFormData(emp);
      setView('FORM');
      setIsActionModalOpen(false);
  };

  const handleCreate = () => {
      setFormData({
          status: 'Active',
          contractType: 'Determinado',
          nationality: 'Angolana',
          gender: 'M',
          maritalStatus: 'Solteiro',
          baseSalary: 0,
          subsidyFood: 0,
          subsidyTransport: 0,
          admissionDate: new Date().toISOString().split('T')[0]
      });
      setView('FORM');
  };

  const handleSave = async () => {
      if (!formData.name || !formData.nif || !formData.baseSalary) {
          alert("Preencha os campos obrigatórios: Nome, NIF e Salário Base.");
          return;
      }

      setIsLoadingCloud(true);
      try {
          const rawId = formData.id || generateId();
          const cloudId = ensureUUID(rawId);
          const empNum = formData.employeeNumber || String(employees.length + 1).padStart(4, '0');

          const { error } = await supabase.from('funcionarios').upsert({
              id: cloudId,
              employee_number: empNum,
              nome: formData.name,
              nif: formData.nif,
              bi_number: formData.biNumber,
              ssn: formData.ssn,
              cargo: formData.role,
              categoria: formData.category,
              departamento: formData.department,
              salario_base: Number(formData.baseSalary),
              status: formData.status,
              data_admissao: formData.admissionDate,
              email: formData.email,
              telefone: formData.phone,
              conta_bancaria: formData.bankAccount,
              nome_banco: formData.bankName,
              iban: formData.iban,
              foto_url: formData.photoUrl,
              tipo_contrato: formData.contractType,
              subs_transporte: Number(formData.subsidyTransport || 0),
              subs_alimentacao: Number(formData.subsidyFood || 0),
              subs_familia: Number(formData.subsidyFamily || 0),
              subs_habitacao: Number(formData.subsidyHousing || 0),
              genero: formData.gender,
              data_nascimento: formData.birthDate,
              estado_civil: formData.maritalStatus,
              nacionalidade: formData.nationality,
              endereco: formData.address,
              municipio: formData.municipality,
              bairro: formData.neighborhood,
              empresa_id: '00000000-0000-0000-0000-000000000001'
          });

          if (error) throw error;

          const employee: Employee = {
              ...formData as Employee,
              id: cloudId,
              employeeNumber: empNum,
              baseSalary: Number(formData.baseSalary),
              subsidyFood: Number(formData.subsidyFood || 0),
              subsidyTransport: Number(formData.subsidyTransport || 0),
              subsidyFamily: Number(formData.subsidyFamily || 0),
              subsidyHousing: Number(formData.subsidyHousing || 0),
              ssn: formData.ssn || 'N/A'
          };

          onSaveEmployee(employee);
          setView('LIST');
          alert("Ficha guardada com sucesso e sincronizada com a Cloud.");
      } catch (err: any) {
          alert("Erro de Sincronização: " + (err.message || "Falha ao gravar na Cloud."));
      } finally {
          setIsLoadingCloud(false);
      }
  };

  const toggleStatus = (emp: Employee) => {
      const newStatus = emp.status === 'Active' ? 'Terminated' : 'Active';
      const action = newStatus === 'Active' ? 'READMITIR' : 'DEMITIR';
      if (confirm(`Tem a certeza que deseja ${action} este funcionário?`)) {
          onSaveEmployee({ ...emp, status: newStatus });
          setIsActionModalOpen(false);
      }
  };

  const handleOpenActions = (emp: Employee) => {
      setSelectedEmployee(emp);
      setIsActionModalOpen(true);
  };

  const ActionButton = ({ icon: Icon, label, onClick, danger = false }: any) => {
      return (
          <button 
              onClick={onClick}
              className={`w-full text-left p-3 rounded-lg border flex items-center justify-between transition-all group ${
                danger 
                  ? 'bg-red-50 border-red-100 hover:bg-red-100 text-red-700' 
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-blue-300 shadow-sm'
              }`}
          >
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${danger ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white'} transition-colors`}>
                    <Icon size={18}/>
                  </div>
                  <span className="font-bold text-sm tracking-tight">{label}</span>
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all"/>
          </button>
      );
  };

  const renderActionModal = () => {
      if (!selectedEmployee) return null;
      
      return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[450px] overflow-hidden border-4 border-slate-800 animate-in zoom-in-95">
                  <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                      <div>
                        <h3 className="font-black text-xl leading-tight uppercase tracking-tighter">{selectedEmployee.name}</h3>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Painel de Controlo do Colaborador</p>
                      </div>
                      <button onClick={() => setIsActionModalOpen(false)} className="bg-slate-800 hover:bg-red-600 p-2 rounded-full transition-all border border-slate-700">
                          <X size={20}/>
                      </button>
                  </div>
                  
                  <div className="p-5 space-y-2 bg-slate-50 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Gestão de Cadastro</div>
                      <ActionButton icon={Info} label="Visualizar Ficha Completa" onClick={() => {}} />
                      <ActionButton icon={Settings} label="Configurar Dados e Salário" onClick={() => handleEdit(selectedEmployee)} />
                      <ActionButton icon={Printer} label="Imprimir Documentos do RH" onClick={() => window.print()} />
                      
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4 mb-2 px-1">Movimentos e Benefícios</div>
                      <div className="grid grid-cols-1 gap-2">
                        <ActionButton icon={Ruler} label="Medidas de Equipamento" onClick={() => {}} />
                        <ActionButton icon={Gavel} label="Registo Disciplinar" onClick={() => {}} />
                        <ActionButton icon={Calculator} label="Lançar Acerto Salarial" onClick={() => {}} />
                        <ActionButton icon={Gift} label="Atribuir Gratificação" onClick={() => {}} />
                        <ActionButton icon={Wallet} label="Solicitar Adiantamento" onClick={() => {}} />
                      </div>

                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4 mb-2 px-1">Jurídico e Contratual</div>
                      <ActionButton icon={FileSignature} label="Gerar Contrato de Trabalho" onClick={() => { onIssueContract?.(selectedEmployee); setIsActionModalOpen(false); }} />
                      
                      <div className="pt-4 border-t border-slate-200 mt-2">
                        {selectedEmployee.status === 'Active' ? (
                            <ActionButton icon={UserMinus} label="Demitir Funcionário (Rescisão)" danger onClick={() => toggleStatus(selectedEmployee)} />
                        ) : (
                            <ActionButton icon={UserCheck} label="Readmitir Funcionário" onClick={() => toggleStatus(selectedEmployee)} />
                        )}
                      </div>
                  </div>
                  
                  <div className="bg-slate-900 p-3 text-center">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-[3px]">Imatec Software • Certificado AGT</p>
                  </div>
              </div>
          </div>
      );
  };

  if (view === 'FORM') {
      return (
          <div className="bg-slate-50 min-h-screen p-6 animate-in fade-in">
              <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 text-white p-6 flex justify-between items-center sticky top-0 z-10">
                      <div className="flex items-center gap-4">
                          <button onClick={() => setView('LIST')} className="p-2 hover:bg-slate-800 rounded-full transition"><X size={24}/></button>
                          <div>
                              <h1 className="text-xl font-bold uppercase tracking-wide">Ficha de Funcionário</h1>
                              <p className="text-xs text-slate-400">Admissão e Cadastro de Pessoal</p>
                          </div>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => setView('LIST')} className="px-6 py-2 border border-slate-600 rounded-lg hover:bg-slate-800 transition">Cancelar</button>
                          <button onClick={handleSave} disabled={isLoadingCloud} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition flex items-center gap-2 disabled:opacity-50">
                              {isLoadingCloud ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} 
                              {isLoadingCloud ? 'A Sincronizar...' : 'Salvar Ficha Cloud'}
                          </button>
                      </div>
                  </div>

                  <div className="p-8 grid grid-cols-12 gap-8">
                      <div className="col-span-12 md:col-span-3 space-y-6">
                          <div className="flex flex-col items-center">
                              <div className="w-48 h-48 bg-slate-100 rounded-full border-4 border-white shadow-lg flex items-center justify-center relative overflow-hidden mb-4 group cursor-pointer">
                                  {formData.photoUrl ? (
                                      <img src={formData.photoUrl} alt="Foto" className="w-full h-full object-cover"/>
                                  ) : (
                                      <Users size={64} className="text-slate-300"/>
                                  )}
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                      <span className="text-white text-xs font-bold flex items-center gap-2"><Upload size={14}/> Alterar</span>
                                  </div>
                              </div>
                              <p className="text-xs text-slate-500 text-center">Clique para carregar foto</p>
                          </div>

                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                              <h3 className="font-bold text-blue-900 mb-3 text-sm uppercase border-b border-blue-200 pb-1">Resumo Salarial</h3>
                              <div className="space-y-2 text-sm">
                                  <div className="flex justify-between"><span>Base:</span> <span className="font-bold">{formatCurrency(Number(formData.baseSalary || 0))}</span></div>
                                  <div className="flex justify-between"><span>Subsídios:</span> <span className="font-bold">{formatCurrency(formCalculations.totalSubsidies)}</span></div>
                                  <div className="flex justify-between text-red-600"><span>Impostos:</span> <span>-{formatCurrency(formCalculations.inssWorker + formCalculations.irt)}</span></div>
                                  <div className="border-t border-blue-200 pt-2 flex justify-between text-lg font-black text-blue-700">
                                      <span>Líquido:</span>
                                      <span>{formatCurrency(formCalculations.net)}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="col-span-12 md:col-span-9 space-y-8">
                          <section>
                              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                                  <User className="text-blue-600"/> Dados Pessoais
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Nascimento</label>
                                      <input type="date" className="w-full p-2 border rounded-lg bg-slate-50 focus:bg-white transition" value={formData.birthDate || ''} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Género</label>
                                      <select className="w-full p-2 border rounded-lg bg-slate-50" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}>
                                          <option value="M">Masculino</option>
                                          <option value="F">Feminino</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado Civil</label>
                                      <select className="w-full p-2 border rounded-lg bg-slate-50" value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value as any})}>
                                          <option value="Solteiro">Solteiro(a)</option>
                                          <option value="Casado">Casado(a)</option>
                                          <option value="Divorciado">Divorciado(a)</option>
                                          <option value="Viuvo">Viúvo(a)</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nacionalidade</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50" value={formData.nationality || ''} onChange={e => setFormData({...formData, nationality: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº BI / Passaporte</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50" value={formData.biNumber || ''} onChange={e => setFormData({...formData, biNumber: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">NIF</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50 font-mono" value={formData.nif || ''} onChange={e => setFormData({...formData, nif: e.target.value})} />
                                  </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                  <div className="md:col-span-3">
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço Completo</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Município</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50" value={formData.municipality || ''} onChange={e => setFormData({...formData, municipality: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bairro</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50" value={formData.neighborhood || ''} onChange={e => setFormData({...formData, neighborhood: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                  </div>
                                  <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                                  </div>
                              </div>
                          </section>

                          <section>
                              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                                  <Building2 className="text-orange-600"/> Informação Laboral
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Funcionário</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-100 text-slate-500" value={formData.employeeNumber || 'Auto'} disabled />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Admissão</label>
                                      <input type="date" className="w-full p-2 border rounded-lg bg-slate-50" value={formData.admissionDate || ''} onChange={e => setFormData({...formData, admissionDate: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departamento</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Função / Cargo</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50" value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                                      <select className="w-full p-2 border rounded-lg bg-slate-50" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})}>
                                          <option value="">Selecione...</option>
                                          <option value="Direcção">Direcção</option>
                                          <option value="Técnico">Técnico</option>
                                          <option value="Administrativo">Administrativo</option>
                                          <option value="Operacional">Operacional</option>
                                          <option value="Estagiário">Estagiário</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo Contrato</label>
                                      <select className="w-full p-2 border rounded-lg bg-slate-50" value={formData.contractType} onChange={e => setFormData({...formData, contractType: e.target.value as any})}>
                                          <option value="Determinado">Determinado (Certo)</option>
                                          <option value="Indeterminado">Sem Termo (Indeterminado)</option>
                                          <option value="Estagio">Estágio</option>
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Seg. Social</label>
                                      <input className="w-full p-2 border rounded-lg bg-slate-50" value={formData.ssn || ''} onChange={e => setFormData({...formData, ssn: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Local Trabalho</label>
                                      <select className="w-full p-2 border rounded-lg bg-slate-50" value={formData.workLocationId || ''} onChange={e => setFormData({...formData, workLocationId: e.target.value})}>
                                          <option value="">Selecione...</option>
                                          {workLocations.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                      </select>
                                  </div>
                              </div>
                              <div className="grid grid-cols-3 gap-4 mt-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                  <div className="col-span-3 text-xs font-bold uppercase text-slate-500 mb-2">Dados Bancários</div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Banco</label>
                                      <input className="w-full p-2 border rounded-lg bg-white" placeholder="Ex: BFA" value={formData.bankName || ''} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Conta</label>
                                      <input className="w-full p-2 border rounded-lg bg-white" value={formData.bankAccount || ''} onChange={e => setFormData({...formData, bankAccount: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">IBAN</label>
                                      <input className="w-full p-2 border rounded-lg bg-white font-mono" value={formData.iban || ''} onChange={e => setFormData({...formData, iban: e.target.value})} />
                                  </div>
                              </div>
                          </section>

                          <section>
                              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                                  <CreditCard className="text-green-600"/> Informação Salarial
                              </h3>
                              <div className="flex flex-col md:flex-row gap-6">
                                  <div className="flex-1 space-y-4">
                                      <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Salário Base</label>
                                          <input type="number" className="w-full p-3 border-2 border-slate-300 rounded-lg text-lg font-bold text-slate-800 focus:border-green-500 outline-none" value={formData.baseSalary || ''} onChange={e => setFormData({...formData, baseSalary: Number(e.target.value)})} placeholder="0.00"/>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sub. Alimentação</label>
                                              <input type="number" className="w-full p-2 border rounded-lg bg-slate-50" value={formData.subsidyFood || ''} onChange={e => setFormData({...formData, subsidyFood: Number(e.target.value)})} />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sub. Transporte</label>
                                              <input type="number" className="w-full p-2 border rounded-lg bg-slate-50" value={formData.subsidyTransport || ''} onChange={e => setFormData({...formData, subsidyTransport: Number(e.target.value)})} />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sub. Família/Abono</label>
                                              <input type="number" className="w-full p-2 rounded-lg bg-slate-50 border" value={formData.subsidyFamily || ''} onChange={e => setFormData({...formData, subsidyFamily: Number(e.target.value)})} />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Outros Subsídios</label>
                                              <input type="number" className="w-full p-2 border rounded-lg bg-slate-50" value={formData.subsidyOther || ''} onChange={e => setFormData({...formData, subsidyOther: Number(e.target.value)})} />
                                          </div>
                                      </div>
                                  </div>

                                  <div className="w-full md:w-80 bg-slate-100 p-5 rounded-xl border border-slate-200">
                                      <h4 className="font-bold text-slate-700 mb-4 border-b border-slate-300 pb-2">Simulação de Processamento</h4>
                                      <div className="space-y-2 text-sm">
                                          <div className="flex justify-between"><span>Vencimento Base</span> <span className="font-mono">{formatCurrency(Number(formData.baseSalary))}</span></div>
                                          <div className="flex justify-between"><span>Total Subsídios</span> <span className="font-mono">{formatCurrency(formCalculations.totalSubsidies)}</span></div>
                                          <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                                              <span>Total Ilíquido</span> 
                                              <span>{formatCurrency(formCalculations.grossTotal)}</span>
                                          </div>
                                          <div className="py-2 space-y-1">
                                              <div className="flex justify-between text-red-600"><span>INSS Trab. (3%)</span> <span>-{formatCurrency(formCalculations.inssWorker)}</span></div>
                                              <div className="flex justify-between text-red-600"><span>IRT (Tabela)</span> <span>-{formatCurrency(formCalculations.irt)}</span></div>
                                          </div>
                                          <div className="flex justify-between font-black text-lg text-blue-700 border-t-2 border-white pt-2 bg-blue-50 p-2 rounded">
                                              <span>Líquido a Receber</span>
                                              <span>{formatCurrency(formCalculations.net)}</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </section>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in pb-20">
        {renderActionModal()}
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="text-blue-600"/> Funcionários
                    {isLoadingCloud && <RefreshCw size={16} className="animate-spin text-blue-500 ml-2"/>}
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-1"><Database size={12}/> Sincronizado com Supabase Cloud</p>
            </div>
            <div className="flex gap-2">
                <button onClick={fetchEmployeesCloud} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border">
                    <RefreshCw size={18}/> Sincronizar
                </button>
                <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md transition">
                    <UserPlus size={18}/> Admitir Funcionário
                </button>
            </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                <input 
                    className="w-full pl-10 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Pesquisar por Nome, Nº Mecanográfico, BI..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div>
                <select className="w-full p-2 border border-slate-300 rounded-lg bg-white" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                    <option value="ALL">Todos os Departamentos</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <div>
                <select className="w-full p-2 border border-slate-300 rounded-lg bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                    <option value="ALL">Todos os Estados</option>
                    <option value="ACTIVE">Ativos</option>
                    <option value="INACTIVE">Inativos</option>
                </select>
            </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                        <tr>
                            <th className="p-4 w-16 text-center">Foto</th>
                            <th className="p-4 w-24">Nº Mec..</th>
                            <th className="p-4 min-w-[200px]">Nome Completo</th>
                            <th className="p-4">Departamento</th>
                            <th className="p-4">Função</th>
                            <th className="p-4">Admissão</th>
                            <th className="p-4 text-right">Salário Base</th>
                            <th className="p-4 text-right">Líquido (Est. )</th>
                            <th className="p-4 text-center">Estado</th>
                            <th className="p-4 text-center w-16">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.map((emp) => {
                            const inss = calculateINSS(emp.baseSalary);
                            const irt = calculateIRT(emp.baseSalary, inss);
                            const net = (emp.baseSalary + (emp.subsidyFood||0) + (emp.subsidyTransport||0)) - inss - irt;

                            return (
                                <tr key={emp.id} className="hover:bg-blue-50 transition-colors group">
                                    <td className="p-3 text-center">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 mx-auto overflow-hidden border border-slate-300">
                                            {emp.photoUrl ? <img src={emp.photoUrl} className="w-full h-full object-cover" alt="Avatar"/> : <User className="w-full h-full p-2 text-slate-400"/>}
                                        </div>
                                    </td>
                                    <td className="p-3 font-mono font-bold text-slate-600">{emp.employeeNumber || '---'}</td>
                                    <td className="p-3 font-bold text-slate-800">{emp.name}</td>
                                    <td className="p-3">{emp.department}</td>
                                    <td className="p-3 text-slate-600">{emp.role}</td>
                                    <td className="p-3">{emp.admissionDate}</td>
                                    <td className="p-3 text-right font-mono">{formatCurrency(emp.baseSalary).replace('Kz','')}</td>
                                    <td className="p-3 text-right font-bold text-blue-700">{formatCurrency(net).replace('Kz','')}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${emp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {emp.status === 'Active' ? 'ATIVO' : 'INATIVO'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button 
                                                onClick={() => onIssueContract?.(emp)}
                                                className="p-1.5 bg-slate-100 text-slate-400 rounded border hover:text-blue-600 hover:border-blue-200 transition"
                                                title="Imprimir Contrato Direto"
                                            >
                                                <Printer size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => handleOpenActions(emp)} 
                                                className="p-1.5 bg-slate-100 text-slate-400 rounded border hover:text-blue-600 hover:border-blue-200 transition"
                                            >
                                                <MoreVertical size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredEmployees.length === 0 && !isLoadingCloud && (
                            <tr><td colSpan={10} className="p-8 text-center text-slate-400 italic">Nenhum funcionário encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default Employees;