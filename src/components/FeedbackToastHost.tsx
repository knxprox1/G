import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type FeedbackToastTone = 'success' | 'info' | 'warning' | 'error';

export interface FeedbackToastItem {
  id: string;
  tone: FeedbackToastTone;
  message: string;
  durationMs?: number | null;
  actionLabel?: string;
  onAction?: () => void;
}

interface FeedbackToastHostProps {
  toasts: FeedbackToastItem[];
  onDismiss: (id: string) => void;
}

const TONE_STYLES: Record<
  FeedbackToastTone,
  {
    container: string;
    iconColor: string;
    textColor: string;
    actionBtn: string;
    closeBtn: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  success: {
    container: 'bg-[#FFFDFD]/98 border-[#1F6B4E]/30 shadow-[0_12px_28px_rgba(31,107,78,0.16)]',
    iconColor: 'text-[#1F6B4E]',
    textColor: 'text-[#211018]',
    actionBtn: 'bg-[#1F6B4E]/12 border-[#1F6B4E]/30 text-[#164F39] hover:bg-[#1F6B4E]/20',
    closeBtn: 'text-[#6A314C] hover:bg-[#3A1627]/8',
    Icon: CheckCircle2,
  },
  info: {
    container: 'bg-[#FFFDFD]/98 border-[#C82368]/30 shadow-[0_12px_28px_rgba(92,22,55,0.14)]',
    iconColor: 'text-[#B31B5B]',
    textColor: 'text-[#211018]',
    actionBtn: 'bg-[#C82368]/10 border-[#C82368]/30 text-[#911549] hover:bg-[#C82368]/18',
    closeBtn: 'text-[#6A314C] hover:bg-[#3A1627]/8',
    Icon: Info,
  },
  warning: {
    container: 'bg-[#FFF9F2]/98 border-[#945D14]/35 shadow-[0_12px_28px_rgba(148,93,20,0.16)]',
    iconColor: 'text-[#945D14]',
    textColor: 'text-[#4B2C0A]',
    actionBtn: 'bg-[#945D14]/12 border-[#945D14]/30 text-[#6F430C] hover:bg-[#945D14]/20',
    closeBtn: 'text-[#6F430C] hover:bg-[#945D14]/12',
    Icon: AlertTriangle,
  },
  error: {
    container: 'bg-[#FFF4F6]/98 border-[#A61B48]/35 shadow-[0_12px_28px_rgba(166,27,72,0.18)]',
    iconColor: 'text-[#A61B48]',
    textColor: 'text-[#681031]',
    actionBtn: 'bg-[#A61B48]/12 border-[#A61B48]/30 text-[#681031] hover:bg-[#A61B48]/20',
    closeBtn: 'text-[#681031] hover:bg-[#A61B48]/12',
    Icon: AlertCircle,
  },
};

export const FeedbackToastHost: React.FC<FeedbackToastHostProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute top-[max(3.85rem,calc(env(safe-area-inset-top)+3.35rem))] inset-x-3.5 z-40 flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const style = TONE_STYLES[toast.tone];
        const IconComponent = style.Icon;
        const isAlert = toast.tone === 'error' || toast.tone === 'warning';

        return (
          <div
            key={toast.id}
            role={isAlert ? 'alert' : 'status'}
            aria-live={isAlert ? 'assertive' : 'polite'}
            className={`pointer-events-auto ad-anim-toast-in ad-cut-tile border backdrop-blur-md pe-1 ps-3 py-1.5 flex items-center gap-2.5 ${style.container}`}
          >
            <IconComponent className={`w-4 h-4 shrink-0 ${style.iconColor}`} aria-hidden="true" />
            <p className={`flex-1 min-w-0 text-[12px] font-bold leading-snug ${style.textColor}`}>
              {toast.message}
            </p>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  onDismiss(toast.id);
                }}
                className={`ad-cut-chip shrink-0 min-h-[38px] px-2.5 py-1 text-[11.5px] font-extrabold border transition-colors ${style.actionBtn}`}
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="إغلاق التنبيه"
              className={`shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${style.closeBtn}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
