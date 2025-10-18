import { useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { scaleSequential } from 'd3-scale';
import { interpolateBlues } from 'd3-scale-chromatic';
import countries from 'i18n-iso-countries';
import type { LocaleData } from 'i18n-iso-countries';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { Globe2 } from 'lucide-react';
import { feature } from 'topojson-client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ContractPriceItem, GeographyItem } from '@/types/dashboard';
import { formatCurrency, formatPercent } from '@/lib/number';

import worldData from 'world-atlas/countries-110m.json';
import ruLocale from 'i18n-iso-countries/langs/ru.json';
import enLocale from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(ruLocale as LocaleData);
countries.registerLocale(enLocale as LocaleData);

type WorldMapCardProps = {
  geography: GeographyItem[];
  prices: ContractPriceItem[];
};

type MapProperties = GeoJsonProperties & {
  name?: string;
  share?: number;
};

type MapFeature = Feature<Geometry, MapProperties>;

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

export function WorldMapCard({ geography, prices }: WorldMapCardProps) {
  const [hovered, setHovered] = useState<GeographyItem | null>(null);

  const priceMap = useMemo(() => new Map(prices.map((entry) => [entry.country, entry.price_usd])), [prices]);

  const highlights = useMemo(() => {
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
        const properties: MapProperties = {
          ...(base.properties ?? {}),
          name: item.country,
          share: item.share_percent
        };
        return {
          ...base,
          properties
        } as MapFeature;
      })
      .filter((featureItem): featureItem is MapFeature => Boolean(featureItem));
  }, [geography]);

  const maxShare = useMemo(
    () => (highlights.length ? Math.max(...highlights.map((item) => item.properties.share ?? 0)) : 0),
    [highlights]
  );

  const colorScale = useMemo(() => {
    const upper = maxShare || 0.4;
    return scaleSequential(interpolateBlues).domain([0, upper]);
  }, [maxShare]);

  const projection = useMemo(() => geoMercator().scale(120).translate([480 / 2, 280 / 1.75]), []);
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const sortedGeography = useMemo(
    () => [...geography].sort((a, b) => b.share_percent - a.share_percent).slice(0, 5),
    [geography]
  );

  const activeCountry = hovered ?? (sortedGeography.length ? sortedGeography[0] : null);
  const activePrice = activeCountry ? priceMap.get(activeCountry.country) ?? null : null;

  return (
    <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-white" />
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900">
          <Globe2 className="h-6 w-6 text-sky-500" />
          География импорта
        </CardTitle>
        <p className="text-sm text-slate-600">
          Интенсивность оттенка показывает долю страны в структуре импорта. Наведите курсор, чтобы увидеть подробности.
        </p>
      </CardHeader>
      <CardContent className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="relative rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-inner">
          <svg viewBox="0 0 480 280" className="h-full w-full">
            <defs>
              <filter id="highlight-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="rgba(15,23,42,0.25)" />
              </filter>
            </defs>
            <g>
              {WORLD_FEATURES.features.map((featureItem, index) => (
                <path
                  key={`world-default-${featureItem.id ?? index}`}
                  d={pathGenerator(featureItem as MapFeature) ?? undefined}
                  fill="#e2e8f0"
                  stroke="#cbd5f5"
                  strokeWidth={0.4}
                  opacity={0.6}
                />
              ))}
            </g>
            <g>
              {highlights.map((featureItem, index) => {
                const share = featureItem.properties.share ?? 0;
                const fillColor = colorScale(share) ?? '#1d4ed8';
                return (
                  <path
                    key={`highlight-${featureItem.id ?? index}`}
                    d={pathGenerator(featureItem) ?? undefined}
                    fill={fillColor}
                    stroke="#1d4ed8"
                    strokeWidth={1.2}
                    filter="url(#highlight-shadow)"
                    opacity={hovered ? (hovered.country === featureItem.properties.name ? 1 : 0.45) : 0.95}
                    onMouseEnter={() =>
                      featureItem.properties.name
                        ? setHovered({
                            country: featureItem.properties.name,
                            share_percent: featureItem.properties.share ?? 0
                          })
                        : undefined
                    }
                    onMouseLeave={() => setHovered(null)}
                  />
                );
              })}
            </g>
          </svg>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Лидирующие страны</p>
            <div className="mt-3 space-y-3">
              {sortedGeography.map((item) => {
                const price = priceMap.get(item.country);
                const isActive = hovered?.country === item.country;
                return (
                  <button
                    key={item.country}
                    type="button"
                    onMouseEnter={() => setHovered(item)}
                    onMouseLeave={() => setHovered(null)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-sky-200 bg-sky-50 shadow'
                        : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.country}</p>
                        <p className="text-xs text-slate-500">Доля {formatPercent(item.share_percent)}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <span className="block text-slate-400">СКЦ</span>
                        <span className="font-semibold text-slate-800">
                          {price ? formatCurrency(price) : '—'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {activeCountry ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-slate-800 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-sky-600">Детали страны</p>
              <p className="mt-1 text-lg font-semibold">{activeCountry.country}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Доля импорта</dt>
                  <dd className="font-medium">{formatPercent(activeCountry.share_percent)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Средняя цена</dt>
                  <dd className="font-medium">{activePrice ? formatCurrency(activePrice) : '—'}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
