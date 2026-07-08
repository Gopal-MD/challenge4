/** Shared TypeScript types for the Fan PWA */

export interface RouteResult {
  route_id: string
  primary_route: {
    waypoints: string[]
    distance_meters: number
    eta_seconds: number
    accessibility_notes: string
    carbon_kg_equivalent: number
  }
  alternatives: Array<{
    route_type: string
    distance_meters: number
    eta_seconds: number
    predicted_density: string
  }>
  transit_info: {
    metro_station_nearby: string
    eta_minutes: number
    accessibility_features: string[]
  }
  source: 'maps_api' | 'fallback_rules'
}

export interface ZoneData {
  zone_id: string
  zone_name: string
  capacity: number
  current_occupancy: number
  occupancy_percent: number
  trend: string
  trend_rate: string
  color_coding: 'green' | 'yellow' | 'orange' | 'red'
  recommendation: string
}

export interface HeatmapData {
  timestamp: string
  stadium_zones: ZoneData[]
  stadium_level_stats: {
    total_capacity: number
    current_occupancy: number
    occupancy_percent: number
    estimated_arrival_rate: number
    eta_to_full_capacity: string
  }
}

export interface BroadcastEvent {
  broadcast_id: string
  urgency: 'immediate' | 'elevated' | 'advisory'
  affected_gates: string[]
  recommended_alternative_gate: string
  reason: string
  messages: Record<string, string>
  route_recalculate: boolean
  timestamp: string
  aria_live: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  loading?: boolean
}

export type Language = 'en' | 'es' | 'fr' | 'pt' | 'de' | 'ar' | 'zh' | 'ja' | 'hi'

export interface AccessibilitySettings {
  highContrast: boolean
  largeText: boolean
  reduceMotion: boolean
  screenReader: boolean
}

export interface StadiumStatus {
  avg_occupancy: number
  busiest_section: string
  metro_delay_minutes: number
  weather_condition: string
}
