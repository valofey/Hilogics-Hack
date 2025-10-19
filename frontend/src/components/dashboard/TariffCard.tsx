import { ArrowUpRight, Scale } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TariffInfo } from '@/types/dashboard';
import { formatPercent } from '@/lib/number';

type TariffCardProps = {
  tariffs: TariffInfo;
  className?: string;
};

export function TariffCard({ tariffs, className }: TariffCardProps) {
  const delta = tariffs.current - tariffs.wto_obligation;
  const isAbove = delta >= 0;

  return (
    <Card className={cn('flex h-full flex-col border border-black bg-white p-6', className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-4">
          <Badge className="border border-black bg-white text-black">Таможенное регулирование</Badge>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Действующая ставка</p>
            <p className="text-4xl font-semibold text-slate-900">
              {formatPercent(tariffs.current, { maximumFractionDigits: 1 })}
            </p>
            <p className="text-xs text-slate-500">адвалорный тариф</p>
          </div>
        </div>
        <div className="rounded-full border border-black bg-white p-2 text-slate-700">
          <Scale className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border border-black bg-white px-3 py-2 text-sm">
          <span className="font-semibold text-slate-900">
            Обязательство ВТО: {formatPercent(tariffs.wto_obligation, { maximumFractionDigits: 1 })}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide',
              isAbove ? 'text-emerald-600' : 'text-amber-600'
            )}
          >
            <ArrowUpRight className="h-4 w-4" />
            {isAbove ? 'Выше обязательства' : 'Ниже обязательства'}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Разница составляет{' '}
          <span className="font-semibold text-slate-900">
            {formatPercent(Math.abs(delta), { maximumFractionDigits: 1 })}
          </span>
          . Используйте этот ориентир, чтобы готовить аргументы для корректировки ставок и заранее считать экономику
          поставок.
        </p>
      </div>
    </Card>
  );
}
