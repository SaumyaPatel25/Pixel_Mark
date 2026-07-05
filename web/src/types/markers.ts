export type MarkerAnchorKind = 'dom-relative' | 'viewport-absolute' | 'canvas-relative' | 'webgl-clip-space' | 'manual';
export type MarkerRendererType = 'dom' | 'shadow-dom' | 'canvas2d' | 'webgl' | 'threejs';
export type CreatorRole = 'developer' | 'reviewer';
export type MarkerStatus = 'open' | 'triaged' | 'in_progress' | 'resolved' | 'dismissed';
export type MarkerPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Marker {
  id: string;
  session_id: string;
  project_id: string;
  page_visit_id: string | null;
  creator_id: string | null;
  creator_name: string | null;
  creator_role: CreatorRole | null;
  color_token: string | null;

  anchor_kind: MarkerAnchorKind;
  page_url: string | null;
  page_title: string | null;
  target_selector: string | null;
  target_xpath: string | null;
  dom_text_excerpt: string | null;
  offset_x_ratio: number | null;
  offset_y_ratio: number | null;
  viewport_x: number | null;
  viewport_y: number | null;
  page_x: number | null;
  page_y: number | null;
  viewport_width: number | null;
  viewport_height: number | null;
  element_rect_json: Record<string, any> | null;
  scroll_x: number | null;
  scroll_y: number | null;

  canvas_id: string | null;
  canvas_x_ratio: number | null;
  canvas_y_ratio: number | null;
  webgl_clip_x: number | null;
  webgl_clip_y: number | null;
  renderer_type: MarkerRendererType | null;
  anchor_mode?: 'dom' | 'fuzzy_dom' | 'viewport_fallback' | null;

  title: string | null;
  description: string | null;
  status: MarkerStatus;
  priority: MarkerPriority;
  is_deleted: boolean;
  created_at: string;
  updated_at: string | null;
  version: number;

  browser: string | null;
  os: string | null;
  device_pixel_ratio: number | null;
  console_errors_json: any[] | null;
  network_errors_json: any[] | null;
  screenshot_url: string | null;
  encrypted_context: string | null;
  issueType?: string | null;
  issue_type?: string | null;
}

export interface ReviewerIdentity {
  id: string;
  session_id: string;
  display_name: string;
  role: 'reviewer';
  color_token: string;
  created_at: string;
  last_seen_at?: string | null;
}

export type RealtimeEventType = 
  | 'marker_created'
  | 'marker_updated'
  | 'marker_deleted'
  | 'marker_moved'
  | 'marker_resolved'
  | 'session_snapshot'
  | 'session_reconciled'
  | 'presence_updated'
  | 'heartbeat'
  | 'error';

export interface BaseEventEnvelope {
  type: RealtimeEventType;
  session_id: string;
  event_id: string;
  occurred_at: string;
  actor_id?: string | null;
  actor_role?: CreatorRole | null;
  marker_id?: string | null;
  version?: number | null;
}

export interface MarkerRealtimeEvent extends BaseEventEnvelope {
  type: 'marker_created' | 'marker_updated' | 'marker_moved' | 'marker_resolved';
  marker_id: string;
  version: number;
  data: {
    marker: Marker;
  };
}

export interface MarkerDeletedEvent extends BaseEventEnvelope {
  type: 'marker_deleted';
  marker_id: string;
  version: number;
  data: {
    marker_id: string;
  };
}

export interface SessionSnapshotEvent extends BaseEventEnvelope {
  type: 'session_snapshot';
  data: {
    generated_at: string;
    markers: Marker[];
    connection_count: number;
  };
}

export interface SessionReconciledEvent extends BaseEventEnvelope {
  type: 'session_reconciled';
  data: {
    status: string;
    message: string;
    connection_count: number;
  };
}

export interface HeartbeatEvent extends BaseEventEnvelope {
  type: 'heartbeat';
  data: {
    status: 'ack';
  };
}

export interface ErrorEvent extends BaseEventEnvelope {
  type: 'error';
  data: {
    message: string;
  };
}

export interface PresenceUpdatedEvent extends BaseEventEnvelope {
  type: 'presence_updated';
  data: {
    participants: {
      id: string
      name: string
      role: 'developer' | 'reviewer'
      color_token: string
      is_online: boolean
      last_seen_at: string
    }[]
  };
}

export type SessionSocketEvent =
  | MarkerRealtimeEvent
  | MarkerDeletedEvent
  | SessionSnapshotEvent
  | SessionReconciledEvent
  | HeartbeatEvent
  | ErrorEvent
  | PresenceUpdatedEvent;
