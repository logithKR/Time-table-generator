import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api';
import { getDepartments, updateDepartment } from '../utils/api';
import {
    Settings, Shield, Zap, Star, Users2, Layers, GitMerge, BookOpen, GraduationCap,
    Save, RotateCcw, Check, AlertTriangle, Info, ToggleLeft, ToggleRight,
    ChevronDown, ChevronRight, Sparkles
} from 'lucide-react';

// ─── Category Config ───
const CATEGORIES = {
    validation: {
        label: 'Pre-Validation & Errors',
        icon: Shield,
        color: 'rose',
        description: 'Control whether the system blocks generation on resource shortages',
        badge: 'CRITICAL'
    },
    hard_constraints: {
        label: 'Hard Constraints',
        icon: AlertTriangle,
        color: 'rose',
        description: 'These rules are NEVER violated during generation',
        badge: 'ABSOLUTE'
    },
    dynamic_constraints: {
        label: 'Dynamic Constraints',
        icon: Zap,
        color: 'amber',
        description: 'Adapt based on schedule load (normal vs overloaded)',
        badge: 'ADAPTIVE'
    },
    soft_constraints: {
        label: 'Soft Constraints',
        icon: Star,
        color: 'violet',
        description: 'Preferences that influence the optimization objective',
        badge: 'WEIGHTED'
    },
    section_settings: {
        label: 'Section & Capacity',
        icon: Users2,
        color: 'blue',
        description: 'Controls how students are divided into sections',
        badge: 'SECTIONS'
    },
    gap_fill: {
        label: 'Gap Filling',
        icon: Layers,
        color: 'emerald',
        description: 'Rules for filling empty slots after main scheduling',
        badge: 'POST-SOLVE'
    },
    batch_rotation: {
        label: 'Batch Rotation',
        icon: GitMerge,
        color: 'teal',
        description: 'Lab merging when there aren\'t enough unique faculty',
        badge: 'MERGE'
    },
    elective_handling: {
        label: 'Elective Handling',
        icon: BookOpen,
        color: 'indigo',
        description: 'How electives are paired and scheduled',
        badge: 'ELECTIVES'
    },
    honours_minor: {
        label: 'Honours & Minor',
        icon: GraduationCap,
        color: 'pink',
        description: 'Period restrictions for honours/minor courses',
        badge: 'SPECIAL'
    }
};

