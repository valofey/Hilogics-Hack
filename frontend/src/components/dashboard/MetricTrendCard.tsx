import { type ReactNode, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MetricPoint } from '@/types/dashboard';
import { formatNumber, formatPercent } from '@/lib/number';

type MetricTrendCardProps = {
  title: string;
  subtitle?: string;
  data: MetricPoint[];
  domain: readonly [number, number];
  color: {
    stroke: string;
    fill: string;
    gradientId: string;
  };
  footer?: ReactNode;
};

type MetricTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ payload: MetricPoint }>;
};

export function MetricTrendCard({ title, subtitle, data, domain, color, footer }: MetricTrendCardProps) {
  const gradientId = useMemo(() => `metric-gradient-${color.gradientId}`, [color.gradientId]);

  const renderTooltip = ({ active, payload, label }: MetricTooltipProps) => {
    if (!active || !payload?.length) {
      return null;
    }
    const record = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow">
        <p className="text-xs font-medium text-slate-500">{`Год ${label}`}</p>
        <p className="font-semibold text-slate-900">{formatNumber(record.value)}</p>
        <p className="text-xs text-slate-500">{`Изменение: ${formatPercent(record.change_percent)}`}</p>
      </div>
    );
  };

  return (
    <Card className="h-full border border-slate-200 bg-white shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">{title}</CardTitle>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 32, right: 24, bottom: 8, left: 12 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color.fill} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={color.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="year"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis hide domain={domain} />
              <Tooltip content={renderTooltip} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color.stroke}
                strokeWidth={3}
                fill={`url(#${gradientId})`}
                activeDot={{ r: 6, fill: '#ffffff', stroke: color.stroke, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {footer ? <div>{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
