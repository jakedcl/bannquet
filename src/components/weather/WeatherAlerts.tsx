import { WeatherAlert } from '@/types/weather';

type WeatherAlertsProps = {
  alerts: WeatherAlert[];
};

export default function WeatherAlerts({ alerts }: WeatherAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <h2 className="font-semibold text-lg">Weather Alerts</h2>
          <p className="text-sm text-gray-500">High Peaks Region</p>
        </div>
        <div className="p-6">
          <p className="text-gray-500">No active weather alerts for this area.</p>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'extreme':
        return 'bg-red-100 text-red-800';
      case 'severe':
        return 'bg-orange-100 text-orange-800';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
        <h2 className="font-semibold text-lg">Weather Alerts</h2>
        <p className="text-sm text-gray-500">High Peaks Region</p>
      </div>
      <div className="divide-y divide-gray-100">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                  {alert.severity}
                </span>
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  {alert.headline}
                </h3>
                <div className="mt-1 text-sm text-gray-500 space-y-1">
                  <p>Effective: {new Date(alert.effective).toLocaleString()}</p>
                  <p>Expires: {new Date(alert.expires).toLocaleString()}</p>
                </div>
                <p className="mt-3 text-sm text-gray-600 whitespace-pre-line">
                  {alert.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 