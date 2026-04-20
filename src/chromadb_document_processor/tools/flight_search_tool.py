import json
import os
import requests
from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class FlightSearchInput(BaseModel):
    origin: str = Field(description="Departure airport IATA code (e.g., JFK)")
    destination: str = Field(description="Arrival airport IATA code (e.g., LAX)")
    outbound_date: str = Field(description="Departure date in YYYY-MM-DD format")
    return_date: str = Field(default="", description="Return date in YYYY-MM-DD format; leave empty for one-way")


_AIRLINE_FLAGS: dict[str, str] = {
    # Japan
    "japan airlines": "🇯🇵", "jal": "🇯🇵",
    "all nippon airways": "🇯🇵", "ana": "🇯🇵",
    # South Korea
    "korean air": "🇰🇷", "asiana airlines": "🇰🇷", "asiana": "🇰🇷",
    "jeju air": "🇰🇷", "jin air": "🇰🇷",
    # China / Hong Kong / Taiwan
    "air china": "🇨🇳", "china eastern": "🇨🇳", "china southern": "🇨🇳",
    "xiamen airlines": "🇨🇳", "hainan airlines": "🇨🇳",
    "cathay pacific": "🇭🇰", "hong kong airlines": "🇭🇰",
    "eva air": "🇹🇼", "china airlines": "🇹🇼",
    # Southeast Asia
    "singapore airlines": "🇸🇬", "scoot": "🇸🇬",
    "malaysia airlines": "🇲🇾", "airasia": "🇲🇾",
    "thai airways": "🇹🇭", "thai lion air": "🇹🇭", "bangkok airways": "🇹🇭",
    "vietnam airlines": "🇻🇳", "vietjet air": "🇻🇳", "bamboo airways": "🇻🇳",
    "garuda indonesia": "🇮🇩", "batik air": "🇮🇩", "lion air": "🇮🇩",
    "philippine airlines": "🇵🇭", "cebu pacific": "🇵🇭",
    # South Asia
    "air india": "🇮🇳", "indigo": "🇮🇳", "spicejet": "🇮🇳", "vistara": "🇮🇳",
    "srilankan airlines": "🇱🇰", "sri lankan airlines": "🇱🇰",
    # Middle East
    "emirates": "🇦🇪", "flydubai": "🇦🇪",
    "etihad airways": "🇦🇪", "etihad": "🇦🇪",
    "qatar airways": "🇶🇦",
    "royal jordanian": "🇯🇴",
    "middle east airlines": "🇱🇧",
    "oman air": "🇴🇲", "air arabia": "🇦🇪",
    # Africa
    "ethiopian airlines": "🇪🇹",
    "kenya airways": "🇰🇪",
    "south african airways": "🇿🇦",
    "royal air maroc": "🇲🇦",
    # Europe — Western
    "british airways": "🇬🇧", "virgin atlantic": "🇬🇧",
    "easyjet": "🇬🇧", "jet2": "🇬🇧",
    "air france": "🇫🇷", "transavia": "🇫🇷",
    "lufthansa": "🇩🇪", "eurowings": "🇩🇪", "condor": "🇩🇪",
    "klm": "🇳🇱", "transavia nl": "🇳🇱",
    "swiss": "🇨🇭", "swiss international air lines": "🇨🇭",
    "austrian airlines": "🇦🇹",
    "brussels airlines": "🇧🇪",
    "iberia": "🇪🇸", "vueling": "🇪🇸", "air europa": "🇪🇸",
    "tap air portugal": "🇵🇹", "tap portugal": "🇵🇹",
    "alitalia": "🇮🇹", "ita airways": "🇮🇹",
    "ryanair": "🇮🇪", "aer lingus": "🇮🇪",
    "icelandair": "🇮🇸",
    # Europe — Nordic / Eastern
    "sas": "🇸🇪", "scandinavian airlines": "🇸🇪",
    "norwegian": "🇳🇴", "norwegian air shuttle": "🇳🇴",
    "finnair": "🇫🇮",
    "lot polish airlines": "🇵🇱", "lot": "🇵🇱",
    "czech airlines": "🇨🇿",
    "wizz air": "🇭🇺",
    "turkish airlines": "🇹🇷", "pegasus airlines": "🇹🇷",
    "aegean airlines": "🇬🇷", "olympic air": "🇬🇷",
    # Americas
    "american airlines": "🇺🇸", "delta": "🇺🇸", "delta air lines": "🇺🇸",
    "united airlines": "🇺🇸", "united": "🇺🇸",
    "southwest airlines": "🇺🇸", "jetblue": "🇺🇸", "alaska airlines": "🇺🇸",
    "spirit airlines": "🇺🇸", "frontier airlines": "🇺🇸", "sun country": "🇺🇸",
    "air canada": "🇨🇦", "westjet": "🇨🇦",
    "aeromexico": "🇲🇽", "volaris": "🇲🇽",
    "latam airlines": "🇨🇱", "latam": "🇨🇱",
    "avianca": "🇨🇴",
    "copa airlines": "🇵🇦",
    "gol linhas aéreas": "🇧🇷", "azul brazilian airlines": "🇧🇷", "tam": "🇧🇷",
    # Oceania
    "qantas": "🇦🇺", "jetstar": "🇦🇺", "virgin australia": "🇦🇺",
    "air new zealand": "🇳🇿",
}


