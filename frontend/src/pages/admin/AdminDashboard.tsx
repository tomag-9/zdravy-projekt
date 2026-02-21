import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/auth";

interface CategoryStats {
  menus: Record<string, number>;
  diets: Record<string, number>;
  total: number;
}

interface MealStats {
  [category: string]: CategoryStats;
}

interface SummaryStats {
  total_orders: number;
  status_breakdown: Record<string, number>;
  meals: {
    breakfast: MealStats;
    lunch: MealStats;
    olovrant: MealStats;
  };
}

const AdminDashboard: React.FC = () => {
  const { apiFetch } = useAuth();
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/summary/daily-stats/?date=${date}`,
      );
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        console.error("Failed to fetch stats");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, date]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Helper to render a meal section
  const renderMealSection = (
    title: string,
    icon: string,
    mealData: MealStats,
    colorClass: string,
  ) => {
    const categories = Object.keys(mealData).sort();
    const hasData = categories.length > 0;

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
        <div
          className={`p-4 border-b border-gray-100 flex items-center justify-between ${colorClass}`}
        >
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <span className="mr-2 text-xl">{icon}</span>
            {title}
          </h3>
          {hasData && (
            <span className="text-sm font-semibold bg-white/50 px-2 py-1 rounded-lg text-gray-700">
              {Object.values(mealData).reduce((acc, cat) => acc + cat.total, 0)}{" "}
              ks
            </span>
          )}
        </div>

        <div className="flex-1 p-0">
          {!hasData ? (
            <div className="p-8 text-center text-gray-400 italic text-sm">
              Žiadne objednávky
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map((catName) => {
                const catStats = mealData[catName];
                return (
                  <div
                    key={catName}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-gray-800 text-sm bg-gray-100 px-2 py-1 rounded text-xs uppercase tracking-wide">
                        {catName}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {catStats.total} ks
                      </span>
                    </div>

                    {/* Menus Grid */}
                    {Object.keys(catStats.menus).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(catStats.menus).map(([menu, count]) => (
                          <div
                            key={menu}
                            className="flex items-center text-xs bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm"
                          >
                            <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full font-bold mr-2 text-[10px] text-gray-600">
                              {menu}
                            </span>
                            <span className="font-bold text-gray-800">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Diets List */}
                    {Object.keys(catStats.diets).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(catStats.diets).map(([diet, count]) => (
                          <span
                            key={diet}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-100"
                          >
                            {diet}: <strong>{count}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Prehľad dňa</h2>
          <p className="text-gray-500 mt-1">
            Podrobný rozpis objednávok podľa kategórií.
          </p>
        </div>
        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <span className="mr-3 text-gray-500 text-sm font-medium pl-2">
            Dátum:
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border-gray-200 rounded-lg text-gray-700 focus:ring-orange-500 focus:border-orange-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Načítavam dáta...</div>
      ) : !stats ? (
        <div className="text-center py-12 text-gray-500">Žiadne dáta.</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
              <div className="text-indigo-100 text-sm font-medium mb-1">
                Spolu Objednávok
              </div>
              <div className="text-4xl font-bold">{stats.total_orders}</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-sm">Potvrdené</span>
                <span className="text-2xl font-bold text-green-600">
                  {stats.status_breakdown?.submitted || 0}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-green-500 h-full"
                  style={{
                    width: `${
                      stats.total_orders
                        ? ((stats.status_breakdown?.submitted || 0) /
                            stats.total_orders) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-center">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-sm">Draft (Rozprac.)</span>
                <span className="text-2xl font-bold text-gray-600">
                  {stats.status_breakdown?.draft || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {renderMealSection(
              "Raňajky",
              "☕",
              stats.meals.breakfast,
              "bg-orange-50/50",
            )}
            {renderMealSection(
              "Obed",
              "🍽️",
              stats.meals.lunch,
              "bg-blue-50/50",
            )}
            {renderMealSection(
              "Olovrant",
              "🍎",
              stats.meals.olovrant,
              "bg-green-50/50",
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
