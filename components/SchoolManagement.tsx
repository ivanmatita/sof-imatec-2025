
import React, { useState, useMemo } from 'react';
import { 
  Users, UserCheck, BookOpen, ClipboardList, ScrollText, 
  Table, Plus, Search, MapPin, Calendar, Clock, Gavel, 
  CheckCircle, FileText, Printer, Download, Save, X, Filter,
  GraduationCap, BookMarked, UserPlus, Eye, ClipboardCheck, BarChart3, ChevronRight, School
} from 'lucide-react';
import { 
  SchoolStudent, SchoolTeacher, SchoolClass, SchoolCourse, 
  SchoolGrade, SchoolAttendance, SchoolOccurrence, ViewState 
} from '../types';
import { formatDate, generateId } from '../utils';

interface SchoolManagementProps {
  currentSubView: ViewState;
}

const SchoolManagement: React.FC<SchoolManagementProps> = ({ currentSubView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock Data
  const [students] = useState<SchoolStudent[]>([
    { id: '1', registrationNumber: '2024/001', name: 'António Manuel', birthDate: '2008-05-12', gender: 'M', address: 'Luanda, Maianga', parentName: 'Manuel António', parentPhone: '923000111', status: 'ACTIVE' },
    { id: '2', registrationNumber: '2024/002', name: 'Beatriz Silva', birthDate: '2009-02-20', gender: 'F', address: 'Luanda, Viana', parentName: 'Sofia Silva', parentPhone: '924555666', status: 'ACTIVE' }
  ]);

  const [teachers] = useState<SchoolTeacher[]>([
    { id: 't1', name: 'Prof. Carlos Bengue', nif: '123456789', specialization: 'Matemática', email: 'carlos@escola.ao', phone: '923111222', status: 'ACTIVE' }
  ]);

  const [classes] = useState<SchoolClass[]>([
    { id: 'c1', name: '10ª Classe A', courseId: 'cr1', roomNumber: 'Sala 04', period: 'MANHÃ', year: 2024, capacity: 40 }
  ]);

  const renderStudents = () => (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> Alunos & Matrículas</h2>
          <p className="text-xs text-slate-500">Gestão de inscrições e histórico escolar</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-md">
          <UserPlus size={18}/> Nova Matrícula
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
          <input className="w-full pl-10 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Pesquisar Aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>
        <select className="border p-2 rounded-lg bg-slate-50 text-sm font-bold outline-none">
          <option>Todas as Turmas</option>
          <option>10ª Classe A</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800 text-white font-bold uppercase text-[10px]">
            <tr>
              <th className="p-4">Nº Proc</th>
              <th className="p-4">Nome Completo</th>
              <th className="p-4">Género</th>
              <th className="p-4">Data Nasc.</th>
              <th className="p-4">Encarregado</th>
              <th className="p-4">Estado</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map(s => (
              <tr key={s.id} className="hover:bg-blue-50 transition-colors">
                <td className="p-4 font-mono font-bold text-blue-600">{s.registrationNumber}</td>
                <td className="p-4 font-bold text-slate-800">{s.name}</td>
                <td className="p-4 text-slate-600">{s.gender}</td>
                <td className="p-4 text-slate-600">{formatDate(s.birthDate)}</td>
                <td className="p-4 text-slate-600">
                   <div className="font-bold">{s.parentName}</div>
                   <div className="text-[10px]">{s.parentPhone}</div>
                </td>
                <td className="p-4">
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200">ACTIVO</span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600"><Eye size={16}/></button>
                    <button className="p-1.5 text-slate-400 hover:text-slate-800"><FileText size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAcademic = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border-l-4 border-blue-600 shadow-sm flex flex-col gap-2">
          <p className="text-slate-500 text-xs font-bold uppercase">Gestão de Pautas</p>
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ClipboardList size={32}/></div>
             <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-blue-700">Lançar Notas</button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border-l-4 border-green-600 shadow-sm flex flex-col gap-2">
          <p className="text-slate-500 text-xs font-bold uppercase">Controlo de Frequência</p>
          <div className="flex items-center gap-4">
             <div className="p-3 bg-green-50 text-green-600 rounded-xl"><ClipboardCheck size={32}/></div>
             <button className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-green-700">Marcar Presenças</button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border-l-4 border-red-600 shadow-sm flex flex-col gap-2">
          <p className="text-slate-500 text-xs font-bold uppercase">Ocorrências Disciplinares</p>
          <div className="flex items-center gap-4">
             <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Gavel size={32}/></div>
             <button className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold text-xs hover:bg-red-700">Registar Incidente</button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><Table size={18} className="text-blue-600"/> Pauta Trimestral - Prévia</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-y border-slate-200">
              <tr>
                <th className="p-3">Aluno</th>
                <th className="p-3 text-center">MAC</th>
                <th className="p-3 text-center">CPP</th>
                <th className="p-3 text-center">EXAME</th>
                <th className="p-3 text-center">MF</th>
                <th className="p-3 text-center">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3 font-bold">António Manuel</td>
                <td className="p-3 text-center">14</td>
                <td className="p-3 text-center">12</td>
                <td className="p-3 text-center">15</td>
                <td className="p-3 text-center font-bold text-blue-700">14</td>
                <td className="p-3 text-center"><span className="text-green-600 font-bold">Aprovado</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Histórico Escolar', icon: BookMarked, color: 'blue' },
          { title: 'Certificados', icon: ScrollText, color: 'emerald' },
          { title: 'Declarações', icon: FileText, color: 'orange' },
          { title: 'Atas de Reunião', icon: Gavel, color: 'slate' }
        ].map((doc, i) => (
          <button key={i} className="bg-white p-8 rounded-2xl border-2 border-slate-50 hover:border-blue-500 hover:shadow-xl transition-all group flex flex-col items-center gap-4 text-center">
            <div className={`p-4 bg-${doc.color}-50 text-${doc.color}-600 rounded-full group-hover:scale-110 transition-transform`}>
              <doc.icon size={40}/>
            </div>
            <span className="font-black text-slate-800 uppercase text-xs tracking-widest">{doc.title}</span>
          </button>
        ))}
      </div>

      <div className="bg-slate-900 rounded-3xl p-10 text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="max-w-xl">
               <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Assinatura Digital Integrada</h2>
               <p className="text-slate-400 leading-relaxed">Gere documentos com validade institucional e assinatura digital QR Code para garantir a integridade dos certificados e declarações emitidos pelo sistema.</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl transition">Configurar Assinaturas</button>
          </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest flex items-center gap-2"><BarChart3 className="text-blue-600"/> Relatórios Administrativos e Estatísticos</h3>
            <div className="flex gap-2">
               <button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200">PDF</button>
               <button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200">Excel</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-500 uppercase text-[10px] tracking-widest border-b pb-2">Académicos</h4>
              <button className="w-full text-left p-4 hover:bg-blue-50 rounded-xl transition-colors flex justify-between items-center group">
                 <span className="font-bold text-slate-700">Taxa de Aproveitamento por Turma</span>
                 <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600"/>
              </button>
              <button className="w-full text-left p-4 hover:bg-blue-50 rounded-xl transition-colors flex justify-between items-center group border-t">
                 <span className="font-bold text-slate-700">Ranking Geral de Alunos</span>
                 <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600"/>
              </button>
              <button className="w-full text-left p-4 hover:bg-blue-50 rounded-xl transition-colors flex justify-between items-center group border-t">
                 <span className="font-bold text-slate-700">Mapa de Assiduidade Geral</span>
                 <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600"/>
              </button>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-slate-500 uppercase text-[10px] tracking-widest border-b pb-2">Financeiro Escolar</h4>
              <button className="w-full text-left p-4 hover:bg-green-50 rounded-xl transition-colors flex justify-between items-center group">
                 <span className="font-bold text-slate-700">Relatório de Propinas Pendentes</span>
                 <ChevronRight size={16} className="text-slate-300 group-hover:text-green-600"/>
              </button>
              <button className="w-full text-left p-4 hover:bg-green-50 rounded-xl transition-colors flex justify-between items-center group border-t">
                 <span className="font-bold text-slate-700">Mapa de Cobrança de Taxas Exame</span>
                 <ChevronRight size={16} className="text-slate-300 group-hover:text-green-600"/>
              </button>
              <button className="w-full text-left p-4 hover:bg-green-50 rounded-xl transition-colors flex justify-between items-center group border-t">
                 <span className="font-bold text-slate-700">Histórico Financeiro por Aluno</span>
                 <ChevronRight size={16} className="text-slate-300 group-hover:text-green-600"/>
              </button>
            </div>
          </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentSubView) {
      case 'SCHOOL_STUDENTS': return renderStudents();
      case 'SCHOOL_ACADEMIC': return renderAcademic();
      case 'SCHOOL_DOCUMENTS': return renderDocuments();
      case 'SCHOOL_REPORTS': return renderReports();
      default: return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center gap-4">
               <div className="p-4 bg-blue-50 text-blue-600 rounded-full"><Users size={32}/></div>
               <div><p className="text-2xl font-black">1.240</p><p className="text-xs text-slate-500 font-bold uppercase">Alunos Ativos</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center gap-4">
               <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full"><UserCheck size={32}/></div>
               <div><p className="text-2xl font-black">84</p><p className="text-xs text-slate-500 font-bold uppercase">Professores</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center gap-4">
               <div className="p-4 bg-orange-50 text-orange-600 rounded-full"><School size={32}/></div>
               <div><p className="text-2xl font-black">28</p><p className="text-xs text-slate-500 font-bold uppercase">Turmas</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center gap-4">
               <div className="p-4 bg-red-50 text-red-600 rounded-full"><CheckCircle size={32}/></div>
               <div><p className="text-2xl font-black">92%</p><p className="text-xs text-slate-500 font-bold uppercase">Assiduidade</p></div>
            </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      {renderContent()}
    </div>
  );
};

export default SchoolManagement;
