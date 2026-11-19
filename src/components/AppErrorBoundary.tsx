import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { CornerRoseFiligree, RoseDivider } from './RoseFiligree';

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset?: () => void },
  AppErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع في الجلسة';
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown) {
    console.error('Layali ErrorBoundary caught:', error);
  }

  private handleSoftReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        dir="rtl"
        className="min-h-dvh w-full ad-rose-silk-bg flex items-center justify-center p-5 text-center"
      >
        <div className="relative w-full max-w-[360px] ad-cut-card bg-white/95 border border-[#F1AFC8] p-5 shadow-[0_24px_60px_rgba(36,7,22,0.22)] flex flex-col items-center gap-3 overflow-hidden">
          <CornerRoseFiligree position="top-right" color="#D6286C" className="w-7 h-7 opacity-30" />
          <CornerRoseFiligree position="bottom-left" color="#D6286C" className="w-7 h-7 opacity-25" />

          <span className="w-12 h-12 rounded-full bg-[#FCEEF3] border border-[#F1AFC8] text-[#D6286C] flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" aria-hidden="true" />
          </span>

          <h1 className="font-display-ar text-xl font-bold text-[#360D21]">
            توقف مؤقت لحماية الجلسة
          </h1>

          <div className="w-24">
            <RoseDivider color="#D6286C" />
          </div>

          <p className="text-xs text-[#5E364A] leading-relaxed">
            تعذّر إتمام إحدى العمليات الأخيرة. البيانات المحلية محفوظة بأمان، ويمكن استعادة الجلسة أو إعادة فتح التطبيق.
          </p>

          <div className="w-full flex flex-col gap-2">
            <button
              type="button"
              onClick={this.handleSoftReset}
              className="w-full min-h-[46px] ad-cut-tile bg-[#D6286C] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:brightness-95"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>استعادة الجلسة الآن</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[44px] ad-cut-tile bg-white border border-[#EFCBD7] text-[#360D21] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:border-[#D6286C]"
            >
              <span>إعادة تحميل الصفحة</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
