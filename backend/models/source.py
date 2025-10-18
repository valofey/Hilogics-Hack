from typing import Union
from pydantic import BaseModel, Field


class ImportByCountry(BaseModel):
    hs_code: str
    country: str
    year: int
    volume: float


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
    import_by_country: list[ImportByCountry] = Field(default_factory=list)
    volumes_general: list[VolumeGeneral] = Field(default_factory=list)
    restrictions: list[Restriction] = Field(default_factory=list)
