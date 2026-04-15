import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State
state_str = """    const [generationWarnings, setGenerationWarnings] = useState([]);
    const [isWarningsPanelOpen, setIsWarningsPanelOpen] = useState(false);
"""
content = re.sub(r'const \[generationWarnings,[ \t]+setGenerationWarnings\][ \t]+=[ \t]+useState\(\[\]\);', state_str, content)


# 2. handleGenerate
gen_str = """                if (res.data.warnings && res.data.warnings.length > 0) {
                    setGenerationWarnings(res.data.warnings);
                    setIsWarningsPanelOpen(true);
                } else {"""
content = re.sub(
    r'if \(res\.data\.warnings && res\.data\.warnings\.length > 0\) \{\s+setGenerationWarnings\(res\.data\.warnings\);\s+\} else \{',
    gen_str, content
)


# 3. Notification Toast -> Warnings Sidebar Panel
toast_str = r'\{/\* --- GENERATION WARNINGS TOAST --- \*/\}.*?\{generationWarnings\.length > 0 && \(.*?\)\}'
# Remove the old toast entirely.
content = re.sub(toast_str, '', content, flags=re.DOTALL)


# 4. Header Bell
header_orig = """                    <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold border-2 border-white shadow-sm">A</div>
                    </div>"""
header_new = """                    <div className="flex items-center space-x-4">
                        {generationWarnings.length > 0 && (
                            <button 
                                onClick={() => setIsWarningsPanelOpen(!isWarningsPanelOpen)}
                                className="relative p-2 rounded-full text-amber-500 hover:bg-amber-50 transition-colors"
                            >
                                <Bell className="w-6 h-6 animate-pulse" />
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>
                        )}
                        <div className="h-10 w-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold border-2 border-white shadow-sm">A</div>
                    </div>"""
content = content.replace(header_orig, header_new)


# 5. Sidebar Injection
sidebar_html = """
            {/* --- RIGHT SIDEBAR WARNINGS UI --- */}
            {isWarningsPanelOpen && generationWarnings.length > 0 && (
                <div 
                    className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsWarningsPanelOpen(false)}
                />
            )}
            <aside 
                className={`fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-white border-l border-gray-200 transform transition-transform duration-300 ease-in-out ${isWarningsPanelOpen && generationWarnings.length > 0 ? 'translate-x-0' : 'translate-x-full'} shadow-2xl flex flex-col`}
            >
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100/50 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800">Generation Alerts</h2>
                            <p className="text-xs text-gray-500">{generationWarnings.length} notices found</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsWarningsPanelOpen(false)} 
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
                    {generationWarnings.map((w, i) => (
                        <div key={i} className="bg-white rounded-xl p-4 border border-red-50/80 shadow-sm shadow-red-100/20 relative group hover:shadow-md hover:border-red-100 transition-all">
                            <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${w.type === 'FACULTY' ? 'bg-orange-400' : 'bg-rose-400'}`}></div>
                            
                            <div className="pl-2">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-bold text-gray-800 break-words pr-2">{w.subject_name || w.course_code}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${w.type === 'FACULTY' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        {w.type}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-2 bg-slate-50 border border-slate-100 rounded-md p-1.5 inline-flex w-full">
                                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                    <span>{w.course_code}</span>
                                    <span className="text-gray-300">|</span>
                                    <span>{w.period}</span>
                                    {w.section && (
                                        <>
                                            <span className="text-gray-300">|</span>
                                            <span>{w.section}</span>
                                        </>
                                    )}
                                </div>
                                
                                <p className="text-[13px] text-gray-700 leading-snug">{w.reason}</p>
                                
                                {w.resource_name && w.resource_name !== 'Unassigned' && (
                                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-1.5 rounded border border-gray-100">
                                        Affected: <span className="font-semibold text-gray-700">{w.resource_name}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {/* Clear button at bottom */}
                {generationWarnings.length > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <button 
                            onClick={() => { setGenerationWarnings([]); setIsWarningsPanelOpen(false); }}
                            className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-all"
                        >
                            Dismiss All
                        </button>
                    </div>
                )}
            </aside>
"""

content = content.replace("export default App;", sidebar_html + "\nexport default App;")


# Let's ensure Bell is imported
if ' Bell,' not in content and 'Bell ' not in content:
    content = content.replace("AlertTriangle", "AlertTriangle, Bell")

if ' MapPin' not in content: # wait MapPin is already imported
    pass

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Patch App.jsx completed successfully')