// ─── Value Editor Based on Type ───
const ValueEditor = ({ item, value, onChange, enabled }) => {
    const type = item.type;

    if (type === 'flag') {
        return null;
    }

    if (type === 'boolean') {
        return (
            <button
                onClick={() => onChange(!value)}
                disabled={!enabled}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${enabled
                        ? value
                            ? 'bg-emerald-500 focus:ring-emerald-400'
                            : 'bg-gray-300 focus:ring-gray-400'
                        : 'bg-gray-200 cursor-not-allowed'
                    }`}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
        );
    }

    if (type === 'number') {
        return (
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                disabled={!enabled}
                className={`w-24 px-3 py-1.5 text-sm font-semibold text-center border-2 rounded-lg transition-all
                    ${enabled
                        ? 'border-gray-200 bg-white hover:border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 focus:outline-none text-gray-800'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
            />
        );
    }

    if (type === 'array') {
        const strVal = Array.isArray(value) ? value.join(', ') : String(value);
        return (
            <input
                type="text"
                value={strVal}
                onChange={(e) => {
                    const arr = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                    onChange(arr);
                }}
                disabled={!enabled}
                placeholder="e.g. 1, 3, 5"
                className={`w-36 px-3 py-1.5 text-sm font-mono border-2 rounded-lg transition-all
                    ${enabled
                        ? 'border-gray-200 bg-white hover:border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 focus:outline-none text-gray-800'
                        : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
            />
        );
    }

    return <span className="text-xs text-gray-400">Unsupported type</span>;
};

// ─── Constraint Card ───
const ConstraintCard = ({ id, item, catColor, onUpdate }) => {
    const isEnabled = item.enabled;

    return (
        <div className={`relative group rounded-xl border-2 p-5 transition-all duration-300 ${isEnabled
                ? 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-lg shadow-sm'
                : 'border-gray-100/50 bg-gray-50/50 opacity-60'
            }`}>
            {/* Enable/Disable Toggle */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <h4 className={`font-bold text-sm ${isEnabled ? 'text-gray-800' : 'text-gray-400'}`}>
                            {item.label || id}
                        </h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${item.type === 'boolean'
                                ? 'bg-blue-50 text-blue-500'
                                : item.type === 'array'
                                    ? 'bg-purple-50 text-purple-500'
                                    : 'bg-gray-50 text-gray-400'
                            }`}>
                            {item.type}
                        </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isEnabled ? 'text-gray-500' : 'text-gray-300'}`}>
                        {item.description}
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Value editor */}
                    <ValueEditor
                        item={item}
                        value={item.value}
                        enabled={isEnabled}
                        onChange={(val) => onUpdate(id, 'value', val)}
                    />

                    {/* Master enable toggle */}
                    <button
                        onClick={() => onUpdate(id, 'enabled', !isEnabled)}
                        className={`p-1 rounded-lg transition-all ${isEnabled ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-300 hover:bg-gray-100'}`}
                        title={isEnabled ? 'Disable this constraint' : 'Enable this constraint'}
                    >
                        {isEnabled
                            ? <ToggleRight className="w-6 h-6" />
                            : <ToggleLeft className="w-6 h-6" />
                        }
                    </button>
                </div>
            </div>

            {/* Overloaded value (for dynamic constraints) */}
            {item.overloaded_value !== undefined && (
                <div className={`mt-3 pt-3 border-t border-dashed flex items-center gap-3 ${isEnabled ? 'border-amber-200' : 'border-gray-100'}`}>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isEnabled ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-300'}`}>
                        OVERLOADED
                    </span>
                    <span className={`text-xs ${isEnabled ? 'text-gray-500' : 'text-gray-300'}`}>Value when schedule is overloaded:</span>
                    <input
                        type="number"
                        value={item.overloaded_value}
                        onChange={(e) => onUpdate(id, 'overloaded_value', parseFloat(e.target.value) || 0)}
                        disabled={!isEnabled}
                        className={`w-20 px-2 py-1 text-xs font-semibold text-center border-2 rounded-lg transition-all ${isEnabled
                                ? 'border-amber-200 bg-amber-50/50 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none text-amber-800'
                                : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                            }`}
                    />
                </div>
            )}
        </div>
    );
};

// ─── Category Section ───
const CategorySection = ({ categoryKey, categoryData, config, onUpdate }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const meta = CATEGORIES[categoryKey] || { label: categoryKey, icon: Settings, color: 'gray', description: '', badge: '' };
    const Icon = meta.icon;
    const items = config[categoryKey] || {};
    const itemCount = Object.keys(items).length;
    const enabledCount = Object.values(items).filter(i => i.enabled).length;

    return (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors"
            >
                <div className={`p-2.5 rounded-xl bg-${meta.color}-50 text-${meta.color}-500`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-gray-800">{meta.label}</h3>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-${meta.color}-50 text-${meta.color}-500 tracking-wider`}>
                            {meta.badge}
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{meta.description}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-400">
                        {enabledCount}/{itemCount} active
                    </span>
                    {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-gray-300" />
                        : <ChevronRight className="w-4 h-4 text-gray-300" />
                    }
                </div>
            </button>

            {/* Body */}
            {isExpanded && (
                <div className="px-6 pb-5 space-y-3 border-t border-gray-50">
                    {Object.entries(items).map(([key, item]) => (
                        <ConstraintCard
                            key={key}
                            id={key}
                            item={item}
                            catColor={meta.color}
                            onUpdate={(k, field, value) => onUpdate(categoryKey, k, field, value)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───
const ConstraintsManager = () => {
    const [config, setConfig] = useState(null);
    const [originalConfig, setOriginalConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // --- Mini Project Display Toggle State ---
    const [departments, setDepartments] = useState([]);
    const [loadingDepts, setLoadingDepts] = useState(false);

    const loadConfig = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.getConfig();
            setConfig(res.data);
            setOriginalConfig(JSON.parse(JSON.stringify(res.data)));
        } catch (err) {
            console.error('Failed to load config:', err);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadConfig(); }, [loadConfig]);

    // Fetch departments for the Mini Project toggle section
    useEffect(() => {
        setLoadingDepts(true);
        getDepartments()
            .then(res => setDepartments(res.data))
            .catch(err => console.error('Failed to load departments:', err))
            .finally(() => setLoadingDepts(false));
    }, []);

    useEffect(() => {
        if (config && originalConfig) {
            setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
        }
    }, [config, originalConfig]);

    const updateField = (category, key, field, value) => {
        setConfig(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: {
                    ...prev[category][key],
                    [field]: value
                }
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.saveConfig(config);
            setOriginalConfig(JSON.parse(JSON.stringify(config)));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            alert('Failed to save: ' + err.message);
        }
        setSaving(false);
    };

    const handleReset = async () => {
        if (!window.confirm('Reset ALL constraints to factory defaults? This cannot be undone.')) return;
        setLoading(true);
        try {
            const res = await api.resetConfig();
            setConfig(res.data);
            setOriginalConfig(JSON.parse(JSON.stringify(res.data)));
        } catch (err) {
            alert('Failed to reset: ' + err.message);
        }
        setLoading(false);
    };

    const handleUndo = () => {
        setConfig(JSON.parse(JSON.stringify(originalConfig)));
    };

    const handleToggleMiniProject = async (code, currentVal) => {
        try {
            await updateDepartment(code, { pair_add_course_miniproject: !currentVal });
            const res = await getDepartments();
            setDepartments(res.data);
        } catch (err) {
            alert('Failed to toggle Mini Project display: ' + (err.response?.data?.detail || err.message));
        }
    };

    if (loading || !config) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                    <span className="text-sm font-medium text-gray-400">Loading constraint configuration...</span>
                </div>
            </div>
        );
    }

    const totalConstraints = Object.values(config).reduce((sum, cat) => sum + Object.keys(cat).length, 0);
    const enabledConstraints = Object.values(config).reduce(
        (sum, cat) => sum + Object.values(cat).filter(i => i.enabled).length, 0
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50/30">
            {/* ─── Header ─── */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
                <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-200">
                            <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-gray-800 tracking-tight">Constraint Configuration</h1>
                            <p className="text-xs text-gray-400 font-medium">
                                {enabledConstraints}/{totalConstraints} constraints active
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Unsaved changes indicator */}
                        {hasChanges && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-bold text-amber-600">Unsaved changes</span>
                            </div>
                        )}

                        {/* Undo */}
                        <button
                            onClick={handleUndo}
                            disabled={!hasChanges}
                            className={`px-4 py-2 text-xs font-bold rounded-xl border-2 transition-all ${hasChanges
                                    ? 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                    : 'border-gray-100 text-gray-300 cursor-not-allowed'
                                }`}
                        >
                            Undo All
                        </button>

                        {/* Reset */}
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 text-xs font-bold text-rose-500 border-2 border-rose-200 rounded-xl hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center gap-1.5"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset Defaults
                        </button>

                        {/* Save */}
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg ${saved
                                    ? 'bg-emerald-500 text-white shadow-emerald-200'
                                    : hasChanges
                                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-violet-200'
                                        : 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
                                }`}
                        >
                            {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</>
                                : saving ? 'Saving...'
                                    : <><Save className="w-3.5 h-3.5" /> Save Changes</>
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Info Banner ─── */}
            <div className="max-w-5xl mx-auto px-8 mt-6">
                <div className="flex items-start gap-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-blue-600 leading-relaxed">
                        <strong>How this works:</strong> Each constraint controls a specific rule in the timetable generator.
                        Toggle constraints <strong>on/off</strong> or adjust their <strong>values</strong>.
                        Changes take effect on the <strong>next timetable generation</strong>.
                        <span className="text-blue-400"> Hard constraints are never violated. Soft constraints influence preferences. Dynamic constraints adapt to schedule load.</span>
                    </div>
                </div>
            </div>

            {/* ─── Categories ─── */}
            <div className="max-w-5xl mx-auto px-8 py-6 space-y-4">
                {Object.keys(CATEGORIES).map(catKey => (
                    config[catKey] && (
                        <CategorySection
                            key={catKey}
                            categoryKey={catKey}
                            categoryData={CATEGORIES[catKey]}
                            config={config}
                            onUpdate={updateField}
                        />
                    )
                ))}
            </div>

            {/* ─── Mini Project Display Section ─── */}
            <div className="max-w-5xl mx-auto px-8 pb-4">
                <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-50">
                        <div className="p-2.5 rounded-xl bg-amber-50 text-amber-500">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-sm text-gray-800">Mini Project Display</h3>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-500 tracking-wider">DISPLAY ONLY</span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">When enabled, Add Course cells show " / Mini Project" and students not opted into Add Courses see "Mini Project" in that slot.</p>
                        </div>
                    </div>
                    <div className="px-6 py-5 space-y-3">
                        {loadingDepts ? (
                            <div className="text-xs text-gray-400 text-center py-4">Loading departments...</div>
                        ) : departments.length === 0 ? (
                            <div className="text-xs text-gray-400 text-center py-4">No departments found.</div>
                        ) : (
                            departments.map(dept => (
                                <div key={dept.department_code} className={`relative group rounded-xl border-2 p-4 transition-all duration-300 ${dept.pair_add_course_miniproject ? 'border-amber-200 bg-amber-50/30 shadow-sm' : 'border-gray-100 bg-white'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-black text-gray-800 tracking-tight">{dept.department_code}</span>
                                            {dept.pair_add_course_miniproject && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wider">Active</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleToggleMiniProject(dept.department_code, dept.pair_add_course_miniproject)}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                                dept.pair_add_course_miniproject
                                                    ? 'bg-amber-500 focus:ring-amber-400'
                                                    : 'bg-gray-300 focus:ring-gray-400'
                                            }`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${dept.pair_add_course_miniproject ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Footer ─── */}
            <div className="max-w-5xl mx-auto px-8 pb-10">
                <div className="flex items-center justify-center gap-2 text-[10px] text-gray-300 font-medium">
                    <Sparkles className="w-3 h-3" />
                    <span>Powered by OR-Tools CP-SAT Solver</span>
                </div>
            </div>
        </div>
    );
};

export default ConstraintsManager;
