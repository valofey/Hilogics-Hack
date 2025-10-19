from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import httpx
from config import settings

DADATA_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party"


class PartyQuery(BaseModel):
    query: str


router = APIRouter()


@router.post("/company-info/")
async def find_party(payload: PartyQuery):
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"Token {settings.dadata_api_key}",
    }
    json_data = {"query": payload.query}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                DADATA_URL, json=json_data, headers=headers, timeout=10.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code, detail=e.response.text
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=500, detail=f"Request to DaData failed: {str(e)}"
            )
