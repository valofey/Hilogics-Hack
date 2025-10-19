import csv
from pathlib import Path
from typing import List
from models.source import (
    CountryInfo,
    SourceData,
    ImportByCountry,
    VolumeGeneral,
    Restriction,
)
from fastapi.responses import StreamingResponse
import io

# Global source data instance
_source_data = SourceData()
_source_is_loaded = False


def get_source_data():
    global _source_is_loaded, _source_data
    if not _source_is_loaded:
        _source_data = _load_source_data()
        _source_is_loaded = True
        # print("[INFO] Data Preloaded")
    return _source_data


def _load_source_data(src_dir: Path = Path("./data")) -> SourceData:

    ds = SourceData()

    with open(src_dir / "countries.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Normalize boolean: accept "true"/"false", "1"/"0", etc.
            is_friendly_raw = row.get("is_friendly", "").strip().lower()
            if is_friendly_raw in ("false", "0", "no", "f", ""):
                is_friendly = False
            else:
                is_friendly = True

            ds.countries.append(
                CountryInfo(
                    code=row.get("code", "").strip(),
                    name=row.get("name", "").strip(),
                    region=row.get("region", "").strip(),
                    is_friendly=is_friendly,
                )
            )

    with open(src_dir / "import_by_country.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item = ImportByCountry(
                hs_code=row["hs_code"],
                country=row["country"],
                year=int(row["year"]),
                volume=float(row["volume"]),
                quantity=float(row["quantity"]),
            )
            ds.import_by_country.append(item)

    with open(src_dir / "volumes_general.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item = VolumeGeneral(
                hs_code=row["hs_code"],
                type=row["type"],
                year=int(row["year"]),
                volume=float(row["volume"]),
            )
            ds.volumes_general.append(item)

    with open(src_dir / "restrictions.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item = Restriction(
                hs_code=row["hs_code"], key=row["key"], value=row["value"]
            )
            ds.restrictions.append(item)

    return ds


# ImportByCountry operations
def get_import_by_country() -> List[ImportByCountry]:
    return get_source_data().import_by_country


def save_import_by_country(item: ImportByCountry):
    # Check if item already exists
    found = False
    for i, existing_item in enumerate(get_source_data().import_by_country):
        if (
            existing_item.hs_code == item.hs_code
            and existing_item.country == item.country
            and existing_item.year == item.year
        ):
            get_source_data().import_by_country[i] = item
            found = True
            break

    if not found:
        get_source_data().import_by_country.append(item)


def delete_import_by_country(hs_code: str, country: str, year: int):
    get_source_data().import_by_country = [
        item
        for item in get_source_data().import_by_country
        if not (
            item.hs_code == hs_code and item.country == country and item.year == year
        )
    ]


def export_import_by_country_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["hs_code", "country", "year", "volume"])

    for item in get_source_data().import_by_country:
        writer.writerow([item.hs_code, item.country, item.year, item.volume])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=import_by_country.csv"},
    )


def import_import_by_country_csv(file_content: str):
    reader = csv.DictReader(io.StringIO(file_content))

    for row in reader:
        item = ImportByCountry(
            hs_code=row["hs_code"],
            country=row["country"],
            year=int(row["year"]),
            volume=float(row["volume"]),
            quantity=float(row["quantity"]),
        )
        save_import_by_country(item)


# VolumeGeneral operations
def get_volume_general() -> List[VolumeGeneral]:
    return get_source_data().volumes_general


def save_volume_general(item: VolumeGeneral):
    # Check if item already exists
    found = False
    for i, existing_item in enumerate(get_source_data().volumes_general):
        if (
            existing_item.hs_code == item.hs_code
            and existing_item.type == item.type
            and existing_item.year == item.year
        ):
            get_source_data().volumes_general[i] = item
            found = True
            break

    if not found:
        get_source_data().volumes_general.append(item)


def delete_volume_general(hs_code: str, type: str, year: int):
    get_source_data().volumes_general = [
        item
        for item in get_source_data().volumes_general
        if not (item.hs_code == hs_code and item.type == type and item.year == year)
    ]


def export_volume_general_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["hs_code", "type", "year", "volume"])

    for item in get_source_data().volumes_general:
        writer.writerow([item.hs_code, item.type, item.year, item.volume])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=volumes_general.csv"},
    )


def import_volume_general_csv(file_content: str):
    reader = csv.DictReader(io.StringIO(file_content))

    for row in reader:
        item = VolumeGeneral(
            hs_code=row["hs_code"],
            type=row["type"],
            year=int(row["year"]),
            volume=float(row["volume"]),
        )
        save_volume_general(item)


# Restriction operations
def get_restriction() -> List[Restriction]:
    return get_source_data().restrictions


def save_restriction(item: Restriction):
    # Check if item already exists
    source_data = get_source_data()
    found = False
    for i, existing_item in enumerate(source_data.restrictions):
        if existing_item.hs_code == item.hs_code and existing_item.key == item.key:
            source_data.restrictions[i] = item
            found = True
            break

    if not found:
        source_data.restrictions.append(item)


def delete_restriction(hs_code: str, key: str):
    source_data = get_source_data()
    source_data.restrictions = [
        item
        for item in source_data.restrictions
        if not (item.hs_code == hs_code and item.key == key)
    ]


def export_restriction_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["hs_code", "key", "value"])
    source_data = get_source_data()
    for item in source_data.restrictions:
        writer.writerow([item.hs_code, item.key, item.value])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=restrictions.csv"},
    )


def import_restriction_csv(file_content: str):
    reader = csv.DictReader(io.StringIO(file_content))

    for row in reader:
        item = Restriction(hs_code=row["hs_code"], key=row["key"], value=row["value"])
        save_restriction(item)
