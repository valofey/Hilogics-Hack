from dataclasses import dataclass, field
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
    country_code: str
    country_name: str
    is_friendly: bool
    import_value: float
    import_quantity: float

    @property
    def average_contract_price(self) -> float:
        if self.import_quantity == 0:
            return 0.0
        return self.import_value / self.import_quantity


@dataclass
class PeriodData:
    period_name: str
    imports: List[CountryImportData]

    @property
    def total_import_value(self) -> float:
        return sum(imp.import_value for imp in self.imports)

    @property
    def total_import_quantity(self) -> float:
        return sum(imp.import_quantity for imp in self.imports)

    @property
    def unfriendly_import_value(self) -> float:
        return sum(imp.import_value for imp in self.imports if not imp.is_friendly)

    @property
    def unfriendly_share(self) -> float:
        total = self.total_import_value
        if total == 0:
            return 0.0
        return (self.unfriendly_import_value / total) * 100

    def get_top_supplier(self) -> Optional[CountryImportData]:
        if not self.imports:
            return None
        return max(self.imports, key=lambda x: x.import_value)

    def get_country(self, country_code: str) -> Optional[CountryImportData]:
        for imp in self.imports:
            if imp.country_code == country_code:
                return imp
        return None

    def get_average_price_excluding(self, exclude_country_code: str) -> float:
        other_countries = [
            imp for imp in self.imports if imp.country_code != exclude_country_code
        ]
        if not other_countries:
            return 0.0

        total_value = sum(imp.import_value for imp in other_countries)
        total_quantity = sum(imp.import_quantity for imp in other_countries)

        if total_quantity == 0:
            return 0.0
        return total_value / total_quantity


@dataclass
class ProductionConsumptionData:
    production: float
    consumption: float
    production_previous: Optional[float] = None
    production_history: Dict[int, float] = field(default_factory=dict)

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

    def is_production_declining_multi(self, current_year: int, window: int = 3) -> bool:
        previous_years = sorted((year for year in self.production_history if year < current_year))
        if not previous_years:
            return False
        previous_years = previous_years[-window:]
        values = [self.production_history[year] for year in previous_years if year in self.production_history]
        if not values:
            return False
        average = sum(values) / len(values)
        return self.production < average


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
    current_period: PeriodData
    previous_period: Optional[PeriodData]
    periods_by_year: Dict[int, PeriodData]
    current_year: int
    production_consumption: ProductionConsumptionData
    tariff_data: TariffData
    non_tariff_data: Optional[NonTariffData] = None

    @property
    def is_total_import_growing(self) -> bool:
        if not self.previous_period:
            return False
        return (
            self.current_period.total_import_value
            > self.previous_period.total_import_value
        )

    @property
    def is_total_quantity_growing(self) -> bool:
        if not self.previous_period:
            return False
        return (
            self.current_period.total_import_quantity
            > self.previous_period.total_import_quantity
        )

    @property
    def unfriendly_share_declining(self) -> bool:
        if not self.previous_period:
            return False
        return (
            self.current_period.unfriendly_share
            < self.previous_period.unfriendly_share
        )

    @property
    def unfriendly_share_stable_or_growing(self) -> bool:
        if not self.previous_period:
            return False
        return (
            self.current_period.unfriendly_share
            >= self.previous_period.unfriendly_share
        )

    @property
    def unfriendly_import_not_decreasing(self) -> bool:
        if not self.previous_period:
            return False
        return (
            self.current_period.unfriendly_import_value
            >= self.previous_period.unfriendly_import_value
        )

    def get_period(self, year: int) -> Optional[PeriodData]:
        return self.periods_by_year.get(year)


