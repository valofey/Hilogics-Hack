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
    country_code: str
    share_percent: float


class ContractPriceItem(BaseModel):
    country: str
    country_code: str
    price_usd: int


class ImpactMeasure(BaseModel):
    measure: str
    before: int
    after: int


class CaseStudy(BaseModel):
    description: str
    case_url: str
    impact: List[ImpactMeasure]


class Recommendation(BaseModel):
    name: str
    reasons: List[str]
    similar_cases: List[CaseStudy]


class DashboardData(BaseModel):
    product: ProductInfo
    organization: OrganizationInfo
    tariffs: TariffInfo
    metrics: Metrics
    geography: List[ImportStructureItem]
    prices: List[ContractPriceItem]
    recommendations: List[Recommendation]
    share_url: str
