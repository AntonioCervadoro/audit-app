
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { 
    Plus, Upload, Play, RotateCcw, 
    FileText, CheckCircle, FileDown,
    Search, X, AlertTriangle, ShieldCheck, MapPin
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

const generateId = () => Math.random().toString(36).substring(2, 11);

const AuditApp = () => {
    const [names, setNames] = useState<any[]>([]);
    const [newName, setNewName] = useState('');
    const [files, setFiles] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [resetKey, setResetKey] = useState(0); 
    const [showResetConfirm, setShowResetConfirm] = useState(false);

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
                            const pageText = textContent.items.map((item: any) => item.str).join(" ");
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
                            location: foundPages.size > 0 ? `Pagina/e: ${Array.from(foundPages).join(', ')}` : 'Nessun riscontro' 
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
                            location: foundLines.size > 0 ? `Riga/he: ${Array.from(foundLines).slice(0, 10).join(', ')}${foundLines.size > 10 ? '...' : ''}` : 'Nessun riscontro' 
                        });
                    }
                }
                tempResults.push({ fileName: fItem.name, findings, date: new Date().toLocaleString() });
            }
            setResults(tempResults);
        } catch (err) {
            alert("Errore analisi.");
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16).text("Report Audit - Solo Posizioni", 14, 20);
        const tableData = results.flatMap(r => r.findings.map((f: any) => [
            r.fileName, f.name, f.status === 'present' ? `SI (${f.count})` : 'NO', f.location
        ]));
        autoTable(doc, {
            startY: 30,
            head: [['File', 'Target', 'Esito', 'Riferimento Posizione']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [40, 40, 40] }
        });
        doc.save(`audit_posizioni_${Date.now()}.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {showResetConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                        <div className="text-center space-y-4">
                            <AlertTriangle size={32} className="mx-auto text-red-500" />
                            <h3 className="text-xl font-black">Resettare sessione?</h3>
                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <button onClick={() => setShowResetConfirm(false)} className="px-4 py-3 rounded-xl bg-slate-100 font-bold">No</button>
                                <button onClick={performReset} className="px-4 py-3 rounded-xl bg-red-600 text-white font-bold">Reset</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 p-2 rounded-lg text-white"><ShieldCheck size={22} /></div>
                    <h1 className="text-lg font-black text-slate-800 tracking-tight">AuditCheck <span className="text-slate-400 font-medium">PrivacyMode</span></h1>
                </div>
                <button onClick={() => setShowResetConfirm(true)} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 flex items-center gap-2">
                    <RotateCcw size={12} /> Nuova Scansione
                </button>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <aside className="lg:col-span-4 space-y-6">
                    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Target di Ricerca</h2>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addName()}
                                placeholder="Nome o Termine..."
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-900"
                            />
                            <button onClick={addName} className="bg-slate-900 text-white p-3 rounded-xl"><Plus size={20} /></button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {names.map(n => (
                                <div key={n.id} className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                                    <span className="text-xs font-bold text-slate-600">{n.name}</span>
                                    <button onClick={() => setNames(names.filter(x => x.id !== n.id))} className="text-slate-300 hover:text-red-500"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Caricamento Documenti</h2>
                        <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 transition-all">
                            <input key={`files-${resetKey}`} type="file" multiple accept=".pdf,.txt,.csv,.xml" className="hidden" onChange={handleFileUpload} />
                            <Upload size={24} className="mx-auto text-slate-300 mb-2" />
                            <span className="text-[10px] font-black uppercase text-slate-400">Seleziona File</span>
                        </label>
                        <div className="mt-4 space-y-2">
                            {files.map(f => (
                                <div key={f.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 text-[10px] font-bold text-slate-500">
                                    <span className="truncate">{f.name}</span>
                                    <button onClick={() => setFiles(files.filter((x: any) => x.id !== f.id))}><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <button 
                        onClick={runLocalAnalysis} disabled={loading || !names.length || !files.length}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-20 transition-all"
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Play size={16} />}
                        Avvia Analisi Posizioni
                    </button>
                </aside>

                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Esiti Localizzati</h2>
                        {results.length > 0 && (
                            <button onClick={exportPDF} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-slate-50">
                                <FileDown size={14} /> Report PDF
                            </button>
                        )}
                    </div>

                    <div className="space-y-6">
                        {results.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-3xl p-20 text-center flex flex-col items-center gap-4">
                                <Search size={48} className="text-slate-100" />
                                <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">Nessun dato analizzato</p>
                            </div>
                        ) : (
                            results.map((res: any, i: number) => (
                                <div key={i} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><FileText size={16} className="text-slate-400" /> {res.fileName}</h3>
                                        <span className="text-[9px] font-black text-slate-400 uppercase">{res.date}</span>
                                    </div>
                                    <div className="p-4 overflow-x-auto">
                                        <table className="w-full text-left text-[11px]">
                                            <thead>
                                                <tr className="text-[9px] text-slate-400 font-black uppercase">
                                                    <th className="px-4 py-3">Soggetto</th>
                                                    <th className="px-4 py-3 text-center">Esito</th>
                                                    <th className="px-4 py-3">Riferimento Posizione</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {res.findings.map((f: any, j: number) => (
                                                    <tr key={j}>
                                                        <td className="px-4 py-4 font-bold text-slate-700">{f.name}</td>
                                                        <td className="px-4 py-4 text-center">
                                                            {f.status === 'present' ? (
                                                                <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md font-black text-[9px] uppercase tracking-tighter">TROVATO ({f.count})</span>
                                                            ) : (
                                                                <span className="text-slate-300 font-medium italic">Assente</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px]">
                                                                {f.status === 'present' && <MapPin size={10} className="text-indigo-400" />}
                                                                {f.location}
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

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<AuditApp />);
}