def _badge(airline: str) -> str:
    return _AIRLINE_FLAGS.get(airline.lower(), "✈️")


def _minutes_to_duration(minutes) -> str:
    if not isinstance(minutes, (int, float)):
        return str(minutes)
    h, m = divmod(int(minutes), 60)
    return f"{h}h {m:02d}m"


def _search_one_way(dep_id: str, arr_id: str, date: str, api_key: str, id_prefix: str) -> list:
    """Call SerpAPI for a one-way search and return a list of flight dicts."""
    params = {
        "engine": "google_flights",
        "departure_id": dep_id,
        "arrival_id": arr_id,
        "outbound_date": date,
        "currency": "USD",
        "hl": "en",
        "api_key": api_key,
        "type": "2",  # one-way
    }
    try:
        response = requests.get("https://serpapi.com/search", params=params, timeout=15)
        data = response.json()
    except Exception:
        return []

    if "error" in data:
        return []

    options = data.get("best_flights", []) or data.get("other_flights", [])
    results = []
    for i, option in enumerate(options[:5], 1):
        legs = option.get("flights", [])
        if not legs:
            continue

        first_leg = legs[0]
        last_leg = legs[-1]
        airline = first_leg.get("airline", "Unknown")
        dep = first_leg.get("departure_airport", {})
        arr = last_leg.get("arrival_airport", {})

        stops_count = len(legs) - 1
        if stops_count == 0:
            stops_label = "Nonstop"
        else:
            via = ", ".join(
                leg.get("arrival_airport", {}).get("id", "")
                for leg in legs[:-1]
                if leg.get("arrival_airport", {}).get("id")
            )
            stops_label = f"{stops_count} stop · {via}" if via else f"{stops_count} stop"

        results.append({
            "id": f"{id_prefix}-{i}",
            "airline": airline,
            "badge": _badge(airline),
            "flightNumber": first_leg.get("flight_number", ""),
            "from": dep.get("id", dep_id),
            "to": arr.get("id", arr_id),
            "departure": dep.get("time", ""),
            "arrival": arr.get("time", ""),
            "duration": _minutes_to_duration(option.get("total_duration")),
            "stops": stops_label,
            "price": option.get("price", 0),
            "class": first_leg.get("travel_class", "Economy"),
            "perks": [],
        })
    return results


class FlightSearchTool(BaseTool):
    name: str = "Flight Search"
    description: str = (
        "Search for flights via SerpAPI Google Flights. "
        "Provide IATA airport codes and dates in YYYY-MM-DD format. "
        "Returns a JSON object with 'flights' (outbound) and 'return_flights' (inbound) arrays."
    )
    args_schema: type[BaseModel] = FlightSearchInput

    def _run(self, origin: str, destination: str, outbound_date: str, return_date: str = "") -> str:
        api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key:
            return json.dumps({"error": "SERPAPI_API_KEY not set.", "flights": [], "return_flights": []})

        origin = origin.upper()
        destination = destination.upper()

        flights = _search_one_way(origin, destination, outbound_date, api_key, "live")

        return_flights = []
        if return_date:
            # Swap origin/destination for the inbound leg
            return_flights = _search_one_way(destination, origin, return_date, api_key, "return")

        return json.dumps({"flights": flights, "return_flights": return_flights})
