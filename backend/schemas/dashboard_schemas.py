from pydantic import BaseModel
from models.dashboard import DashboardData, OrganizationInfo, ProductInfo


class DashboardRequest(BaseModel):
    product: ProductInfo
    organization: OrganizationInfo


class DashboardResponse(BaseModel):
    dashboard: DashboardData
