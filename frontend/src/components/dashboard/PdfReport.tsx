import { geoMercator, geoPath } from 'd3-geo';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import countries from 'i18n-iso-countries';
import type { LocaleData } from 'i18n-iso-countries';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { feature } from 'topojson-client';

import type { DashboardData, GeographyItem } from '@/types/dashboard';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/number';

import worldData from 'world-atlas/countries-110m.json';
import ruLocale from 'i18n-iso-countries/langs/ru.json';
import enLocale from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(ruLocale as LocaleData);
countries.registerLocale(enLocale as LocaleData);

type PdfReportProps = {
  data: DashboardData;
  qrCode?: string | null;
  generatedAt?: string;
};

type MapProperties = GeoJsonProperties & {
  name?: string;
  share?: number;
};

type MapFeature = Feature<Geometry, MapProperties>;

const PDF_WIDTH = 794;
const PDF_HEIGHT = 1123;

function buildFeatureCollection(): FeatureCollection<Geometry, MapProperties> {
  const topo = worldData as unknown as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return feature(topo as any, (topo as any).objects.countries) as unknown as FeatureCollection<Geometry, MapProperties>;
}

const WORLD_FEATURES = buildFeatureCollection();
const FEATURE_MAP = new Map<string, MapFeature>(WORLD_FEATURES.features.map((item) => [String(item.id), item]));

function getNumericCountryCode(name: string): string | undefined {
  const alpha2 = countries.getAlpha2Code(name, 'ru') ?? countries.getAlpha2Code(name, 'en');
  if (!alpha2) {
    return undefined;
  }
  const codes = countries.getNumericCodes() as Record<string, string>;
  return codes[alpha2.toUpperCase()];
}

function buildMapFeatures(geography: GeographyItem[]) {
  return geography
    .map((item) => {
      const numeric = getNumericCountryCode(item.country);
      if (!numeric) {
        return null;
      }
      const base = FEATURE_MAP.get(String(Number(numeric)));
      if (!base) {
        return null;
      }
      return {
        ...base,
        properties: {
          ...(base.properties ?? {}),
          name: item.country,
          share: item.share_percent
        }
      } as MapFeature;
    })
    .filter((featureItem): featureItem is MapFeature => Boolean(featureItem));
}

