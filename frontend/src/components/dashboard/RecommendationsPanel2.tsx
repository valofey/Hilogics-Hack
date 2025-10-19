import { CheckCircle2, Link2, Lightbulb } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Recommendation } from '@/types/dashboard';

type RecommendationsPanelProps = {
  recommendations: Recommendation[];
};

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  const items = recommendations.length
    ? recommendations
    : [{ name: 'Рекомендации появятся после расчёта', reasons: [], similar_cases: [] }];

  return (
    <Card className="border border-black bg-white">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900">
          <Lightbulb className="h-6 w-6 text-slate-900" />
          Рекомендации по мерам поддержки
        </CardTitle>
        <p className="text-sm text-slate-600">
          Ниже указаны меры поддержки на основе анализа данных. Сформированы автоматически и требуют проверки
          специалистами MOSPROM. Для подробностей изучите причины и похожие кейсы.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {items.map((rec, index) => (
          <div key={`${rec.name}-${index}`} className="h-full border border-black bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 border border-black bg-white p-2 text-slate-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Мера №-{index + 1}</p>
                  <h4 className="text-base font-semibold text-slate-900">{rec.name}</h4>
                </div>

                {rec.reasons && rec.reasons.length ? (
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {rec.reasons.map((reason, i) => (
                      <li key={`${reason}-${i}`} className="flex items-start gap-2 leading-relaxed">
                        <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 border border-black bg-black" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {rec.similar_cases && rec.similar_cases.length ? (
                  <div className="pt-2 text-xs text-slate-500">
                    {rec.similar_cases.slice(0, 2).map((c, j) => (
                      <div key={`${c.case_url}-${j}`} className="flex items-start gap-2">
                        <Link2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <a href={c.case_url} target="_blank" rel="noreferrer" className="underline">
                          {c.description}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

