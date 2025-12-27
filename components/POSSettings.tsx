
import React, { useState } from 'react';
import { POSConfig, DocumentSeries, Client } from '../types';
import { Save, Monitor, Printer, CreditCard } from 'lucide-react';

interface POSSettingsProps {
  config: POSConfig;
  onSaveConfig: (cfg: POSConfig) => void;
  series: DocumentSeries[];
  clients: Client[];
}

const POSSettings: React.FC<POSSettingsProps> = ({ config, onSaveConfig, series, clients }) => {
  const [localConfig, setLocalConfig] = useState<POSConfig>(config);

  const handleSave = () => {
      onSaveConfig(localConfig);
      alert("Configurações guardadas!");
  };

  return (
    <div className="p-8 max-w-3xl mx-auto animate-in fade-in">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Monitor/> Configurações do Ponto de Venda</h1>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            
            <div>
                <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">Geral e Documentos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Série Padrão POS</label>
                        <select 
                            className="w-full p-2 border rounded"
                            value={localConfig.defaultSeriesId}
                            onChange={e => setLocalConfig({...localConfig, defaultSeriesId: e.target.value})}
                        >
                            <option value="">Selecione...</option>
                            {series.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente Padrão</label>
                        <select 
                            className="w-full p-2 border rounded"
                            value={localConfig.defaultClientId}
                            onChange={e => setLocalConfig({...localConfig, defaultClientId: e.target.value})}
                        >
                            <option value="">Consumidor Final</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-slate-700 border-b pb-2 mb-4 flex items-center gap-2"><Printer size={18}/> Impressão</h3>
                <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={localConfig.autoPrint} 
                            onChange={e => setLocalConfig({...localConfig, autoPrint: e.target.checked})}
                            className="w-5 h-5"
                        />
                        <span className="text-sm font-medium">Imprimir automaticamente ao finalizar</span>
                    </label>
                </div>
                <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Formato de Talão</label>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setLocalConfig({...localConfig, printerType: '80mm'})}
                            className={`px-4 py-2 rounded border ${localConfig.printerType === '80mm' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}
                        >
                            Térmica 80mm
                        </button>
                        <button 
                            onClick={() => setLocalConfig({...localConfig, printerType: 'A4'})}
                            className={`px-4 py-2 rounded border ${localConfig.printerType === 'A4' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}
                        >
                            Papel A4
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-slate-700 border-b pb-2 mb-4 flex items-center gap-2"><CreditCard size={18}/> Pagamento e Interface</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Método Pagamento Padrão</label>
                        <select 
                            className="w-full p-2 border rounded"
                            value={localConfig.defaultPaymentMethod}
                            onChange={e => setLocalConfig({...localConfig, defaultPaymentMethod: e.target.value as any})}
                        >
                            <option value="CASH">Numerário</option>
                            <option value="MULTICAIXA">Multicaixa</option>
                        </select>
                    </div>
                    <div className="space-y-2 pt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={localConfig.showImages} 
                                onChange={e => setLocalConfig({...localConfig, showImages: e.target.checked})}
                            />
                            <span className="text-sm">Mostrar imagens dos produtos</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={localConfig.quickMode} 
                                onChange={e => setLocalConfig({...localConfig, quickMode: e.target.checked})}
                            />
                            <span className="text-sm">Modo Rápido (Ocultar detalhes)</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
                <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-lg">
                    <Save size={20}/> Guardar Configurações
                </button>
            </div>
        </div>
    </div>
  );
};

export default POSSettings;
