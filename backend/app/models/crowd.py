"""Pydantic models for crowd signals and heatmap data."""
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class Signal(BaseModel):
    sensor_id: str
    type: str  # turnstile | occupancy | transit_delay | weather
    value: Optional[float] = None
    unit: Optional[str] = None
    location: Optional[str] = None
    condition: Optional[str] = None
    visibility: Optional[float] = None
    temperature_celsius: Optional[float] = None


class CrowdSignalRequest(BaseModel):
    timestamp: str
    signals: list[Signal]


class StadiumStateResponse(BaseModel):
    avg_occupancy: float
    busiest_section: str
    metro_delay_minutes: int
    weather_condition: str


class CrowdSignalResponse(BaseModel):
    status: str
    saved_signal_count: int
    current_stadium_state: StadiumStateResponse


class ZoneData(BaseModel):
    zone_id: str
    zone_name: str
    capacity: int
    current_occupancy: int
    occupancy_percent: float
    trend: str
    trend_rate: str
    color_coding: str  # green | yellow | orange | red
    recommendation: str


class StadiumLevelStats(BaseModel):
    total_capacity: int
    current_occupancy: int
    occupancy_percent: float
    estimated_arrival_rate: int
    eta_to_full_capacity: str


class HeatmapResponse(BaseModel):
    timestamp: str
    stadium_zones: list[ZoneData]
    stadium_level_stats: StadiumLevelStats
