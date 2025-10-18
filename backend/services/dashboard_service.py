from collections import defaultdict
from typing import Dict, List
from services.source_service import load_source_data
from models.source import VolumeGeneral
from schemas.dashboard_schemas import TnvedItem
from config import settings
from models.dashboard import (
    DashboardData,
    OrganizationInfo,
    ProductInfo,
    TariffInfo,
    Metrics,
    MetricHistoryItem,
    ImportStructureItem,
    ContractPriceItem,
)
from models.dashboard import Recommendation, CaseStudy, ImpactMeasure
import csv
from pathlib import Path


def create_report(
    product: ProductInfo, organization: OrganizationInfo
) -> DashboardData:
    hs_code = product.code

    source = load_source_data()

    # 3. Extract tariffs from restrictions
    current_duty = 0.0
    wto_duty = 0.0
    for r in source.restrictions:
        if r.hs_code != hs_code:
            continue
        try:
            if r.key == "customs_duty_rate":
                current_duty = float(r.value) if r.value is not None else 0.0
            elif r.key == "customs_duty_rate_wto":
                wto_duty = float(r.value) if r.value is not None else 0.0
        except (TypeError, ValueError):
            # If value is not convertible to float, ignore (keep default 0.0)
            pass

    tariffs = TariffInfo(current=current_duty, wto_obligation=wto_duty)

    # 4. Metrics
    vol_by_type: Dict[str, List[VolumeGeneral]] = defaultdict(list)
    for v in source.volumes_general:
        if v.hs_code == hs_code:
            vol_by_type[v.type].append(v)

    def build_metric_history(items: List[VolumeGeneral]) -> List[MetricHistoryItem]:
        sorted_items = sorted(items, key=lambda x: x.year)
        history = []
        for i, item in enumerate(sorted_items):
            # Multiply by 10^6 and round to int
            value = int(round(item.volume * 1e6))
            if i == 0:
                change_percent = 0.0
            else:
                prev_value = int(round(sorted_items[i - 1].volume * 1e6))
                if prev_value == 0:
                    change_percent = 0.0 if value == 0 else float("inf")
                else:
                    change_percent = ((value - prev_value) / prev_value) * 100
                # Cap inf to a large number or keep as 0? We'll keep inf as float('inf')
                # But Pydantic may not accept inf; better to use 0.0 or large placeholder.
                if not (-1e10 < change_percent < 1e10):  # avoid inf/nan
                    change_percent = 0.0
            history.append(
                MetricHistoryItem(
                    year=item.year, value=value, change_percent=round(change_percent, 2)
                )
            )
        return history

    metrics = Metrics(
        import_data=build_metric_history(vol_by_type.get("import", [])),
        production=build_metric_history(vol_by_type.get("production", [])),
        consumption=build_metric_history(vol_by_type.get("consumption", [])),
    )

    # 5. Geography: latest year only
    imports = [imp for imp in source.import_by_country if imp.hs_code == hs_code]
    geography = []
    prices = []  # <-- initialize here or below
    if imports:
        latest_year = max(imp.year for imp in imports)
        latest_imports = [imp for imp in imports if imp.year == latest_year]
        total_vol = sum(imp.volume for imp in latest_imports)
        # Geography: shares
        if total_vol > 0:
            for imp in latest_imports:
                geography.append(
                    ImportStructureItem(
                        country=imp.country, share_percent=imp.volume / total_vol
                    )
                )
        # Prices: absolute values (assuming volume = price in millions USD)
        for imp in latest_imports:
            price_usd = int(round(imp.volume * 1e6))
            prices.append(ContractPriceItem(country=imp.country, price_usd=price_usd))

    # 6. Recommendations: not available → empty list
    recommendations: List[Recommendation] = []

    # 7. Share URL
    share_url = generate_share_url(424242)

    return DashboardData(
        product=product,
        organization=organization,
        tariffs=tariffs,
        metrics=metrics,
        geography=geography,
        prices=prices,
        recommendations=recommendations,
        share_url=share_url,
    )


