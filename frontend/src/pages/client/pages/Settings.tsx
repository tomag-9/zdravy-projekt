import { useApp, DIETS, CATEGORIES } from '../context/AppContext';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Settings = () => {
    const { enabledDiets, toggleDiet, enabledCategories, toggleCategory, settings, updateSettings } = useApp();

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8 pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/home">
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                        </Link>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Nastavenia</h2>
                            <p className="text-sm sm:text-base text-slate-500">Prispôsobte si správanie aplikácie</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Categories Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span>🍽️</span> Povolené porcie
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Vyberte porcie, ktoré sa majú zobrazovať.</p>
                        </div>
                        <div className="p-6 grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                            {CATEGORIES.map(category => (
                                <label
                                    key={category}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${enabledCategories.includes(category)
                                        ? 'border-indigo-200 bg-indigo-50/50 text-indigo-900'
                                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                        }`}
                                >
                                    <span className="font-medium text-sm">{category}</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={enabledCategories.includes(category)}
                                            onChange={() => toggleCategory(category)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Diets Section */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span>🩺</span> Povolené diéty
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Vyberte diéty, ktoré sa majú zobrazovať.</p>
                        </div>
                        <div className="p-6 grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                            {DIETS.map(diet => (
                                <label
                                    key={diet}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${enabledDiets.includes(diet)
                                        ? 'border-indigo-200 bg-indigo-50/50 text-indigo-900'
                                        : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                        }`}
                                >
                                    <span className="font-medium text-sm">{diet}</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={enabledDiets.includes(diet)}
                                            onChange={() => toggleDiet(diet)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span>🔄</span> Automatické kopírovanie
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Automaticky skopíruj obedy do ostatných jedál.</p>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                            <div>
                                <p className="font-semibold text-slate-700 text-sm">Raňajky z včerajšieho obeda</p>
                                <p className="text-xs text-slate-500 mt-1">Automaticky kopíruj obed z minulého dňa na raňajky</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.copyBreakfastFromPrevLunch}
                                    onChange={(e) => updateSettings('copyBreakfastFromPrevLunch', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                            <div>
                                <p className="font-semibold text-slate-700 text-sm">Olovrant z dnešného obeda</p>
                                <p className="text-xs text-slate-500 mt-1">Automaticky kopíruj dnešný obed na olovrant</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={settings.copyOlovrantFromLunch}
                                    onChange={(e) => updateSettings('copyOlovrantFromLunch', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
