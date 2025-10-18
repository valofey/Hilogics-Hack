import { ArrowUpRight, Scale } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { TariffInfo } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/number';

type TariffCardProps = {
  tariffs: TariffInfo;
  className?: string;
};

export function TariffCard({ tariffs, className }: TariffCardProps) {
  const delta = tariffs.current - tariffs.wto_obligation;
  const isAbove = delta >= 0;

  return (
    <Card
      className={cn(
        'relative flex h-full flex-col overflow-hidden border border-slate-200 bg-white p-6 shadow-lg',
        className
      )}
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-100/70 blur-2xl" />
      <div className="absolute -bottom-12 left-6 h-40 w-40 rounded-full bg-sky-200/50 blur-3xl" />
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-4">
          <Badge className="bg-sky-100 text-sky-700">Тарифное регулирование</Badge>
          <div>
            <p className="text-sm text-slate-500">Текущая ставка</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-4xl font-semibold text-slate-900">
                {formatPercent(tariffs.current, { maximumFractionDigits: 1 })}
              </span>
              <span className="text-sm text-slate-500">действует сейчас</span>
            </div>
          </div>
        </div>
        <div className="rounded-full border border-slate-200 bg-white p-2 text-slate-500">
          <Scale className="h-6 w-6" />
        </div>
      </div>

      <div className="relative z-10 mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Обязательство ВТО</p>
            <p className="text-xl font-semibold text-slate-900">
              {formatPercent(tariffs.wto_obligation, { maximumFractionDigits: 1 })}
            </p>
          </div>
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
              isAbove ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            )}
          >
            <ArrowUpRight className="h-4 w-4" />
            {isAbove ? 'Выше уровня ВТО' : 'Ниже уровня ВТО'}
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Отклонение от международного обязательства составляет{' '}
          <span className="font-semibold text-slate-900">
            {formatPercent(Math.abs(delta), { maximumFractionDigits: 1 })}
          </span>
          . Следует учесть это при выборе мер поддержки.
        </p>
      </div>
    </Card>
  );
}
