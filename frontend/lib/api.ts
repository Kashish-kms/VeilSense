import {
  TelemetryReading,
  RiskPrediction,
  DeviceStatus,
  AlertItem,
  ModelMetricsReport,
  EdaInsights
} from './types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/live';

// Default mock data for Demo Mode or offline fallback
export const MOCK_LATEST_READING: TelemetryReading = {
  id: 8640,
  timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
  temperature: 22.4,
  humidity: 46.8,
  air_quality_ppm: 428.5,
  motion_detected: 1,
  motion_count: 5,
  fan_active: 0,
  risk_level: 0,
  risk_confidence: 0.96,
  is_outlier: 0,
  device_id: 'ESP32-NODE-01'
};

export const MOCK_DEVICE_STATUS: DeviceStatus = {
  device_id: 'ESP32-NODE-01',
  online: true,
  ip_address: '192.168.1.142',
  wifi_rssi_dbm: -58,
  firmware_version: 'v1.4.2-tls',
  uptime_seconds: 184520,
  free_heap_bytes: 182340,
  sampling_interval_sec: 30,
  tls_secured: true,
  tls_cipher: 'TLS_AES_256_GCM_SHA384',
  sensors: {
    dht22: { status: 'nominal', pin: 4, last_read_ms: 12 },
    mq135: { status: 'warmed_up', pin: 34, heater_resistance_ohms: 21.4 },
    pir: { status: 'active', pin: 27, interrupt_count: 842 }
  },
  last_seen: new Date().toISOString()
};

export async function fetchLatestReading(): Promise<TelemetryReading> {
  try {
    const res = await fetch(`${API_BASE}/api/readings/latest`, { cache: 'no-store' });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (err) {
    return MOCK_LATEST_READING;
  }
}

export function determineEnvironmentalRisk(temp: number, hum: number, ppm: number): { risk_level: number; risk_label: 'Safe' | 'Moderate' | 'High Risk'; fan_active: number } {
  // Severe air hazard or extreme temperature discomfort
  if (ppm >= 850 || temp >= 32.0 || temp <= 15.0 || (hum >= 75 && ppm >= 700)) {
    return { risk_level: 2, risk_label: 'High Risk', fan_active: 1 };
  }
  // Moderate air stagnation or mild thermal discomfort
  if (ppm >= 500 || hum > 65 || hum < 30 || temp > 27.5 || temp < 18.5) {
    return { risk_level: 1, risk_label: 'Moderate', fan_active: 0 };
  }
  // Safe / optimal ambient room condition (e.g. 20-25°C, 40-60% RH, <500 PPM)
  return { risk_level: 0, risk_label: 'Safe', fan_active: 0 };
}

export async function fetchReadings(
  timeRange = '24h',
  limit = 100,
  offset = 0,
  filterOutliers = false,
  search = ''
): Promise<{ items: TelemetryReading[]; total: number; summary: any }> {
  try {
    const params = new URLSearchParams({
      time_range: timeRange,
      limit: limit.toString(),
      offset: offset.toString(),
      filter_outliers: filterOutliers.toString(),
    });
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/api/readings?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch readings');
    return await res.json();
  } catch (err) {
    // Generate realistic privacy-preserving sensor series for demo mode / offline preview
    const items: TelemetryReading[] = [];
    const now = Date.now();
    for (let i = 0; i < limit; i++) {
      const ts = new Date(now - i * 30000).toISOString().replace('T', ' ').substring(0, 19);
      const temp = +(22.2 + Math.sin(i / 12) * 1.2 + (Math.random() - 0.5) * 0.3).toFixed(2);
      const hum = +(48.0 - Math.sin(i / 12) * 2.5 + (Math.random() - 0.5) * 0.6).toFixed(2);
      // Realistic indoor baseline (410 - 450 PPM); occasional simulated elevation in past window (i=35..38)
      const isHistoricalPeak = i >= 35 && i <= 38;
      const ppm = +(isHistoricalPeak ? 860.0 + (i - 35) * 20 : 416.0 + (i % 8) * 3 + (Math.random() - 0.5) * 2).toFixed(1);
      
      const { risk_level, fan_active } = determineEnvironmentalRisk(temp, hum, ppm);
      const is_outlier = (i === 18) ? 1 : 0;

      items.push({
        id: 1000 - i,
        timestamp: ts,
        temperature: temp,
        humidity: hum,
        air_quality_ppm: ppm,
        motion_detected: i % 4 === 0 ? 1 : 0,
        motion_count: i % 4 === 0 ? Math.floor(Math.random() * 6) + 1 : 0,
        fan_active: fan_active,
        risk_level: risk_level,
        risk_confidence: risk_level === 0 ? 0.98 : (risk_level === 1 ? 0.91 : 0.96),
        is_outlier: is_outlier,
        device_id: 'ESP32-NODE-01'
      });
    }
    return {
      items,
      total: 8640,
      summary: { avg_temp: 22.45, avg_hum: 47.8, avg_ppm: 432.1, outlier_count: 23, total_samples: 8640 }
    };
  }
}

export async function fetchDeviceStatus(): Promise<DeviceStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/device/status`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Status error');
    return await res.json();
  } catch {
    return MOCK_DEVICE_STATUS;
  }
}

export async function actuateFan(action: 'FAN_ON' | 'FAN_OFF' | 'AUTO'): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/device/actuate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason: 'Dashboard manual toggle' })
    });
    return await res.json();
  } catch (err) {
    return { status: 'mocked', action, message: `Actuation set to ${action}` };
  }
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/alerts`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Alerts error');
    return await res.json();
  } catch {
    return [
      {
        id: 1,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        severity: 'critical',
        title: 'High VOC / Air Stagnation Detected',
        message: 'MQ-135 reading reached 840 PPM with active occupancy. Automatic ventilation triggered.',
        resolved: 0
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 3600000).toISOString().replace('T', ' ').substring(0, 19),
        severity: 'warning',
        title: 'Thermal Comfort Drift',
        message: 'Room temperature reached 27.4°C with 62% RH. Approaching moderate risk boundary.',
        resolved: 1
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 7200000).toISOString().replace('T', ' ').substring(0, 19),
        severity: 'info',
        title: 'TLS 1.3 mTLS Handshake Verified',
        message: 'ESP32 edge node authenticated via X.509 client certificate.',
        resolved: 1
      }
    ];
  }
}

