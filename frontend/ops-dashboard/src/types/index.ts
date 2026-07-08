/** Shared TypeScript types for Ops Dashboard */

export interface IncidentQueueItem {
  incident_id: string
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  time_since_report: string
  location: string
  status: 'new' | 'in_progress' | 'resolved' | 'escalated'
  assigned_volunteer_id: string | null
  next_action: string | null
  resolved_at: string | null
}

export interface IncidentQueue {
  timestamp: string
  active_incidents: IncidentQueueItem[]
  summary: {
    critical_count: number
    high_count: number
    medium_count: number
    low_count: number
  }
}

export interface PredictionItem {
  gate: string
  current_capacity_percent: number
  predicted_capacity_percent: number
  time_to_critical: string
  risk_level: 'low' | 'medium' | 'high'
  reason: string
  recommended_action: string
  confidence_percent: number
  ai_source: string
}

export interface HeatmapZone {
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
  stadium_zones: HeatmapZone[]
  stadium_level_stats: {
    total_capacity: number
    current_occupancy: number
    occupancy_percent: number
    estimated_arrival_rate: number
    eta_to_full_capacity: string
  }
}

export interface BroadcastResult {
  broadcast_id: string
  status: string
  target_fan_sessions: number
  delivered_count: number
  failed_count: number
  messages_pushed: Record<string, string>
  aria_live_announcements: boolean
  screen_reader_compatible: boolean
}

export interface HealthStatus {
  status: string
  timestamp: string
  services: {
    firestore: string
    vertex_ai: string
    google_maps_api: string
    cloud_logging: string
  }
  uptime_seconds: number
  request_count_last_hour: number
  mode: string
}

export type OpsTab = 'overview' | 'incidents' | 'predictions' | 'broadcast' | 'heatmap'
