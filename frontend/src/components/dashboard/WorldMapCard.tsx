import { useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { scaleLinear } from 'd3-scale';
import countries from 'i18n-iso-countries';
import type { LocaleData } from 'i18n-iso-countries';
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { Globe2 } from 'lucide-react';
import { feature } from 'topojson-client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

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

  const shareByCountry = useMemo(
    () => new Map(geography.map((item) => [item.country, item.share_percent])),
    [geography]
  );

  const maxShare = useMemo(
    () => (highlights.length ? Math.max(...highlights.map((item) => item.properties.share ?? 0)) : 0),
    [highlights]
  );

  const colorScale = useMemo(() => {
    const upper = maxShare || 0.4;
    return scaleLinear<string>().domain([0, upper]).range(['#f5f5f5', '#111111']);
  }, [maxShare]);

  const projection = useMemo(() => geoMercator().scale(120).translate([480 / 2, 280 / 1.75]), []);
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const sortedGeography = useMemo(
    () => [...geography].sort((a, b) => b.share_percent - a.share_percent).slice(0, 6),
    [geography]
  );

  const activeCountry = hovered ?? sortedGeography[0] ?? null;

  return (
    <Card className="border border-black bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900">
          <Globe2 className="h-6 w-6 text-slate-900" />
          География спроса
        </CardTitle>
        <p className="text-sm text-slate-600">
          Отобразите топ стран по доле импорта: наведите курсор на территорию или выберите страну из списка, чтобы
          увидеть долю и среднюю цену контракта.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="relative border border-black bg-white p-4">
          <svg viewBox="0 0 480 280" className="h-full w-full">
            <g className="fill-slate-100 stroke-slate-300 stroke-[0.3]">
              {WORLD_FEATURES.features.map((featureItem, index) => (
                <path
                  key={`world-default-${featureItem.id ?? index}`}
                  d={pathGenerator(featureItem as MapFeature) ?? undefined}
                  opacity={0.75}
                />
              ))}
            </g>
            <g className="cursor-pointer">
              {WORLD_FEATURES.features.map((featureItem, index) => {
                const name = featureItem.properties?.name as string | undefined;
                const share = name ? shareByCountry.get(name) ?? 0 : 0;
                const color = colorScale(Math.min(maxShare || 0.4, share));
                const mappedFeature = highlights.find((item) => item.id === featureItem.id);
                const isActive = activeCountry ? activeCountry.country === name : false;

                return (
                  <path
                    key={`highlight-${featureItem.id ?? index}`}
                    d={pathGenerator(mappedFeature ?? (featureItem as MapFeature)) ?? undefined}
                    fill={color}
                    stroke={isActive ? '#141414' : '#525252'}
                    strokeWidth={isActive ? 1.6 : 0.6}
                    opacity={activeCountry ? (isActive ? 1 : 0.25) : 0.85}
                    onMouseEnter={(event) => {
                      if (!name) {
                        return;
                      }
                      const share_percent = shareByCountry.get(name) ?? 0;
                      setHovered({ country: name, share_percent });
                      const svg = event.currentTarget.ownerSVGElement as SVGSVGElement;
                      const { left, top } = svg.getBoundingClientRect();
                      setTooltipPosition({
                        x: event.clientX - left,
                        y: event.clientY - top
                      });
                    }}
                    onMouseMove={(event) => {
                      const svg = event.currentTarget.ownerSVGElement as SVGSVGElement;
                      const { left, top } = svg.getBoundingClientRect();
                      setTooltipPosition({
                        x: event.clientX - left,
                        y: event.clientY - top
                      });
                    }}
                    onMouseLeave={() => {
                      setHovered(null);
                      setTooltipPosition(null);
                    }}
                  />
                );
              })}
            </g>
          </svg>
          {activeCountry ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">{activeCountry.country}</span>
              <span>Доля импорта: {formatPercent(activeCountry.share_percent)}</span>
              <span>
                Средняя цена:{' '}
                {priceMap.has(activeCountry.country) ? formatCurrency(priceMap.get(activeCountry.country) ?? 0) : '—'}
              </span>
            </div>
          ) : null}
          {activeCountry && tooltipPosition ? (
            <div
              className="pointer-events-none absolute rounded border border-black bg-white px-3 py-2 text-xs text-slate-700 shadow-sm"
              style={{ left: tooltipPosition.x + 12, top: tooltipPosition.y + 12 }}
            >
              <p className="font-semibold text-slate-900">{activeCountry.country}</p>
              <p>Доля импорта: {formatPercent(activeCountry.share_percent)}</p>
              <p>
                Средняя контрактная цена:{' '}
                {priceMap.has(activeCountry.country) ? formatCurrency(priceMap.get(activeCountry.country) ?? 0) : '—'}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Топ стран по доле импорта</p>
          <div className="space-y-2">
            {sortedGeography.map((item) => {
              const price = priceMap.get(item.country);
              const isActive = activeCountry?.country === item.country;
              return (
                <button
                  key={item.country}
                  type="button"
                  onMouseEnter={() => setHovered(item)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    'w-full border border-black px-4 py-3 text-left transition',
                    isActive ? 'bg-black/5' : 'bg-white hover:bg-black/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.country}</p>
                      <p className="text-xs text-slate-500">Доля импорта {formatPercent(item.share_percent)}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <span className="block text-slate-400">Контрактная цена</span>
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
      </CardContent>
    </Card>
  );
}
