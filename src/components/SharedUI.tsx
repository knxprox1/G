import React, { useEffect, useState } from 'react';
import { Cloud, Sparkles } from 'lucide-react';
import { toArabicDigits } from '../game/engine';
import { useHasNativeNearby } from '../sync/usePlatformCapabilities';
import { PhoneModalPortal } from './PhoneStage';
import { CornerRoseFiligree } from './RoseFiligree';

export interface RoseModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabelledBy?: string;
  ariaLabel?: string;
  maxWidthClass?: string;
  motionEnabled: boolean;
  darkVelvet?: boolean;
  accentHex?: string;
  insetFrame?: boolean;
  scrollableBody?: boolean;
  cardPaddingClass?: string;
  backdropClassName?: string;
  showShadowBackCard?: boolean;
  presentation?: 'dialog' | 'sheet';
  closeDurationMs?: number;
  children: React.ReactNode;
}

/**
 * غلاف موحّد للنوافذ المنبثقة بهوية «ليالي الورد»
 */
export function RoseModalShell({
  isOpen,
  onClose,
  ariaLabelledBy,
  ariaLabel,
  maxWidthClass = 'max-w-[356px]',
  motionEnabled,
  darkVelvet = false,
  accentHex = '#D6286C',
  insetFrame = true,
  scrollableBody = false,
  cardPaddingClass = 'p-4',
  backdropClassName = 'px-4 py-4',
  showShadowBackCard = true,
  presentation = 'dialog',
  closeDurationMs = 170,
  children,
}: RoseModalShellProps) {
  const [rendered, setRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setIsClosing(false);
      return;
    }

    if (!rendered) return;
    if (!motionEnabled) {
      setRendered(false);
      setIsClosing(false);
      return;
    }

    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setRendered(false);
      setIsClosing(false);
    }, closeDurationMs);
    return () => window.clearTimeout(timer);
  }, [isOpen, rendered, motionEnabled, closeDurationMs]);

  if (!rendered) return null;

  const backdropAnimClass = motionEnabled
    ? isClosing
      ? 'ad-anim-backdrop-out'
      : 'ad-anim-backdrop'
    : '';
  const panelAnimClass = motionEnabled
    ? isClosing
      ? presentation === 'sheet'
        ? 'ad-anim-sheet-down'
        : 'ad-anim-scale-out'
      : presentation === 'sheet'
        ? 'ad-anim-sheet-up'
        : 'ad-anim-scale-in'
    : '';

  return (
    <PhoneModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={isClosing || undefined}
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        onClick={isClosing ? undefined : onClose}
        className={`absolute inset-0 ad-modal-backdrop flex items-center justify-center ${backdropClassName} ${
          isClosing ? 'pointer-events-none' : ''
        } ${backdropAnimClass}`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full ${maxWidthClass} ${
            scrollableBody ? 'max-h-[90%] flex flex-col' : ''
          } ${panelAnimClass}`}
        >
          {showShadowBackCard && (
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-2 top-2 -bottom-2 ad-cut-card -rotate-[1.5deg] opacity-80 ${
                darkVelvet
                  ? 'bg-gradient-to-b from-[#4C112B] to-[#34091B]'
                  : 'bg-gradient-to-b from-[#F9BBD2] to-[#F08DB3]'
              }`}
            />
          )}

          <div
            className={`relative z-10 w-full ad-cut-card border shadow-[0_24px_60px_rgba(36,7,22,0.4)] overflow-hidden ${
              scrollableBody ? 'max-h-full flex flex-col' : ''
            } ${
              darkVelvet
                ? 'bg-gradient-to-b from-[#3A0C22] via-[#2D0719] to-[#230513] border-[#DF5B8E]/45 text-white'
                : 'bg-gradient-to-b from-[#FFFDFB] via-[#FFF4F8] to-[#FFE7F0] border-[#F1AFC8] text-[#360D21]'
            } ${cardPaddingClass}`}
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 opacity-35 ${
                darkVelvet ? 'ad-petal-lattice-velvet' : 'ad-petal-lattice'
              }`}
            />

            {insetFrame && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-2.5 ad-cut-tile border"
                style={{ borderColor: `${accentHex}29` }}
              />
            )}

            <CornerRoseFiligree
              position="top-right"
              color={accentHex}
              insetFrame={insetFrame}
              className={insetFrame ? 'w-5 h-5 opacity-45' : 'w-6 h-6 opacity-30'}
            />
            <CornerRoseFiligree
              position="bottom-left"
              color={accentHex}
              insetFrame={insetFrame}
              className={insetFrame ? 'w-5 h-5 opacity-45' : 'w-6 h-6 opacity-25'}
            />

            <div className={`relative z-10 ${scrollableBody ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </PhoneModalPortal>
  );
}