export function PdfReport({ data, qrCode, generatedAt }: PdfReportProps) {
  const { product, tariffs, metrics, geography, prices, recommendations, organization, share_url } = data;
  const priceLookup = new Map(prices.map((item) => [item.country, item.price_usd]));
  const generatedDate = generatedAt ? new Date(generatedAt) : new Date();

  const mapFeatures = buildMapFeatures(geography);
  const maxShare = mapFeatures.length
    ? Math.max(...mapFeatures.map((featureItem) => featureItem.properties.share ?? 0))
    : 0;
  const projection = geoMercator().scale(95).translate([360 / 2, 220 / 1.65]);
  const pathGenerator = geoPath(projection);
  const colorScale = scaleSequential(interpolateBlues).domain([0, maxShare || 0.4]);

  const topCountries = [...geography].sort((a, b) => b.share_percent - a.share_percent).slice(0, 6);
  const formattedTimestamp = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(generatedDate);

  return (
    <div
      className="text-slate-900"
      style={{
        width: `${PDF_WIDTH}px`
      }}
    >
      <div
        style={{
          width: '100%',
          minHeight: `${PDF_HEIGHT}px`,
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          backgroundColor: '#ffffff',
          pageBreakAfter: 'always'
        }}
      >
        <header className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">MOSPROM REPORT</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight">
              {product.name} · {product.code}
            </h1>
            <p className="mt-2 text-sm text-slate-600">Организация: {organization.name}</p>
            {organization.inn ? <p className="text-xs text-slate-500">ИНН: {organization.inn}</p> : null}
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">Сформировано: {formattedTimestamp}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            {qrCode ? <img src={qrCode} alt="QR code" className="h-28 w-28 rounded border border-slate-200" /> : null}
            <p className="max-w-[200px] text-xs text-slate-500">
              Просмотрите отчёт онлайн по ссылке: {share_url}
            </p>
          </div>
        </header>

        <section
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
          }}
        >
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Наименование товара</p>
            <p className="mt-2 text-lg font-semibold">{product.name}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Код ТН ВЭД</p>
            <p className="mt-2 text-lg font-semibold">{product.code}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Текущая ставка</p>
            <p className="mt-1 text-2xl font-semibold">{formatPercent(tariffs.current)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Обязательство ВТО</p>
            <p className="mt-1 text-2xl font-semibold">{formatPercent(tariffs.wto_obligation)}</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Динамика показателей</h2>
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>
                <th className="p-2 font-medium text-slate-600">Показатель</th>
                {metrics.import_data.map((point) => (
                  <th key={point.year} className="p-2 font-medium text-slate-600">
                    {point.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Импорт', data: metrics.import_data },
                { label: 'Производство', data: metrics.production },
                { label: 'Потребление', data: metrics.consumption }
              ].map((metricRow) => (
                <tr key={metricRow.label} className="border-b border-slate-200">
                  <td className="p-2 font-medium text-slate-700">{metricRow.label}</td>
                  {metricRow.data.map((point) => (
                    <td key={point.year} className="p-2 text-slate-600">
                      <div className="font-semibold text-slate-900">{formatNumber(point.value)}</div>
                      <div className="text-xs text-slate-500">Δ {formatPercent(point.change_percent)}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 p-4">
            <h2 className="text-lg font-semibold">Карта импорта</h2>
            <p className="mt-1 text-xs text-slate-500">
              Чем интенсивнее оттенок, тем выше доля страны в поставках. Отображены данные за последний доступный период.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <svg viewBox="0 0 360 220" className="h-[220px] w-full">
                <defs>
                  <linearGradient id="pdf-map-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#dbeafe" />
                    <stop offset="100%" stopColor="#bfdbfe" />
                  </linearGradient>
                </defs>
                <rect x={0} y={0} width={360} height={220} fill="url(#pdf-map-gradient)" rx={20} />
                <g>
                  {WORLD_FEATURES.features.map((featureItem) => (
                    <path
                      key={`world-base-${featureItem.id}`}
                      d={pathGenerator(featureItem as MapFeature) ?? undefined}
                      fill="#e2e8f0"
                      stroke="#cbd5f5"
                      strokeWidth={0.4}
                    />
                  ))}
                </g>
                <g>
                  {mapFeatures.map((featureItem) => {
                    const share = featureItem.properties.share ?? 0;
                    const fill = colorScale(share) ?? '#1d4ed8';
                    return (
                      <path
                        key={`highlight-${featureItem.id}`}
                        d={pathGenerator(featureItem) ?? undefined}
                        fill={fill}
                        stroke="#1d4ed8"
                        strokeWidth={0.8}
                        opacity={0.95}
                      />
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <h2 className="text-lg font-semibold">Лидирующие страны</h2>
            <div className="mt-4 space-y-3 text-sm">
              {topCountries.map((item) => {
                const price = priceLookup.get(item.country);
                return (
                  <div key={item.country} className="rounded-xl border border-slate-200 bg-white/80 p-3">
                    <p className="font-semibold text-slate-900">{item.country}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Доля: {formatPercent(item.share_percent)}</span>
                      <span>СКЦ: {price ? formatCurrency(price) : '—'}</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-sky-400"
                        style={{ width: `${Math.min(item.share_percent * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      <div
        style={{
          width: '100%',
          minHeight: `${PDF_HEIGHT}px`,
          padding: '48px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          backgroundColor: '#ffffff'
        }}
      >
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Рекомендации по мерам поддержки</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {recommendations.map((item, index) => (
              <div key={`${item.name}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
          <p className="text-xs uppercase tracking-wide text-slate-500">Комментарии MOSPROM</p>
          <p className="mt-2 leading-relaxed">
            Отчёт сформирован автоматически по данным об импорте, производстве и обязательствам Российской Федерации в
            ВТО. Для получения индивидуальных рекомендаций и согласования мер поддержки обратитесь к ответственному
            эксперту MOSPROM.
          </p>
        </section>
      </div>
    </div>
  );
}
