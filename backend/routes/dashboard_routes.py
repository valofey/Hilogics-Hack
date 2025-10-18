from fastapi import APIRouter
from schemas.dashboard_schemas import DashboardRequest, DashboardResponse
from services.dashboard_service import (
    create_report,
    get_tnved_list_service,
    retrieve_report,
)
from schemas.dashboard_schemas import (
    DashboardResponse,
    DashboardRequest,
    TnvedListResponse,
)


router = APIRouter()


@router.get("/tnved", response_model=TnvedListResponse)
def get_tnved_list():
    tnved_data = get_tnved_list_service()
    return TnvedListResponse(items=tnved_data)


@router.post("/dashboard", response_model=DashboardResponse)
def create_dashboard(request: DashboardRequest):
    data = create_report(product=request.product, organization=request.organization)
    return DashboardResponse(dashboard=data)


@router.get("/dashboard/{uid}", response_model=DashboardResponse)
def retrieve_dashboard(uid: int):
    data = retrieve_report(uid)
    return DashboardResponse(dashboard=data)
