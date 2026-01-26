
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AuditCheck Pro - Offline Local App</title>
    <meta name="theme-color" content="#4f46e5">
    <link rel="manifest" href="manifest.json">
    <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/1048/1048953.png">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
    
    <!-- Babel Standalone -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <style>
        body { font-family: 'Inter', sans-serif; overflow-x: hidden; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        #root:empty::before {
            content: "Inizializzazione motore locale...";
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            color: #64748b;
            font-size: 0.875rem;
            font-weight: 500;
            background: #f8fafc;
        }
    </style>

    <script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.2.0",
    "react-dom": "https://esm.sh/react-dom@18.2.0",
    "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
    "lucide-react": "https://esm.sh/lucide-react@0.460.0?external=react",
    "jspdf": "https://esm.sh/jspdf@2.5.1",
    "jspdf-autotable": "https://esm.sh/jspdf-autotable@3.8.2",
    "pdfjs-dist": "https://esm.sh/pdfjs-dist@4.10.38",
    "react-dom/": "https://esm.sh/react-dom@^19.2.3/",
    "react/": "https://esm.sh/react@^19.2.3/"
  }
}
</script>
</head>
<body class="bg-slate-50 text-slate-900">
    <div id="root"></div>

    <!-- CRITICO: Aggiunto data-type="module" per gestire gli import trasformati -->
    <script type="text/babel" data-type="module" data-presets="react,typescript" src="index.tsx"></script>

    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').then(reg => {
                    console.log('PWA Offline Ready');
                }).catch(err => console.log('PWA Error:', err));
            });
        }
    </script>
</body>
</html>
