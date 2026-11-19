import React, { useEffect, useRef, useState } from 'react';
import { Delete, EyeOff, KeyRound, Lock, ShieldCheck, X } from 'lucide-react';
import type { DeviceRole } from '../data/types';
import { toArabicDigits } from '../game/engine';
import { isValidPinFormat } from '../utils/security';
import { useBackOverlay } from '../utils/backNavigation';
import { CornerRoseFiligree, RoseDivider, RoseStarOrnament } from './RoseFiligree';
import { InlineConfirmBox, RoseModalShell } from './SharedUI';

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

function PinDotsIndicator({
  length,
  hasError,
  motionEnabled = true,
}: {
  length: number;
  hasError?: boolean;
  motionEnabled?: boolean;
}) {
  const [shaking, setShaking] = useState(false);
  const prevErrorRef = useRef(false);

  useEffect(() => {
    const triggered = Boolean(hasError) && !prevErrorRef.current;
    prevErrorRef.current = Boolean(hasError);
    if (!triggered || !motionEnabled) {
      if (!hasError) setShaking(false);
      return;
    }
    setShaking(true);
    const timer = window.setTimeout(() => setShaking(false), 320);
    return () => window.clearTimeout(timer);
  }, [hasError, motionEnabled]);

  return (
    <div
      dir="ltr"
      aria-label={`تم إدخال ${toArabicDigits(length)} من ٤ أرقام`}
      className={`px-5 py-2.5 ad-cut-chip bg-white/92 border border-[#E4B29D]/75 shadow-xs flex items-center justify-center gap-3.5 ${
        shaking && motionEnabled ? 'ad-anim-shake' : ''
      }`}
    >
      {[0, 1, 2, 3].map((idx) => {
        const filled = idx < length;
        return (
          <span
            key={idx}
            className={`w-4 h-4 rounded-full border transition-[transform,background-color,border-color,box-shadow] duration-200 ${
              hasError
                ? 'border-[#B92859] bg-[#FADCE7] scale-95'
                : filled
                  ? 'border-[#D6286C] bg-gradient-to-br from-[#D6286C] to-[#9E194D] scale-110 shadow-[0_0_12px_rgba(214,40,108,0.4)]'
                  : 'border-[#E6A4BC] bg-white/95'
            }`}
          />
        );
      })}
    </div>
  );
}

function ArabicNumericKeypad({
  onDigit,
  onBackspace,
  disabled = false,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}) {
  return (
    <div dir="ltr" className="w-full max-w-[264px] flex flex-col gap-2.5">
      {KEYPAD_ROWS.map((row, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-3 gap-2.5">
          {row.map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={disabled}
              onClick={() => onDigit(digit)}
              aria-label={`رقم ${toArabicDigits(Number(digit))}`}
              className="min-h-[54px] ad-cut-chip bg-white/95 border border-[#EECCDA] text-[#360D21] font-display-ar text-xl font-bold shadow-[0_6px_16px_rgba(214,40,108,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-[#D6286C] hover:bg-[#FFF5F9] active:bg-[#FCE8F0] active:scale-95 transition-[transform,background-color,border-color] duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed tabular-nums-ar"
            >
              {toArabicDigits(Number(digit))}
            </button>
          ))}
        </div>
      ))}

      <div className="grid grid-cols-3 gap-2.5">
        <span
          aria-hidden="true"
          className="min-h-[54px] ad-cut-chip border border-dashed border-[#EFCBD7]/70 bg-white/35 flex items-center justify-center"
        >
          <RoseStarOrnament color="#D6286C" className="w-3.5 h-3.5 opacity-45" />
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDigit('0')}
          aria-label="رقم ٠"
          className="min-h-[54px] ad-cut-chip bg-white/95 border border-[#EECCDA] text-[#360D21] font-display-ar text-xl font-bold shadow-[0_6px_16px_rgba(214,40,108,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-[#D6286C] hover:bg-[#FFF5F9] active:bg-[#FCE8F0] active:scale-95 transition-[transform,background-color,border-color] duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed tabular-nums-ar"
        >
          {toArabicDigits(0)}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onBackspace}
          aria-label="حذف آخر رقم"
          className="min-h-[54px] ad-cut-chip bg-[#FCEEF3] border border-[#F1AFC8] text-[#8E184B] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] hover:bg-[#FADCE7] active:scale-95 transition-[transform,background-color] duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Delete className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * ستار الخصوصية الفوري عند انتقال التطبيق إلى الخلفية أو مبدّل التطبيقات
 */
