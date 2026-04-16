#!/usr/bin/env python3
"""
Scrape live HSE TrolleyGAR data from uec.hse.ie and insert into MongoDB.
Designed to run as a daily K8s CronJob or standalone script.

Usage:
  python scrape_tgar.py                    # scrape today
  python scrape_tgar.py 2026-04-16         # scrape specific date
  python scrape_tgar.py --backfill 30      # scrape last 30 days
"""

import os
import sys
import re
import time
from datetime import datetime, timedelta
from typing import Optional

import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient, UpdateOne

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017/")
MONGO_DB = os.getenv("MONGO_DB", "healthcare")
TGAR_URL = "https://uec.hse.ie/uec/TGAR.php"

# Map HSE website hospital names to our DB codes
HOSPITAL_MAP = {
    "Mater Misericordiae University Hospital": {"code": "MMU", "region": "Dublin North", "hse_area": "HSE Dublin North East"},
    "Beaumont Hospital": {"code": "BEA", "region": "Dublin North", "hse_area": "HSE Dublin North East"},
    "Connolly Hospital": {"code": "CON", "region": "Dublin North", "hse_area": "HSE Dublin North East"},
    "St. James's Hospital": {"code": "SJH", "region": "Dublin South", "hse_area": "HSE Dublin Mid-Leinster"},
    "St James's Hospital": {"code": "SJH", "region": "Dublin South", "hse_area": "HSE Dublin Mid-Leinster"},
    "St. Vincent's University Hospital": {"code": "SVH", "region": "Dublin South East", "hse_area": "HSE Dublin South East"},
    "Tallaght University Hospital": {"code": "TU", "region": "Dublin South West", "hse_area": "HSE Dublin Mid-Leinster"},
    "Cork University Hospital": {"code": "CU", "region": "South", "hse_area": "HSE South"},
    "Mercy University Hospital": {"code": "MER", "region": "South", "hse_area": "HSE South"},
    "University Hospital Galway": {"code": "UHG", "region": "West", "hse_area": "HSE West"},
    "University Hospital Limerick": {"code": "UHL", "region": "Mid-West", "hse_area": "HSE Mid-West"},
    "UH Waterford": {"code": "UHW", "region": "South East", "hse_area": "HSE South East"},
    "Letterkenny University Hospital": {"code": "LUH", "region": "North West", "hse_area": "HSE North West"},
    "Sligo University Hospital": {"code": "SUH", "region": "North West", "hse_area": "HSE North West"},
    "Mayo University Hospital": {"code": "MUH", "region": "West", "hse_area": "HSE West"},
    "MRH Tullamore": {"code": "TUL", "region": "Midlands", "hse_area": "HSE Dublin Mid-Leinster"},
    "MRH Portlaoise": {"code": "POR", "region": "Midlands", "hse_area": "HSE Dublin Mid-Leinster"},
    "Naas General Hospital": {"code": "NAA", "region": "Dublin Mid-Leinster", "hse_area": "HSE Dublin Mid-Leinster"},
    "Our Lady of Lourdes Hospital": {"code": "DRO", "region": "North East", "hse_area": "HSE Dublin North East"},
    "Wexford General Hospital": {"code": "WEX", "region": "South East", "hse_area": "HSE South East"},
    "Tipperary University Hospital": {"code": "STI", "region": "South East", "hse_area": "HSE South East"},
    "South Tipperary General Hospital": {"code": "STI", "region": "South East", "hse_area": "HSE South East"},
    "Cavan General Hospital": {"code": "CAV", "region": "North East", "hse_area": "HSE Dublin North East"},
    "MRH Mullingar": {"code": "MUL", "region": "Midlands", "hse_area": "HSE Dublin Mid-Leinster"},
    "St Luke's General Hospital Kilkenny": {"code": "KIL", "region": "South East", "hse_area": "HSE South East"},
    "UH Kerry": {"code": "KER", "region": "South West", "hse_area": "HSE South West"},
    "Portiuncula University Hospital": {"code": "PTU", "region": "West", "hse_area": "HSE West"},
    "Roscommon University Hospital": {"code": "ROS", "region": "West", "hse_area": "HSE West"},
}


def _safe_int(val: str) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


