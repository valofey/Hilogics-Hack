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


def generate_share_url(uid: int):
    return f"{settings.base_url}/share/{uid}"


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
        recommendations=["Мера поддержки 1", "Мера поддержки 2"],
    )
