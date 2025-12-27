import React, { useState, useEffect, useMemo } from 'react';
import { Employee, Company, Contract } from '../types';
import { formatDate, formatCurrency, numberToExtenso, generateId, generateQrCodeUrl } from '../utils';
import { supabase } from '../services/supabaseClient';
import { ArrowLeft, Printer, Save, RefreshCw, FileSignature, UserCircle2, Calendar, Gavel, X } from 'lucide-react';

interface ContractGeneratorProps {
  employee: Employee;
  company: Company;
  onBack: () => void;
  onSave?: (contract: Contract) => void;
  initialContract?: Contract;
  autoPrint?: boolean;
}

const ContractGenerator: React.FC<ContractGeneratorProps> = ({ employee, company, onBack, onSave, initialContract, autoPrint = false }) => {
  const [startDate, setStartDate] = useState(initialContract?.startDate || new Date().toISOString().split('T')[0]);
  const [durationMonths, setDurationMonths] = useState(0);
  const [probationDays, setProbationDays] = useState(30);
  const [noticeDays, setNoticeDays] = useState(30);
  const [salary, setSalary] = useState(employee?.baseSalary || 0);
  const [repName, setRepName] = useState('Administrador');
  const [idType, setIdType] = useState('Bilhete Identidade');
  const [idNumber, setIdNumber] = useState('000000000');
  const [repNationality, setRepNationality] = useState('Angolana');
  const [repPosition, setRepPosition] = useState('Gerente Geral');
  const [isSaving, setIsSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(!autoPrint);
  
  const [contractType, setContractType] = useState(initialContract?.type === 'Indeterminado' ? 'Contrato por Tempo Indeterminado' : 'Contrato por Tempo Determinado');
  const [selectedReason, setSelectedReason] = useState(initialContract?.clauses?.[0] || 'Trabalho sazonal');

  const contractTypes = [
    'Contrato por Tempo Indeterminado',
    'Contrato por Tempo Determinado',
    'Contrato de Aprendizagem',
    'Contrato de Comissão de Serviço',
    'Contrato de Estágio',
    'Contrato de trabalho no Domicilio',
    'Contrato de trabalho Rural',
    'Contrato de Trabalho Desportivo',
    'Contrato de Trabalho Doméstico'
  ];

  const reasons = [
      { label: 'Trabalho sazonal', duration: '6 meses' },
      { label: 'Execução de trabalhos urgentes necessários ou para organizar medidas de salvaguarda das instalações.', duration: '6 meses' },
      { label: 'Acréscimo temporário ou excepcional da actividade normal da empresa.', duration: '12 meses' },
      { label: 'Realização de tarefas ocasionais e pontuais que não entram no quadro de actividade corrente.', duration: '12 meses' },
      { label: 'Substituição de trabalhador temporariamente ausente;', duration: '36 meses' },
      { label: 'Aprendizagem e formação profissional prática.', duration: '36 meses' },
      { label: 'Lançamento de actividades novas de duração incerta.', duration: '60 meses' }
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const mappedType: 'Determinado' | 'Indeterminado' | 'Estagio' = 
            contractType.includes('Indeterminado') ? 'Indeterminado' :
            contractType.includes('Estágio') ? 'Estagio' : 'Determinado';

        const docId = initialContract?.id || generateId();
        const endDate = durationMonths > 0 ? new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + durationMonths)).toISOString().split('T')[0] : null;

        const newContractObj: Contract = {
            id: docId,
            employeeId: employee.id,
            type: mappedType,
            startDate: startDate,
            endDate: endDate || undefined,
            status: 'Active',
            clauses: [selectedReason, contractType] 
        };

        // Persistência no Supabase
        const { error } = await supabase
            .from('contratos')
            .upsert({
                funcionario_id: employee.id,
                tipo: mappedType,
                data_inicio: startDate,
                data_fim: endDate,
                status: 'Active',
                clausulas: [selectedReason, contractType],
                salario: Number(salary),
                empresa_id: company.id || '00000000-0000-0000-0000-000000000001'
            });

        if (error) throw error;

        onSave?.(newContractObj);
        alert("Contrato guardado com sucesso na Cloud!");
        setShowEditor(false); // Após salvar, foca na visualização A4
    } catch (err: any) {
        console.error("Erro ao salvar contrato:", err);
        alert("Erro ao salvar contrato: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const contractTemplate = useMemo(() => {
    if (!employee || !company) return '';
    const today = new Date();
    const day = today.getDate();
    const monthName = today.toLocaleString('pt-PT', { month: 'long' });
    const year = today.getFullYear();

    return `
      <div class="space-y-4 text-justify leading-relaxed text-[11pt] font-serif p-4">
          <div class="text-center mb-10 pb-4 border-b-2 border-black">
              <h1 class="text-2xl font-black uppercase underline tracking-tight">${contractType}</h1>
              <p class="text-[10px] font-bold mt-2 uppercase tracking-widest">Em conformidade com a Lei 12/23 de 27 de Dezembro (Angola)</p>
          </div>

          <p><b>Entre:</b></p>
          <p>
              <span class="uppercase font-bold">${company.name || '---'}</span>, com sede social sita em ${(company.address || '---').toUpperCase()}, 
              Número de Identificação Fiscal (NIF) ${company.nif || '---'}, neste acto representada por <span class="font-bold underline">${repName}</span>, de 
              nacionalidade <span class="font-bold">${repNationality}</span>, portador do <span class="font-bold">${idType} nº ${idNumber}</span>, na qualidade de 
              <span class="font-bold">${repPosition}</span>, adiante abreviadamente designada por <b>EMPREGADOR</b>.
          </p>
          
          <p><b>E:</b></p>
          <p>
              <span class="font-bold uppercase underline">${employee.name || '---'}</span>, estado civil ${employee.maritalStatus || '---'}, nascido em ${formatDate(employee.birthDate || '')}, residente e domiciliado em ${employee.address || '---'}, 
              Bairro ${employee.neighborhood || '---'}, Municipio de ${employee.municipality || '---'}, titular do Bilhete de Identidade Nº ${employee.biNumber || '---'}, 
              NIF ${employee.nif || '---'}, adiante designado por <b>TRABALHADOR</b>.
          </p>

          <p>É celebrado livremente e de boa fé o presente Contrato de Trabalho, que se regerá pelas disposições da Lei Geral do Trabalho vigente na República de Angola e pelas cláusulas seguintes:</p>

          <p><b>CLÁUSULA 1.ª (FUNÇÕES E LOCAL DE TRABALHO)</b><br/>
          O TRABALHADOR é admitido para exercer as funções de <b>${employee.role || '---'}</b>, comprometendo-se a executar todas as tarefas inerentes à sua categoria profissional, sob as ordens e direcção do EMPREGADOR.</p>

          <p><b>CLÁUSULA 2.ª (REMUNERAÇÃO)</b><br/>
          Pela prestação do seu trabalho, o EMPREGADOR pagará ao TRABALHADOR a remuneração mensal ilíquida de <b>${formatCurrency(salary)}</b> ( ${numberToExtenso(salary)} ), paga mensalmente até ao último dia útil do mês a que respeita.</p>

          <p><b>CLÁUSULA 3.ª (DURAÇÃO E PERÍODO EXPERIMENTAL)</b><br/>
          O presente contrato é celebrado pelo período ${contractType.includes('Indeterminado') ? 'indeterminado' : 'determinado com início em ' + formatDate(startDate) + ' e duração de ' + durationMonths + ' meses'}, com um período experimental de ${probationDays} dias.</p>

          ${contractType.includes('Determinado') ? `
          <p><b>CLÁUSULA 3.ª-A (FUNDAMENTAÇÃO)</b><br/>
          A celebração do contrato a tempo determinado fundamenta-se em: ${selectedReason}.</p>
          ` : ''}

          <p><b>CLÁUSULA 4.ª (HORÁRIO DE TRABALHO)</b><br/>
          O TRABALHADOR cumprirá um horário de 44 horas semanais, distribuídas de segunda a sábado, salvaguardando-se os períodos de descanso obrigatórios previstos na lei.</p>

          <div class="grid grid-cols-2 gap-12 mt-20 text-center font-bold">
              <div class="border-t border-black pt-2 uppercase">O TRABALHADOR</div>
              <div class="border-t border-black pt-2 uppercase">O EMPREGADOR</div>
          </div>

          <div class="mt-12 text-right font-medium">
              Luanda, aos ${day} de ${monthName} de ${year}.
          </div>
      </div>
    `;
  }, [startDate, durationMonths, probationDays, salary, repName, repNationality, idType, idNumber, repPosition, contractType, selectedReason, company, employee]);

  return (
    <div className="bg-slate-100 h-screen flex flex-col animate-in fade-in overflow-hidden">
      {/* BARRA DE TOPO - FIXA */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shrink-0 shadow-xl print:hidden">
          <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition border border-slate-700"><ArrowLeft size={24}/></button>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                    <FileSignature className="text-blue-400"/> Contrato de Trabalho
                </h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{employee.name}</p>
              </div>
          </div>
          <div className="flex gap-2">
              {!showEditor && (
                <button onClick={() => setShowEditor(true)} className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-xl font-black uppercase text-xs hover:bg-slate-700 transition">
                    Editar Dados
                </button>
              )}
              <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-black uppercase tracking-tighter text-xs flex items-center gap-2 shadow-lg transition">
                  <Printer size={18}/> Imprimir A4
              </button>
              {showEditor && (
                <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2 rounded-xl font-black uppercase tracking-tighter text-xs flex items-center gap-2 shadow-xl transition disabled:opacity-50">
                    {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Gravar na Cloud
                </button>
              )}
          </div>
      </div>

      {/* CONTEÚDO */}
      <div className="flex-1 flex overflow-hidden">
          {/* EDITOR SIDEBAR - CONDICIONAL */}
          {showEditor && (
            <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto p-5 space-y-6 custom-scrollbar print:hidden animate-in slide-in-from-left duration-300">
                <div className="space-y-4">
                    <h2 className="font-black text-slate-800 uppercase text-[10px] tracking-widest border-b pb-2 flex items-center gap-2">
                        <UserCircle2 size={16} className="text-blue-600"/> Representante
                    </h2>
                    <input className="w-full p-2 border rounded-lg bg-slate-50 font-bold text-xs" placeholder="Nome do Outorgante" value={repName} onChange={e => setRepName(e.target.value)}/>
                    <input className="w-full p-2 border rounded-lg bg-slate-50 text-xs" placeholder="Cargo" value={repPosition} onChange={e => setRepPosition(e.target.value)}/>
                    <input type="number" className="w-full p-2 border-2 border-blue-100 rounded-lg bg-white font-black text-blue-800 text-xs" placeholder="Vencimento" value={salary} onChange={e => setSalary(Number(e.target.value))}/>
                </div>

                <div className="space-y-4">
                    <h2 className="font-black text-slate-800 uppercase text-[10px] tracking-widest border-b pb-2 flex items-center gap-2">
                        <Calendar size={16} className="text-blue-600"/> Vigência
                    </h2>
                    <input type="date" className="w-full p-2 border rounded-lg bg-slate-50 font-bold text-xs" value={startDate} onChange={e => setStartDate(e.target.value)}/>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" className="w-full p-2 border rounded-lg bg-slate-50 text-center text-xs" placeholder="Meses" value={durationMonths} onChange={e => setDurationMonths(Number(e.target.value))}/>
                        <input type="number" className="w-full p-2 border rounded-lg bg-slate-50 text-center text-xs" placeholder="Exp (Dias)" value={probationDays} onChange={e => setProbationDays(Number(e.target.value))}/>
                    </div>
                    <select className="w-full p-2 border rounded-lg bg-slate-50 text-xs font-bold" value={contractType} onChange={e => setContractType(e.target.value)}>
                        {contractTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <h2 className="font-black text-slate-800 uppercase text-[10px] tracking-widest border-b pb-2 flex items-center gap-2">
                        <Gavel size={16} className="text-blue-600"/> Fundamentação
                    </h2>
                    {reasons.map(r => (
                        <label key={r.label} className={`flex gap-2 p-2 rounded-lg border text-[9px] cursor-pointer transition ${selectedReason === r.label ? 'bg-blue-50 border-blue-300 font-bold text-blue-800' : 'hover:bg-slate-50 border-transparent text-slate-600'}`}>
                            <input type="radio" name="reason" value={r.label} checked={selectedReason === r.label} onChange={e => setSelectedReason(e.target.value)} className="mt-0.5"/>
                            <span className="leading-tight">{r.label}</span>
                        </label>
                    ))}
                </div>
                <button onClick={() => setShowEditor(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase hover:bg-slate-200">Fechar Editor</button>
            </div>
          )}

          {/* VISUALIZAÇÃO A4 */}
          <div className="flex-1 overflow-y-auto p-12 flex justify-center bg-slate-200 custom-scrollbar print:bg-white print:p-0">
              <div className="bg-white text-black w-[210mm] min-h-[297mm] shadow-2xl p-[25mm] print:shadow-none print:m-0 print:p-[20mm] shrink-0 h-fit" id="contract-view-area">
                    <div className="flex justify-between items-start mb-12 border-b-4 border-slate-900 pb-8">
                        <div className="w-48 h-20 bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 border-2 border-dashed border-slate-200 uppercase font-black overflow-hidden">
                            {company.logo ? <img src={company.logo} className="h-full w-full object-contain" alt="Logo"/> : 'Logotipo'}
                        </div>
                        <div className="text-right text-[10px] font-bold text-slate-900 uppercase">
                            <p className="text-lg font-black">{company.name || '---'}</p>
                            <p>{company.address || '---'}</p>
                            <p>NIF: {company.nif || '---'}</p>
                            <p>{company.email || '---'}</p>
                            <p>Tel: {company.phone || '---'}</p>
                        </div>
                    </div>

                    <div 
                        className="outline-none" 
                        contentEditable={false} 
                        dangerouslySetInnerHTML={{ __html: contractTemplate }}
                    ></div>

                    <div className="mt-20 pt-4 border-t border-slate-100 flex justify-between items-center text-[8px] text-slate-400 font-mono">
                        <div className="flex items-center gap-2">
                            <img src={generateQrCodeUrl(initialContract?.id || 'CONTRACT')} className="w-8 h-8 opacity-50" alt="QR"/>
                            <span>Certificado nº 25/AGT/2019 • Imatec Software V.2.0</span>
                        </div>
                        <span className="font-bold">Original: RH / Cópia: Trabalhador</span>
                    </div>
              </div>
          </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #contract-view-area, #contract-view-area * { visibility: visible; }
          #contract-view-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            padding: 20mm;
            margin: 0;
            box-shadow: none !important;
            border: none !important;
          }
          @page { size: A4; margin: 0; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ContractGenerator;