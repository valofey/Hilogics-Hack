import csv
from pathlib import Path
from models.source import (
    CountryInfo,
    SourceData,
    ImportByCountry,
    VolumeGeneral,
    Restriction,
)


def load_source_data(src_dir: Path = Path("./data")) -> SourceData:
    source = SourceData()

    with open(src_dir / "countries.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Normalize boolean: accept "true"/"false", "1"/"0", etc.
            is_friendly_raw = row.get("is_friendly", "").strip().lower()
            if is_friendly_raw in ("false", "0", "no", "f", ""):
                is_friendly = False
            else:
                is_friendly = True

            source.countries.append(
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
            )
            source.import_by_country.append(item)

    with open(src_dir / "volumes_general.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item = VolumeGeneral(
                hs_code=row["hs_code"],
                type=row["type"],
                year=int(row["year"]),
                volume=float(row["volume"]),
            )
            source.volumes_general.append(item)

    with open(src_dir / "restrictions.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item = Restriction(
                hs_code=row["hs_code"], key=row["key"], value=row["value"]
            )
            source.restrictions.append(item)

    return source
