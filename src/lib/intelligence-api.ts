import { supabase } from './supabase';

export interface Earthquake {
  id: string;
  event_id: string;
  magnitude: number;
  location: string;
  latitude: number;
  longitude: number;
  depth: number;
  event_time: string;
  properties: Record<string, any>;
}

export interface Disaster {
  id: string;
  event_id: string;
  title: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  event_date: string;
  closed: boolean;
  properties: Record<string, any>;
}

export interface NewsEvent {
  id: string;
  source: string;
  title: string;
  url: string;
  content: string;
  published_at: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  categories: string[];
  sentiment: string | null;
}

export interface Vessel {
  id: string;
  mmsi: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  heading: number;
  destination: string;
  flag: string;
  last_position_time: string;
  properties: Record<string, any>;
}

export interface VolcanoEvent {
  id: string;
  volcano_id: string;
  name: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  status: 'erupting' | 'unrest' | 'normal';
  alert_level: string | null;
  activity_description: string | null;
  last_eruption: string | null;
  source: string;
  properties: Record<string, any>;
  updated_at: string;
}

export interface GeopoliticalEvent {
  id: string;
  event_id: string;
  title: string;
  category: 'conflict' | 'sanctions' | 'curfew' | 'coup' | 'crisis' | 'protest' | 'geopolitical';
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  is_active: boolean;
  started_at: string | null;
  source: string;
  properties: Record<string, any>;
  updated_at: string;
}

export interface CyberThreat {
  id: string;
  threat_id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  threat_type: string;
  is_active: boolean;
  first_seen: string;
  last_seen: string;
}

export interface BankEvent {
  id: string;
  institution: string;
  event_type: string;
  description: string;
  severity: string;
  country: string;
  event_time: string;
}

export interface InfoOp {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  platform: string;
  origin_country: string;
  is_active: boolean;
  first_detected: string;
}

export interface UAETwitter {
  id: string;
  tweet_id: string;
  author: string;
  content: string;
  posted_at: string;
  sentiment: string;
  hashtags: string[];
}

export class IntelligenceAPI {
  private static functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  static async getEarthquakes(minMagnitude = 0, limit = 100): Promise<Earthquake[]> {
    const { data, error } = await supabase
      .from('earthquakes')
      .select('*')
      .gte('magnitude', minMagnitude)
      .order('event_time', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getDisasters(limit = 100): Promise<Disaster[]> {
    const { data, error } = await supabase
      .from('disasters')
      .select('*')
      .eq('closed', false)
      .order('event_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getNews(limit = 100): Promise<NewsEvent[]> {
    const { data, error } = await supabase
      .from('news_events')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getVessels(limit = 100): Promise<Vessel[]> {
    const { data, error } = await supabase
      .from('vessels')
      .select('*')
      .order('last_position_time', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getVolcanoes(limit = 100): Promise<VolcanoEvent[]> {
    const { data, error } = await supabase
      .from('volcanoes')
      .select('*')
      .in('status', ['erupting', 'unrest'])
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getGeopoliticalEvents(limit = 100): Promise<GeopoliticalEvent[]> {
    const { data, error } = await supabase
      .from('geopolitical_events')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static subscribeToVessels(callback: (vessel: Vessel) => void) {
    return supabase
      .channel('vessels-channel')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'vessels',
      }, (payload) => {
        callback(payload.new as Vessel);
      })
      .subscribe();
  }

  static async getCyberThreats(limit = 100): Promise<CyberThreat[]> {
    const { data, error } = await supabase
      .from('cyber_threats')
      .select('*')
      .eq('is_active', true)
      .order('first_seen', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getBankEvents(limit = 100): Promise<BankEvent[]> {
    const { data, error } = await supabase
      .from('bank_events')
      .select('*')
      .order('event_time', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getInfoOps(limit = 100): Promise<InfoOp[]> {
    const { data, error } = await supabase
      .from('info_ops')
      .select('*')
      .eq('is_active', true)
      .order('first_detected', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getUAETwitter(limit = 100): Promise<UAETwitter[]> {
    const { data, error } = await supabase
      .from('uae_twitter_feed')
      .select('*')
      .order('posted_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getAllIntelligence() {
    const response = await fetch(`${this.functionsUrl}/get-intelligence?type=all`, {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch intelligence data');
    }

    const result = await response.json();
    return result.data;
  }

  static async triggerDataSync(): Promise<void> {
    const response = await fetch(`${this.functionsUrl}/scheduler`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to trigger data sync');
    }
  }

  static subscribeToEarthquakes(callback: (earthquake: Earthquake) => void) {
    return supabase
      .channel('earthquakes-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'earthquakes',
      }, (payload) => {
        callback(payload.new as Earthquake);
      })
      .subscribe();
  }

  static subscribeToDisasters(callback: (disaster: Disaster) => void) {
    return supabase
      .channel('disasters-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'disasters',
      }, (payload) => {
        callback(payload.new as Disaster);
      })
      .subscribe();
  }

  static subscribeToNews(callback: (news: NewsEvent) => void) {
    return supabase
      .channel('news-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'news_events',
      }, (payload) => {
        callback(payload.new as NewsEvent);
      })
      .subscribe();
  }

  static subscribeToCyberThreats(callback: (threat: CyberThreat) => void) {
    return supabase
      .channel('threats-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cyber_threats',
      }, (payload) => {
        callback(payload.new as CyberThreat);
      })
      .subscribe();
  }
}