export interface InlineConfirmBoxProps {
  containerRef?: React.Ref<HTMLDivElement>;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'primary';
  accentColor?: string;
  darkMode?: boolean;
  busy?: boolean;
  confirmDisabled?: boolean;
  centeredText?: boolean;
  submitFormId?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  onConfirm?: () => void;
  onCancel: () => void;
}

/**
 * مربع تأكيد ثنائي الخيارات موحّد (مؤكّد + تراجع)
 */
export function InlineConfirmBox({
  containerRef,
  message,
  confirmLabel,
  cancelLabel = 'تراجع',
  variant = 'destructive',
  accentColor = '#D6286C',
  darkMode = false,
  busy = false,
  confirmDisabled = false,
  centeredText = true,
  submitFormId,
  icon,
  ariaLabel,
  className = '',
  onConfirm,
  onCancel,
}: InlineConfirmBoxProps) {
  const isDestructive = variant === 'destructive';

  const containerSurface = darkMode
    ? 'bg-[#280615]/95 border-[#DF5B8E]/45 text-white'
    : isDestructive
      ? 'bg-[#FFF5F8] border-[#E89CB7] text-[#360D21]'
      : 'bg-white/95 border-[#EFCBD7] text-[#360D21]';

  const cancelSurface = darkMode
    ? 'bg-[#2E0819] border border-[#DF5B8E]/45 text-white hover:bg-[#3E0D23]'
    : 'bg-white border border-[#EFCBD7] text-[#360D21] hover:border-[#D6286C]/60';

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={ariaLabel}
      className={`ad-cut-tile border p-3 flex flex-col gap-2.5 ad-anim-toast-in ${containerSurface} ${className}`}
    >
      <div
        className={`flex items-start gap-2 ${
          centeredText && !icon ? 'justify-center text-center' : 'text-right'
        }`}
      >
        {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
        <p
          className={`text-xs font-semibold leading-relaxed ${
            darkMode ? 'text-[#FFE8F1]' : 'text-[#360D21]'
          } ${centeredText && !icon ? 'text-center' : 'text-right'}`}
        >
          {message}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type={submitFormId ? 'submit' : 'button'}
          form={submitFormId}
          disabled={busy || confirmDisabled}
          onClick={submitFormId ? undefined : onConfirm}
          className={`min-h-[44px] px-3 ad-cut-tile text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-[transform,filter,opacity,background-color] duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
            isDestructive
              ? 'bg-[#B92859] hover:brightness-95 active:scale-[0.98]'
              : 'ad-shimmer-btn hover:brightness-105 active:scale-[0.98] shadow-[0_8px_18px_rgba(214,40,108,0.24)]'
          }`}
          style={!isDestructive ? { backgroundColor: accentColor } : undefined}
        >
          {confirmLabel}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className={`min-h-[44px] px-3 ad-cut-tile text-xs font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] cursor-pointer disabled:opacity-60 ${cancelSurface}`}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * شريط تنبيه موحّد للزوج عند عدم مزامنة اختيارات الزوجة بعد
 */
export function PartnerSyncBanner({
  partnerName,
  onPress,
  compact = false,
  className = '',
}: {
  partnerName: string;
  onPress: () => void;
  compact?: boolean;
  className?: string;
}) {
  const hasNativeNearby = useHasNativeNearby();

  return (
    <button
      type="button"
      onClick={onPress}
      className={`w-full min-h-[44px] ${
        compact ? 'px-3 py-2' : 'px-3.5 py-2.5'
      } ad-cut-tile bg-[#FFF8F2]/95 border border-[#E4B29D] hover:border-[#D6286C] text-right flex items-center justify-between gap-2 cursor-pointer transition-[border-color,background-color,transform] duration-150 active:scale-[0.98] shadow-xs ${className}`}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="w-7 h-7 ad-cut-chip bg-[#FFE8D6] text-[#9A4A24] flex items-center justify-center shrink-0">
          {hasNativeNearby ? (
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </span>
        <span className="text-[11.5px] font-semibold text-[#360D21] truncate">
          {hasNativeNearby
            ? `لم تُزامَن اختيارات ${partnerName} بعد — اقترن الآن`
            : `لم تُزامَن اختيارات ${partnerName} بعد — فعّل المزامنة السحابية`}
        </span>
      </span>
      <span className="text-[11px] font-bold text-[#9A4A24] shrink-0">مزامنة</span>
    </button>
  );
}

export interface FilterTabOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

/**
 * شريط تبويبات فلترة موحّد ببطاقات مقطوعة وارتفاع لمسي 44px
 */
export function FilterTabStrip<T extends string>({
  tabs,
  activeId,
  onChange,
  ariaLabel,
  accentHex = '#D6286C',
  showEdgeFade = false,
  fadeFromClass = 'from-[#FFE8F1]',
  keyPrefix = 'filter',
  className = '',
}: {
  tabs: FilterTabOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  accentHex?: string;
  showEdgeFade?: boolean;
  fadeFromClass?: string;
  keyPrefix?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex items-center gap-1.5 overflow-x-auto ad-no-scrollbar pb-0.5 pl-4"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <button
              key={`${keyPrefix}-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={`min-h-[44px] px-3 ad-cut-chip border text-[11px] leading-none flex items-center justify-center gap-1 whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] cursor-pointer tabular-nums-ar shrink-0 ${
                active
                  ? 'text-white font-bold shadow-xs'
                  : 'bg-white/92 border-[#EFCBD7] text-[#5E364A] hover:text-[#360D21] font-semibold'
              }`}
              style={
                active
                  ? {
                      backgroundColor: accentHex,
                      borderColor: accentHex,
                    }
                  : undefined
              }
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className={active ? 'text-white/90' : 'text-[#8D5972]'}>
                  ({toArabicDigits(tab.count)})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showEdgeFade && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-7 bg-gradient-to-r ${fadeFromClass} to-transparent`}
        />
      )}
    </div>
  );
}

export interface RoseSwitchRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  statusLabel?: string;
  iconContainerClassName?: string;
  onToggle: () => void;
}

