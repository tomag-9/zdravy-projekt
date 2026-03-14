import {
  X,
  FileCheck,
  AlertCircle,
  Edit,
  Trash2,
  Eraser,
  Bot,
} from "lucide-react";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import OrderService, { DailyOrder } from "../../services/OrderService";

import ConfirmationModal from "../ui/ConfirmationModal";
import { useState } from "react";

interface OrderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDate: string;
  orderData?: DailyOrder;
  globalDeadlines: { breakfast: string; breakfast_day_before?: boolean; lunch: string; lunch_day_before?: boolean; olovrant: string; olovrant_day_before?: boolean };
  onDelete?: () => void;
  /** When true the order is not yet in DB – it's an auto-prediction */
  isPredicted?: boolean;
  /** When true the order was created automatically – Delete is disabled */
  isAuto?: boolean;
  /** Meal counts for the auto-prediction preview */
  predictedMealCount?: { breakfast: number; lunch: number; olovrant: number };
  /** Called when user chooses to zero out a predicted order */
  onZero?: () => void;
}

const OrderSummaryModal = ({
  isOpen,
  onClose,
  orderDate,
  orderData,
  globalDeadlines,
  onDelete,
  isPredicted = false,
  isAuto = false,
  predictedMealCount,
  onZero,
}: OrderSummaryModalProps) => {
  const navigate = useNavigate();
  const { setSelectedDate, deleteOrder } = useApp();
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);

  if (!isOpen || (!orderData && !isPredicted)) return null;

  const isEditable = (mealKey: string) =>
    OrderService.checkDeadline(orderDate, mealKey, globalDeadlines);

  const anyMealEditable = (["breakfast", "lunch", "olovrant"] as const).some(
    (meal) => OrderService.checkDeadline(orderDate, meal, globalDeadlines),
  );
  const canDelete = !isPredicted && !isAuto && anyMealEditable;

  const getMealSummary = (mealKey: string) => {
    const key = mealKey as "breakfast" | "lunch" | "olovrant";
    const mealData = orderData?.[key];
    if (!mealData) return null;

    let total = 0;
    const details: string[] = [];

    Object.keys(mealData).forEach((cat) => {
      const counts = mealData[cat].menuCounts || {};
      const catTotal = (Object.values(counts) as number[]).reduce(
        (a, b) => a + b,
        0,
      );
      if (catTotal > 0) {
        total += catTotal;
        details.push(`${cat}: ${catTotal}`);
      }
    });

    if (total === 0) return null;

    return { total, details };
  };

  const summaries = {
    breakfast: getMealSummary("breakfast"),
    lunch: getMealSummary("lunch"),
    olovrant: getMealSummary("olovrant"),
  };

  const hasAnyOrder = Object.values(summaries).some((s) => s !== null);

  const handleEdit = () => {
    setSelectedDate(orderDate);
    navigate(`/order?date=${orderDate}`);
    onClose();
  };

  // Note: Deleting individual meals or the whole order could be implemented here.
  // For now, we just redirect to edit page for granular control.

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-600" />
            Detail objednávky
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-5 h-5 text-slate-500" />
          </Button>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-sm text-slate-500 uppercase tracking-wider font-medium">
              Dátum
            </span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900">
              {new Date(orderDate).toLocaleDateString("sk-SK", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>

          {/* ── Predicted-mode body ── */}
          {isPredicted && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
                <Bot className="w-4 h-4 shrink-0" />
                <span>
                  Táto objednávka ešte{" "}
                  <strong>nebola manuálne vytvorená</strong>. Systém ju zapíše
                  podľa predošlej objednávky.
                </span>
              </div>
              {predictedMealCount && (
                <div className="space-y-2">
                  {predictedMealCount.breakfast > 0 && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex justify-between items-center">
                      <span className="font-semibold text-amber-900">
                        Raňajky
                      </span>
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                        {predictedMealCount.breakfast} ks
                      </span>
                    </div>
                  )}
                  {predictedMealCount.lunch > 0 && (
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex justify-between items-center">
                      <span className="font-semibold text-indigo-900">
                        Obed
                      </span>
                      <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full">
                        {predictedMealCount.lunch} ks
                      </span>
                    </div>
                  )}
                  {predictedMealCount.olovrant > 0 && (
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 flex justify-between items-center">
                      <span className="font-semibold text-purple-900">
                        Olovrant
                      </span>
                      <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">
                        {predictedMealCount.olovrant} ks
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Real-order body ── */}
          {!isPredicted && (
            <>
              {!hasAnyOrder ? (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Žiadne objednané jedlá pre tento deň.
                </div>
              ) : (
                <div className="space-y-4">
                  {summaries.breakfast && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-amber-900">
                          Raňajky
                        </span>
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                          {summaries.breakfast.total} ks
                        </span>
                      </div>
                      <div className="text-sm text-amber-700">
                        {summaries.breakfast.details.join(", ")}
                      </div>
                      {!isEditable("breakfast") && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-amber-600/80">
                          <AlertCircle className="w-3 h-3" />
                          <span>Po deadline ({globalDeadlines.breakfast})</span>
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
                        {summaries.lunch.details.join(", ")}
                      </div>
                      {!isEditable("lunch") && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600/80">
                          <AlertCircle className="w-3 h-3" />
                          <span>Po deadline ({globalDeadlines.lunch})</span>
                        </div>
                      )}
                    </div>
                  )}

                  {summaries.olovrant && (
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-purple-900">
                          Olovrant
                        </span>
                        <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">
                          {summaries.olovrant.total} ks
                        </span>
                      </div>
                      <div className="text-sm text-purple-700">
                        {summaries.olovrant.details.join(", ")}
                      </div>
                      {!isEditable("olovrant") && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-purple-600/80">
                          <AlertCircle className="w-3 h-3" />
                          <span>Po deadline ({globalDeadlines.olovrant})</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Footer buttons: Edit | Erase | Delete ── */}
          <div className="pt-3 sm:pt-4 flex gap-2">
            <Button
              className="flex-1 gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm shadow-indigo-200"
              onClick={handleEdit}
            >
              <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Upraviť
            </Button>
            <Button
              className={[
                "flex-1 gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm border shadow-sm",
                onZero
                  ? "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60",
              ].join(" ")}
              onClick={onZero ?? undefined}
              disabled={!onZero}
            >
              <Eraser className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Vynulovať
            </Button>
            <Button
              className={[
                "flex-1 gap-1 sm:gap-2 px-2 sm:px-4 text-xs sm:text-sm border shadow-sm",
                canDelete
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60",
              ].join(" ")}
              onClick={
                canDelete
                  ? () => setDeleteConfirmation(true)
                  : undefined
              }
              disabled={!canDelete}
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              Vymazať
            </Button>
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
    </div>
  );
};

export default OrderSummaryModal;
