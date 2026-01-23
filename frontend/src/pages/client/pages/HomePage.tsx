import { Link } from 'react-router-dom';
import { Plus, Calendar, UtensilsCrossed, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';

interface Order {
    id: number;
    date: string;
    portions: {
        breakfast: number;
        lunch: number;
        olovrant: number;
    };
    meals: {
        breakfast: boolean;
        lunch: boolean;
        olovrant: boolean;
    };
}

const HomePage = () => {
    // Statické dáta - neskôr sa nahradí z API/localStorage
    const orders: Order[] = [
        {
            id: 1,
            date: '2026-01-05',
            portions: {
                breakfast: 12,
                lunch: 25,
                olovrant: 8
            },
            meals: {
                breakfast: true,
                lunch: true,
                olovrant: false
            }
        },
        {
            id: 2,
            date: '2026-01-04',
            portions: {
                breakfast: 10,
                lunch: 20,
                olovrant: 8
            },
            meals: {
                breakfast: true,
                lunch: true,
                olovrant: true
            }
        },
        {
            id: 3,
            date: '2026-01-03',
            portions: {
                breakfast: 0,
                lunch: 52,
                olovrant: 0
            },
            meals: {
                breakfast: false,
                lunch: true,
                olovrant: false
            }
        }
    ];

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('sk-SK', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatPortions = (order: Order) => {
        const parts = [];
        if (order.meals.breakfast && order.portions.breakfast > 0) {
            parts.push(order.portions.breakfast);
        }
        if (order.meals.lunch && order.portions.lunch > 0) {
            parts.push(order.portions.lunch);
        }
        if (order.meals.olovrant && order.portions.olovrant > 0) {
            parts.push(order.portions.olovrant);
        }
        return parts.length > 0 ? parts.join(' + ') : '0';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="max-w-6xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8 pt-4">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Objednávky jedál</h1>
                    <p className="text-lg text-slate-600">Prehľad a správa vašich objednávok</p>
                </div>

                {/* New Order Button */}
                <Link to="/order">
                    <button className="w-full mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group">
                        <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="text-lg">Vytvoriť novú objednávku</span>
                    </button>
                </Link>

                {/* Orders Section */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <UtensilsCrossed className="w-6 h-6 text-indigo-600" />
                        História objednávok
                    </h2>
                </div>

                {/* Orders List */}
                <div className="space-y-4">
                    {orders.map((order) => (
                        <Card key={order.id} className="hover:shadow-lg transition-shadow duration-200">
                            <CardContent className="p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="bg-indigo-100 p-3 rounded-xl flex-shrink-0">
                                            <Calendar className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-lg text-slate-900 mb-1 truncate">
                                                {formatDate(order.date)}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                                                <span className="font-semibold whitespace-nowrap">Počet porcií:</span>
                                                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md font-bold">
                                                    {formatPortions(order)}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {order.meals.breakfast && (
                                                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium">
                                                        🌅 Raňajky
                                                    </span>
                                                )}
                                                {order.meals.lunch && (
                                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                                                        🍽️ Obed
                                                    </span>
                                                )}
                                                {order.meals.olovrant && (
                                                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                                                        🍎 Olovrant
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 flex-shrink-0 self-start sm:self-center">
                                        <Link to={`/order?date=${order.date}`}>
                                            <button className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium min-w-[44px]">
                                                <Pencil className="w-4 h-4" />
                                                <span className="hidden sm:inline">Upraviť</span>
                                            </button>
                                        </Link>
                                        <button className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium min-w-[44px]">
                                            <Trash2 className="w-4 h-4" />
                                            <span className="hidden sm:inline">Vymazať</span>
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Empty State (if no orders) */}
                {orders.length === 0 && (
                    <Card className="border-2 border-dashed border-slate-300">
                        <CardContent className="p-12 text-center">
                            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UtensilsCrossed className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                                Žiadne objednávky v histórii
                            </h3>
                            <p className="text-slate-600 mb-4">
                                Začnite vytvorením novej objednávky
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default HomePage;
