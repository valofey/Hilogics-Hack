import csv
from functools import lru_cache
from pathlib import Path
from typing import Dict, Tuple, Optional


DEFAULT_QUANTITY_CSV = Path("data/import_quantity_by_country.csv")


@lru_cache(maxsize=1)
def load_quantity_map(csv_path: str | None = None) -> Dict[Tuple[str, str, int], float]:
    """
    Возвращает словарь {(hs_code, country, year): quantity} с физическими объемами импорта.
    Если файл отсутствует или содержит ошибочные строки, они пропускаются.
    """
    path = Path(csv_path) if csv_path is not None else DEFAULT_QUANTITY_CSV
    if not path.exists():
        return {}

    quantity_map: Dict[Tuple[str, str, int], float] = {}
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                hs_code = row["hs_code"].strip()
                country = row["country"].strip()
                year = int(row["year"])
                raw_quantity = (
                    row.get("quantity")
                    or row.get("quantity_tonnes")
                    or row.get("quantity_tons")
                    or row.get("value")
                    or "0"
                )
                quantity = float(raw_quantity)
            except (KeyError, ValueError, TypeError):
                continue
            quantity_map[(hs_code, country, year)] = quantity
    return quantity_map


def calc_share(numerator: float, denominator: float) -> float:
    """Безопасное вычисление доли (в процентах)."""
    if denominator == 0:
        return 0.0
    return (numerator / denominator) * 100.0


def is_increasing(current: Optional[float], previous: Optional[float]) -> Optional[bool]:
    """
    Возвращает True, если текущее значение больше предыдущего,
    False — если меньше, и None — когда хотя бы одно значение отсутствует.
    """
    if current is None or previous is None:
        return None
    return current > previous


def is_not_decreasing(current: Optional[float], previous: Optional[float]) -> Optional[bool]:
    """
    True — если текущее значение >= предыдущего,
    False — если меньше, None — при отсутствии данных.
    """
    if current is None or previous is None:
        return None
    return current >= previous
