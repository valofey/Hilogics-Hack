from fastapi import APIRouter
from schemas.dashboard_schemas import DashboardRequest, DashboardResponse
from services.dashboard_service import create_report, retrieve_report


router = APIRouter()


@router.post("/dashboard", response_model=DashboardResponse)
def create_dashboard(request: DashboardRequest):
    data = create_report(product=request.product, organization=request.organization)
    return DashboardResponse(dashboard=data)


@router.get("/dashboard/{uid}", response_model=DashboardResponse)
def retrieve_dashboard(uid: int):
    data = retrieve_report(uid)
    return DashboardResponse(dashboard=data)
