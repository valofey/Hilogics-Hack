from typing import Union
from pydantic import BaseModel, Field


class CountryInfo(BaseModel):
    code: str  # 2 letter code (e.g., "RU")
    name: str  # Local name (e.g., "Россия")
    region: str  # Region name (e.g., "Европа")
    is_friendly: bool  # Whether the country is considered "friendly"


class ImportByCountry(BaseModel):
    hs_code: str
    country: str # 2 letter code
    year: int
    value: float  # monetary value (e.g. million USD)
    quantity: float = 0.0  # physical volume (e.g. tonnes)


class VolumeGeneral(BaseModel):
    hs_code: str
    type: str  # one of "import", "production", "consumption"
    year: int
    volume: float


class Restriction(BaseModel):
    hs_code: str
    key: str
    value: Union[bool, float, int, str, None]


class SourceData(BaseModel):
    countries: list[CountryInfo] = Field(default_factory=list)
    import_by_country: list[ImportByCountry] = Field(default_factory=list)
    volumes_general: list[VolumeGeneral] = Field(default_factory=list)
    restrictions: list[Restriction] = Field(default_factory=list)