export async function fetchModelMetrics(): Promise<ModelMetricsReport> {
  try {
    const res = await fetch(`${API_BASE}/api/models/metrics`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Metrics error');
    return await res.json();
  } catch {
    return {
      timestamp: new Date().toISOString(),
      dataset_size_clean: 8617,
      dataset_size_raw: 8640,
      outliers_removed: 23,
      best_model: 'random_forest',
      feature_names: ['temperature', 'humidity', 'air_quality_ppm', 'motion_detected', 'heat_index', 'occupancy_persistence'],
      feature_importance: [
        { feature: 'air_quality_ppm', importance: 0.4494 },
        { feature: 'ppm_rolling_mean_5', importance: 0.3317 },
        { feature: 'temp_rolling_mean_5', importance: 0.0489 },
        { feature: 'occupancy_persistence', importance: 0.0457 },
        { feature: 'hour_sin', importance: 0.0322 },
        { feature: 'heat_index', importance: 0.0275 },
        { feature: 'd_ppm_dt', importance: 0.0241 },
        { feature: 'humidity', importance: 0.0212 },
        { feature: 'd_temp_dt', importance: 0.0193 }
      ],
      models: {
        baseline: {
          model_name: 'Rule-Based Baseline',
          accuracy: 0.9229,
          precision: 0.9221,
          recall: 0.9229,
          f1_score: 0.9221,
          latency_ms: 0.05,
          confusion_matrix: [[760, 42, 6], [38, 480, 24], [5, 18, 351]]
        },
        logistic_regression: {
          model_name: 'Logistic Regression',
          accuracy: 0.9872,
          precision: 0.9872,
          recall: 0.9872,
          f1_score: 0.9872,
          latency_ms: 0.01,
          confusion_matrix: [[802, 6, 0], [10, 528, 4], [0, 2, 372]]
        },
        random_forest: {
          model_name: 'Random Forest (Production)',
          accuracy: 0.9994,
          precision: 0.9994,
          recall: 0.9994,
          f1_score: 0.9994,
          latency_ms: 0.03,
          confusion_matrix: [[808, 0, 0], [1, 541, 0], [0, 0, 374]]
        }
      }
    };
  }
}

export async function fetchEdaInsights(): Promise<EdaInsights> {
  try {
    const res = await fetch(`${API_BASE}/api/eda`, { cache: 'no-store' });
    if (!res.ok) throw new Error('EDA error');
    return await res.json();
  } catch {
    return {
      statistics: {
        temperature: { min: 18.2, max: 28.6, mean: 22.4, std: 2.1 },
        humidity: { min: 36.4, max: 68.2, mean: 47.5, std: 6.8 },
        air_quality_ppm: { min: 382.0, max: 1240.0, mean: 452.0, std: 112.5 },
        total_samples: 8640,
        outlier_count: 23
      },
      correlation_matrix: {
        columns: ['temperature', 'humidity', 'air_quality_ppm', 'motion_detected', 'risk_level'],
        values: [
          [1.0, -0.42, 0.35, 0.28, 0.52],
          [-0.42, 1.0, 0.21, 0.15, 0.38],
          [0.35, 0.21, 1.0, 0.62, 0.88],
          [0.28, 0.15, 0.62, 1.0, 0.49],
          [0.52, 0.38, 0.88, 0.49, 1.0]
        ]
      },
      hourly_patterns: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        temperature: +(21.0 + 3.0 * Math.sin(((h - 8) / 24) * 2 * Math.PI)).toFixed(1),
        humidity: +(48.0 - 5.0 * Math.sin(((h - 8) / 24) * 2 * Math.PI)).toFixed(1),
        air_quality_ppm: +(400 + (h >= 9 && h <= 18 ? 180 + Math.sin(h) * 50 : 20)).toFixed(1),
        motion_detected: h >= 8 && h <= 19 ? 0.75 : 0.08
      })),
      label_distribution: [
        { label: 'Safe', value: 3845, percentage: 44.5 },
        { label: 'Moderate', value: 2583, percentage: 29.9 },
        { label: 'High Risk', value: 2212, percentage: 25.6 }
      ]
    };
  }
}

