import { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface BankService {
  name: string;
  uptime: number;
  status: 'up' | 'down' | 'partial';
}

export function SewaView() {
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const bobServices: BankService[] = [
    { name: 'UPI', uptime: 99.8, status: 'up' },
    { name: 'NEFT', uptime: 98.5, status: 'up' },
    { name: 'Mobile', uptime: 97.2, status: 'partial' },
  ];

  const peerBanks = [
    { rank: 1, name: 'HDFC Bank', uptime: 99.9 },
    { rank: 2, name: 'Bank of Baroda', uptime: 99.8, highlight: true },
    { rank: 3, name: 'ICICI Bank', uptime: 99.5 },
    { rank: 4, name: 'SBI', uptime: 98.8 },
    { rank: 5, name: 'Axis Bank', uptime: 98.2 },
  ];

  useEffect(() => {
    setTimeout(() => setLoading(false), 800);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setLastUpdate(new Date());
    setTimeout(() => setLoading(false), 800);
  };

  if (loading) {
    return (
      <div className="view active sewa-wrap">
        <div className="sewa-loading">
          <div className="sewa-spinner"></div>
          <div>LOADING BANK SERVICE DATA...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="view active sewa-wrap">
      <div className="sewa-header">
        <div className="sewa-title">SEWA — BANK SERVICE WATCH</div>
        <div className="sewa-sub">Real-time Banking Infrastructure Availability Monitor</div>
      </div>

      <div className="sewa-toolbar">
        <button className="sewa-refresh-btn" onClick={handleRefresh}>
          <Activity size={12} style={{ display: 'inline', marginRight: '4px' }} />
          REFRESH
        </button>
        <div className="sewa-status">Last update: {lastUpdate.toLocaleTimeString()}</div>
      </div>

      <div className="sewa-body">
        <div className="bob-hero">
          <div className="bob-hero-head">
            <div className="bob-logo-badge">🏦</div>
            <div>
              <div className="bob-name">BANK OF BARODA</div>
              <div className="bob-fullname">Public Sector • Primary Monitoring Target</div>
            </div>
          </div>

          <div className="bob-uptime-row">
            {bobServices.map((service) => (
              <div key={service.name} className={`bob-svc ${service.status}`}>
                <div className="bob-svc-name">{service.name}</div>
                <div className={`bob-svc-pct ${service.status}`}>{service.uptime}%</div>
                <div className="bob-svc-bar">
                  <div
                    className="bob-svc-fill"
                    style={{
                      width: `${service.uptime}%`,
                      background: service.status === 'up' ? '#00D4A0' : service.status === 'partial' ? '#FFB800' : '#FF4C4C',
                    }}
                  ></div>
                </div>
                <div className="bob-svc-state">{service.status === 'up' ? 'OPERATIONAL' : service.status === 'partial' ? 'DEGRADED' : 'DOWN'}</div>
              </div>
            ))}
          </div>

          <div className="bob-outages">
            <div className="outage-pill scheduled">
              <div className="outage-icon">
                <AlertTriangle size={12} />
              </div>
              <div className="outage-body">
                <div className="outage-svc">MOBILE BANKING</div>
                <div className="outage-time">Scheduled: Tonight 23:00 - 02:00 IST</div>
                <div className="outage-desc">Routine maintenance and system upgrades</div>
              </div>
            </div>
          </div>
        </div>

        <div className="peer-section">
          <div className="peer-title">
            <TrendingUp size={14} />
            PEER COMPARISON
          </div>
          {peerBanks.map((bank) => (
            <div key={bank.rank} className="peer-row">
              <div className="peer-rank">{bank.rank}</div>
              <div className={`peer-bank ${bank.highlight ? 'highlight' : ''}`}>{bank.name}</div>
              <div className="peer-bar-wrap">
                <div
                  className="peer-bar-fill"
                  style={{
                    width: `${bank.uptime}%`,
                    background: bank.uptime > 99 ? '#00D4A0' : bank.uptime > 98 ? '#FFB800' : '#FF6B00',
                  }}
                ></div>
              </div>
              <div className="peer-pct" style={{ color: bank.uptime > 99 ? '#00D4A0' : bank.uptime > 98 ? '#FFB800' : '#FF6B00' }}>
                {bank.uptime}%
              </div>
            </div>
          ))}
        </div>

        <div className="sewa-timestamp">Data as of {lastUpdate.toLocaleString()}</div>
      </div>
    </div>
  );
}
