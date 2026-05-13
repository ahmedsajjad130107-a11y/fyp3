"""
Budget engine — LLM-powered hotel & transport option generator.

get_hotel_options()    → ask LLM for 4 real hotel options matching budget tier
get_transport_options() → ask LLM for 3-4 transport options with realistic PKR prices
calculate_estimated_cost() → hotel + transport only; food & activities excluded
"""

import asyncio
import json
import re
from typing import Any, List

from config import (
    GROQ_MODEL_NAME,
    OPENAI_MODEL_NAME,
    _get_groq_client,
    _get_openai_client,
)
from schemas import EstimatedCostResponse, HotelOption, TransportOption


# ── LLM call (synchronous, run in thread) ────────────────────────────────────

def _call_llm_sync(prompt: str) -> str:
    """Try OpenAI (GPT) first, then Groq as fallback. Raises RuntimeError if neither works."""
    oai = _get_openai_client()
    groq = _get_groq_client()

    # 1) Try OpenAI first (GPT)
    if oai is not None:
        try:
            resp = oai.chat.completions.create(
                model=OPENAI_MODEL_NAME or "gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0,  # deterministic — keeps indices stable across /options & /estimate
            )
            return resp.choices[0].message.content
        except Exception as exc:
            print(f"[BudgetEngine] OpenAI failed, trying Groq: {exc}")

    # 2) Groq as fallback
    if groq is not None:
        try:
            resp = groq.chat.completions.create(
                model=GROQ_MODEL_NAME or "llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )
            return resp.choices[0].message.content
        except Exception as exc:
            print(f"[BudgetEngine] Groq also failed: {exc}")

    raise RuntimeError(
        "No LLM client available. Set OPENAI_API_KEY or GROQ_API_KEY in .env"
    )


def _extract_json(text: str) -> Any:
    """Extract JSON array or object from LLM output (handles code fences)."""
    # Strip markdown code fences
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if m:
        text = m.group(1)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find first JSON array or object in the text
    for pat in [r"\[[\s\S]*?\]", r"\{[\s\S]*?\}"]:
        m = re.search(pat, text)
        if m:
            try:
                return json.loads(m.group())
            except json.JSONDecodeError:
                continue

    raise ValueError(f"No valid JSON in LLM response: {text[:300]!r}")


# ── Tier descriptions for prompts ─────────────────────────────────────────────

TIER_HOTEL_DESCRIPTIONS = {
    "low": "budget guesthouses and economy hotels, typically PKR 1,500–4,000 per room per night",
    "medium": "comfortable 3-star hotels with good amenities, typically PKR 5,000–12,000 per room per night",
    "high": "premium 4-5 star hotels, luxury resorts, and boutique hotels, typically PKR 15,000–40,000 per room per night",
}


# ── Hotel options ─────────────────────────────────────────────────────────────

def _hotel_prompt(destination: str, num_days: int, num_travelers: int, budget_tier: str) -> str:
    tier_desc = TIER_HOTEL_DESCRIPTIONS.get(budget_tier, TIER_HOTEL_DESCRIPTIONS["medium"])
    return (
        f"You are a Pakistani travel expert. Return exactly 4 hotel options for {destination}, Pakistan.\n\n"
        f"Trip details: {num_days} day(s), {num_travelers} traveler(s).\n"
        f"Budget tier: {budget_tier.upper()} — the user wants {tier_desc}.\n\n"
        f"Return a JSON array of exactly 4 objects that match the {budget_tier} tier. Each object must have:\n"
        f'  "name": real hotel name in {destination}\n'
        f'  "star_rating": integer 1-5 (matching the tier)\n'
        f'  "price_per_night": realistic 2024-2025 PKR price per room per night\n'
        f'  "total_price": price_per_night * {num_days}\n'
        f'  "location": area or neighbourhood in {destination}\n'
        f'  "amenities": array of 3-5 strings (e.g. "WiFi", "AC", "Breakfast")\n\n'
        f"IMPORTANT: ALL prices must be in PKR (Pakistani Rupees). Never use USD.\n"
        f"Use real, plausible hotel names for {destination}. "
        f"Return ONLY the JSON array — no explanation, no markdown."
    )


def _parse_hotels(raw: Any, num_days: int) -> List[HotelOption]:
    items = raw if isinstance(raw, list) else [raw]
    result: List[HotelOption] = []
    for h in items:
        if not isinstance(h, dict):
            continue
        ppn = float(h.get("price_per_night") or 0)
        if ppn <= 0:
            continue
        result.append(HotelOption(
            name=str(h.get("name") or "Hotel"),
            star_rating=max(1, min(5, int(h.get("star_rating") or 3))),
            price_per_night=round(ppn, 2),
            total_price=round(float(h.get("total_price") or ppn * num_days), 2),
            location=str(h.get("location") or "City centre"),
            amenities=[str(a) for a in (h.get("amenities") or [])],
        ))
    return result


def _hotels_fallback(destination: str, num_days: int, budget_tier: str) -> List[HotelOption]:
    tier_options = {
        "low": [
            ("Budget Guesthouse", 2, 2_500, ["WiFi", "Fan"]),
            ("Economy Inn", 2, 3_000, ["WiFi", "AC"]),
            ("Traveler Lodge", 2, 3_500, ["WiFi", "AC", "Breakfast"]),
            ("City Hostel", 1, 2_000, ["WiFi", "Fan", "Shared Bath"]),
        ],
        "medium": [
            ("Standard Hotel", 3, 6_000, ["WiFi", "AC", "Breakfast"]),
            ("Comfort Inn", 3, 8_000, ["WiFi", "AC", "Breakfast", "Restaurant"]),
            ("Business Hotel", 3, 10_000, ["WiFi", "AC", "Pool", "Restaurant"]),
            ("City Suites", 4, 12_000, ["WiFi", "AC", "Gym", "Restaurant"]),
        ],
        "high": [
            ("Luxury Hotel", 5, 20_000, ["WiFi", "AC", "Pool", "Spa", "Restaurant"]),
            ("Grand Resort", 5, 28_000, ["WiFi", "AC", "Pool", "Spa", "Fine Dining"]),
            ("Premium Suites", 4, 18_000, ["WiFi", "AC", "Gym", "Restaurant", "Bar"]),
            ("Royal Palace Hotel", 5, 35_000, ["WiFi", "AC", "Pool", "Spa", "Butler Service"]),
        ],
    }
    tiers = tier_options.get(budget_tier, tier_options["medium"])
    return [
        HotelOption(
            name=f"{label} {destination}",
            star_rating=stars,
            price_per_night=ppn,
            total_price=ppn * num_days,
            location="City centre",
            amenities=amenities,
        )
        for label, stars, ppn, amenities in tiers
    ]


def _hotels_sync(destination: str, num_days: int, num_travelers: int, budget_tier: str) -> List[HotelOption]:
    prompt = _hotel_prompt(destination, num_days, num_travelers, budget_tier)
    for attempt in range(2):
        try:
            raw_text = _call_llm_sync(prompt)
            hotels = _parse_hotels(_extract_json(raw_text), num_days)
            if hotels:
                return hotels[:4]
        except Exception as exc:
            print(f"[BudgetEngine] Hotel options attempt {attempt + 1} failed: {exc}")
    print("[BudgetEngine] Using static hotel fallback")
    return _hotels_fallback(destination, num_days, budget_tier)


async def get_hotel_options(
    destination: str,
    num_days: int,
    num_travelers: int,
    budget_tier: str,
) -> List[HotelOption]:
    """Return up to 4 LLM-generated hotel options matching the budget tier."""
    return await asyncio.to_thread(_hotels_sync, destination, num_days, num_travelers, budget_tier)


# ── Transport options ─────────────────────────────────────────────────────────

def _transport_prompt(destination: str, num_travelers: int, budget_tier: str) -> str:
    return (
        f"You are a Pakistani travel expert. Return transport options to reach {destination}, Pakistan.\n\n"
        f"Trip details: {num_travelers} traveler(s), budget tier: {budget_tier.upper()}.\n\n"
        f"Return a JSON array of 3-4 objects. Include a mix of bus, train, flight, car where available. Each object:\n"
        f'  "type": one of "flight", "bus", "train", "car"\n'
        f'  "provider": real Pakistani provider name\n'
        f'  "price_per_person": realistic one-way fare in PKR\n'
        f'  "total_price": price_per_person * {num_travelers}\n'
        f'  "duration": travel time string (e.g. "2h 30m")\n\n'
        f"CRITICAL — Use realistic 2024-2025 Pakistan transport prices in PKR:\n"
        f"  • Intercity standard buses (e.g. Faisal Movers, Niazi Express): Rs. 1,500–3,000 per person\n"
        f"  • Daewoo Express / luxury buses: Rs. 2,500–4,500 per person\n"
        f"  • Pakistan Railways (business class): Rs. 800–2,000 per person\n"
        f"  • Domestic flights (PIA, Airblue, Serene Air): Rs. 8,000–25,000 per person depending on route\n"
        f"  • Car rental with driver: Rs. 5,000–15,000 per day\n"
        f"  • ALL prices MUST be in PKR (Pakistani Rupees). NEVER use USD or any other currency.\n\n"
        f"Example providers: PIA, Airblue, Serene Air, Daewoo Express, Faisal Movers, Niazi Express, Pakistan Railways, rent-a-car. "
        f"Order cheapest to most expensive. "
        f"Return ONLY the JSON array — no explanation, no markdown."
    )


def _parse_transport(raw: Any, num_travelers: int) -> List[TransportOption]:
    items = raw if isinstance(raw, list) else [raw]
    result: List[TransportOption] = []
    for t in items:
        if not isinstance(t, dict):
            continue
        ppp = float(t.get("price_per_person") or 0)
        if ppp <= 0:
            continue
        result.append(TransportOption(
            type=str(t.get("type") or "bus"),
            provider=str(t.get("provider") or "Local Transport"),
            price_per_person=round(ppp, 2),
            total_price=round(float(t.get("total_price") or ppp * num_travelers), 2),
            duration=str(t.get("duration") or "Varies"),
        ))
    return result


def _transport_fallback(num_travelers: int) -> List[TransportOption]:
    options = [
        ("bus", "Faisal Movers", 1_800, "Varies by route"),
        ("bus", "Daewoo Express", 3_000, "Varies by route"),
        ("train", "Pakistan Railways", 1_200, "Varies by route"),
        ("flight", "PIA", 12_000, "1h – 2h"),
    ]
    return [
        TransportOption(
            type=t, provider=provider,
            price_per_person=ppp,
            total_price=ppp * num_travelers,
            duration=dur,
        )
        for t, provider, ppp, dur in options
    ]


def _transport_sync(destination: str, num_travelers: int, budget_tier: str) -> List[TransportOption]:
    prompt = _transport_prompt(destination, num_travelers, budget_tier)
    for attempt in range(2):
        try:
            raw_text = _call_llm_sync(prompt)
            options = _parse_transport(_extract_json(raw_text), num_travelers)
            if options:
                return options[:4]
        except Exception as exc:
            print(f"[BudgetEngine] Transport options attempt {attempt + 1} failed: {exc}")
    print("[BudgetEngine] Using static transport fallback")
    return _transport_fallback(num_travelers)


async def get_transport_options(
    destination: str,
    num_travelers: int,
    budget_tier: str,
) -> List[TransportOption]:
    """Return 3-4 LLM-generated transport options (cheapest to most expensive)."""
    return await asyncio.to_thread(_transport_sync, destination, num_travelers, budget_tier)


# ── Cost estimate ─────────────────────────────────────────────────────────────

# ── Cost estimate ─────────────────────────────────────────────────────────────

import math


def calculate_estimated_cost(
    hotel: HotelOption,
    transport: TransportOption,
    num_days: int,
    num_travelers: int,
) -> EstimatedCostResponse:
    """
    Estimate trip cost using:

    • Hotel pricing = per room per night
    • Transport pricing = one-way per traveler
    • Transport total is converted to round-trip
    • Activities and food are excluded

    Assumptions:
    • 1 hotel room accommodates up to 2 travelers
    • Hotel nights = max(1, num_days - 1)
    """

    # Prevent invalid values
    num_days = max(1, num_days)
    num_travelers = max(1, num_travelers)

    # Travel industry standard:
    # 3-day trip usually means 2 hotel nights
    num_nights = max(1, num_days - 1)

    # Assume 2 travelers per room
    num_rooms = math.ceil(num_travelers / 2)

    # Hotel cost (per room pricing)
    accommodation_cost = (
        hotel.price_per_night
        * num_nights
        * num_rooms
    )

    # Transport.total_price currently represents:
    # one-way total group fare
    transport_cost = transport.total_price * 2

    total = round(
        accommodation_cost + transport_cost,
        2,
    )

    return EstimatedCostResponse(
        selected_hotel=hotel,
        selected_transport=transport,
        total_estimated_cost=total,
        note=(
            "⚠️ Activities and food are not included in this estimate. "
            "Hotel cost is based on shared room occupancy "
            "(2 travelers per room). "
            "Transport cost includes round-trip travel."
        ),
    )
