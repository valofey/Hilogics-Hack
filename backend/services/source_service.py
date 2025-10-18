import csv
from pathlib import Path
from models.source import SourceData, ImportByCountry, VolumeGeneral, Restriction


def load_source_data(dist_dir: Path = Path("./data")) -> SourceData:
    source = SourceData()

    with open(dist_dir / "import_by_country.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item = ImportByCountry(
                hs_code=row["hs_code"],
                country=row["country"],
                year=int(row["year"]),
                volume=float(row["volume"]),
            )
            source.import_by_country.append(item)

    with open(dist_dir / "volumes_general.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item = VolumeGeneral(
                hs_code=row["hs_code"],
                type=row["type"],
                year=int(row["year"]),
                volume=float(row["volume"]),
            )
            source.volumes_general.append(item)

    with open(dist_dir / "restrictions.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            item = Restriction(
                hs_code=row["hs_code"], key=row["key"], value=row["value"]
            )
            source.restrictions.append(item)

    return source
