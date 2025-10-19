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

const CODE_NAME_OVERRIDES: Record<string, string[]> = {
  BY: ['Беларусь', 'Белоруссия'],
  CN: ['Китай', 'КНР']
};

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

function getAlpha2FromFeature(featureItem: MapFeature): string | undefined {
  const rawId = featureItem.id;
  if (rawId !== undefined && rawId !== null) {
    const numeric = String(rawId).padStart(3, '0');
    const alpha3 = countries.numericToAlpha3?.(numeric);
    const alpha2 = alpha3 ? countries.alpha3ToAlpha2?.(alpha3) : undefined;
    if (alpha2) {
      return alpha2.toUpperCase();
    }
  }

  const englishName = featureItem.properties?.name;
  if (typeof englishName === 'string') {
    const alpha2FromName = countries.getAlpha2Code(englishName, 'en');
    if (alpha2FromName) {
      return alpha2FromName.toUpperCase();
    }
  }

  return undefined;
}

const fallbackMatchByNames = (
  name: string | undefined,
  geographyByName: Map<string, GeographyItem>,
  geographyByNameLower: Map<string, GeographyItem>
): GeographyItem | undefined => {
  if (!name) {
    return undefined;
  }
  return geographyByName.get(name) ?? geographyByNameLower.get(name.toLowerCase());
};

function resolveAlpha2(country: string | undefined | null, countryCode?: string | null): string | undefined {
  if (countryCode && countryCode.length === 2) {
    return countryCode.toUpperCase();
  }
  if (!country) {
    return undefined;
  }
  const alpha2 = countries.getAlpha2Code(country, 'ru') ?? countries.getAlpha2Code(country, 'en');
  return alpha2 ? alpha2.toUpperCase() : undefined;
}

