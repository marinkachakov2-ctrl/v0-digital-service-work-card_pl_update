"use client";

import { AlertTriangle, Ban, X } from "lucide-react";
import type { PayerStatus } from "@/lib/types";

interface CreditWarningBannerProps {
  payerStatus: PayerStatus;
  onDismiss?: () => void;
}

export function CreditWarningBanner({ payerStatus, onDismiss }: CreditWarningBannerProps) {
  if (!payerStatus.isBlocked && !payerStatus.isOverCreditLimit) {
    return null;
  }

  const isBlocked = payerStatus.isBlocked;
  const warningMessage = payerStatus.creditWarningMessage 
    || (isBlocked 
      ? "Клиентът е блокиран поради неплатени задължения!" 
      : `Превишен кредитен лимит: ${payerStatus.currentBalance.toLocaleString()} лв. / ${payerStatus.creditLimit.toLocaleString()} лв.`);

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] animate-in slide-in-from-top-2 duration-300">
      <div className={`
        flex items-center justify-between gap-4 px-4 py-3 shadow-lg
        ${isBlocked 
          ? "bg-gradient-to-r from-red-600 via-red-500 to-red-600 border-b-2 border-red-700" 
          : "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 border-b-2 border-amber-700"
        }
      `}>
        {/* Warning Icon and Message */}
        <div className="flex items-center gap-3 flex-1">
          <div className={`
            flex items-center justify-center h-10 w-10 rounded-full shrink-0
            ${isBlocked ? "bg-red-700/50" : "bg-amber-700/50"}
          `}>
            {isBlocked ? (
              <Ban className="h-6 w-6 text-white" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-white" />
            )}
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white uppercase tracking-wide">
              {isBlocked ? "КРИТИЧНО: КЛИЕНТ БЛОКИРАН" : "ВНИМАНИЕ: КРЕДИТЕН ЛИМИТ"}
            </span>
            <span className="text-sm text-white/90">
              {warningMessage}
            </span>
            <span className="text-xs text-white/70 mt-0.5">
              Платец: {payerStatus.payerName}
            </span>
          </div>
        </div>

        {/* Action text */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className={`
            text-xs font-semibold px-3 py-1.5 rounded-md
            ${isBlocked 
              ? "bg-red-800/50 text-white border border-red-400/30" 
              : "bg-amber-800/50 text-white border border-amber-400/30"
            }
          `}>
            {isBlocked ? "Работата е забранена" : "Изисква одобрение"}
          </span>
        </div>

        {/* Dismiss button (only for over-limit, not blocked) */}
        {!isBlocked && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0"
            aria-label="Dismiss warning"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
