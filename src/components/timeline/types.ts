export type EventType = 'quake' | 'disaster' | 'volcano' | 'news' | 'geo' | 'vessel';

export interface TimelineEvent {
  id: string;
  type: EventType;
  label: string;
  timestamp: string;
  severity?: string;
  location?: string;
  detail?: string;
}