export function WorldMapCard({ geography, prices }: WorldMapCardProps) {
  const [hovered, setHovered] = useState<GeographyItem | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const normalizedGeography = useMemo(() => {
    return geography.map((item) => ({
      ...item,
      country_code: item.country_code ? item.country_code.toUpperCase() : item.country_code
    }));
  }, [geography]);

  const normalizedPrices = useMemo(() => {
    return prices.map((item) => ({
      ...item,
      country_code: item.country_code ? item.country_code.toUpperCase() : item.country_code
    }));
  }, [prices]);

  const priceByCode = useMemo(() => {
    const map = new Map<string, number>();
    normalizedPrices.forEach((item) => {
      if (item.country_code) {
        map.set(item.country_code, item.price_usd);
      }
    });
    return map;
  }, [normalizedPrices]);

  const priceByName = useMemo(() => {
    const map = new Map<string, number>();
    normalizedPrices.forEach((item) => {
      map.set(item.country, item.price_usd);
    });
    return map;
  }, [normalizedPrices]);

  const geographyByCode = useMemo(() => {
    const map = new Map<string, GeographyItem>();
    normalizedGeography.forEach((item) => {
      if (item.country_code) {
        map.set(item.country_code, item);
      }
    });
    return map;
  }, [normalizedGeography]);

  const geographyByName = useMemo(() => {
    const map = new Map<string, GeographyItem>();
    normalizedGeography.forEach((item) => {
      map.set(item.country, item);
    });
    return map;
  }, [normalizedGeography]);

  const geographyByNameLower = useMemo(() => {
    const map = new Map<string, GeographyItem>();
    normalizedGeography.forEach((item) => {
      map.set(item.country.toLowerCase(), item);
    });
    return map;
  }, [normalizedGeography]);

  const maxShare = useMemo(
    () => (normalizedGeography.length ? Math.max(...normalizedGeography.map((item) => item.share_percent)) : 0),
    [normalizedGeography]
  );

  const upperShare = maxShare > 0 ? maxShare : 1;

  const colorScale = useMemo(
    () => scaleLinear<string>().domain([0, upperShare]).range(['#ffffff', '#000000']).clamp(true),
    [upperShare]
  );

  const projection = useMemo(() => geoMercator().scale(120).translate([480 / 2, 280 / 1.75]), []);
  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const sortedGeography = useMemo(
    () => [...normalizedGeography].sort((a, b) => b.share_percent - a.share_percent).slice(0, 6),
    [normalizedGeography]
  );

  const activeCountry = hovered;
  const activeCountryCode = activeCountry?.country_code ?? (activeCountry ? resolveAlpha2(activeCountry.country) : undefined);

  const findEntryByCode = (code?: string | null): GeographyItem | undefined => {
    if (!code) {
      return undefined;
    }
    const upper = code.toUpperCase();
    const direct = geographyByCode.get(upper);
    if (direct) {
      return direct;
    }

    const overrides = CODE_NAME_OVERRIDES[upper];
    if (overrides) {
      for (const name of overrides) {
        const candidate = fallbackMatchByNames(name, geographyByName, geographyByNameLower);
        if (candidate) {
          return candidate;
        }
      }
    }

    const ruName = countries.getName(upper, 'ru');
    const ruMatch = fallbackMatchByNames(ruName, geographyByName, geographyByNameLower);
    if (ruMatch) {
      return ruMatch;
    }

    const enName = countries.getName(upper, 'en');
    return fallbackMatchByNames(enName, geographyByName, geographyByNameLower);
  };

  const findEntryForFeature = (featureItem: MapFeature): GeographyItem | undefined => {
    const code = getAlpha2FromFeature(featureItem);
    let entry = findEntryByCode(code);
    if (entry) {
      return entry;
    }

    const englishName = featureItem.properties?.name;
    entry = fallbackMatchByNames(englishName, geographyByName, geographyByNameLower);
    if (entry) {
      return entry;
    }

    if (typeof englishName === 'string') {
      const alpha2 = countries.getAlpha2Code(englishName, 'en');
      if (alpha2) {
        entry = findEntryByCode(alpha2.toUpperCase());
        if (entry) {
          return entry;
        }
      }
    }

    return undefined;
  };

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
                const mapFeature = featureItem as MapFeature;
                const geographyEntry = findEntryForFeature(mapFeature);
                const share = geographyEntry?.share_percent ?? 0;

                const baseFill = share > 0 ? colorScale(Math.min(upperShare, share)) : '#f5f5f5';
                const hasHover = Boolean(activeCountry);

                const entryCode = geographyEntry?.country_code ?? resolveAlpha2(geographyEntry?.country ?? '');
                const isActive = Boolean(
                  hasHover &&
                    geographyEntry &&
                    ((activeCountryCode && entryCode && activeCountryCode === entryCode) ||
                      (!activeCountryCode && activeCountry?.country === geographyEntry.country))
                );

                const fill = hasHover ? (isActive ? '#000000' : '#ffffff') : baseFill;
                const strokeColor = hasHover ? (isActive ? '#000000' : '#d4d4d8') : '#525252';
                const strokeWidth = hasHover && isActive ? 1.6 : 0.6;
                const opacity = hasHover ? (isActive ? 1 : 0.35) : share > 0 ? 0.9 : 0.55;

                return (
                  <path
                    key={`highlight-${featureItem.id ?? index}`}
                    d={pathGenerator(mapFeature) ?? undefined}
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
              <p className="font-semibold text-slate-900">{activeCountry.country}</p>
              <p>Доля импорта: {formatPercent(activeCountry.share_percent)}</p>

              <p>
              Суммарно:{' '}

                {(() => {
                  const priceValue =
                    (activeCountry.country_code && priceByCode.get(activeCountry.country_code)) ??
                    priceByName.get(activeCountry.country);
                  return typeof priceValue === 'number' ? formatCurrency(priceValue) : '-';
                })()}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Топ стран по доле импорта</p>
          <div className="space-y-2">
            {sortedGeography.map((item) => {
              const price = (item.country_code && priceByCode.get(item.country_code)) ?? priceByName.get(item.country);
              const isActive = Boolean(
                activeCountry &&
                  ((activeCountryCode && item.country_code && activeCountryCode === item.country_code) ||
                    (!activeCountryCode && activeCountry.country === item.country))
              );

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
                        {item.country}
                      </p>
                      <p className={cn('text-xs', isActive ? 'text-white/80' : 'text-slate-500')}>
                        Импортная доля {formatPercent(item.share_percent)}
                      </p>
                    </div>
                    <div className={cn('text-right text-xs', isActive ? 'text-white/80' : 'text-slate-500')}>
                      <span className={cn('block', isActive ? 'text-white/60' : 'text-slate-400')}>Суммарно</span>
                      <span className={cn('font-semibold', isActive ? 'text-white' : 'text-slate-800')}>
                        {typeof price === 'number' ? formatCurrency(price) : 'вЂ”'}
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