export function PrivacyCurtainOverlay({ motionEnabled = true }: { motionEnabled?: boolean }) {
  return (
    <div
      aria-live="polite"
      aria-label="ستار الخصوصية"
      className={`absolute inset-0 z-[90] ad-rose-silk-bg flex flex-col items-center justify-center px-6 text-center select-none overflow-hidden ${
        motionEnabled ? 'ad-anim-backdrop' : ''
      }`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 ad-petal-lattice opacity-60" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-72 h-72 rounded-full border border-[#D6286C]/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute w-52 h-52 rounded-full border border-dashed border-[#E4B29D]/55"
      />
      <CornerRoseFiligree position="top-right" color="#D6286C" className="w-10 h-10 opacity-30" />
      <CornerRoseFiligree position="bottom-left" color="#D6286C" className="w-10 h-10 opacity-30" />

      <div className="relative z-10 w-20 h-20 rounded-full border border-dashed border-[#E6A4BC] bg-white/88 flex items-center justify-center mb-4 shadow-[0_14px_34px_rgba(214,40,108,0.18)]">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D6286C] to-[#9E194D] text-white flex items-center justify-center shadow-sm">
          <EyeOff className="w-7 h-7" aria-hidden="true" />
        </div>
      </div>

      <h2 className="relative z-10 font-display-ar text-2xl font-bold text-[#360D21]">ليالي الورد</h2>
      <div className="relative z-10 w-28 my-2.5">
        <RoseDivider />
      </div>
      <p className="relative z-10 text-xs font-semibold text-[#5E364A] max-w-[26ch] leading-relaxed">
        تم إخفاء المحتوى تلقائياً لحماية خصوصية الزوجين
      </p>
    </div>
  );
}

interface PrivacyLockScreenProps {
  role?: DeviceRole;
  playerName: string;
  lockoutRemainingMs: number;
  onSubmitPin: (pin: string) => {
    unlocked: boolean;
    errorMessage?: string;
  };
  onForgotPinWipeAll: () => void;
  motionEnabled: boolean;
}

/**
 * شاشة القفل الكاملة برمز من ٤ أرقام
 */
export function PrivacyLockScreen({
  role = 'wife',
  playerName,
  lockoutRemainingMs,
  onSubmitPin,
  onForgotPinWipeAll,
  motionEnabled,
}: PrivacyLockScreenProps) {
  const isHusband = role === 'husband';
  const [digits, setDigits] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const onSubmitPinRef = useRef(onSubmitPin);
  onSubmitPinRef.current = onSubmitPin;
  const submittedPinRef = useRef<string | null>(null);

  const isLockedOut = lockoutRemainingMs > 0;
  const lockoutSeconds = Math.max(1, Math.ceil(lockoutRemainingMs / 1000));

  useEffect(() => {
    if (digits.length < 4) {
      submittedPinRef.current = null;
      return;
    }
    if (isLockedOut) return;
    if (submittedPinRef.current === digits) return;
    submittedPinRef.current = digits;

    const result = onSubmitPinRef.current(digits);
    if (!result.unlocked) {
      setErrorMsg(result.errorMessage ?? 'الرمز غير صحيح');
      const t = window.setTimeout(() => {
        submittedPinRef.current = null;
        setDigits('');
      }, 260);
      return () => window.clearTimeout(t);
    }
  }, [digits, isLockedOut]);

  useEffect(() => {
    if (isLockedOut || confirmWipe) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      let normalizedDigit: string | null = null;
      if (e.key >= '0' && e.key <= '9') {
        normalizedDigit = e.key;
      } else if (e.key >= '٠' && e.key <= '٩') {
        normalizedDigit = String.fromCharCode(e.key.charCodeAt(0) - 0x0660 + 48);
      }
      if (normalizedDigit !== null) {
        e.preventDefault();
        setErrorMsg(null);
        setDigits((prev) => (prev.length >= 4 ? prev : `${prev}${normalizedDigit}`.slice(0, 4)));
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setErrorMsg(null);
        setDigits((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLockedOut, confirmWipe]);

  const handleDigit = (d: string) => {
    if (isLockedOut || digits.length >= 4) return;
    setErrorMsg(null);
    setDigits((prev) => `${prev}${d}`.slice(0, 4));
  };

  const handleBackspace = () => {
    if (isLockedOut) return;
    setErrorMsg(null);
    setDigits((prev) => prev.slice(0, -1));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-lock-title"
      className={`absolute inset-0 z-[80] ad-rose-silk-bg flex flex-col items-center justify-center px-5 py-6 text-center overflow-y-auto ad-no-scrollbar ${
        motionEnabled ? 'ad-anim-content-swap' : ''
      }`}
    >
      <CornerRoseFiligree position="top-right" color="#D6286C" className="w-9 h-9 opacity-30" />
      <CornerRoseFiligree position="bottom-left" color="#D6286C" className="w-9 h-9 opacity-25" />

      <div className="relative z-10 w-full max-w-[330px] flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-full border border-dashed border-[#E6A4BC] bg-white/90 flex items-center justify-center shadow-[0_12px_30px_rgba(214,40,108,0.16)]">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#D6286C] to-[#9E194D] text-white flex items-center justify-center">
            <Lock className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-[11px] font-semibold text-[#5E364A]">
            مرحباً {playerName} · جلسة محمية
          </p>
          <h1
            id="privacy-lock-title"
            className="font-display-ar text-2xl font-bold text-[#360D21]"
          >
            {isHusband ? 'أدخل رمز القفل' : 'أدخلي رمز القفل'}
          </h1>
        </div>

        <PinDotsIndicator
          length={digits.length}
          hasError={Boolean(errorMsg) || isLockedOut}
          motionEnabled={motionEnabled}
        />

        {isLockedOut ? (
          <p
            role="alert"
            className={`text-xs font-bold text-[#9E194D] bg-[#FFF0F4] border border-[#E89CB7] ad-cut-chip px-3 py-2 tabular-nums-ar ${
              motionEnabled ? 'ad-anim-toast-in' : ''
            }`}
          >
            {`تم إيقاف المحاولات مؤقتاً · ${isHusband ? 'انتظر' : 'انتظري'} ${toArabicDigits(lockoutSeconds)} ثانية`}
          </p>
        ) : errorMsg ? (
          <p
            role="alert"
            className={`text-xs font-bold text-[#B92859] ${
              motionEnabled ? 'ad-anim-toast-in' : ''
            }`}
          >
            {errorMsg}
          </p>
        ) : (
          <p className="text-[11.5px] text-[#5E364A]">
            {isHusband
              ? 'أدخل الأرقام الأربعة للوصول إلى السجل والأسئلة'
              : 'أدخلي الأرقام الأربعة للوصول إلى السجل والأسئلة'}
          </p>
        )}

        <ArabicNumericKeypad
          onDigit={handleDigit}
          onBackspace={handleBackspace}
          disabled={isLockedOut}
        />

        {!confirmWipe ? (
          <button
            type="button"
            onClick={() => setConfirmWipe(true)}
            className="mt-1 text-[11px] font-semibold text-[#5E364A] hover:text-[#D6286C] underline underline-offset-4 cursor-pointer min-h-[44px] px-3 ad-cut-chip flex items-center justify-center active:scale-[0.97] transition-[color,transform] duration-150"
          >
            {isHusband ? 'نسيت الرمز الشخصي؟' : 'نسيتِ الرمز الشخصي؟'}
          </button>
        ) : (
          <InlineConfirmBox
            variant="destructive"
            centeredText={false}
            className="w-full mt-1"
            message={
              isHusband
                ? 'حمايةً للخصوصية، لا يمكن استعادة الرمز دون مسح البيانات المحلية على هذا الجهاز. هل تريد المتابعة؟'
                : 'حمايةً للخصوصية، لا يمكن استعادة الرمز دون مسح البيانات المحلية على هذا الجهاز. هل تريدين المتابعة؟'
            }
            confirmLabel="مسح وفتح القفل"
            cancelLabel="تراجع"
            onConfirm={onForgotPinWipeAll}
            onCancel={() => setConfirmWipe(false)}
          />
        )}
      </div>
    </div>
  );
}

export type PinSetupMode = 'create' | 'change' | 'disable';

interface PinSetupModalProps {
  isOpen: boolean;
  mode: PinSetupMode;
  role?: DeviceRole;
  verifyCurrentPin: (pin: string) => boolean;
  onSaveNewPin: (pin: string) => void;
  onDisablePin: () => void;
  onClose: () => void;
  motionEnabled: boolean;
}

/**
 * نافذة إعداد / تغيير / إلغاء رمز القفل الشخصي من شاشة الإعدادات
 */
export function PinSetupModal({
  isOpen,
  mode,
  role = 'wife',
  verifyCurrentPin,
  onSaveNewPin,
  onDisablePin,
  onClose,
  motionEnabled,
}: PinSetupModalProps) {
  type Step = 'verify-current' | 'enter-new' | 'confirm-new';
  const isHusband = role === 'husband';

  const [step, setStep] = useState<Step>(mode === 'create' ? 'enter-new' : 'verify-current');
  const [digits, setDigits] = useState('');
  const [firstNewPin, setFirstNewPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const verifyCurrentPinRef = useRef(verifyCurrentPin);
  verifyCurrentPinRef.current = verifyCurrentPin;
  const onSaveNewPinRef = useRef(onSaveNewPin);
  onSaveNewPinRef.current = onSaveNewPin;
  const onDisablePinRef = useRef(onDisablePin);
  onDisablePinRef.current = onDisablePin;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const handledKeyRef = useRef<string | null>(null);

  useBackOverlay(isOpen, 'pin-setup-modal', onClose);

  useEffect(() => {
    if (!isOpen) {
      handledKeyRef.current = null;
      return;
    }
    setStep(mode === 'create' ? 'enter-new' : 'verify-current');
    setDigits('');
    setFirstNewPin('');
    setErrorMsg(null);
    handledKeyRef.current = null;
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      let normalizedDigit: string | null = null;
      if (e.key >= '0' && e.key <= '9') {
        normalizedDigit = e.key;
      } else if (e.key >= '٠' && e.key <= '٩') {
        normalizedDigit = String.fromCharCode(e.key.charCodeAt(0) - 0x0660 + 48);
      }
      if (normalizedDigit !== null) {
        e.preventDefault();
        setErrorMsg(null);
        setDigits((prev) => (prev.length >= 4 ? prev : `${prev}${normalizedDigit}`.slice(0, 4)));
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setErrorMsg(null);
        setDigits((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || digits.length < 4) {
      handledKeyRef.current = null;
      return;
    }
    if (!isValidPinFormat(digits)) return;
    const attemptKey = `${step}:${digits}`;
    if (handledKeyRef.current === attemptKey) return;
    handledKeyRef.current = attemptKey;

    if (step === 'verify-current') {
      if (!verifyCurrentPinRef.current(digits)) {
        setErrorMsg('الرمز الحالي غير صحيح');
        const t = window.setTimeout(() => {
          handledKeyRef.current = null;
          setDigits('');
        }, 250);
        return () => window.clearTimeout(t);
      }
      if (mode === 'disable') {
        onDisablePinRef.current();
        onCloseRef.current();
        return;
      }
      setErrorMsg(null);
      setDigits('');
      handledKeyRef.current = null;
      setStep('enter-new');
      return;
    }

    if (step === 'enter-new') {
      setFirstNewPin(digits);
      setDigits('');
      setErrorMsg(null);
      handledKeyRef.current = null;
      setStep('confirm-new');
      return;
    }

    if (step === 'confirm-new') {
      if (digits !== firstNewPin) {
        setErrorMsg(
          isHusband
            ? 'الرمزان غير متطابقين · أعد إدخال الرمز الجديد'
            : 'الرمزان غير متطابقين · أعيدي إدخال الرمز الجديد',
        );
        const t = window.setTimeout(() => {
          handledKeyRef.current = null;
          setDigits('');
          setFirstNewPin('');
          setStep('enter-new');
        }, 380);
        return () => window.clearTimeout(t);
      }
      onSaveNewPinRef.current(digits);
      onCloseRef.current();
    }
  }, [digits, step, mode, firstNewPin, isOpen, isHusband]);

  const titleText =
    step === 'verify-current'
      ? mode === 'disable'
        ? 'تأكيد إلغاء القفل'
        : isHusband
          ? 'أدخل الرمز الحالي'
          : 'أدخلي الرمز الحالي'
      : step === 'enter-new'
        ? 'اختيار رمز القفل'
        : 'تأكيد الرمز الجديد';

  const subtitleText =
    step === 'verify-current'
      ? isHusband
        ? 'أدخل الرمز الحالي المكون من ٤ أرقام للمتابعة'
        : 'أدخلي الرمز الحالي المكون من ٤ أرقام للمتابعة'
      : step === 'enter-new'
        ? isHusband
          ? 'اختر ٤ أرقام سهلة التذكر لحماية الخصوصية'
          : 'اختاري ٤ أرقام سهلة التذكر لحماية الخصوصية'
        : isHusband
          ? 'أعد إدخال الأرقام الأربعة للتأكيد'
          : 'أعيدي إدخال الأرقام الأربعة للتأكيد';

  return (
    <RoseModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="pin-setup-title"
      motionEnabled={motionEnabled}
      insetFrame={false}
      cardPaddingClass="px-4 pt-3.5 pb-4"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-white border border-[#E88FB2] flex items-center justify-center text-[#D6286C]">
              {mode === 'disable' ? (
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              ) : (
                <KeyRound className="w-4 h-4" aria-hidden="true" />
              )}
            </span>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-[#5E364A]">حماية الخصوصية</p>
              <h2 id="pin-setup-title" className="font-display-ar text-lg font-bold text-[#360D21]">
                {titleText}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق إعداد الرمز"
            className="min-w-[44px] min-h-[44px] rounded-full bg-white/95 border border-[#EFCBD7] flex items-center justify-center text-[#5E364A] hover:text-[#D6286C] active:scale-95 transition-[color,transform] duration-150 cursor-pointer shrink-0 shadow-sm"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="w-full">
          <RoseDivider color="#D6286C" />
        </div>

        <p
          key={step}
          className={`text-xs text-[#5E364A] text-center ${
            motionEnabled ? 'ad-anim-content-swap' : ''
          }`}
        >
          {subtitleText}
        </p>

        <PinDotsIndicator
          length={digits.length}
          hasError={Boolean(errorMsg)}
          motionEnabled={motionEnabled}
        />

        {errorMsg && (
          <p
            role="alert"
            className={`text-xs font-bold text-[#B92859] text-center ${
              motionEnabled ? 'ad-anim-toast-in' : ''
            }`}
          >
            {errorMsg}
          </p>
        )}

        <ArabicNumericKeypad
          onDigit={(d) => {
            if (digits.length >= 4) return;
            setErrorMsg(null);
            setDigits((prev) => `${prev}${d}`.slice(0, 4));
          }}
          onBackspace={() => {
            setErrorMsg(null);
            setDigits((prev) => prev.slice(0, -1));
          }}
        />
      </div>
    </RoseModalShell>
  );
}
