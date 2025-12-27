
import React, { useState } from 'react';
import { Employee, HrTransaction, HrVacation, SalarySlip, Profession, Candidate, PerformanceReview, DisciplinaryAction, TrainingCourse, Contract, AttendanceRecord, Company } from '../types';
import { generateId, formatCurrency, formatDate, calculateINSS, calculateIRT, calculateINSSEntity } from '../utils';
import { Users, UserPlus, ClipboardList, Briefcase, Calculator, Calendar, FileText, Download, Printer, Search, Plus, Trash2, Camera, AlertTriangle, CheckCircle, Wallet, FileCheck, X, Table, User, MapPin, TrendingUp, BookOpen, GraduationCap, Gavel, BarChart3, BrainCircuit, Sparkles, AlertCircle, Clock, HeartHandshake, Shield, ListChecks, RefreshCw } from 'lucide-react';
import SalaryMap from './SalaryMap';
import ProfessionManager from './ProfessionManager';
import ContractGenerator from './ContractGenerator';

interface HumanResourcesProps {
  employees: Employee[];
  onSaveEmployee: (emp: Employee) => void;
  transactions: HrTransaction[];
  onSaveTransaction: (t: HrTransaction) => void;
  vacations: HrVacation[];
  onSaveVacation: (v: HrVacation) => void;
  payroll: SalarySlip[]; 
  onProcessPayroll: (slips: SalarySlip[]) => void;
  professions: Profession[];
  onSaveProfession: (p: Profession) => void;
  onDeleteProfession: (id: string) => void;
  contracts: Contract[];
  onSaveContract: (c: Contract) => void;
  attendance: AttendanceRecord[];
  onSaveAttendance: (a: AttendanceRecord) => void;
  company: Company;
}

