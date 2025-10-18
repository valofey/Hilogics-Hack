from dataclasses import dataclass
from enum import IntEnum
from typing import Dict, List, Optional, Tuple

from models.source import SourceData


class Measure(IntEnum):
    MEASURE_1 = 1
    MEASURE_2 = 2
    MEASURE_3 = 3
    MEASURE_4 = 4
    MEASURE_5 = 5
    MEASURE_6 = 6

    @property
    def description(self) -> str:
        return _MEASURE_DESCRIPTIONS[self]


_MEASURE_DESCRIPTIONS: Dict[Measure, str] = {
    Measure.MEASURE_1: "Мера 1: Повышение ставки таможенного тарифа",
    Measure.MEASURE_2: "Мера 2: Запрет импорта из недружественных стран",
    Measure.MEASURE_3: "Мера 3: Антидемпинговое расследование в отношении топ-1 поставщика",
    Measure.MEASURE_4: "Мера 4: Запрет на допуск товара из НС для целей осуществления госзакупок",
    Measure.MEASURE_5: "Мера 5: Введение обязательной сертификации",
    Measure.MEASURE_6: "Мера 6: Дополнительные меры не требуются",
}


@dataclass
class CountryImportData:
    country_name: str
    is_friendly: bool
    import_value: float
    import_volume: float

    @property
    def average_contract_price(self) -> float:
        if self.import_volume == 0:
            return 0
        return self.import_value / self.import_volume


@dataclass
class PeriodData:
    period_name: str
    imports: List[CountryImportData]

    @property
    def total_import_value(self) -> float:
        return sum(imp.import_value for imp in self.imports)

    @property
    def unfriendly_import_value(self) -> float:
        return sum(imp.import_value for imp in self.imports if not imp.is_friendly)

    @property
    def unfriendly_share(self) -> float:
        total = self.total_import_value
        if total == 0:
            return 0
        return (self.unfriendly_import_value / total) * 100

    def get_top_supplier(self) -> Optional[CountryImportData]:
        if not self.imports:
            return None
        return max(self.imports, key=lambda x: x.import_value)

    def get_average_price_excluding(self, exclude_country: str) -> float:
        other_countries = [imp for imp in self.imports if imp.country_name != exclude_country]
        if not other_countries:
            return 0

        total_value = sum(imp.import_value for imp in other_countries)
        total_volume = sum(imp.import_volume for imp in other_countries)

        if total_volume == 0:
            return 0
        return total_value / total_volume


@dataclass
class ProductionConsumptionData:
    production: float
    consumption: float
    production_previous: Optional[float] = None

    @property
    def is_production_sufficient(self) -> bool:
        return self.production >= self.consumption

    @property
    def is_production_growing(self) -> bool:
        if self.production_previous is None:
            return False
        return self.production > self.production_previous

    @property
    def is_production_declining(self) -> bool:
        if self.production_previous is None:
            return False
        return self.production < self.production_previous


@dataclass
class TariffData:
    applied_tariff: float
    wto_maximum_tariff: float

    @property
    def has_tariff_increase_potential(self) -> bool:
        return self.wto_maximum_tariff > self.applied_tariff


@dataclass
class NonTariffData:
    in_government_procurement_list: bool
    has_certification_requirement: bool
    in_minpromtorg_exception_list: bool


@dataclass
class AnalysisInput:
    hs_code: str
    previous_period: PeriodData
    current_period: PeriodData
    production_consumption: ProductionConsumptionData
    tariff_data: TariffData
    non_tariff_data: Optional[NonTariffData] = None

    @property
    def is_total_import_growing(self) -> bool:
        return self.current_period.total_import_value > self.previous_period.total_import_value

    @property
    def unfriendly_share_declining(self) -> bool:
        return self.current_period.unfriendly_share < self.previous_period.unfriendly_share


