import React, { useState } from 'react';
import { Check, ChevronLeft, Heart, Lock, User } from 'lucide-react';
import type { DeviceRole } from '../data/types';
import { DEFAULT_HUSBAND_NAME, DEFAULT_WIFE_NAME } from '../game/engine';
import { BrandMark } from './BrandMark';
import { CornerRoseFiligree, RoseDivider } from './RoseFiligree';
import { InlineConfirmBox } from './SharedUI';

interface RoleOnboardingScreenProps {
  onConfirmRole: (role: DeviceRole, playerName: string) => void;
  onTapFeedback?: () => void;
  motionEnabled: boolean;
}

/**
 * شاشة التهيئة الأولى عند تثبيت التطبيق أو تشغيله للمرة الأولى:
 * يختار المستخدم مرة واحدة ما إذا كان هذا الجهاز «نسخة الزوجة» أو «نسخة الزوج»،
 * ثم تُعتمد هذه الهوية نهائياً لهذا التثبيت دون أي تعقيد أو روابط خارجية.
 */
export function RoleOnboardingScreen({
  onConfirmRole,
  onTapFeedback,
  motionEnabled,
}: RoleOnboardingScreenProps) {
  const [selectedRole, setSelectedRole] = useState<DeviceRole | null>(null);
  const [customName, setCustomName] = useState<string>('');
  const [touchedName, setTouchedName] = useState<boolean>(false);
  const [confirmingRole, setConfirmingRole] = useState<boolean>(false);
  const [nameHint, setNameHint] = useState<string | null>(null);

  const handleSelectRole = (role: DeviceRole) => {
    onTapFeedback?.();
    setSelectedRole(role);
    setConfirmingRole(false);
    setNameHint(null);
    if (!touchedName) {
      setCustomName(role === 'husband' ? DEFAULT_HUSBAND_NAME : DEFAULT_WIFE_NAME);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    onTapFeedback?.();
    if (!confirmingRole) {
      if (touchedName && customName.length > 0 && customName.trim().length === 0) {
        setNameHint('المسافات وحدها غير معتمدة — سيتم اعتماد الاسم الافتراضي تلقائياً');
      } else {
        setNameHint(null);
      }
      setConfirmingRole(true);
      return;
    }
    onConfirmRole(selectedRole, customName.trim());
  };

  return (
    <section
      className={`relative flex-1 min-h-0 flex flex-col justify-between px-5 pt-safe pb-[max(1.1rem,env(safe-area-inset-bottom))] overflow-hidden ${
        motionEnabled ? 'ad-anim-screen-curtain' : ''
      }`}
      aria-label="إعداد نسخة الجهاز لأول مرة"
    >
      {/* Serene Centered Brand Header */}
      <header className="shrink-0">
        <div className="flex items-center justify-center min-h-[44px] px-16">
          <BrandMark />
        </div>
        <div
          aria-hidden="true"
          className="mt-1.5 h-px w-full bg-gradient-to-l from-transparent via-[#D6286C]/30 to-transparent"
        />
      </header>

      {/* Scrollable Middle Selection Stage */}
      <form
        id="role-onboarding-form"
        onSubmit={handleSubmit}
        className="flex-1 min-h-0 overflow-y-auto ad-no-scrollbar py-3 flex flex-col justify-center gap-3.5"
      >
        <div className="text-center flex flex-col items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#9E194D]">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>إعداد التثبيت الأول · يُحدَّد مرة واحدة</span>
          </span>
          <h1 className="font-display-ar text-[1.7rem] sm:text-[1.85rem] font-bold text-[#360D21] leading-tight text-balance">
            من يستخدم هذا الجهاز؟
          </h1>
          <p className="text-xs text-[#5E364A] leading-relaxed max-w-[34ch]">
            تُحدَّد نسخة هذا الهاتف مرة واحدة؛ لتُضبط تجربة الأسئلة والسجل والمزامنة التلقائية بما يناسب دور كل منكما.
          </p>
        </div>

        <div className="w-32 mx-auto">
          <RoseDivider color="#D6286C" />
        </div>

        {/* Two Tactile Royal Edition Cards */}
        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="تحديد نسخة الجهاز">
          <button
            type="button"
            role="radio"
            aria-checked={selectedRole === 'wife'}
            onClick={() => handleSelectRole('wife')}
            className={`relative ad-cut-card p-4 border text-right transition-[transform,background-color,border-color,box-shadow] duration-200 active:scale-[0.99] cursor-pointer overflow-hidden ${
              selectedRole === 'wife'
                ? 'bg-gradient-to-br from-[#D6286C] via-[#C62161] to-[#A8164F] border-[#D6286C] text-white shadow-[0_14px_30px_rgba(214,40,108,0.3)] -translate-y-0.5'
                : 'bg-white/95 border-[#EECCDA] text-[#360D21] hover:border-[#D6286C]/65 shadow-[0_8px_22px_rgba(214,40,108,0.08)]'
            }`}
          >
            <CornerRoseFiligree
              position="top-right"
              color={selectedRole === 'wife' ? '#FFFFFF' : '#D6286C'}
              className="w-6 h-6 opacity-25"
            />
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`w-10 h-10 ad-cut-chip flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedRole === 'wife'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#FCEEF3] text-[#D6286C]'
                  }`}
                >
                  <Heart className="w-5 h-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-display-ar text-xl font-bold leading-snug">نسخة الزوجة</p>
                  <p
                    className={`text-xs leading-relaxed mt-0.5 ${
                      selectedRole === 'wife' ? 'text-white/90' : 'text-[#5E364A]'
                    }`}
                  >
                    تجيب عن الأسئلة وتوثّق اختياراتها الخاصة في السجل وتشاركها تلقائياً عند الاقتران القريب.
                  </p>
                </div>
              </div>
              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                  selectedRole === 'wife'
                    ? 'bg-white text-[#D6286C] border-white'
                    : 'border-[#E2B5C7] bg-white'
                }`}
                aria-hidden="true"
              >
                {selectedRole === 'wife' && <Check className="w-3.5 h-3.5 stroke-[2.8]" />}
              </span>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={selectedRole === 'husband'}
            onClick={() => handleSelectRole('husband')}
            className={`relative ad-cut-card p-4 border text-right transition-[transform,background-color,border-color,box-shadow] duration-200 active:scale-[0.99] cursor-pointer overflow-hidden ${
              selectedRole === 'husband'
                ? 'bg-gradient-to-br from-[#B4226A] via-[#9E1954] to-[#7D1040] border-[#B4226A] text-white shadow-[0_14px_30px_rgba(180,34,106,0.3)] -translate-y-0.5'
                : 'bg-white/95 border-[#EECCDA] text-[#360D21] hover:border-[#D6286C]/65 shadow-[0_8px_22px_rgba(214,40,108,0.08)]'
            }`}
          >
            <CornerRoseFiligree
              position="top-right"
              color={selectedRole === 'husband' ? '#FFFFFF' : '#B4226A'}
              className="w-6 h-6 opacity-25"
            />
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`w-10 h-10 ad-cut-chip flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedRole === 'husband'
                      ? 'bg-white/20 text-white'
                      : 'bg-[#FCEEF3] text-[#B4226A]'
                  }`}
                >
                  <User className="w-5 h-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-display-ar text-xl font-bold leading-snug">نسخة الزوج</p>
                  <p
                    className={`text-xs leading-relaxed mt-0.5 ${
                      selectedRole === 'husband' ? 'text-white/90' : 'text-[#5E364A]'
                    }`}
                  >
                    تظهر له الأسئلة محددةً عليها اختيارات زوجته كما أجابت عنها دون تعديل، مع جاهزية الأنماط التفاعلية الحية.
                  </p>
                </div>
              </div>
              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                  selectedRole === 'husband'
                    ? 'bg-white text-[#B4226A] border-white'
                    : 'border-[#E2B5C7] bg-white'
                }`}
                aria-hidden="true"
              >
                {selectedRole === 'husband' && <Check className="w-3.5 h-3.5 stroke-[2.8]" />}
              </span>
            </div>
          </button>
        </div>

        {/* Optional Name Field Once Role Is Highlighted */}
        {selectedRole && (
          <div
            className={`ad-cut-tile bg-white/95 border border-[#EECCDA] px-3.5 py-2.5 flex flex-col gap-1 ${
              motionEnabled ? 'ad-anim-content-swap' : ''
            }`}
          >
            <label
              htmlFor="onboarding-player-name"
              className="text-[11px] font-bold text-[#5E364A]"
            >
              الاسم الظاهر في الملف الشخصي (اختياري)
            </label>
            <input
              id="onboarding-player-name"
              type="text"
              maxLength={24}
              value={customName}
              onChange={(e) => {
                setTouchedName(true);
                setCustomName(e.target.value);
                if (nameHint && e.target.value.trim().length > 0) {
                  setNameHint(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (selectedRole && !confirmingRole) {
                    onTapFeedback?.();
                    if (touchedName && customName.length > 0 && customName.trim().length === 0) {
                      setNameHint('المسافات وحدها غير معتمدة — سيتم اعتماد الاسم الافتراضي تلقائياً');
                    } else {
                      setNameHint(null);
                    }
                    setConfirmingRole(true);
                  }
                  e.currentTarget.blur();
                }
              }}
              placeholder={
                selectedRole === 'husband' ? DEFAULT_HUSBAND_NAME : DEFAULT_WIFE_NAME
              }
              className="w-full min-h-[44px] px-3 ad-cut-chip bg-[#FFF8FB] border border-[#EFCBD7] text-sm font-semibold text-[#360D21] focus:outline-none focus:border-[#D6286C]"
            />
            {nameHint && (
              <p
                role="status"
                className={`text-[11px] font-semibold text-[#8E184B] leading-snug ${
                  motionEnabled ? 'ad-anim-toast-in' : ''
                }`}
              >
                {nameHint}
              </p>
            )}
          </div>
        )}
      </form>

      {/* Bottom Sticky Confirmation Button or Final Lock Warning */}
      <footer className="shrink-0 pt-2 flex flex-col gap-2">
        {confirmingRole && selectedRole ? (
          <InlineConfirmBox
            ariaLabel="تأكيد تثبيت نسخة الجهاز"
            variant="primary"
            submitFormId="role-onboarding-form"
            centeredText={false}
            icon={<Lock className="w-4 h-4 text-[#D6286C]" aria-hidden="true" />}
            message={
              <>
                سيتم تثبيت هذا الجهاز نهائياً على{' '}
                <span className="font-bold text-[#B41F5E]">
                  {selectedRole === 'husband' ? '«نسخة الزوج»' : '«نسخة الزوجة»'}
                </span>{' '}
                لهذا التثبيت (ويمكن تبديلها لاحقاً من الإعدادات).{' '}
                {selectedRole === 'husband' ? 'هل تريد الاعتماد؟' : 'هل تريدين الاعتماد؟'}
              </>
            }
            confirmLabel="تأكيد الاعتماد النهائي"
            cancelLabel="تراجع"
            onCancel={() => {
              onTapFeedback?.();
              setConfirmingRole(false);
            }}
            className="border-[#D6286C]/55 shadow-[0_12px_28px_rgba(180,34,106,0.16)]"
          />
        ) : (
          <button
            type="submit"
            form="role-onboarding-form"
            disabled={!selectedRole}
            className={`w-full min-h-[52px] ad-cut-tile font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 transition-[transform,filter,background-color,border-color,color,box-shadow] duration-150 ${
              selectedRole
                ? 'ad-shimmer-btn bg-gradient-to-l from-[#D6286C] via-[#C62161] to-[#AE1752] text-white shadow-[0_14px_30px_rgba(186,29,88,0.3)] hover:brightness-105 active:scale-[0.98] cursor-pointer'
                : 'bg-[#F8DAE6] text-[#6E3E56] border border-[#EBB8CC] cursor-not-allowed'
            }`}
          >
            <span>
              {selectedRole === 'husband'
                ? 'اعتماد نسخة الزوج والمتابعة'
                : selectedRole === 'wife'
                  ? 'اعتماد نسخة الزوجة والمتابعة'
                  : 'يُرجى تحديد النسخة أولاً للمتابعة'}
            </span>
            <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        )}
      </footer>
    </section>
  );
}
