"""One-off parser for PortalSeven jackpot winner dumps -> src/data/jackpotWins.json"""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

SOURCES = {
    "powerball": Path(
        r"C:\Users\darre\.cursor\projects\c-Users-darre-Documents-GitHub-jackpotdesk\agent-tools\af9556c5-2087-41cb-b46c-86d8593ecbf2.txt"
    ),
    "megamillions": Path(
        r"C:\Users\darre\.cursor\projects\c-Users-darre-Documents-GitHub-jackpotdesk\agent-tools\c02af0d8-0acb-4971-a8f6-a3dc00872b14.txt"
    ),
}

STATES = {
    "ALABAMA": "AL",
    "ALASKA": "AK",
    "ARIZONA": "AZ",
    "ARKANSAS": "AR",
    "CALIFORNIA": "CA",
    "COLORADO": "CO",
    "CONNECTICUT": "CT",
    "DELAWARE": "DE",
    "FLORIDA": "FL",
    "GEORGIA": "GA",
    "HAWAII": "HI",
    "IDAHO": "ID",
    "ILLINOIS": "IL",
    "INDIANA": "IN",
    "IOWA": "IA",
    "KANSAS": "KS",
    "KENTUCKY": "KY",
    "LOUISIANA": "LA",
    "MAINE": "ME",
    "MARYLAND": "MD",
    "MASSACHUSETTS": "MA",
    "MICHIGAN": "MI",
    "MINNESOTA": "MN",
    "MISSISSIPPI": "MS",
    "MISSOURI": "MO",
    "MONTANA": "MT",
    "NEBRASKA": "NE",
    "NEVADA": "NV",
    "NEW HAMPSHIRE": "NH",
    "NEW JERSEY": "NJ",
    "NEW MEXICO": "NM",
    "NEW YORK": "NY",
    "NORTH CAROLINA": "NC",
    "NORTH DAKOTA": "ND",
    "OHIO": "OH",
    "OKLAHOMA": "OK",
    "OREGON": "OR",
    "PENNSYLVANIA": "PA",
    "PUERTO RICO": "PR",
    "RHODE ISLAND": "RI",
    "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD",
    "TENNESSEE": "TN",
    "TEXAS": "TX",
    "UTAH": "UT",
    "VERMONT": "VT",
    "VIRGIN ISLANDS": "VI",
    "VIRGINIA": "VA",
    "WASHINGTON": "WA",
    "WEST VIRGINIA": "WV",
    "WISCONSIN": "WI",
    "WYOMING": "WY",
}

ABBR = set(STATES.values()) | {"DC"}

CITY_STATE = {
    "ROCKY POINT": "NY",
    "WYANDANCH": "NY",
    "NORTH BELLMORE": "NY",
    "MAHOPAC FALLS": "NY",
    "NEW WINDSOR": "NY",
    "TOMS RIVER": "NJ",
    "MILL VALLEY": "CA",
    "SOUTH WEBSTER": "OH",
    "COMSTOCK PARK": "MI",
    "STREAMWOOD": "IL",
}

INFORMAL = {
    r"\bGA\.": "GA",
    r"\bFLA\.": "FL",
    r"\bCALIF\.": "CA",
    r"\bNYC\b": "NY",
    r"\bN\.Y\.": "NY",
    r"\bN\.J\.": "NJ",
}

ROW = re.compile(
    r"\|?\s*\$?\s*([\d,.]+)\s*(Billion|Million|Millions|M)?\s+"
    r"Date\s*:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})\s+"
    r"Winner\s*:\s*(.*?)\s+"
    r"Store Location\s*:\s*(.*?)\s+"
    r"Winning Numbers",
    re.I,
)

SHARES = re.compile(r"Total\s+(\d+)\s+Winners", re.I)
ZIP_STATE = re.compile(
    r",\s*([A-Za-z .'-]+?)[,\s]+([A-Z]{2})\s*-?\s*\d{5}\b"
)
ABBR_TAIL = re.compile(r"\b([A-Z]{2})\s*-?\s*\d{5}\b")
ABBR_COMMA = re.compile(r",\s*([A-Z]{2})\.?(?:\s|,|$)")