/**
 * صف تبديل موحّد (Switch Row) بإتاحة لمسية ≥ 58px وحالات ARIA كاملة
 */
export function RoseSwitchRow({
  icon,
  title,
  description,
  checked,
  disabled = false,
  statusLabel,
  iconContainerClassName = 'bg-[#FFF3EE] border-[#EBC6B6] text-[#9E4F39]',
  onToggle,
}: RoseSwitchRowProps) {
  const resolvedLabel = statusLabel ?? (checked ? 'مفعّل' : 'متوقف');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onToggle}
      className={`w-full min-h-[58px] px-3.5 py-2.5 flex items-center justify-between gap-2.5 transition-[background-color,transform] duration-150 ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-[#FFF8FB] active:scale-[0.99]'
      }`}
    >
      <div className="flex items-center gap-2.5 text-right min-w-0">
        <div
          className={`w-9 h-9 ad-cut-chip border flex items-center justify-center shrink-0 ${iconContainerClassName}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-[#360D21]">{title}</p>
          <p className="text-[11px] text-[#5E364A] leading-snug">{description}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-semibold text-[#5E364A]">{resolvedLabel}</span>
        <span
          className={`relative w-11 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
            checked && !disabled ? 'bg-[#D6286C]' : 'bg-[#E5C5D2]'
          }`}
        >
          <span
            className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              checked && !disabled ? 'translate-x-0' : '-translate-x-5'
            }`}
          />
        </span>
      </div>
    </button>
  );
}
