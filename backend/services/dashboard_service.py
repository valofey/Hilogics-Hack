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
from services.recommendation_service import RecommendationService, Measure
import csv
from pathlib import Path


def create_report(
    product: ProductInfo, organization: OrganizationInfo
) -> DashboardData:
    hs_code = product.code

    source = load_source_data()

    country_by_code = {c.code: c for c in source.countries}

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
                country_info = country_by_code.get(imp.country)
                country_name = country_info.name if country_info else f"[{imp.country}]"
                geography.append(
                    ImportStructureItem(
                        country=country_name,
                        country_code=imp.country,
                        share_percent=imp.volume / total_vol,
                    )
                )
        # Prices: absolute values (assuming volume = price in millions USD)
        for imp in latest_imports:
            country_info = country_by_code.get(imp.country)
            country_name = country_info.name if country_info else f"[{imp.country}]"
            price_usd = int(round(imp.volume * 1e6))
            prices.append(
                ContractPriceItem(
                    country=country_name, country_code=imp.country, price_usd=price_usd
                )
            )

    recommendation_service = RecommendationService(source)
    recommended_measures, recommended_reasons = recommendation_service.recommend(
        hs_code
    )

    recommendations: List[Recommendation] = []
    for code in recommended_measures:
        try:
            measure = Measure(code)
            name = measure.description
        except ValueError:
            name = f"Мера поддержки {code}"
        recommendations.append(
            Recommendation(
                name=name,
                reasons=recommended_reasons,
                similar_cases=[],
            )
        )

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
