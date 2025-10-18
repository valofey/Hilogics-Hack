from pydantic import BaseModel
from typing import List, Optional


class OrganizationInfo(BaseModel):
    name: str
    inn: Optional[str] = None


class ProductInfo(BaseModel):
    name: str
    code: str


class TariffInfo(BaseModel):
    current: float
    wto_obligation: float


class MetricHistoryItem(BaseModel):
    year: int
    value: int
    change_percent: float


class Metrics(BaseModel):
    import_data: List[MetricHistoryItem]
    production: List[MetricHistoryItem]
    consumption: List[MetricHistoryItem]


class ImportStructureItem(BaseModel):
    country: str
    share_percent: float


class ContractPriceItem(BaseModel):
    country: str
    price_usd: int


class DashboardData(BaseModel):
    product: ProductInfo
    organization: OrganizationInfo
    tariffs: TariffInfo
    metrics: Metrics
    geography: List[ImportStructureItem]
    prices: List[ContractPriceItem]
    recommendations: List[str]
    share_url: str