def scrape_date(date: datetime) -> list[dict]:
    """Scrape TrolleyGAR for a single date. Returns list of hospital records."""
    date_str = date.strftime("%d/%m/%Y")
    resp = requests.get(TGAR_URL, params={"EDDATE": date_str}, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    table = soup.find("table")
    if not table:
        print(f"  No table found for {date_str}")
        return []

    rows = table.find_all("tr")
    records = []
    seen = set()

    for row in rows:
        name_td = row.find("td", attrs={"colspan": "8"})
        if not name_td:
            continue
        div = name_td.find("div")
        if not div:
            continue
        hospital_name = div.get_text(strip=True)
        if not hospital_name or hospital_name not in HOSPITAL_MAP:
            continue

        info = HOSPITAL_MAP[hospital_name]
        code = info["code"]

        # Skip duplicates (same hospital appears twice due to nested rows)
        if code in seen:
            continue

        # Extract numeric values from all non-name tds in this row
        all_tds = row.find_all("td")
        nums = []
        for td in all_tds:
            if td == name_td or "colspan" in str(td.attrs):
                continue
            txt = td.get_text(strip=True)
            if txt.isdigit():
                nums.append(int(txt))
            elif txt == "":
                continue

        # Pattern: ED_trolleys, Ward_trolleys, Total, [spacer], Surge, [spacer], DTOC, ...
        # We take first 5 meaningful numbers
        ed_trolleys = nums[0] if len(nums) > 0 else 0
        ward_trolleys = nums[1] if len(nums) > 1 else 0
        total_trolleys = nums[2] if len(nums) > 2 else ed_trolleys + ward_trolleys
        surge_capacity = nums[3] if len(nums) > 3 else 0
        dtoc = nums[4] if len(nums) > 4 else 0

        records.append({
            "hospital_code": code,
            "hospital_name": hospital_name,
            "date": date.strftime("%Y-%m-%d"),
            "day_of_week": date.weekday(),
            "month": date.month,
            "trolley_count": total_trolleys,
            "ed_trolleys": ed_trolleys,
            "ward_trolleys": ward_trolleys,
            "surge_capacity": surge_capacity,
            "dtoc": dtoc,
            # Derived estimates for LSTM features
            "admissions": int(total_trolleys * 0.75),
            "discharges": int(total_trolleys * 0.65),
            "trolleys_gt_24hrs": int(total_trolleys * 0.3),
            "elderly_waiting": int(total_trolleys * 0.35),
            "region": info["region"],
            "hse_area": info["hse_area"],
        })
        seen.add(code)

    return records


def upsert_to_mongo(records: list[dict]):
    """Upsert records into MongoDB (no duplicates)."""
    if not records:
        return 0

    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]
    coll = db.trolley_counts

    ops = []
    for r in records:
        ops.append(UpdateOne(
            {"hospital_code": r["hospital_code"], "date": r["date"]},
            {"$set": r},
            upsert=True,
        ))

    result = coll.bulk_write(ops)
    # Ensure indexes
    coll.create_index([("hospital_code", 1), ("date", -1)])
    coll.create_index([("date", -1)])

    client.close()
    return result.upserted_count + result.modified_count


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--backfill":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 30
        print(f"Backfilling {days} days...")
        total = 0
        for d in range(days, -1, -1):
            date = datetime.now() - timedelta(days=d)
            records = scrape_date(date)
            if records:
                n = upsert_to_mongo(records)
                total += len(records)
                print(f"  {date.strftime('%Y-%m-%d')}: {len(records)} hospitals scraped")
            else:
                print(f"  {date.strftime('%Y-%m-%d')}: no data (weekend/holiday?)")
            time.sleep(1)  # Be polite to HSE servers
        print(f"Done. {total} total records upserted.")
    else:
        date_str = sys.argv[1] if len(sys.argv) > 1 else None
        if date_str:
            date = datetime.strptime(date_str, "%Y-%m-%d")
        else:
            date = datetime.now()

        print(f"Scraping TrolleyGAR for {date.strftime('%Y-%m-%d')}...")
        records = scrape_date(date)
        if records:
            n = upsert_to_mongo(records)
            print(f"  {len(records)} hospitals scraped, {n} records upserted to MongoDB")
            for r in records:
                print(f"    {r['hospital_code']}: {r['trolley_count']} trolleys")
        else:
            print("  No data found.")


if __name__ == "__main__":
    main()