export async function requestRiskPrediction(params: {
  temperature: number;
  humidity: number;
  air_quality_ppm: number;
  motion_detected: number;
  consecutive_occupied_minutes?: number;
}): Promise<RiskPrediction> {
  try {
    // Attempt standard route first, then models subpath
    let res = await fetch(`${API_BASE}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      res = await fetch(`${API_BASE}/api/models/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
    }
    if (!res.ok) throw new Error('Prediction API error');
    return await res.json();
  } catch {
    // Client-side fallback calculation matching physical rules & ML classifier
    const ppm = params.air_quality_ppm;
    const temp = params.temperature;
    const hum = params.humidity;
    
    const { risk_level, risk_label: label } = determineEnvironmentalRisk(temp, hum, ppm);
    const confidence = risk_level === 0 ? 0.98 : (risk_level === 1 ? 0.92 : 0.96);

    return {
      risk_level,
      risk_label: label,
      confidence,
      probabilities: {
        Safe: risk_level === 0 ? 0.98 : (risk_level === 1 ? 0.05 : 0.02),
        Moderate: risk_level === 1 ? 0.92 : (risk_level === 0 ? 0.02 : 0.06),
        'High Risk': risk_level === 2 ? 0.92 : 0.01
      },
      top_contributing_factors: [
        {
          factor: ppm >= 850 ? 'Severe Air Stagnation (VOC Spike)' : (ppm >= 500 ? 'Moderate Air Stagnation' : 'Clean Ambient Air (Sub-500 PPM)'),
          impact: ppm >= 850 ? 'High' : (ppm >= 500 ? 'Medium' : 'Low'),
          contribution: '48%'
        },
        {
          factor: (temp > 28 || temp < 18) ? 'Thermal Comfort Deviation' : 'Optimal Thermal Envelope',
          impact: (temp > 28 || temp < 18) ? 'High' : 'Low',
          contribution: '28%'
        },
        {
          factor: params.motion_detected ? 'Active Room Occupancy' : 'Unoccupied Space',
          impact: 'Low',
          contribution: '24%'
        }
      ],
      recommendations: risk_level === 2
        ? ['Activate high-flow smart ventilation immediately.', 'Inspect localized VOC or smoke source.']
        : risk_level === 1
        ? ['Schedule intermittent ventilation cycle.', 'Ensure room temperature remains between 21-24°C.']
        : ['Room environmental quality is optimal.', 'Maintain low-power eco ventilation.']
    };
  }
}