def generate_share_url(uid: int):
    return f"{settings.ui_base_url}/share/{uid}"


def retrieve_report(uid: int):
    res = create_report(
        product=ProductInfo(name="retrieved produce", code="123400"),
        organization=OrganizationInfo(name="retrieved org", inn="000"),
    )
    res.share_url = generate_share_url(uid)
    return res


def get_tnved_list_service() -> List[TnvedItem]:
    tnved_file_path = Path("data/tnved.csv")
    items = []
    with open(tnved_file_path, mode="r", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            items.append(TnvedItem(code=row["code"], description=row["description"]))
    return items


def create_report_mock(
    product: ProductInfo, organization: OrganizationInfo
) -> DashboardData:

    case1 = CaseStudy(
        description="Применение специальной пошлины на импорт стиральных машин в 2021 году",
        case_url="https://example.com/case/1",
        impact=[
            ImpactMeasure(measure="Импорт", before=100000, after=85000),
            ImpactMeasure(measure="Внутреннее производство", before=45000, after=52000),
            ImpactMeasure(
                measure="Внутреннее потребление", before=145000, after=137000
            ),
        ],
    )

    rec1 = Recommendation(
        name="Мера поддержки 1",
        reasons=["Высокий уровень импорта", "Снижение внутреннего производства"],
        similar_cases=[case1],
    )

    case2 = CaseStudy(
        description="Введение квоты на импорт холодильников в 2019 году",
        case_url="https://example.com/case/2",
        impact=[
            ImpactMeasure(measure="Импорт", before=200000, after=160000),
            ImpactMeasure(measure="Внутреннее производство", before=80000, after=95000),
            ImpactMeasure(
                measure="Внутреннее потребление", before=280000, after=255000
            ),
        ],
    )

    rec2 = Recommendation(
        name="Мера поддержки 2",
        reasons=[
            "Низкая конкурентоспособность отечественного производителя",
            "Необходимость защиты внутреннего рынка",
        ],
        similar_cases=[case2],
    )

    return DashboardData(
        share_url=generate_share_url(424242),
        product=product,
        organization=organization,
        tariffs=TariffInfo(current=0.15, wto_obligation=0.12),
        metrics=Metrics(
            import_data=[
                MetricHistoryItem(year=2022, value=10000, change_percent=0.05),
                MetricHistoryItem(year=2023, value=10500, change_percent=0.03),
                MetricHistoryItem(year=2024, value=11000, change_percent=0.02),
            ],
            production=[
                MetricHistoryItem(year=2022, value=5000, change_percent=-0.02),
                MetricHistoryItem(year=2023, value=4900, change_percent=-0.01),
                MetricHistoryItem(year=2024, value=4800, change_percent=0.01),
            ],
            consumption=[
                MetricHistoryItem(year=2022, value=15000, change_percent=0.03),
                MetricHistoryItem(year=2023, value=15400, change_percent=0.02),
                MetricHistoryItem(year=2024, value=15800, change_percent=0.01),
            ],
        ),
        geography=[
            ImportStructureItem(country="Китай", share_percent=0.40),
            ImportStructureItem(country="Германия", share_percent=0.20),
            ImportStructureItem(country="Польша", share_percent=0.15),
            ImportStructureItem(country="Турция", share_percent=0.10),
            ImportStructureItem(country="Италия", share_percent=0.08),
            ImportStructureItem(country="Другие", share_percent=0.07),
        ],
        prices=[
            ContractPriceItem(country="Китай", price_usd=20000),
            ContractPriceItem(country="Германия", price_usd=35000),
            ContractPriceItem(country="Польша", price_usd=27000),
            ContractPriceItem(country="Турция", price_usd=22000),
            ContractPriceItem(country="Италия", price_usd=30000),
        ],
        recommendations=[rec1, rec2],
    )
