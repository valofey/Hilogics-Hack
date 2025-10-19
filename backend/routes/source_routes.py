from fastapi import APIRouter, HTTPException, UploadFile, File
import csv
import io
from models.source import (
    ImportByCountry,
    VolumeGeneral,
    Restriction,
)
from services.source_service import (
    save_import_by_country,
    save_volume_general,
    save_restriction,
    delete_import_by_country,
    delete_volume_general,
    delete_restriction,
    get_import_by_country,
    get_volume_general,
    get_restriction,
    export_import_by_country_csv,
    export_volume_general_csv,
    export_restriction_csv,
)

router = APIRouter()


# ImportByCountry CRUD operations
@router.get("/import-by-country", response_model=list[ImportByCountry])
def get_import_by_country_list():
    return get_import_by_country()


@router.post("/import-by-country", response_model=ImportByCountry)
def create_import_by_country(item: ImportByCountry):
    save_import_by_country(item)
    return item


@router.put(
    "/import-by-country/{hs_code}/{country}/{year}", response_model=ImportByCountry
)
def update_import_by_country(
    hs_code: str, country: str, year: int, item: ImportByCountry
):
    if item.hs_code != hs_code or item.country != country or item.year != year:
        raise HTTPException(
            status_code=400, detail="Path parameters do not match item data"
        )
    save_import_by_country(item)
    return item


@router.delete("/import-by-country/{hs_code}/{country}/{year}")
def delete_import_by_country_item(hs_code: str, country: str, year: int):
    delete_import_by_country(hs_code, country, year)
    return {"message": "Item deleted successfully"}


# VolumeGeneral CRUD operations
@router.get("/volume-general", response_model=list[VolumeGeneral])
def get_volume_general_list():
    return get_volume_general()


@router.post("/volume-general", response_model=VolumeGeneral)
def create_volume_general(item: VolumeGeneral):
    save_volume_general(item)
    return item


@router.put("/volume-general/{hs_code}/{type}/{year}", response_model=VolumeGeneral)
def update_volume_general(hs_code: str, type: str, year: int, item: VolumeGeneral):
    if item.hs_code != hs_code or item.type != type or item.year != year:
        raise HTTPException(
            status_code=400, detail="Path parameters do not match item data"
        )
    save_volume_general(item)
    return item


@router.delete("/volume-general/{hs_code}/{type}/{year}")
def delete_volume_general_item(hs_code: str, type: str, year: int):
    delete_volume_general(hs_code, type, year)
    return {"message": "Item deleted successfully"}


# Restriction CRUD operations
@router.get("/restriction", response_model=list[Restriction])
def get_restriction_list():
    return get_restriction()


@router.post("/restriction", response_model=Restriction)
def create_restriction(item: Restriction):
    save_restriction(item)
    return item


@router.put("/restriction/{hs_code}/{key}", response_model=Restriction)
def update_restriction(hs_code: str, key: str, item: Restriction):
    if item.hs_code != hs_code or item.key != key:
        raise HTTPException(
            status_code=400, detail="Path parameters do not match item data"
        )
    save_restriction(item)
    return item


@router.delete("/restriction/{hs_code}/{key}")
def delete_restriction_item(hs_code: str, key: str):
    delete_restriction(hs_code, key)
    return {"message": "Item deleted successfully"}


# ImportByCountry batch operations
@router.post("/import-by-country/batch-import")
def import_import_by_country_batch(file: UploadFile = File(...)):
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    for row in reader:
        item = ImportByCountry(
            hs_code=row["hs_code"],
            country=row["country"],
            year=int(row["year"]),
            volume=float(row["volume"]),
            quantity=float(row["quantity"]),
        )
        save_import_by_country(item)

    return {"message": "Batch import completed successfully"}


@router.get("/import-by-country/export-csv")
def export_import_by_country_csv_file():
    return export_import_by_country_csv()


# VolumeGeneral batch operations
@router.post("/volume-general/batch-import")
def import_volume_general_batch(file: UploadFile = File(...)):
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    for row in reader:
        item = VolumeGeneral(
            hs_code=row["hs_code"],
            type=row["type"],
            year=int(row["year"]),
            volume=float(row["volume"]),
        )
        save_volume_general(item)

    return {"message": "Batch import completed successfully"}


@router.get("/volume-general/export-csv")
def export_volume_general_csv_file():
    return export_volume_general_csv()


# Restriction batch operations
@router.post("/restriction/batch-import")
def import_restriction_batch(file: UploadFile = File(...)):
    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    for row in reader:
        item = Restriction(hs_code=row["hs_code"], key=row["key"], value=row["value"])
        save_restriction(item)

    return {"message": "Batch import completed successfully"}


@router.get("/restriction/export-csv")
def export_restriction_csv_file():
    return export_restriction_csv()
