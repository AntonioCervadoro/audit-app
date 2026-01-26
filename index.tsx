import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
    Plus, Upload, Play, RotateCcw, 
    FileText, CheckCircle, FileDown,
    Search, X, AlertTriangle, ShieldCheck, MapPin
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as pdfjsLib from 'pdfjs-dist';

// Configurazione worker PDF.js
const PDF_WORKER_URL = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs';

const generateId = () => Math.random().toString(36).substring(2, 11);

const AuditApp = () => {
    const [names, setNames] = useState<any[]>([]);
    const [newName, setNewName] = useState('');
    const [files, setFiles] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [resetKey, setResetKey] = useState(0); 
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    useEffect(() => {
        try {
            if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
                console.log("AuditApp: Motore PDF inizializzato.");
            }
        } catch (e) {
            console.error("Errore Worker PDF:", e);
        }
    }, []);

    const performReset = () => {
        setNames([]);
        setFiles([]);
        setResults([]);
        setNewName('');
        setResetKey(prev => prev + 1);
        setShowResetConfirm(false);
    };

    const addName = () => {
        if (newName.trim()) {
            setNames([...names, { id: generateId(), name: newName.trim() }]);
            setNewName('');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploaded = Array.from(e.target.files || []) as File[];
        const newFiles = uploaded.map(file => ({
            id: generateId(),
            file,
            name: file.name,
            type: file.type
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const runLocalAnalysis = async () => {
        if (!names.length || !files.length) return;
        setLoading(true);
        const tempResults = [];

        try {
            for (const fItem of files) {
                const { file } = fItem;
                const findings = [];
                const searchNames = names.map(n => n.name);
                
                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    
                    for (const name of searchNames) {
                        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(escapedName, 'gi');
                        let totalCount = 0;
                        const foundPages = new Set<number>();

                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map((item: any) => item.str || "").join(" ");
                            const matches = [...pageText.matchAll(regex)];
                            if (matches.length > 0) {
                                totalCount += matches.length;
                                foundPages.add(i);
                            }
                        }
                        findings.push({ 
                            name, 
                            status: totalCount > 0 ? 'present' : 'absent', 
                            count: totalCount, 
                            location: foundPages.size > 0 ? `Pagina/e: ${Array.from(foundPages).sort((a: number, b: number) => a - b).join(', ')}` : 'Nessun riscontro' 
                        });
                    }
                } else {
                    const text = await file.text();
                    const lines = text.split(/\r?\n/);
                    for (const name of searchNames) {
                        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(escapedName, 'gi');
                        let totalCount = 0;
                        const foundLines = new Set<number>();

                        for (let i = 0; i < lines.length; i++) {
                            const matches = [...lines[i].matchAll(regex)];
                            if (matches.length > 0) {
                                totalCount += matches.length;
                                foundLines.add(i + 1);
                            }
                        }
                        findings.push({ 
                            name, 
                            status: totalCount > 0 ? 'present' : 'absent', 
                            count: totalCount, 
                            location: foundLines.size > 0 ? `Riga/he: ${Array.from(foundLines).sort((a: number, b: number) => a - b).slice(0, 15).join(', ')}${foundLines.size > 15 ? '...' : ''}` : 'Nessun riscontro' 
                        });
                    }
                }
                tempResults.push({ fileName: fItem.name, findings, date: new Date().toLocaleString() });
            }
            setResults(tempResults);
        } catch (err) {
            console.error("Errore analisi:", err);
            alert("Si è verificato un errore durante l'analisi locale.");
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18).text("Audit Privacy Report", 14, 20);
        doc.setFontSize(10).text(`Generato il: ${new Date().toLocaleString()}`, 14, 28);
        
        const tableData = results.flatMap(r => r.findings.map((f: any) => [
            r.fileName, f.name, f.status === 'present' ? `TROVATO (${f.count})` : 'ASSENTE', f.location
        ]));

        autoTable(doc, {
            startY: 35,
            head: [['Documento', 'Soggetto', 'Esito', 'Posizione']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59] },
            styles: { fontSize: 8 }
        });
        doc.save(`audit_report_${Date.now()}.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {showResetConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-fade-in">
                        <div className="text-center space-y-4">
                            <AlertTriangle size={48} className="mx-auto text-red-500" />
                            <h3 className="text-xl font-black text-slate-800">Cancellare tutto?</h3>
                            <p className="text-slate-500 text-sm">Questa azione rimuoverà tutti i documenti e i risultati correnti.</p>
                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <button onClick={() => setShowResetConfirm(false)} className="px-4 py-3 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition-colors">Annulla</button>
                                <button onClick={performReset} className="px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">Resetta</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 p-2 rounded-lg text-white"><ShieldCheck size={24} /></div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 tracking-tight">AuditCheck <span className="text-indigo-600">Privacy</span></h1>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">100% Analisi Locale Offline</p>
                    </div>
                </div>
                <button onClick={() => setShowResetConfirm(true)} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 flex items-center gap-2 transition-colors">
                    <RotateCcw size={14} /> Nuova Scansione
                </button>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <aside className="lg:col-span-4 space-y-6">
                    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Target di Ricerca</h2>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addName()}
                                placeholder="Esempio: Nome Cognome"
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                            <button onClick={addName} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-800 active:scale-95 transition-all">
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                            {names.length === 0 && <p className="text-[10px] text-slate-300 italic text-center py-4">Nessun target aggiunto</p>}
                            {names.map(n => (
                                <div key={n.id} className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 group animate-fade-in">
                                    <span className="text-xs font-bold text-slate-600">{n.name}</span>
                                    <button onClick={() => setNames(names.filter(x => x.id !== n.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Documenti da Analizzare</h2>
                        <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all group">
                            <input key={`files-${resetKey}`} type="file" multiple accept=".pdf,.txt,.csv" className="hidden" onChange={handleFileUpload} />
                            <Upload size={32} className="mx-auto text-slate-300 group-hover:text-indigo-400 mb-3 transition-colors" />
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Sfoglia o Trascina</span>
                            <span className="text-[9px] text-slate-300 mt-1 block">PDF o TESTO</span>
                        </label>
                        <div className="mt-4 space-y-2">
                            {files.map(f => (
                                <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 animate-fade-in">
                                    <div className="flex items-center gap-2 truncate">
                                        <FileText size={12} className="text-slate-300 shrink-0" />
                                        <span className="truncate">{f.name}</span>
                                    </div>
                                    <button onClick={() => setFiles(files.filter((x: any) => x.id !== f.id))} className="hover:text-red-500 transition-colors"><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <button 
                        onClick={runLocalAnalysis} disabled={loading || !names.length || !files.length}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-20 active:scale-95 transition-all"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Play size={16} />}
                        Avvia Scansione Privacy
                    </button>
                </aside>

                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Esito Scansione</h2>
                        {results.length > 0 && (
                            <button onClick={exportPDF} className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                                <FileDown size={14} className="text-indigo-600" /> Esporta Report
                            </button>
                        )}
                    </div>

                    <div className="space-y-6 pb-20">
                        {results.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-3xl p-24 text-center flex flex-col items-center gap-5 shadow-sm">
                                <div className="bg-slate-50 p-6 rounded-full"><Search size={48} className="text-slate-200" /></div>
                                <div className="space-y-1">
                                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Nessuna analisi attiva</p>
                                    <p className="text-slate-300 text-xs max-w-[240px] mx-auto">Carica i nominativi e i documenti per generare il report di conformità.</p>
                                </div>
                            </div>
                        ) : (
                            results.map((res: any, i: number) => (
                                <div key={i} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in border-l-4 border-l-indigo-500">
                                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 truncate pr-4">
                                            <FileText size={16} className="text-indigo-400 shrink-0" /> <span className="truncate">{res.fileName}</span>
                                        </h3>
                                        <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">{res.date}</span>
                                    </div>
                                    <div className="p-0 overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-[9px] text-slate-400 font-black uppercase bg-slate-50/30">
                                                    <th className="px-6 py-4">Soggetto</th>
                                                    <th className="px-6 py-4 text-center">Stato</th>
                                                    <th className="px-6 py-4">Dettagli Posizione</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {res.findings.map((f: any, j: number) => (
                                                    <tr key={j} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-slate-700 text-xs">{f.name}</td>
                                                        <td className="px-6 py-4 text-center">
                                                            {f.status === 'present' ? (
                                                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md font-black text-[9px] uppercase whitespace-nowrap">
                                                                    <CheckCircle size={10} /> TROVATO ({f.count})
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300 font-medium italic text-[10px]">Assente</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-start gap-2 text-slate-500 font-mono text-[10px] leading-relaxed">
                                                                {f.status === 'present' && <MapPin size={12} className="text-indigo-400 shrink-0 mt-0.5" />}
                                                                <span className="break-words">{f.location}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<AuditApp />);
}
