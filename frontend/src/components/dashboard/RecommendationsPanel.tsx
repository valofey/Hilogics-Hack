import { CheckCircle2, Lightbulb } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MEASURE_DETAILS, findMeasureDetail } from '@/data/ttp-measures';

type RecommendationsPanelProps = {
  recommendations: string[];
};

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  const items =
    recommendations.length && typeof recommendations[0] === 'string'
      ? recommendations
      : ['Рассмотрите программы поддержки экспорта, релевантные вашему рынку'];

  return (
    <Card className="border border-black bg-white">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900">
          <Lightbulb className="h-6 w-6 text-slate-900" />
          Возможные меры поддержки
        </CardTitle>
        <p className="text-sm text-slate-600">
          Подбор основан на текущем уровне тарифной нагрузки и ресурсах, которые задействуют компании с аналогичным
          профилем. Выберите подходящие меры, чтобы дополнить план действий.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {items.map((recommendation, index) => {
          const detail = findMeasureDetail(recommendation);
          const payload = detail ?? MEASURE_DETAILS.find((item) => recommendation.includes(item.id)) ?? null;

          return (
            <div key={`${recommendation}-${index}`} className="h-full border border-black bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 border border-black bg-white p-2 text-slate-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {payload?.id ?? `Рекомендация №${index + 1}`}
                    </p>
                    <h4 className="text-base font-semibold text-slate-900">
                      {payload?.title ?? recommendation}
                    </h4>
                  </div>
                  <p className="text-sm text-slate-600">{payload ? payload.description : recommendation}</p>
                  {payload?.triggers ? (
                    <ul className="space-y-1.5 text-xs text-slate-500">
                      {payload.triggers.map((trigger) => (
                        <li key={trigger} className="flex items-start gap-2 leading-relaxed">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 border border-black bg-black" />
                          {trigger}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
