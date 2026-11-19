import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import type { DeviceRole } from '../data/types';
import type { PartnerConnectionStatus } from '../game/engine';

interface PartnerConnectionBadgeProps {
  role?: DeviceRole;
  isConnected?: boolean;
  status?: PartnerConnectionStatus;
  darkMode?: boolean;
  disabled?: boolean;
  motionEnabled?: boolean;
  onPress?: () => void;
}

/**
 * مؤشر مرئي صغير وغير مزعج في الزاوية العلوية يوضح حالة الاتصال بالطرف الآخر
 */
export function PartnerConnectionBadge({
  role,
  isConnected = false,
  status,
  darkMode = false,
  disabled = false,
  motionEnabled = true,
  onPress,
}: PartnerConnectionBadgeProps) {
  const resolvedStatus: PartnerConnectionStatus =
    status ?? (isConnected ? 'connected' : 'offline');

  const partnerSubject =
    role === 'husband' ? 'الشريكة' : role === 'wife' ? 'الشريك' : 'الطرف الآخر';

  const statusLabel =
    resolvedStatus === 'connected'
      ? 'متصل'
      : resolvedStatus === 'error'
        ? 'تعذّر الربط'
        : resolvedStatus === 'pending'
          ? 'معلّق للمزامنة'
          : resolvedStatus === 'waiting'
            ? role === 'husband'
              ? 'بانتظار الشريكة'
              : 'بانتظار الشريك'
            : 'غير متصل';

  const actionPrompt = role === 'wife' ? 'اضغطي لإدارة المزامنة' : 'اضغط لإدارة المزامنة';
  const ariaLabel = onPress
    ? `حالة الاتصال بـ ${partnerSubject}: ${statusLabel} — ${actionPrompt}`
    : `حالة الاتصال بـ ${partnerSubject}: ${statusLabel}`;

  const pillClasses =
    resolvedStatus === 'connected'
      ? darkMode
        ? 'bg-[#173624]/90 border-[#4ADE80]/45 text-[#DCFCE7] shadow-[0_4px_12px_rgba(0,0,0,0.32)]'
        : 'bg-white/92 border-[#A7E3BE] text-[#14532D] shadow-[0_3px_10px_rgba(20,83,45,0.08)]'
      : resolvedStatus === 'error'
        ? darkMode
          ? 'bg-[#4C1024]/92 border-[#FB7185]/50 text-[#FFE4E6] shadow-[0_4px_12px_rgba(0,0,0,0.34)]'
          : 'bg-[#FFF3F5]/95 border-[#F49EB2] text-[#881337] shadow-[0_3px_10px_rgba(136,19,55,0.1)]'
        : resolvedStatus === 'pending' || resolvedStatus === 'waiting'
          ? darkMode
            ? 'bg-[#3D2510]/90 border-[#FBBF24]/45 text-[#FEF3C7] shadow-[0_4px_12px_rgba(0,0,0,0.32)]'
            : 'bg-white/92 border-[#F3C677] text-[#78350F] shadow-[0_3px_10px_rgba(120,53,15,0.08)]'
          : darkMode
            ? 'bg-[#3D0D23]/90 border-[#DF5B8E]/42 text-[#FFE0EC] shadow-[0_4px_12px_rgba(0,0,0,0.32)]'
            : 'bg-white/88 border-[#EFCBD7]/95 text-[#5E364A] shadow-[0_3px_10px_rgba(68,14,42,0.07)]';

  const dotClasses =
    resolvedStatus === 'connected'
      ? darkMode
        ? 'w-2 h-2 rounded-full bg-[#4ADE80] ring-2 ring-[#4ADE80]/25'
        : 'w-2 h-2 rounded-full bg-[#16A34A] ring-2 ring-[#22C55E]/22'
      : resolvedStatus === 'waiting'
        ? darkMode
          ? `w-2 h-2 rounded-full bg-[#FBBF24] ring-2 ring-[#FBBF24]/25 ${motionEnabled ? 'ad-anim-waiting-pulse' : ''}`
          : `w-2 h-2 rounded-full bg-[#D97706] ring-2 ring-[#F59E0B]/22 ${motionEnabled ? 'ad-anim-waiting-pulse' : ''}`
        : darkMode
          ? 'w-1.5 h-1.5 rounded-full bg-[#D982A6]'
          : 'w-1.5 h-1.5 rounded-full bg-[#C288A2]';

  const innerBadge = (
    <span
      className={`min-h-[26px] px-2 ad-cut-chip border inline-flex items-center gap-1 text-[11px] font-bold leading-none whitespace-nowrap transition-colors ${pillClasses}`}
    >
      {resolvedStatus === 'error' ? (
        <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
      ) : resolvedStatus === 'pending' ? (
        <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
      ) : (
        <span aria-hidden="true" className={`shrink-0 ${dotClasses}`} />
      )}
      <span>{statusLabel}</span>
    </span>
  );

  if (!onPress) {
    return (
      <div
        role="status"
        aria-label={ariaLabel}
        className="pointer-events-none absolute top-[max(0.85rem,env(safe-area-inset-top))] left-3 sm:left-4 z-30 min-h-[44px] flex items-center justify-end"
      >
        {innerBadge}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onPress}
      aria-label={ariaLabel}
      className={`group absolute top-[max(0.85rem,env(safe-area-inset-top))] left-3 sm:left-4 z-30 min-h-[44px] min-w-[44px] flex items-center justify-end focus-visible:outline-none ${
        disabled ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span
        className={`transition-transform duration-150 ad-cut-chip ${
          disabled
            ? ''
            : 'group-hover:scale-[1.03] group-active:scale-95 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[#D6286C]'
        }`}
      >
        {innerBadge}
      </span>
    </button>
  );
}
