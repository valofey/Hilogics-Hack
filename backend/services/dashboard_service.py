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


def generate_share_url(uid: int):
    return f"{settings.ui_base_url}/share/{uid}"


def retrieve_report(uid: int):
    res = create_report(
        product=ProductInfo(name="retrieved produce", code="123400"),
        organization=OrganizationInfo(name="retrieved org", inn="000"),
    )
    res.share_url = generate_share_url(uid)
    return res


def create_report(
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