const HumanResources: React.FC<HumanResourcesProps> = ({ 
    employees, onSaveEmployee, transactions, onSaveTransaction, 
    vacations, onSaveVacation, payroll, onProcessPayroll,
    professions, onSaveProfession, onDeleteProfession,
    contracts, onSaveContract, attendance, onSaveAttendance,
    company
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GESTÃO' | 'RECRUTAMENTO' | 'FÉRIAS' | 'ASSIDUIDADE' | 'CONTRATOS' | 'PROCESSAMENTO' | 'DISCIPLINAR' | 'FORMAÇÃO' | 'BENEFICIOS' | 'RELATORIOS' | 'PROFISSÕES' | 'MAPAS'>('DASHBOARD');
  const [printingContract, setPrintingContract] = useState<Contract | null>(null);

  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showTransModal, setShowTransModal] = useState(false);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

  const [newEmp, setNewEmp] = useState<Partial<Employee>>({ status: 'Active', contractType: 'Determinado' });
  const [newTrans, setNewTrans] = useState<Partial<HrTransaction>>({ type: 'ABSENCE', amount: 0 });
  const [newVacation, setNewVacation] = useState<Partial<HrVacation>>({ status: 'REQUESTED' });
  const [newAttendance, setNewAttendance] = useState<Partial<AttendanceRecord>>({ status: 'Present' });
  const [newContract, setNewContract] = useState<Partial<Contract>>({ status: 'Active' });

  const [searchTerm, setSearchTerm] = useState('');
  const [processingMonth, setProcessingMonth] = useState(new Date().getMonth() + 1);
  const [processingYear, setProcessingYear] = useState(new Date().getFullYear());
  const [previewSlips, setPreviewSlips] = useState<SalarySlip[]>([]);
  const [isPayrollCertified, setIsPayrollCertified] = useState(false);

  const handleSaveEmployee = () => {
      if (!newEmp.name || !newEmp.nif || !newEmp.baseSalary) return alert("Preencha campos obrigatórios: Nome, NIF, Salário Base");
      const emp: Employee = {
          id: newEmp.id || generateId(),
          name: newEmp.name!,
          nif: newEmp.nif!,
          biNumber: newEmp.biNumber || '',
          ssn: newEmp.ssn || 'N/A',
          role: newEmp.role || 'Geral',
          professionId: newEmp.professionId,
          professionName: newEmp.professionName,
          department: newEmp.department || 'Geral',
          workLocationId: newEmp.workLocationId || '',
          baseSalary: Number(newEmp.baseSalary),
          status: newEmp.status || 'Active',
          admissionDate: newEmp.admissionDate || new Date().toISOString().split('T')[0],
          contractType: newEmp.contractType,
          contractClauses: newEmp.contractClauses || [],
          photoUrl: newEmp.photoUrl,
          bankAccount: newEmp.bankAccount,
          email: newEmp.email,
          phone: newEmp.phone,
          gender: newEmp.gender,
          birthDate: newEmp.birthDate,
          maritalStatus: newEmp.maritalStatus,
          address: newEmp.address,
          subsidyTransport: Number(newEmp.subsidyTransport || 0),
          subsidyFood: Number(newEmp.subsidyFood || 0),
          subsidyFamily: Number(newEmp.subsidyFamily || 0),
          subsidyHousing: Number(newEmp.subsidyHousing || 0),
          subsidyChristmas: Number(newEmp.subsidyChristmas || 0),
          subsidyVacation: Number(newEmp.subsidyVacation || 0),
          turnoverRisk: 'Low'
      };
      onSaveEmployee(emp);
      setShowEmpModal(false);
      setNewEmp({ status: 'Active', contractType: 'Determinado' });
  };

  const handleSaveVacation = () => {
      if (!newVacation.employeeId || !newVacation.startDate || !newVacation.days) return alert("Preencha os campos obrigatórios");
      onSaveVacation({
          id: generateId(),
          employeeId: newVacation.employeeId!,
          startDate: newVacation.startDate!,
          endDate: newVacation.endDate || newVacation.startDate!,
          days: Number(newVacation.days),
          status: newVacation.status || 'REQUESTED',
          year: new Date().getFullYear()
      });
      setShowVacationModal(false);
      setNewVacation({ status: 'REQUESTED' });
  };

  const handleSaveAttendance = () => {
      if (!newAttendance.employeeId || !newAttendance.date) return alert("Preencha funcionário e data");
      onSaveAttendance({
          id: generateId(),
          employeeId: newAttendance.employeeId!,
          date: newAttendance.date!,
          checkIn: newAttendance.checkIn,
          checkOut: newAttendance.checkOut,
          status: newAttendance.status || 'Present',
          justification: newAttendance.justification,
          overtimeHours: Number(newAttendance.overtimeHours || 0)
      });
      setShowAttendanceModal(false);
      setNewAttendance({ status: 'Present' });
  };

  const handleSaveContract = () => {
      if (!newContract.employeeId || !newContract.type || !newContract.startDate) return alert("Preencha os campos do contrato");
      onSaveContract({
          id: generateId(),
          employeeId: newContract.employeeId!,
          type: newContract.type!,
          startDate: newContract.startDate!,
          endDate: newContract.endDate,
          status: 'Active',
          clauses: newContract.clauses || []
      });
      setShowContractModal(false);
      setNewContract({ status: 'Active' });
  };

  const calculatePayrollPreview = () => {
      const slips: SalarySlip[] = employees.filter(e => e.status === 'Active').map(e => {
          const empTrans = transactions.filter(t => 
              t.employeeId === e.id && 
              !t.processed &&
              new Date(t.date).getMonth() + 1 === processingMonth &&
              new Date(t.date).getFullYear() === processingYear
          );

          const bonuses = empTrans.filter(t => t.type === 'BONUS').reduce((acc, t) => acc + t.amount, 0);
          const allowances = empTrans.filter(t => t.type === 'ALLOWANCE').reduce((acc, t) => acc + t.amount, 0);
          const totalSubsidies = (e.subsidyTransport || 0) + (e.subsidyFood || 0) + (e.subsidyFamily || 0) + (e.subsidyHousing || 0);
          
          const absenceAmount = empTrans.filter(t => t.type === 'ABSENCE').reduce((acc, t) => acc + t.amount, 0);
          const advances = empTrans.filter(t => t.type === 'ADVANCE').reduce((acc, t) => acc + t.amount, 0); 

          const gross = e.baseSalary + bonuses + allowances - absenceAmount; 
          const inss = calculateINSS(gross);
          const irt = calculateIRT(gross, inss);
          const net = gross + totalSubsidies - inss - irt - advances;

          return {
              employeeId: e.id,
              employeeName: e.name,
              employeeRole: e.role,
              professionCode: e.professionId ? professions.find(p => p.id === e.professionId)?.code : '',
              baseSalary: e.baseSalary,
              allowances: allowances + bonuses, 
              bonuses,
              subsidies: totalSubsidies,
              subsidyTransport: e.subsidyTransport || 0,
              subsidyFood: e.subsidyFood || 0,
              subsidyFamily: e.subsidyFamily || 0,
              subsidyHousing: e.subsidyHousing || 0,
              absences: absenceAmount,
              advances,
              grossTotal: gross,
              inss,
              irt,
              netTotal: net
          };
      });
      setPreviewSlips(slips);
      setIsPayrollCertified(false);
  };

  const certifyPayroll = () => {
      if (previewSlips.length === 0) return;
      if (window.confirm("ATENÇÃO: Ao certificar, os movimentos financeiros serão gerados e os recibos emitidos. Continuar?")) {
          onProcessPayroll(previewSlips);
          setIsPayrollCertified(true);
          alert("Processamento Certificado com Sucesso!");
      }
  };

  const filteredEmployees = employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const renderDashboard = () => (
      <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                      <p className="text-slate-500 text-xs font-bold uppercase">Total Colaboradores</p>
                      <h2 className="text-3xl font-black text-blue-900">{employees.filter(e => e.status === 'Active').length}</h2>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Users size={24}/></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                      <p className="text-slate-500 text-xs font-bold uppercase">Custo Mensal (Estim.)</p>
                      <h2 className="text-2xl font-bold text-slate-800">{formatCurrency(employees.reduce((acc, e) => acc + e.baseSalary, 0))}</h2>
                  </div>
                  <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Wallet size={24}/></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                      <p className="text-slate-500 text-xs font-bold uppercase">Faltas no Mês</p>
                      <h2 className="text-3xl font-black text-orange-500">{attendance.filter(a => a.status === 'Absent').length}</h2>
                  </div>
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Clock size={24}/></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                      <p className="text-slate-500 text-xs font-bold uppercase">Turnover (Risco)</p>
                      <h2 className="text-3xl font-black text-red-500">{employees.filter(e => e.turnoverRisk === 'High').length}</h2>
                  </div>
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg"><TrendingUp size={24}/></div>
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-64 flex items-center justify-center text-slate-400">
              <BarChart3 size={48} className="mr-4"/>
              <span>Gráficos de evolução salarial e assiduidade (Visualização)</span>
          </div>
      </div>
  );

  const renderGestao = () => (
      <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <div className="relative">
                  <Search className="absolute left-2 top-2.5 text-slate-400" size={16}/>
                  <input className="pl-8 p-2 border rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Procurar Colaborador" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
              </div>
              <button onClick={() => { setNewEmp({ status: 'Active', contractType: 'Determinado' }); setShowEmpModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md">
                  <UserPlus size={16}/> Cadastrar Funcionário
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map(e => (
                  <div key={e.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition relative overflow-hidden">
                      <div className="w-16 h-16 bg-slate-100 rounded-full overflow-hidden flex-shrink-0 border-2 border-slate-200">
                          {e.photoUrl ? <img src={e.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Users/></div>}
                      </div>
                      <div className="flex-1">
                          <h3 className="font-bold text-lg text-slate-800">{e.name}</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase mb-2">{e.role}</p>
                          <div className="text-xs text-slate-600 space-y-1">
                              <p>Contrato: {e.contractType}</p>
                              <p>Salário Base: <span className="font-bold text-slate-900">{formatCurrency(e.baseSalary)}</span></p>
                          </div>
                          <div className="mt-3 pt-3 border-t flex gap-2">
                              <button onClick={() => { setNewEmp(e); setShowEmpModal(true); }} className="flex-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-slate-200 font-bold">Editar Ficha</button>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderContracts = () => (
      <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase text-sm tracking-tighter">
                <HeartHandshake size={20} className="text-purple-600"/> Gestão de Contratos de Trabalho
              </h3>
              <button onClick={() => setShowContractModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition-all">
                  <Plus size={16}/> Emitir Novo Contrato
              </button>
          </div>
          <div className="bg-white border-2 border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 font-bold uppercase text-[10px] text-white border-b border-slate-800">
                    <tr>
                        <th className="p-4 border-r border-slate-800">Funcionário Beneficiário</th>
                        <th className="p-4 border-r border-slate-800">Modalidade</th>
                        <th className="p-4 border-r border-slate-800">Data Início</th>
                        <th className="p-4 border-r border-slate-800">Expiração</th>
                        <th className="p-4 border-r border-slate-800 text-center">Estado</th>
                        <th className="p-4 text-center">Visualizar A4</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-slate-100 font-medium">
                      {contracts.map(c => {
                          const emp = employees.find(e => e.id === c.employeeId);
                          return (
                              <tr key={c.id} className="hover:bg-blue-50 transition-colors">
                                  <td className="p-4 font-black text-slate-800 border-r border-slate-100">{emp?.name || 'Desconhecido'}</td>
                                  <td className="p-4 border-r border-slate-100 text-slate-600 uppercase font-black text-[10px]">{c.type}</td>
                                  <td className="p-4 font-mono text-slate-700 border-r border-slate-100">{formatDate(c.startDate)}</td>
                                  <td className="p-4 font-mono text-slate-700 border-r border-slate-100">{c.endDate ? formatDate(c.endDate) : '---'}</td>
                                  <td className="p-4 text-center border-r border-slate-100">
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-black text-[9px] uppercase border border-green-200">ACTIVO</span>
                                  </td>
                                  <td className="p-4 text-center">
                                      <button 
                                        onClick={() => emp && setPrintingContract(c)} 
                                        className="bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-500 p-2.5 rounded-xl transition-all border border-slate-200 shadow-sm group" 
                                        title="Abrir Formato A4 para Impressão"
                                      >
                                          <Printer size={18} className="group-hover:scale-110 transition-transform"/>
                                      </button>
                                  </td>
                              </tr>
                          );
                      })}
                      {contracts.length === 0 && (
                          <tr><td colSpan={6} className="p-20 text-center text-slate-300 font-black uppercase tracking-[5px] bg-slate-50 italic">Sem contratos emitidos</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
  );

  if (printingContract) {
      const emp = employees.find(e => e.id === printingContract.employeeId);
      if (emp) {
        return (
            <div className="fixed inset-0 z-[200] bg-white overflow-hidden">
                <ContractGenerator 
                    employee={emp} 
                    company={company} 
                    onBack={() => setPrintingContract(null)} 
                    initialContract={printingContract}
                    autoPrint={true} 
                />
            </div>
        );
      }
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users/> Recursos Humanos & Salários</h1>
                <p className="text-xs text-slate-500">Gestão completa conforme Legislação Angolana</p>
            </div>
            <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm overflow-x-auto w-full md:w-auto custom-scrollbar">
                {['DASHBOARD', 'GESTÃO', 'PROFISSÕES', 'MAPAS', 'FÉRIAS', 'ASSIDUIDADE', 'CONTRATOS', 'PROCESSAMENTO', 'DISCIPLINAR', 'FORMAÇÃO', 'BENEFICIOS', 'RELATORIOS'].map(t => (
                    <button 
                        key={t}
                        onClick={() => setActiveTab(t as any)}
                        className={`px-3 py-2 rounded-md font-bold text-[10px] uppercase transition-all whitespace-nowrap ${activeTab === t ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                        {t === 'MAPAS' ? 'MAPAS SAL.' : t}
                    </button>
                ))}
            </div>
        </div>

        {activeTab === 'DASHBOARD' && renderDashboard()}
        {activeTab === 'GESTÃO' && renderGestao()}
        {activeTab === 'PROFISSÕES' && <div className="h-[calc(100vh-200px)]"><ProfessionManager professions={professions} onSave={onSaveProfession} onDelete={onDeleteProfession}/></div>}
        {activeTab === 'MAPAS' && <SalaryMap payroll={payroll} employees={employees} />}
        {activeTab === 'FÉRIAS' && <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calendar size={20} className="text-orange-500"/> Mapa de Férias</h3>
                <button onClick={() => setShowVacationModal(true)} className="bg-orange-600 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2">
                    <Plus size={16}/> Marcar Férias
                </button>
            </div>
            <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold"><tr><th className="p-3">Funcionário</th><th className="p-3">Início</th><th className="p-3">Fim</th><th className="p-3">Dias</th><th className="p-3">Estado</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {vacations.map(v => {
                            const empName = employees.find(e => e.id === v.employeeId)?.name || 'Desconhecido';
                            return (
                                <tr key={v.id} className="border-b">
                                    <td className="p-3">{empName}</td>
                                    <td className="p-3 font-mono">{formatDate(v.startDate)}</td>
                                    <td className="p-3 font-mono">{formatDate(v.endDate)}</td>
                                    <td className="p-3 font-bold">{v.days}</td>
                                    <td className="p-3"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold text-[10px] uppercase border border-blue-200">{v.status}</span></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>}
        {activeTab === 'ASSIDUIDADE' && <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={20} className="text-blue-500"/> Assiduidade e Ponto</h3>
                <button onClick={() => setShowAttendanceModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2">
                    <Plus size={16}/> Registar Ponto
                </button>
            </div>
            <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600"><tr><th className="p-4">Funcionário</th><th className="p-4">Data</th><th className="p-4 text-center">Entrada</th><th className="p-4 text-center">Saída</th><th className="p-4 text-center">Estado</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {attendance.map(a => {
                            const empName = employees.find(e => e.id === a.employeeId)?.name || 'Desconhecido';
                            return (
                                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-700">{empName}</td>
                                    <td className="p-4 font-mono">{formatDate(a.date)}</td>
                                    <td className="p-4 text-center font-mono">{a.checkIn || '--:--'}</td>
                                    <td className="p-4 text-center font-mono">{a.checkOut || '--:--'}</td>
                                    <td className="p-4 text-center"><span className={`px-2 py-1 rounded font-bold text-[10px] uppercase border ${a.status === 'Absent' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{a.status}</span></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>}
        {activeTab === 'CONTRATOS' && renderContracts()}
        {activeTab === 'BENEFICIOS' && <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Wallet size={20} className="text-green-600"/> Configuração de Benefícios e Subsídios</h3>
                <p className="text-xs text-slate-500 mb-4">Os valores são configurados na ficha individual de cada funcionário.</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200">
                        <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600"><tr><th className="p-4">Funcionário</th><th className="p-4 text-right">Transporte</th><th className="p-4 text-right">Alimentação</th><th className="p-4 text-right">Família</th><th className="p-4 text-right">Habitação</th><th className="p-4 text-right">Total</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {employees.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-700">{e.name}</td>
                                    <td className="p-4 text-right font-mono">{formatCurrency(e.subsidyTransport || 0)}</td>
                                    <td className="p-4 text-right font-mono">{formatCurrency(e.subsidyFood || 0)}</td>
                                    <td className="p-4 text-right font-mono">{formatCurrency(e.subsidyFamily || 0)}</td>
                                    <td className="p-4 text-right font-mono">{formatCurrency(e.subsidyHousing || 0)}</td>
                                    <td className="p-4 text-right font-bold text-blue-700 font-mono">{formatCurrency((e.subsidyTransport||0)+(e.subsidyFood||0)+(e.subsidyFamily||0)+(e.subsidyHousing||0))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>}
        {activeTab === 'RELATORIOS' && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center hover:bg-blue-50 transition group" onClick={() => window.print()}>
              <FileCheck size={32} className="text-slate-400 group-hover:text-blue-600 mb-2 transition-colors"/>
              <span className="font-bold text-slate-800">Recibos de Vencimento</span>
          </button>
          <button className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center hover:bg-green-50 transition group">
              <Table size={32} className="text-slate-400 group-hover:text-green-600 mb-2 transition-colors"/>
              <span className="font-bold text-slate-800">Mapa de INSS</span>
          </button>
          <button className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center hover:bg-orange-50 transition group">
              <Calculator size={32} className="text-slate-400 group-hover:text-orange-600 mb-2 transition-colors"/>
              <span className="font-bold text-slate-800">Mapa de IRT</span>
          </button>
        </div>}
        
        {activeTab === 'PROCESSAMENTO' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-slate-700 text-sm"><RefreshCw size={16}/> Processamento Salarial Mensal</h3>
                <div className="flex gap-4 mb-4 items-end bg-slate-50 p-4 rounded border">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Mês</label>
                        <select className="border p-2 rounded bg-white text-sm font-bold" value={processingMonth} onChange={e => setProcessingMonth(Number(e.target.value))}>
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Ano</label>
                        <select className="border p-2 rounded bg-white text-sm font-bold" value={processingYear} onChange={e => setProcessingYear(Number(e.target.value))}>
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                        </select>
                    </div>
                    <button onClick={calculatePayrollPreview} className="bg-blue-600 text-white px-6 py-2 rounded font-bold text-xs h-[38px] hover:bg-blue-700 transition shadow-sm">Calcular Folha</button>
                    <button onClick={certifyPayroll} disabled={previewSlips.length === 0} className="bg-green-600 text-white px-6 py-2 rounded font-bold text-xs h-[38px] disabled:opacity-50 hover:bg-green-700 transition shadow-sm">Certificar e Emitir</button>
                </div>
                {previewSlips.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600"><tr><th className="p-3">Nome</th><th className="p-3 text-right">Base</th><th className="p-3 text-right">Subsídios</th><th className="p-3 text-right">IRT</th><th className="p-3 text-right">INSS</th><th className="p-3 text-right">Líquido</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {previewSlips.map(s => (
                                    <tr key={s.employeeId} className="hover:bg-slate-50"><td className="p-3 font-bold text-slate-700">{s.employeeName}</td><td className="p-3 text-right font-mono">{formatCurrency(s.baseSalary)}</td><td className="p-3 text-right font-mono">{formatCurrency(s.subsidies)}</td><td className="p-3 text-right text-red-600 font-mono">{formatCurrency(s.irt)}</td><td className="p-3 text-right text-red-600 font-mono">{formatCurrency(s.inss)}</td><td className="p-3 text-right font-black text-blue-700 font-mono">{formatCurrency(s.netTotal)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}

        {showEmpModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 shadow-2xl">
                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-bold text-lg flex items-center gap-2"><UserPlus size={20}/> {newEmp.id ? 'Editar Trabalhador' : 'Admitir Trabalhador'}</h3>
                        <button onClick={() => setShowEmpModal(false)}><X size={20}/></button>
                    </div>
                    <div className="p-6">
                        <h4 className="text-sm font-bold text-blue-900 uppercase border-b border-blue-100 pb-2 mb-4">Dados Pessoais</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div><label className="text-xs font-bold uppercase text-slate-500">Nome Completo</label><input className="w-full border p-2 rounded bg-slate-50" value={newEmp.name || ''} onChange={e => setNewEmp({...newEmp, name: e.target.value})}/></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">NIF</label><input className="w-full border p-2 rounded bg-slate-50" value={newEmp.nif || ''} onChange={e => setNewEmp({...newEmp, nif: e.target.value})}/></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">BI Nº</label><input className="w-full border p-2 rounded bg-slate-50" value={newEmp.biNumber || ''} onChange={e => setNewEmp({...newEmp, biNumber: e.target.value})}/></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">Género</label><select className="w-full border p-2 rounded bg-slate-50" value={newEmp.gender} onChange={e => setNewEmp({...newEmp, gender: e.target.value as any})}><option value="M">Masculino</option><option value="F">Feminino</option></select></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">Estado Civil</label><select className="w-full border p-2 rounded bg-slate-50" value={newEmp.maritalStatus} onChange={e => setNewEmp({...newEmp, maritalStatus: e.target.value as any})}><option value="Solteiro">Solteiro</option><option value="Casado">Casado</option></select></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">Nascimento</label><input type="date" className="w-full border p-2 rounded bg-slate-50" value={newEmp.birthDate} onChange={e => setNewEmp({...newEmp, birthDate: e.target.value})}/></div>
                            <div className="col-span-3"><label className="text-xs font-bold uppercase text-slate-500">Morada</label><input className="w-full border p-2 rounded bg-slate-50" value={newEmp.address || ''} onChange={e => setNewEmp({...newEmp, address: e.target.value})}/></div>
                        </div>
                        <h4 className="text-sm font-bold text-blue-900 uppercase border-b border-blue-100 pb-2 mb-4">Dados Contratuais e Financeiros</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div><label className="text-xs font-bold uppercase text-slate-500">Salário Base</label><input type="number" className="w-full border p-2 rounded font-bold text-lg" value={newEmp.baseSalary || ''} onChange={e => setNewEmp({...newEmp, baseSalary: Number(e.target.value)})}/></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">Sub. Transporte</label><input type="number" className="w-full border p-2 rounded" value={newEmp.subsidyTransport || ''} onChange={e => setNewEmp({...newEmp, subsidyTransport: Number(e.target.value)})}/></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">Sub. Alimentação</label><input type="number" className="w-full border p-2 rounded" value={newEmp.subsidyFood || ''} onChange={e => setNewEmp({...newEmp, subsidyFood: Number(e.target.value)})}/></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">Outros Sub.</label><input type="number" className="w-full border p-2 rounded" value={newEmp.subsidyFamily || ''} onChange={e => setNewEmp({...newEmp, subsidyFamily: Number(e.target.value)})}/></div>
                        </div>
                    </div>
                    <div className="p-4 border-t flex justify-end gap-2 bg-slate-50 sticky bottom-0">
                        <button onClick={() => setShowEmpModal(false)} className="px-4 py-2 border rounded hover:bg-white">Cancelar</button>
                        <button onClick={handleSaveEmployee} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Salvar Ficha</button>
                    </div>
                </div>
            </div>
        )}

        {showVacationModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in zoom-in-95">
                <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 uppercase tracking-widest text-slate-700"><Calendar size={20} className="text-orange-500"/> Marcar Férias</h3>
                    <div className="space-y-4">
                        <select className="w-full border p-2 rounded" value={newVacation.employeeId || ''} onChange={e => setNewVacation({...newVacation, employeeId: e.target.value})}>
                            <option value="">Selecione Funcionário...</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Início</label><input type="date" className="w-full border p-2 rounded" onChange={e => setNewVacation({...newVacation, startDate: e.target.value})}/></div>
                            <div><label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Dias</label><input type="number" className="w-full border p-2 rounded" onChange={e => setNewVacation({...newVacation, days: Number(e.target.value)})}/></div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => setShowVacationModal(false)} className="flex-1 border py-2 rounded font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                          <button onClick={handleSaveVacation} className="flex-1 bg-orange-600 text-white py-2 rounded font-bold hover:bg-orange-700 shadow-sm">Confirmar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showAttendanceModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in zoom-in-95">
                <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 uppercase tracking-widest text-slate-700"><Clock size={20} className="text-blue-500"/> Registo de Ponto</h3>
                    <div className="space-y-4">
                        <select className="w-full border p-2 rounded" value={newAttendance.employeeId || ''} onChange={e => setNewAttendance({...newAttendance, employeeId: e.target.value})}>
                            <option value="">Selecione Funcionário...</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <input type="date" className="w-full border p-2 rounded" onChange={e => setNewAttendance({...newAttendance, date: e.target.value})}/>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Entrada</label><input type="time" className="w-full border p-2 rounded" onChange={e => setNewAttendance({...newAttendance, checkIn: e.target.value})}/></div>
                            <div><label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Saída</label><input type="time" className="w-full border p-2 rounded" onChange={e => setNewAttendance({...newAttendance, checkOut: e.target.value})}/></div>
                        </div>
                        <select className="w-full border p-2 rounded" value={newAttendance.status} onChange={e => setNewAttendance({...newAttendance, status: e.target.value as any})}>
                            <option value="Present">Presente</option>
                            <option value="Absent">Falta</option>
                            <option value="Late">Atraso</option>
                        </select>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => setShowAttendanceModal(false)} className="flex-1 border py-2 rounded font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                          <button onClick={handleSaveAttendance} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 shadow-sm">Registar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showContractModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in zoom-in-95">
                <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 uppercase tracking-widest text-slate-700"><HeartHandshake size={20} className="text-purple-500"/> Novo Contrato</h3>
                    <div className="space-y-4">
                        <select className="w-full border p-2 rounded" value={newContract.employeeId || ''} onChange={e => setNewContract({...newContract, employeeId: e.target.value})}>
                            <option value="">Selecione Funcionário...</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <select className="w-full border p-2 rounded" value={newContract.type} onChange={e => setNewContract({...newContract, type: e.target.value as any})}>
                            <option value="Determinado">Termo Certo (Determinado)</option>
                            <option value="Indeterminado">Sem Termo (Indeterminado)</option>
                            <option value="Estagio">Estágio</option>
                        </select>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Início</label><input type="date" className="w-full border p-2 rounded font-mono" onChange={e => setNewContract({...newContract, startDate: e.target.value})}/></div>
                            <div><label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Fim</label><input type="date" className="w-full border p-2 rounded font-mono" onChange={e => setNewContract({...newContract, endDate: e.target.value})}/></div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => setShowContractModal(false)} className="flex-1 border py-2 rounded font-bold text-slate-500 hover:bg-slate-50">Cancelar</button>
                          <button onClick={handleSaveContract} className="flex-1 bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700 shadow-sm">Criar Contrato</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default HumanResources;
