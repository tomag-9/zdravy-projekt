import { X, FileCheck, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import OrderService, { DailyOrder } from '../../services/OrderService';

import ConfirmationModal from '../ui/ConfirmationModal';
import { useState } from 'react';

interface OrderSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderDate: string;
    orderData: DailyOrder;
    onDelete?: () => void;
}

const OrderSummaryModal = ({ isOpen, onClose, orderDate, orderData, onDelete }: OrderSummaryModalProps) => {
    const navigate = useNavigate();
    const { setSelectedDate, deleteOrder } = useApp();
    const [deleteConfirmation, setDeleteConfirmation] = useState(false);

    if (!isOpen || !orderData) return null;

    const isEditable = (mealKey: string) => OrderService.checkDeadline(orderDate, mealKey);

    const getMealSummary = (mealKey: string) => {
        const key = mealKey as 'breakfast' | 'lunch' | 'olovrant';
        const mealData = orderData[key];
        if (!mealData) return null;

        let total = 0;
        const details: string[] = [];

        Object.keys(mealData).forEach(cat => {
            const counts = mealData[cat].menuCounts || {};
            const catTotal = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);
            if (catTotal > 0) {
                total += catTotal;
                details.push(`${cat}: ${catTotal}`);
            }
        });

        if (total === 0) return null;

        return { total, details };
    };

    const summaries = {
        breakfast: getMealSummary('breakfast'),
        lunch: getMealSummary('lunch'),
        olovrant: getMealSummary('olovrant')
    };

    const hasAnyOrder = Object.values(summaries).some(s => s !== null);

    const handleEdit = () => {
        setSelectedDate(orderDate);
        navigate(`/order?date=${orderDate}`);
        onClose();
    };

    // Note: Deleting individual meals or the whole order could be implemented here.
    // For now, we just redirect to edit page for granular control.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-indigo-600" />
                        Detail objednávky
                    </h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="w-5 h-5 text-slate-500" />
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex flex-col items-center justify-center text-center">
                        <span className="text-sm text-slate-500 uppercase tracking-wider font-medium">Dátum</span>
                        <span className="text-2xl font-bold text-slate-900">
                            {new Date(orderDate).toLocaleDateString('sk-SK', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                    </div>

                    {!hasAnyOrder ? (
                        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            Žiadne objedlané jedlá pre tento deň.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {summaries.breakfast && (
                                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-amber-900">Raňajky</span>
                                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                                            {summaries.breakfast.total} ks
                                        </span>
                                    </div>
                                    <div className="text-sm text-amber-700">
                                        {summaries.breakfast.details.join(', ')}
                                    </div>
                                    {!isEditable('breakfast') && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600/80">
                                            <AlertCircle className="w-3 h-3" />
                                            <span>Po deadline (3:00)</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {summaries.lunch && (
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-indigo-900">Obed</span>
                                        <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full">
                                            {summaries.lunch.total} ks
                                        </span>
                                    </div>
                                    <div className="text-sm text-indigo-700">
                                        {summaries.lunch.details.join(', ')}
                                    </div>
                                    {!isEditable('lunch') && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600/80">
                                            <AlertCircle className="w-3 h-3" />
                                            <span>Po deadline (7:30)</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {summaries.olovrant && (
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-purple-900">Olovrant</span>
                                        <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">
                                            {summaries.olovrant.total} ks
                                        </span>
                                    </div>
                                    <div className="text-sm text-purple-700">
                                        {summaries.olovrant.details.join(', ')}
                                    </div>
                                    {!isEditable('olovrant') && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-purple-600/80">
                                            <AlertCircle className="w-3 h-3" />
                                            <span>Po deadline (7:30)</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <Button
                            className="flex-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm border"
                            onClick={onClose}
                        >
                            Zavrieť
                        </Button>
                        {(isEditable('breakfast') || isEditable('lunch') || isEditable('olovrant')) && (
                            <>
                                <Button
                                    className="flex-1 gap-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 border shadow-sm"
                                    onClick={() => setDeleteConfirmation(true)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Vymazať
                                </Button>
                                <Button
                                    className="flex-1 gap-2 shadow-indigo-200"
                                    onClick={handleEdit}
                                >
                                    <Edit className="w-4 h-4" />
                                    Upraviť
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={deleteConfirmation}
                onClose={() => setDeleteConfirmation(false)}
                onConfirm={() => {
                    deleteOrder(orderDate);
                    if (onDelete) onDelete();
                    onClose();
                }}
                title="Vymazať objednávku"
                description="Naozaj chcete vymazať celú objednávku pre tento deň? Táto akcia je nevratná."
                confirmText="Vymazať"
                variant="danger"
            />
        </div >
    );
};

export default OrderSummaryModal;