class TradeAnalyzer:
    def __init__(self, data: AnalysisInput):
        self.data = data
        self.analysis_steps: List[str] = []
        self.recommended_measures: List[Measure] = []

    def log_step(self, step: str):
        self.analysis_steps.append(step)

    def analyze(self) -> Tuple[List[Measure], List[str]]:
        self.analysis_steps = []
        self.recommended_measures = []

        share_current = self.data.current_period.unfriendly_share
        self.log_step(f"Доля НС в текущем периоде: {share_current:.2f}%")

        if self.data.previous_period:
            share_prev = self.data.previous_period.unfriendly_share
            self.log_step(f"Доля НС в предыдущем периоде: {share_prev:.2f}%")
            self.log_step(
                f"Доля НС стабильна/растёт: {self.data.unfriendly_share_stable_or_growing}"
            )
            self.log_step(
                f"Импорт из НС не снижается: {self.data.unfriendly_import_not_decreasing}"
            )
        else:
            self.log_step("Нет данных о предыдущем периоде доли НС")

        high_share = (
            share_current >= 30.0
            and self.data.unfriendly_share_stable_or_growing
            and self.data.unfriendly_import_not_decreasing
        )

        if high_share:
            self.log_step("Сценарий 4.1: доля НС ≥ 30% и не снижается")
            self._evaluate_high_share()
        else:
            self.log_step("Сценарий 4.2: доля НС < 30% или снижается")
            self._evaluate_low_share()

        if not self.recommended_measures:
            self.log_step("Не выполнены условия для мер 1–5 → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)

        return self.recommended_measures, self.analysis_steps

    def _evaluate_high_share(self):
        is_sufficient = self.data.production_consumption.is_production_sufficient
        self.log_step(f"Производство >= потребления: {is_sufficient}")

        if is_sufficient:
            self.log_step("Шаг 4.1.1.1: Производство достаточно → Мера 2")
            self.recommended_measures.append(Measure.MEASURE_2)
            if self.data.non_tariff_data:
                self.log_step("Проверяем нетарифные меры параллельно с Мерой 2")
                self._analyze_non_tariff_measures()
        else:
            self.log_step("Шаг 4.1.1.2: Производство недостаточно → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)

    def _evaluate_low_share(self):
        has_potential = self.data.tariff_data.has_tariff_increase_potential
        is_sufficient = self.data.production_consumption.is_production_sufficient

        self.log_step(f"Потенциал повышения тарифа: {has_potential}")
        self.log_step(f"Производство >= потребления: {is_sufficient}")

        if has_potential and is_sufficient:
            share_declining = self.data.unfriendly_share_declining
            self.log_step(f"Доля НС снижается: {share_declining}")
            if share_declining:
                self.log_step("Шаг 4.2.1.1: Условия выполнены → Мера 1")
                self.recommended_measures.append(Measure.MEASURE_1)
            else:
                self.log_step("Шаг 4.2.1.1: Доля НС не снижается → Мера 1 не применяется")
            self._analyze_non_tariff_measures()
            return

        if has_potential and not is_sufficient:
            self.log_step("Шаг 4.2.1.2: Потенциал есть, но производство ниже потребления → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return

        if not has_potential and not is_sufficient:
            self.log_step("Шаг 4.2.1.3: Тариф на максимуме, производство < потребления → анализ поставок из Китая")
            self._analyze_china_case()
            return

        if not has_potential and is_sufficient:
            self.log_step("Шаг 4.2.1.4: Тариф на максимуме, производство >= потребления → анализ нетарифных мер")
            self._analyze_non_tariff_measures()
            return

        self.log_step("Сценарий 4.2 завершился без мер → Мера 6")
        self.recommended_measures.append(Measure.MEASURE_6)

    def _analyze_china_case(self) -> bool:
        self.log_step("Проверка условий Меры 3 (антидемпинговое расследование)")

        current_period = self.data.current_period
        top_supplier = current_period.get_top_supplier()
        if not top_supplier:
            self.log_step("Нет данных о поставщиках → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return True

        if top_supplier.country_code != 'CN':
            self.log_step("Топ-1 поставщик не Китай → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return True

        china_current = current_period.get_country('CN')
        if not china_current or china_current.import_value <= 0:
            self.log_step("Нет данных об импорте Китая → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return True

        previous_years = sorted(
            year for year in self.data.periods_by_year if year < self.data.current_year
        )[-3:]
        if not previous_years:
            self.log_step("Недостаточно периодов для анализа динамики → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return True

        china_prev_values = []
        for year in previous_years:
            period = self.data.get_period(year)
            if not period:
                continue
            record = period.get_country('CN')
            if record:
                china_prev_values.append(record.import_value)

        if not china_prev_values:
            self.log_step("Нет данных об импорте Китая за предыдущие годы → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return True

        average_prev = sum(china_prev_values) / len(china_prev_values)
        self.log_step(
            f"Импорт Китая текущий: {china_current.import_value:.2f}; "
            f"среднее за предыдущие годы: {average_prev:.2f}"
        )
        if china_current.import_value <= average_prev:
            self.log_step("Импорт Китая не растёт → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return True

        production_decline = self.data.production_consumption.is_production_declining_multi(
            self.data.current_year
        )
        self.log_step(f"Производство в РФ снижается: {production_decline}")
        if not production_decline:
            self.log_step("Производство не сокращается → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return True

        china_price = china_current.average_contract_price
        other_price = current_period.get_average_price_excluding('CN')
        self.log_step(
            f"СКЦ Китая: {china_price:.4f}; СКЦ прочих стран: {other_price:.4f}"
        )

        if china_price == 0 or other_price == 0:
            self.log_step("Недостаточно данных по СКЦ → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return True

        if china_price < other_price:
            self.log_step("СКЦ Китая ниже → Мера 3")
            self.recommended_measures.append(Measure.MEASURE_3)
            return True

        self.log_step("СКЦ Китая не ниже → Мера 6")
        self.recommended_measures.append(Measure.MEASURE_6)
        return True

    def _analyze_non_tariff_measures(self):
        self.log_step("Анализ нетарифных мер (раздел II)")

        is_sufficient = self.data.production_consumption.is_production_sufficient
        self.log_step(f"Производство >= потребления: {is_sufficient}")
        if not is_sufficient:
            self.log_step("Шаг II.1.1: Производство < потребления → Мера 6")
            self.recommended_measures.append(Measure.MEASURE_6)
            return

        if not self.data.non_tariff_data:
            self.log_step("Нет данных по нетарифным ограничениям")
            return

        nt_data = self.data.non_tariff_data
        if nt_data.in_government_procurement_list:
            self.log_step("Товар присутствует в перечнях ПП №1875 → Мера 4")
            self.recommended_measures.append(Measure.MEASURE_4)
        else:
            self.log_step("Товар отсутствует в перечнях ПП №1875")

        has_cert = nt_data.has_certification_requirement
        not_in_exception = not nt_data.in_minpromtorg_exception_list
        import_growing = self.data.is_total_quantity_growing
        production_growing = self.data.production_consumption.is_production_growing

        self.log_step(
            "Условия для Меры 5: "
            f"сертификация={'Да' if has_cert else 'Нет'}, "
            f"не в исключениях={'Да' if not_in_exception else 'Нет'}, "
            f"импорт растёт={'Да' if import_growing else 'Нет'}, "
            f"производство растёт={'Да' if production_growing else 'Нет'}"
        )

        if has_cert and not_in_exception and import_growing and production_growing:
            self.log_step("Все условия выполнены → Мера 5")
            self.recommended_measures.append(Measure.MEASURE_5)

        return True

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
        previous_year = years[-2] if len(years) >= 2 else None

        periods_by_year: Dict[int, PeriodData] = {
            year: PeriodData(str(year), imports_by_year.get(year, [])) for year in years
        }
        current_period = periods_by_year[current_year]
        previous_period = periods_by_year.get(previous_year) if previous_year else None

        production_data = self._collect_production_consumption(hs_code, current_year, previous_year)
        tariff_data = self._collect_tariff_data(hs_code)
        non_tariff_data = self._collect_non_tariff_data(hs_code)

        return AnalysisInput(
            hs_code=hs_code,
            current_period=current_period,
            previous_period=previous_period,
            periods_by_year=periods_by_year,
            current_year=current_year,
            production_consumption=production_data,
            tariff_data=tariff_data,
            non_tariff_data=non_tariff_data,
        )

    def _collect_imports(self, hs_code: str) -> Dict[int, List[CountryImportData]]:
        result: Dict[int, List[CountryImportData]] = {}
        for record in self.source_data.import_by_country:
            if record.hs_code != hs_code:
                continue
            country_code = record.country
            country_name = self._country_name_cache.get(country_code, country_code)
            is_friendly = self._country_cache.get(country_code, True)
            import_value = record.value
            import_quantity = record.quantity
            result.setdefault(record.year, []).append(
                CountryImportData(
                    country_code=country_code,
                    country_name=country_name,
                    is_friendly=is_friendly,
                    import_value=import_value,
                    import_quantity=import_quantity,
                )
            )

        for year_imports in result.values():
            year_imports.sort(key=lambda item: item.import_value, reverse=True)

        return result

    def _collect_production_consumption(
        self, hs_code: str, current_year: int, previous_year: Optional[int]
    ) -> ProductionConsumptionData:
        production_by_year: Dict[int, float] = {}
        consumption_by_year: Dict[int, float] = {}

        for record in self.source_data.volumes_general:
            if record.hs_code != hs_code:
                continue
            if record.type == "production":
                production_by_year[record.year] = record.volume
            elif record.type == "consumption":
                consumption_by_year[record.year] = record.volume

        production_current = production_by_year.get(current_year, 0.0)
        consumption_current = consumption_by_year.get(current_year, 0.0)
        production_previous = production_by_year.get(previous_year) if previous_year is not None else None

        return ProductionConsumptionData(
            production=production_current,
            consumption=consumption_current,
            production_previous=production_previous,
            production_history=production_by_year,
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
