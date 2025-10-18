import csv
import re
from pathlib import Path
from typing import Dict, Tuple

import pandas as pd

from models.source import (
    CountryInfo,
    SourceData,
    ImportByCountry,
    VolumeGeneral,
    Restriction,
)


_HS_CODE_TO_VOLUME_FILE: Dict[str, str] = {
    "842810": "лифты_объем_тонны.xlsx",
    "847290": "банкоматы_объем_тонны.xlsx",
    "330300": "парфюмерия_объем_тонны.xlsx",
}

_COUNTRY_ALIAS_TO_CODE: Dict[str, str] = {
    "Armenia": "AM",
    "Australia": "AU",
    "Austria": "AT",
    "Bahrain": "BH",
    "Belarus": "BY",
    "Belgium": "BE",
    "Bosnia and Herzegovina": "BA",
    "Brazil": "BR",
    "Bulgaria": "BG",
    "Canada": "CA",
    "Chile": "CL",
    "China": "CN",
    "Cyprus": "CY",
    "Czech Republic": "CZ",
    "Denmark": "DK",
    "Egypt": "EG",
    "Estonia": "EE",
    "Finland": "FI",
    "France": "FR",
    "Georgia": "GE",
    "Germany": "DE",
    "Greece": "GR",
    "Hong Kong, China": "HK",
    "Hungary": "HU",
    "India": "IN",
    "Indonesia": "ID",
    "Ireland": "IE",
    "Israel": "IL",
    "Italy": "IT",
    "Japan": "JP",
    "Kazakhstan": "KZ",
    "Korea, Democratic People's Republic of": "KP",
    "Korea, Republic of": "KR",
    "Kyrgyzstan": "KG",
    "Latvia": "LV",
    "Lithuania": "LT",
    "Luxembourg": "LU",
    "Malaysia": "MY",
    "Mexico": "MX",
    "Moldova, Republic of": "MD",
    "Morocco": "MA",
    "Netherlands": "NL",
    "Norway": "NO",
    "Oman": "OM",
    "Philippines": "PH",
    "Poland": "PL",
    "Portugal": "PT",
    "Saudi Arabia": "SA",
    "Serbia": "RS",
    "Singapore": "SG",
    "Slovakia": "SK",
    "Slovenia": "SI",
    "South Africa": "ZA",
    "Spain": "ES",
    "Sweden": "SE",
    "Switzerland": "CH",
    "Taipei, Chinese": "TW",
    "Thailand": "TH",
    "Türkiye": "TR",
    "Ukraine": "UA",
    "United Arab Emirates": "AE",
    "United Kingdom": "GB",
    "United States of America": "US",
    "Uzbekistan": "UZ",
    "Viet Nam": "VN",
}

_VOLUME_ALIAS_SKIP = {"World", "European Union Nes", "Area Nes", "", "nan"}


def _normalize_bool(value: str) -> bool:
    raw = (value or "").strip().lower()
    if raw in {"false", "0", "no", "n", "нет"}:
        return False
    return True


def _extract_year(label: str) -> int | None:
    match = re.search(r"\d{4}", label)
    if not match:
        return None
    return int(match.group())


def _load_quantity_map(src_dir: Path) -> Dict[Tuple[str, str, int], float]:
    quantity_map: Dict[Tuple[str, str, int], float] = {}
    missing_aliases: set[str] = set()

    for hs_code, filename in _HS_CODE_TO_VOLUME_FILE.items():
        file_path = src_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(f"Не найден файл с объёмами: {file_path}")

        df = pd.read_excel(file_path)
        name_column = df.columns[0]
        data_columns = df.columns[1:]

        for _, row in df.iterrows():
            alias = str(row[name_column]).strip()
            if alias in _VOLUME_ALIAS_SKIP:
                continue

            code = _COUNTRY_ALIAS_TO_CODE.get(alias)
            if not code:
                missing_aliases.add(alias)
                continue

            for column in data_columns:
                year = _extract_year(str(column))
                if year is None:
                    continue
                value = row[column]
                if pd.isna(value):
                    continue
                quantity_map[(hs_code, code, int(year))] = float(value)

    if missing_aliases:
        raise ValueError(
            "Не удалось сопоставить следующие страны с ISO-кодами: "
            + ", ".join(sorted(missing_aliases))
        )

    return quantity_map


def load_source_data(src_dir: Path = Path("./data")) -> SourceData:
    source = SourceData()

    with open(src_dir / "countries.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            source.countries.append(
                CountryInfo(
                    code=row.get("code", "").strip(),
                    name=row.get("name", "").strip(),
                    region=row.get("region", "").strip(),
                    is_friendly=_normalize_bool(row.get("is_friendly", "")),
                )
            )

    quantity_map = _load_quantity_map(src_dir)

    with open(src_dir / "import_by_country.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            hs_code = row["hs_code"]
            country = row["country"]
            year = int(row["year"])
            value = float(row["volume"])
            quantity = quantity_map.get((hs_code, country, year), 0.0)

            source.import_by_country.append(
                ImportByCountry(
                    hs_code=hs_code,
                    country=country,
                    year=year,
                    value=value,
                    quantity=quantity,
                )
            )

    with open(src_dir / "volumes_general.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            source.volumes_general.append(
                VolumeGeneral(
                    hs_code=row["hs_code"],
                    type=row["type"],
                    year=int(row["year"]),
                    volume=float(row["volume"]),
                )
            )

    with open(src_dir / "restrictions.csv", "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            source.restrictions.append(
                Restriction(
                    hs_code=row["hs_code"], key=row["key"], value=row["value"]
                )
            )

    return source
