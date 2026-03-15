import { useEffect, useState } from 'react';

interface Alert {
  id: string;
  title: string;
  message: string;
}

interface AlertToastProps {
  alerts: Alert[];
}

export function AlertToast({ alerts }: AlertToastProps) {
  const [visible, setVisible] = useState<string[]>([]);

  useEffect(() => {
    const newAlerts = alerts.filter((a) => !visible.includes(a.id));
    if (newAlerts.length > 0) {
      setVisible((prev) => [...prev, ...newAlerts.map((a) => a.id)]);
    }
  }, [alerts]);

  return (
    <div id="alert-toast">
      {alerts.map((alert) => (
        <div key={alert.id} className="toast">
          <div className="toast-head">{alert.title}</div>
          <div>{alert.message}</div>
        </div>
      ))}
    </div>
  );
}
