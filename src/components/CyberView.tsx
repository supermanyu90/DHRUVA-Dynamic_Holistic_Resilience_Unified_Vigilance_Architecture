import { useState } from 'react';
import { Shield, AlertTriangle, Activity } from 'lucide-react';

interface Threat {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  age: string;
  tags: string[];
}

export function CyberView() {
  const [filter, setFilter] = useState<string>('all');

  const threatLevels = {
    critical: 3,
    high: 8,
    medium: 15,
    low: 24,
  };

  const threats: Threat[] = [
    {
      id: '1',
      type: 'APT',
      title: 'APT29 Phishing Campaign Detected',
      description: 'Sophisticated spear-phishing targeting government agencies with credential harvesting',
      severity: 'critical',
      age: '2h',
      tags: ['Russia', 'Government', 'Phishing'],
    },
    {
      id: '2',
      type: 'RANSOMWARE',
      title: 'LockBit 3.0 Variant Spreading',
      description: 'New ransomware variant exploiting unpatched Exchange servers',
      severity: 'high',
      age: '5h',
      tags: ['Ransomware', 'Exchange', 'Healthcare'],
    },
    {
      id: '3',
      type: 'VULNERABILITY',
      title: 'Zero-Day in Popular CMS',
      description: 'Critical RCE vulnerability discovered in WordPress plugin',
      severity: 'high',
      age: '8h',
      tags: ['0-day', 'WordPress', 'RCE'],
    },
    {
      id: '4',
      type: 'BOTNET',
      title: 'Mirai Botnet Activity Surge',
      description: 'Increased scanning activity from IoT devices across Asia-Pacific',
      severity: 'medium',
      age: '12h',
      tags: ['Botnet', 'IoT', 'APAC'],
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#FF0040';
      case 'high':
        return '#FF6B00';
      case 'medium':
        return '#FFB800';
      case 'low':
        return '#00D4A0';
      default:
        return '#8BAFC8';
    }
  };

  return (
    <div className="view active cyber-wrap">
      <div className="cyber-header">
        <div className="cyber-title">CYBER WATCH — THREAT INTELLIGENCE</div>
        <div className="cyber-sub">Real-time Cybersecurity Threat Monitoring & Analysis</div>
      </div>

      <div className="cyber-toolbar">
        <button className="cyber-refresh-btn">
          <Activity size={12} style={{ display: 'inline', marginRight: '4px' }} />
          REFRESH
        </button>
        <div className="cyber-status">Last scan: 2 minutes ago</div>
      </div>

      <div className="cyber-body">
        <div className="cyber-threat-strip">
          {Object.entries(threatLevels).map(([severity, count]) => (
            <div key={severity} className={`cyber-threat-tile ${severity}`}>
              <div className={`cyber-threat-n ${severity}`} style={{ color: getSeverityColor(severity) }}>
                {count}
              </div>
              <div className="cyber-threat-l">{severity.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <div className="cyber-section-title">
          <Shield size={14} />
          ACTIVE THREATS
        </div>

        <div className="cyber-filter-bar">
          <button className={`cyber-filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            ALL
          </button>
          <button className={`cyber-filter-btn ${filter === 'apt' ? 'active' : ''}`} onClick={() => setFilter('apt')}>
            APT
          </button>
          <button className={`cyber-filter-btn ${filter === 'ransomware' ? 'active' : ''}`} onClick={() => setFilter('ransomware')}>
            RANSOMWARE
          </button>
          <button className={`cyber-filter-btn ${filter === 'malware' ? 'active' : ''}`} onClick={() => setFilter('malware')}>
            MALWARE
          </button>
          <button className={`cyber-filter-btn ${filter === 'vuln' ? 'active' : ''}`} onClick={() => setFilter('vuln')}>
            VULNERABILITIES
          </button>
        </div>

        <div className="cyber-feed">
          {threats.map((threat) => (
            <div key={threat.id} className={`cyber-card sev-${threat.severity}`}>
              <div className="cyber-card-head">
                <div className="cyber-card-type">{threat.type}</div>
                <div className="cyber-card-age">{threat.age} ago</div>
              </div>
              <div className="cyber-card-title">{threat.title}</div>
              <div className="cyber-card-desc">{threat.description}</div>
              <div className="cyber-card-footer">
                {threat.tags.map((tag, i) => (
                  <div key={i} className="cyber-tag">
                    {tag}
                  </div>
                ))}
                <div className={`cyber-sev-badge ${threat.severity}`}>{threat.severity.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
