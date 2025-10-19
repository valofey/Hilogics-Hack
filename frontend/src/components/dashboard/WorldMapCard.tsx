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
  code?: string; // ISO alpha-2
};

type MapFeature = Feature<Geometry, MapProperties>;

function buildFeatureCollection(): FeatureCollection<Geometry, MapProperties> {
  const topo = worldData as unknown as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return feature(topo as any, (topo as any).objects.countries) as unknown as FeatureCollection<Geometry, MapProperties>;
}

const WORLD_FEATURES = buildFeatureCollection();
const FEATURE_MAP = new Map<string, MapFeature>(WORLD_FEATURES.features.map((item) => [String(item.id), item]));

function getNumericFromAlpha2(alpha2?: string | null): string | undefined {
  if (!alpha2) return undefined;
  const codes = countries.getNumericCodes() as Record<string, string>;
  return codes[alpha2.toUpperCase()];
}

function resolveAlpha2(country: string, country_code?: string): string | undefined {
  if (country_code && country_code.length === 2) return country_code.toUpperCase();
  const a2 = countries.getAlpha2Code(country, 'ru') ?? countries.getAlpha2Code(country, 'en');
  return a2 ?? undefined;
}

export function WorldMapCard({ geography, prices }: WorldMapCardProps) {
  const [hovered, setHovered] = useState<GeographyItem | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Use ISO alpha-2 codes as the canonical key
  const priceMap = useMemo(() => {
    return new Map(
      prices.map((entry) => {
        const a2 = resolveAlpha2(entry.country, entry.country_code);
        const key = a2 ? a2.toUpperCase() : entry.country;
        return [key, entry.price_usd];
      })
    );
  }, [prices]);

  const highlights = useMemo(() => {
    return geography
      .map((item) => {
        const alpha2 = resolveAlpha2(item.country, item.country_code);
        const numeric = getNumericFromAlpha2(alpha2);
        if (!numeric) return null;
        const base = FEATURE_MAP.get(String(Number(numeric)));
        if (!base) return null;
        const localizedName = alpha2 ? countries.getName(alpha2, 'ru') ?? item.country : item.country;
        const properties: MapProperties = {
          ...(base.properties ?? {}),
          name: localizedName,
          code: alpha2,
          share: item.share_percent
        };
        return { ...base, properties } as MapFeature;
      })
      .filter((featureItem): featureItem is MapFeature => Boolean(featureItem));
  }, [geography]);

  const highlightMap = useMemo(() => new Map(highlights.map((f) => [String(f.id), f])), [highlights]);

  const geographyByCode = useMemo(() => {
    const m = new Map<string, GeographyItem>();
    geography.forEach((item) => {
      const a2 = resolveAlpha2(item.country, item.country_code);
      if (a2) m.set(a2.toUpperCase(), item);
    });
    return m;
  }, [geography]);

  const maxShare = useMemo(
    () => (geography.length ? Math.max(...geography.map((item) => item.share_percent)) : 0),
    [geography]
  );

  const upperShare = maxShare > 0 ? maxShare : 1;

  const colorScale = useMemo(
    () => scaleLinear<string>().domain([0, upperShare]).range(['#ffffff', '#000000']).clamp(true),
    [upperShare]
  );

  const projection = useMemo(() => geoMercator().scale(120).translate([480 / 2, 280 / 1.75]), []);
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const sortedGeography = useMemo(
    () => [...geography].sort((a, b) => b.share_percent - a.share_percent).slice(0, 6),
    [geography]
  );

  const activeCountry = hovered;

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
                const idKey = String(featureItem.id ?? index);
                const mappedFeature = highlightMap.get(idKey);
                const code = (mappedFeature?.properties?.code ?? '').toUpperCase();
                const geographyEntry = code ? geographyByCode.get(code) : undefined;
                const share = geographyEntry?.share_percent ?? 0;
                const geometryTarget = mappedFeature ?? (featureItem as MapFeature);
                const baseFill = colorScale(Math.min(upperShare, share));
                const hasHover = Boolean(activeCountry);
                const isActive = Boolean(
                  hasHover && geographyEntry && (activeCountry?.country_code?.toUpperCase?.() ?? '') === code
                );
                const fill = hasHover ? (isActive ? '#000000' : '#ffffff') : baseFill;
                const strokeColor = hasHover ? (isActive ? '#000000' : '#d4d4d8') : '#525252';
                const strokeWidth = hasHover ? (isActive ? 1.6 : 0.5) : 0.6;
                const opacity = hasHover ? 1 : share > 0 ? 0.95 : 0.5;

                return (
                  <path
                    key={`highlight-${featureItem.id ?? index}`}
                    d={pathGenerator(geometryTarget) ?? undefined}
                    fill={fill}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                    onMouseEnter={(event) => {
                      if (!geographyEntry) {
                        return;
                      }
                      setHovered(geographyEntry);
                      const svg = event.currentTarget.ownerSVGElement as SVGSVGElement;
                      const { left, top } = svg.getBoundingClientRect();
                      setTooltipPosition({
                        x: event.clientX - left,
                        y: event.clientY - top
                      });
                    }}
                    onMouseMove={(event) => {
                      if (!geographyEntry) {
                        return;
                      }
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
          {activeCountry && tooltipPosition ? (
            <div
              className="pointer-events-none absolute rounded border border-black bg-white px-3 py-2 text-xs text-slate-700 shadow-sm"
              style={{ left: tooltipPosition.x + 12, top: tooltipPosition.y + 12 }}
            >
              <p className="font-semibold text-slate-900">
                {activeCountry.country_code ? countries.getName(activeCountry.country_code, 'ru') ?? activeCountry.country : activeCountry.country}
              </p>
              <p>Доля импорта: {formatPercent(activeCountry.share_percent)}</p>
              <p>
                Средняя контрактная цена:{' '}
                {priceMap.has((activeCountry.country_code ?? '').toUpperCase())
                  ? formatCurrency(priceMap.get((activeCountry.country_code ?? '').toUpperCase()) ?? 0)
                  : '—'}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Топ стран по доле импорта</p>
          <div className="space-y-2">
            {sortedGeography.map((item) => {
              const codeKey = (item.country_code ?? '').toUpperCase();
              const price = priceMap.get(codeKey);
              const isActive = (activeCountry?.country_code ?? '').toUpperCase() === codeKey;
              return (
                <button
                  key={item.country}
                  type="button"
                  onMouseEnter={() => setHovered(item)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(item)}
                  onBlur={() => setHovered(null)}
                  className={cn(
                    'w-full border border-black px-4 py-3 text-left transition focus:outline-none',
                    isActive ? 'bg-black text-white' : 'bg-white hover:bg-black/5'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={cn('text-sm font-semibold', isActive ? 'text-white' : 'text-slate-900')}>
                        {item.country_code ? countries.getName(item.country_code, 'ru') ?? item.country : item.country}
                      </p>
                      <p className={cn('text-xs', isActive ? 'text-white/80' : 'text-slate-500')}>Импортная доля {formatPercent(item.share_percent)}</p>
                    </div>
                    <div className={cn('text-right text-xs', isActive ? 'text-white/80' : 'text-slate-500')}>
                      <span className={cn('block', isActive ? 'text-white/60' : 'text-slate-400')}>Контрактная цена</span>
                      <span className={cn('font-semibold', isActive ? 'text-white' : 'text-slate-800')}>
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
