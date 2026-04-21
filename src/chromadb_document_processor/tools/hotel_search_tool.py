import json
import os
import requests
from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class HotelSearchInput(BaseModel):
    destination: str = Field(description="City/destination name for hotel search (e.g., 'Kyoto, Japan')")
    check_in_date: str = Field(description="Check-in date in YYYY-MM-DD format")
    check_out_date: str = Field(description="Check-out date in YYYY-MM-DD format")
    max_price_per_night: int = Field(
        default=0,
        description="Maximum price per night in USD; 0 means no limit",
    )


def _extract_price(rate_per_night: dict) -> int:
    if not rate_per_night:
        return 0
    price = rate_per_night.get("extracted_lowest", 0)
    if not price:
        raw = rate_per_night.get("lowest", "")
        try:
            price = int(str(raw).replace("$", "").replace(",", "").strip())
        except (ValueError, TypeError):
            price = 0
    return int(price) if price else 0


def _rating_to_stars(rating) -> int:
    try:
        r = float(rating)
    except (TypeError, ValueError):
        return 3
    if r >= 4.5:
        return 5
    if r >= 4.0:
        return 4
    return 3


_DEST_EMOJI: dict[str, str] = {
    "kyoto": "⛩️", "tokyo": "🗼", "osaka": "🏯",
    "bali": "🌺", "paris": "🗼", "barcelona": "🏛️",
    "santorini": "🌅", "maldives": "🏝️", "iceland": "🌋",
    "patagonia": "🏔️", "new york": "🗽", "london": "🎡",
    "rome": "🏟️", "dubai": "🌆", "bangkok": "🛕",
    "sydney": "🌉", "rio": "🏖️",
}


def _fallback_emoji(destination: str) -> str:
    dest_lower = destination.lower()
    for key, emoji in _DEST_EMOJI.items():
        if key in dest_lower:
            return emoji
    return "🏨"


class HotelSearchTool(BaseTool):
    name: str = "Hotel Search"
    description: str = (
        "Search for hotels via SerpAPI Google Hotels. "
        "Provide destination city, check-in/check-out dates (YYYY-MM-DD), "
        "and an optional max price per night in USD (0 = no limit). "
        "Returns a JSON object with a 'hotels' array of 2.5–5 star properties."
    )
    args_schema: type[BaseModel] = HotelSearchInput

    def _run(
        self,
        destination: str,
        check_in_date: str,
        check_out_date: str,
        max_price_per_night: int = 0,
    ) -> str:
        api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key:
            return json.dumps({"error": "SERPAPI_API_KEY not set.", "hotels": []})

        params = {
            "engine": "google_hotels",
            "q": f"Hotels in {destination}",
            "check_in_date": check_in_date,
            "check_out_date": check_out_date,
            "adults": 2,
            "currency": "USD",
            "hl": "en",
            "gl": "us",
            "hotel_class": "3,4,5",
            "api_key": api_key,
        }
        if max_price_per_night > 0:
            params["max_price"] = max_price_per_night

        try:
            response = requests.get(
                "https://serpapi.com/search", params=params, timeout=20
            )
            data = response.json()
        except Exception as e:
            return json.dumps({"error": str(e), "hotels": []})

        if "error" in data:
            return json.dumps({"error": data["error"], "hotels": []})

        properties = data.get("properties", [])
        fallback = _fallback_emoji(destination)
        hotels = []

        for i, prop in enumerate(properties[:6], 1):
            price = _extract_price(prop.get("rate_per_night", {}))
            rating = prop.get("overall_rating", 3.5)
            stars = _rating_to_stars(rating)

            amenities = prop.get("amenities", [])
            if not isinstance(amenities, list):
                amenities = []
            amenities = [str(a) for a in amenities[:8]]

            # Neighborhood: first nearby place or city name
            neighborhood = ""
            nearby = prop.get("nearby_places", [])
            if nearby and isinstance(nearby, list):
                neighborhood = nearby[0].get("name", "")
            if not neighborhood:
                neighborhood = destination.split(",")[0].strip()

            images = prop.get("images", [])
            thumbnail = images[0].get("thumbnail", "") if images else ""

            hotels.append({
                "id": f"live-h{i}",
                "name": prop.get("name", f"Hotel {i}"),
                "stars": stars,
                "rating": float(rating) if rating else 3.5,
                "reviews": prop.get("reviews", 0),
                "type": prop.get("type", "Hotel"),
                "neighborhood": neighborhood,
                "price": price,
                "description": prop.get("description", ""),
                "amenities": amenities,
                "link": prop.get("link", ""),
                "image": thumbnail or fallback,
            })

        return json.dumps({"hotels": hotels})