def parse_amount(num: str, unit: str | None) -> int:
    n = float(num.replace(",", ""))
    u = (unit or "").lower()
    if u == "billion":
        n *= 1_000_000_000
    elif u in {"million", "millions"}:
        n *= 1_000_000
    elif u == "m":
        n *= 1_000_000
    else:
        # bare number like 478.2 Million already handled; 83 Million missing $
        if n < 10_000:
            n *= 1_000_000
    return int(round(n))


def parse_date(raw: str) -> str:
    return datetime.strptime(raw.replace("  ", " ").strip(), "%B %d, %Y").strftime(
        "%Y-%m-%d"
    )


def city_state(location: str) -> tuple[str | None, str | None]:
    loc = location.strip()
    upper = loc.upper()
    for pat, st in INFORMAL.items():
        if re.search(pat, upper):
            before = re.split(pat, loc, flags=re.I)[0].rstrip(" ,")
            city = before.split(",")[-1].strip()
            city = re.sub(r"\bin\s+$", "", city, flags=re.I).strip()
            return city or None, st
    for city_name, st in CITY_STATE.items():
        if city_name in upper:
            return city_name.title(), st

    if "ILOTTERY" in upper or "I-LOTTERY" in upper:
        return "iLottery", "IL"
    if "NEW YORK LOTTERY" in upper and "SUBSCRIB" in upper:
        return "Lottery subscription", "NY"
    if "PUERTO RICO" in upper or re.search(r"\bPR\b", loc):
        city = loc.split(",")[0].strip() if "," in loc else "Puerto Rico"
        return city[:48], "PR"
    if re.search(r"\bWASHINGTON,\s*D\.?C\.?\b", loc, re.I) or re.search(
        r"\bDC\s+\d{5}\b", loc
    ):
        return "Washington", "DC"

    m = ZIP_STATE.search(loc)
    if m:
        city = m.group(1).strip(" -")
        st = m.group(2)
        if st in ABBR:
            return city, st

    m = ABBR_TAIL.search(loc)
    if m and m.group(1) in ABBR:
        st = m.group(1)
        before = loc[: m.start()].rstrip(" ,")
        city = before.split(",")[-1].strip()
        return city or None, st

    m = ABBR_COMMA.search(loc)
    if m and m.group(1) in ABBR:
        st = m.group(1)
        before = loc[: m.start()].rstrip(" ,")
        city = before.split(",")[-1].strip()
        return city or None, st

    for name, st in sorted(STATES.items(), key=lambda x: -len(x[0])):
        if re.search(rf"\b{name}\b", upper):
            before = re.split(name, loc, flags=re.I)[0].rstrip(" ,")
            city = before.split(",")[-1].strip()
            return city or None, st

    if "NOT AVAILABLE" in upper:
        return None, None
    return None, None


def parse_file(path: Path, game: str) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    rows: list[dict] = []
    seen: set[tuple] = set()
    for m in ROW.finditer(text):
        amount = parse_amount(m.group(1), m.group(2))
        date = parse_date(m.group(3))
        winner = re.sub(r"\s+", " ", m.group(4)).strip()
        location = re.sub(r"\s+", " ", m.group(5)).strip()
        shares = 1
        sm = SHARES.search(winner)
        if sm:
            shares = int(sm.group(1))
        city, state = city_state(location)
        key = (game, date, amount, state, location[:80])
        if key in seen:
            continue
        seen.add(key)
        if not state:
            continue
        rows.append(
            {
                "game": game,
                "date": date,
                "advertised": amount,
                "shares": shares,
                "state": state,
                "city": city,
            }
        )
    rows.sort(key=lambda r: r["date"], reverse=True)
    return rows


def main() -> None:
    all_rows: list[dict] = []
    for game, path in SOURCES.items():
        rows = parse_file(path, game)
        print(f"{game}: {len(rows)} rows")
        all_rows.extend(rows)
    all_rows.sort(key=lambda r: r["date"], reverse=True)
    out = Path(r"C:\Users\darre\Documents\GitHub\jackpotdesk\src\data\jackpotWins.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "asOf": "2026-08-16",
        "note": "Public jackpot tickets by sale state. Not lower-tier prizes.",
        "wins": all_rows,
    }
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print("wrote", out, "total", len(all_rows))


if __name__ == "__main__":
    main()