class TradeAnalyzer:
    def __init__(self, data: AnalysisInput):
        self.data = data
        self.analysis_steps: List[str] = []

    def log_step(self, step: str):
        self.analysis_steps.append(step)

    def analyze(self) -> Tuple[List[Measure], List[str]]:
        self.analysis_steps = []
        self.recommended_measures: List[Measure] = []

        unfriendly_share_current = self.data.current_period.unfriendly_share
        self.log_step(f"Доля НС в текущем периоде: {unfriendly_share_current:.2f}%")

        unfriendly_prev = self.data.previous_period.unfriendly_import_value
        unfriendly_curr = self.data.current_period.unfriendly_import_value
        unfriendly_growing = unfriendly_curr >= unfriendly_prev

        self.log_step(f"Импорт из НС в предыдущем периоде: {unfriendly_prev:.2f}")
        self.log_step(f"Импорт из НС в текущем периоде: {unfriendly_curr:.2f}")
        self.log_step(f"Импорт из НС растет или не падает: {unfriendly_growing}")

        if unfriendly_share_current >= 30 and unfriendly_growing:
            self._analyze_high_unfriendly_share()
        elif unfriendly_share_current < 30:
            self._analyze_low_unfriendly_share()
        else:
            self.log_step("Доля НС >= 30%, но импорт из НС падает → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)

        return self.recommended_measures, self.analysis_steps

    def _analyze_high_unfriendly_share(self):
        self.log_step("Сценарий высокой доли НС (>= 30%) и не снижающегося импорта")

        is_sufficient = self.data.production_consumption.is_production_sufficient
        self.log_step(f"Производство >= потребления: {is_sufficient}")

        if is_sufficient:
            self.log_step("Производство достаточно → Мера 2")
            self.recommended_measures.append(Measure.MEASURE_2)

            if self.data.non_tariff_data:
                self.log_step("Дополнительная проверка нетарифных мер совместно с Мерой 2")
                self._analyze_non_tariff_measures()
        else:
            self.log_step("Производство недостаточно → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)

    def _analyze_low_unfriendly_share(self):
        self.log_step("Сценарий низкой доли НС (< 30%)")

        has_potential = self.data.tariff_data.has_tariff_increase_potential
        is_sufficient = self.data.production_consumption.is_production_sufficient

        self.log_step(f"Потенциал повышения тарифа: {has_potential}")
        self.log_step(f"Производство >= потребления: {is_sufficient}")

        if has_potential and is_sufficient:
            declining = self.data.unfriendly_share_declining
            self.log_step(f"Доля НС снижается: {declining}")
            self.log_step("Условия для Меры 1 выполнены → Мера 1")
            self.recommended_measures.append(Measure.MEASURE_1)

        if has_potential and not is_sufficient:
            self.log_step("Потенциал есть, но производство недостаточно → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)

        if not has_potential and not is_sufficient:
            self.log_step("Потенциала нет и производство недостаточно → анализ ценовой динамики")
            self._analyze_top_supplier_pricing()

        if not has_potential and is_sufficient:
            self.log_step("Потенциала нет, но производство достаточно → нетарифные меры")
            self._analyze_non_tariff_measures()

        if has_potential and is_sufficient and self.data.non_tariff_data:
            self.log_step("Дополнительная проверка нетарифных мер совместно с Мерой 1")
            self._analyze_non_tariff_measures()

    def _analyze_top_supplier_pricing(self):
        self.log_step("Анализ топ-1 поставщика")

        top_prev = self.data.previous_period.get_top_supplier()
        top_curr = self.data.current_period.get_top_supplier()

        if not top_curr:
            self.log_step("Нет данных о текущем топ-1 → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return

        import_growing = False
        if top_prev and top_prev.country_name == top_curr.country_name:
            import_growing = top_curr.import_value > top_prev.import_value
            self.log_step(f"Импорт топ-1 в предыдущем периоде: {top_prev.import_value:.2f}")
            self.log_step(f"Импорт топ-1 в текущем периоде: {top_curr.import_value:.2f}")
        else:
            import_growing = True
            self.log_step("Топ-1 поставщик сменился → считаем, что импорт растет")

        self.log_step(f"Импорт топ-1 растет: {import_growing}")

        if not import_growing:
            self.log_step("Импорт топ-1 не растет → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return

        top1_price = top_curr.average_contract_price
        avg_other_price = self.data.current_period.get_average_price_excluding(top_curr.country_name)

        self.log_step(f"СКЦ топ-1: {top1_price:.2f}")
        self.log_step(f"СКЦ других стран: {avg_other_price:.2f}")

        if top1_price < avg_other_price:
            self.log_step("СКЦ топ-1 ниже → Мера 3")
            self.recommended_measures.append(Measure.MEASURE_3)
        else:
            self.log_step("СКЦ топ-1 не ниже → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)

    def _analyze_non_tariff_measures(self):
        self.log_step("Анализ потенциала нетарифных мер")

        is_sufficient = self.data.production_consumption.is_production_sufficient
        self.log_step(f"Производство >= потребления: {is_sufficient}")

        if not is_sufficient:
            self.log_step("Производство недостаточно → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return

        if not self.data.non_tariff_data:
            self.log_step("Нет данных для нетарифного анализа → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return

        nt_data = self.data.non_tariff_data

        if nt_data.in_government_procurement_list:
            self.log_step("Товар уже в списке госзакупок → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
        else:
            self.log_step("Товар вне списка госзакупок → Мера 4")
            self.recommended_measures.append(Measure.MEASURE_4)

        has_cert = nt_data.has_certification_requirement
        not_in_exception = not nt_data.in_minpromtorg_exception_list
        import_growing = self.data.is_total_import_growing
        production_growing = self.data.production_consumption.is_production_growing

        self.log_step(
            "Требование сертификации: "
            f"{'Да' if has_cert else 'Нет'}, "
            f"Не в списке исключений: {'Да' if not_in_exception else 'Нет'}, "
            f"Импорт растет: {'Да' if import_growing else 'Нет'}, "
            f"Производство растет: {'Да' if production_growing else 'Нет'}"
        )

        if has_cert and not_in_exception and import_growing and production_growing:
            self.log_step("Все условия выполнены → Мера 5")
            self.recommended_measures.append(Measure.MEASURE_5)
        elif has_cert and not_in_exception:
            self.log_step("Условия частично выполнены → Мера 5 (условно)")
            self.recommended_measures.append(Measure.MEASURE_5)


def _parse_bool(value: Optional[object]) -> Optional[bool]:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        cleaned = value.strip().lower()
        if cleaned in {"", "none", "null"}:
            return None
        if cleaned in {"true", "1", "yes", "y", "да"}:
            return True
        if cleaned in {"false", "0", "no", "n", "нет"}:
            return False
    return None


def _parse_float(value: Optional[object]) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.strip().replace("%", "")
        if cleaned == "":
            return None
        try:
            return float(cleaned.replace(",", "."))
        except ValueError:
            return None
    return None


def _ensure_unique_ordered(measures: List[Measure]) -> List[int]:
    seen = set()
    ordered: List[int] = []
    for measure in measures:
        code = int(measure)
        if code not in seen:
            ordered.append(code)
            seen.add(code)
    return ordered


class RecommendationService:
    def __init__(self, source_data: SourceData):
        self.source_data = source_data
        self._country_cache: Dict[str, bool] = {
            country.code: country.is_friendly for country in source_data.countries
        }
        self._country_name_cache: Dict[str, str] = {
            country.code: country.name or country.code for country in source_data.countries
        }

    def recommend(self, hs_code: str) -> List[int]:
        analysis_input = self._build_analysis_input(hs_code)
        if not analysis_input:
            return [int(Measure.MEASURE_6)]

        analyzer = TradeAnalyzer(analysis_input)
        measures, _steps = analyzer.analyze()

        ordered = _ensure_unique_ordered(measures)
        if not ordered:
            return [int(Measure.MEASURE_6)]
        return ordered

    def _build_analysis_input(self, hs_code: str) -> Optional[AnalysisInput]:
        imports_by_year = self._collect_imports(hs_code)
        if not imports_by_year:
            return None

        years = sorted(imports_by_year.keys())
        current_year = years[-1]
        previous_year = years[-2] if len(years) >= 2 else years[-1]

        previous_period = PeriodData(str(previous_year), imports_by_year.get(previous_year, []))
        current_period = PeriodData(str(current_year), imports_by_year.get(current_year, []))

        production_data = self._collect_production_consumption(hs_code, current_year, previous_year)
        tariff_data = self._collect_tariff_data(hs_code)
        non_tariff_data = self._collect_non_tariff_data(hs_code)

        return AnalysisInput(
            hs_code=hs_code,
            previous_period=previous_period,
            current_period=current_period,
            production_consumption=production_data,
            tariff_data=tariff_data,
            non_tariff_data=non_tariff_data,
        )

    def _collect_imports(self, hs_code: str) -> Dict[int, List[CountryImportData]]:
        result: Dict[int, List[CountryImportData]] = {}
        for record in self.source_data.import_by_country:
            if record.hs_code != hs_code:
                continue
            country_name = self._country_name_cache.get(record.country, record.country)
            is_friendly = self._country_cache.get(record.country, True)
            import_value = record.volume
            import_volume = 1.0 if record.volume != 0 else 0.0
            result.setdefault(record.year, []).append(
                CountryImportData(
                    country_name=country_name,
                    is_friendly=is_friendly,
                    import_value=import_value,
                    import_volume=import_volume,
                )
            )

        for year_imports in result.values():
            year_imports.sort(key=lambda item: item.import_value, reverse=True)

        return result

    def _collect_production_consumption(
        self, hs_code: str, current_year: int, previous_year: int
    ) -> ProductionConsumptionData:
        production_current = 0.0
        consumption_current = 0.0
        production_previous: Optional[float] = None

        for record in self.source_data.volumes_general:
            if record.hs_code != hs_code:
                continue
            if record.type == "production":
                if record.year == current_year:
                    production_current = record.volume
                elif record.year == previous_year:
                    production_previous = record.volume
            elif record.type == "consumption" and record.year == current_year:
                consumption_current = record.volume

        if previous_year == current_year:
            production_previous = None

        return ProductionConsumptionData(
            production=production_current,
            consumption=consumption_current,
            production_previous=production_previous,
        )

    def _collect_tariff_data(self, hs_code: str) -> TariffData:
        restrictions = self._get_restrictions(hs_code)

        applied = _parse_float(restrictions.get("customs_duty_rate"))
        wto_max = _parse_float(restrictions.get("customs_duty_rate_wto"))

        applied_percent = (applied or 0.0) * 100
        wto_percent = (wto_max or 0.0) * 100

        return TariffData(applied_tariff=applied_percent, wto_maximum_tariff=wto_percent)

    def _collect_non_tariff_data(self, hs_code: str) -> Optional[NonTariffData]:
        restrictions = self._get_restrictions(hs_code)
        if not restrictions:
            return None

        in_procurement = _parse_bool(restrictions.get("rf_decree_1875_present")) or False
        has_cert = _parse_bool(restrictions.get("tech_regulations_present")) or False
        in_exception = _parse_bool(restrictions.get("order_4114_present")) or False

        return NonTariffData(
            in_government_procurement_list=in_procurement,
            has_certification_requirement=has_cert,
            in_minpromtorg_exception_list=in_exception,
        )

    def _get_restrictions(self, hs_code: str) -> Dict[str, object]:
        result: Dict[str, object] = {}
        for restriction in self.source_data.restrictions:
            if restriction.hs_code == hs_code:
                result[restriction.key] = restriction.value
        return result
