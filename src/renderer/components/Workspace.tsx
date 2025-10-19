import { useEffect, useRef } from 'react';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from './ui/empty';
import { useTranslation } from 'react-i18next';

export default function Workspace() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const report = () => {
      const rect = el.getBoundingClientRect();
      try {
        window.parallelchat?.send('parallelchat/workspace/bounds', {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      } catch (_err) {
        void _err;
      }
    };

    report();

    const RO = (window as any).ResizeObserver;
    let cleanup: (() => void) | undefined;
    if (RO) {
      const ro = new RO(report);
      ro.observe(el);
      cleanup = () => {
        try {
          ro.disconnect();
        } catch (_err) {
          void _err;
        }
      };
    } else {
      const onResize = () => report();
      window.addEventListener('resize', onResize);
      cleanup = () => window.removeEventListener('resize', onResize);
    }

    return cleanup;
  }, []);

  return (
    <div ref={ref} className="flex-1 relative">
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <line x1="9" x2="15" y1="9" y2="15"/>
              <line x1="15" x2="9" y1="9" y2="15"/>
            </svg>
          </EmptyMedia>
          <EmptyTitle>{t('workspace.emptyTitle')}</EmptyTitle>
          <EmptyDescription>
            {t('workspace.emptyDesc', { app: t('app.title') })}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
