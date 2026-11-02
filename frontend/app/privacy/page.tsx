'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  MicOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Key,
  Cpu,
  ArrowRight,
  Fingerprint,
  WifiOff,
  UserX,
  Database,
  Radio,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* ─── Data ─────────────────────────────────────────────────────────────── */

const guaranteeStats = [
  { label: 'Optical Sensors', value: 'Zero', sub: 'No cameras, no imagery', icon: EyeOff, color: 'cyan' },
  { label: 'Acoustic Sensors', value: 'Zero', sub: 'No microphones, no audio', icon: MicOff, color: 'violet' },
  { label: 'PII Collected', value: 'Zero', sub: 'Strictly anonymous telemetry', icon: UserX, color: 'emerald' },
  { label: 'Biometric Data', value: 'Zero', sub: 'Coarse 30s pulse counts only', icon: Fingerprint, color: 'rose' },
];

const comparisonData = [
  {
    category: 'Optical / Video Surveillance',
    conventional: 'HD Video Streams (1080p / 4K), face crops, room imagery uploaded to cloud',
    veilsense: 'Zero optical elements. Physically impossible to capture imagery.',
    verdict: 'Completely Excluded',
    verdictColor: 'emerald',
  },
  {
    category: 'Acoustic / Voice Recording',
    conventional: 'Far-field microphone arrays, keyword wake audio, speech recordings',
    veilsense: 'Zero microphones or acoustic sensors. Speech is physically inaudible to hardware.',
    verdict: 'Completely Excluded',
    verdictColor: 'emerald',
  },
  {
    category: 'Biometric & Gait Profiling',
    conventional: 'Facial embeddings, gait frequency, millimeter-wave silhouette tracking',
    veilsense: 'Single PIR infrared pulse counter aggregated into coarse 30s counts.',
    verdict: 'Fully Anonymized',
    verdictColor: 'cyan',
  },
  {
    category: 'Data Granularity at Transmission',
    conventional: 'Continuous raw sub-second streams streamed directly over internet',
    veilsense: '30-second window summary statistics (mean, variance, pulse count).',
    verdict: 'Edge Aggregated',
    verdictColor: 'violet',
  },
  {
    category: 'Identity & PII Storage',
    conventional: 'User accounts linked to room IDs, personal schedules, device MACs',
    veilsense: 'Strictly anonymous room telemetry; zero user identity tied to readings.',
    verdict: 'Zero PII Retained',
    verdictColor: 'emerald',
  },
];

const strideThreats = [
  {
    id: 'S',
    name: 'Spoofing',
    color: 'rose',
    threat: 'Rogue MQTT Client Publishing Forged Sensor Data',
    vector: 'Attacker injects fabricated temperature, humidity, or AQI packets into the broker to trigger false ML risk classifications.',
    mitigation: 'Broker enforces mutual TLS with X.509 client certificates. Each ESP32 node has a unique device cert; anonymous connections are rejected at the TCP handshake.',
    status: 'Mitigated',
  },
  {
    id: 'T',
    name: 'Tampering',
    color: 'amber',
    threat: 'In-Transit Packet Manipulation',
    vector: 'Man-in-the-middle attack modifying MQTT payload bytes between ESP32 and broker to alter sensor readings.',
    mitigation: 'TLS 1.3 AES-256-GCM provides authenticated encryption. Any byte modification breaks the GCM authentication tag, causing the broker to reject the connection.',
    status: 'Mitigated',
  },
  {
    id: 'R',
    name: 'Repudiation',
    color: 'orange',
    threat: 'Denial of Unauthorized Sensor Actuation',
    vector: 'Attacker sends unauthorized fan actuation command and later denies it when system anomalies are detected.',
    mitigation: 'Every actuation event is timestamped and stored in the SQLite WAL audit log with device cert fingerprint. Immutable append-only log enables forensic attribution.',
    status: 'Mitigated',
  },
  {
    id: 'I',
    name: 'Info Disclosure',
    color: 'cyan',
    threat: 'Telemetry Inference & Occupancy Profiling',
    vector: 'Adversary correlates 1Hz motion pulses to infer specific occupant behavior, gait patterns, or daily schedules.',
    mitigation: 'On-device 30s aggregation collapses sub-second micro-samples into coarse pulse counts, making individual motion signatures statistically irrecoverable.',
    status: 'Mitigated',
  },
  {
    id: 'D',
    name: 'Denial of Service',
    color: 'violet',
    threat: 'MQTT Broker Flooding & Connection Exhaustion',
    vector: 'Attacker floods broker with connection attempts to exhaust file descriptors or cause message queue overflow.',
    mitigation: 'Mosquitto configured with max_connections limit, per-client message queue caps, and connection rate-limiting. Invalid cert handshakes terminated immediately.',
    status: 'Mitigated',
  },
  {
    id: 'E',
    name: 'Elevation of Privilege',
    color: 'emerald',
    threat: 'Topic ACL Bypass & Unauthorized Actuation',
    vector: 'Compromised device attempts to publish to admin or actuation topics beyond its authorized sensor telemetry scope.',
    mitigation: 'Mosquitto topic ACLs restrict each device certificate to a single publish path (veilsense/room/{id}/telemetry). Read and actuation topics require separate credentials.',
    status: 'Mitigated',
  },
];

const outOfScope = [
  {
    threat: 'Physical Microcontroller Tampering',
    reason: 'Direct physical probing of ESP32 GPIO pins with oscilloscope or logic analyzer is considered out of ambient threat scope.',
    icon: Cpu,
  },
  {
    threat: 'Physical Sensor Disconnection or Obstruction',
    reason: 'Physical vandalism (e.g. covering DHT22 or PIR sensor with tape) is handled as a hardware fault rather than a cyber vulnerability.',
    icon: WifiOff,
  },
  {
    threat: 'Compromise of the Host Server OS',
    reason: 'Root privilege compromise on the server hosting Mosquitto and Docker falls under general IT infrastructure hardening.',
    icon: Database,
  },
];

const cryptoChecklist = [
  {
    label: 'TLS 1.3 Transport',
    detail: 'Port 8883 AES-256-GCM encrypted channel. Forward secrecy via ECDHE.',
    color: 'emerald',
  },
  {
    label: 'X.509 Mutual TLS Auth',
    detail: 'Every ESP32 node carries a unique device certificate signed by private Root CA.',
    color: 'emerald',
  },
  {
    label: 'MQTT Topic ACL Isolation',
    detail: 'Per-certificate publish/subscribe restrictions enforced at broker connection time.',
    color: 'emerald',
  },
  {
    label: 'Stateless JWT Dashboard Auth',
    detail: 'HS256 signed tokens with 1-hour expiry for REST API access. No server-side sessions.',
    color: 'emerald',
  },
  {
    label: 'Zero Audio / Optical Hardware',
    detail: 'Physical impossibility of acoustic or visual surveillance; no such components exist on the PCB.',
    color: 'emerald',
  },
  {
    label: 'GDPR Article 25 Compliant',
    detail: 'Privacy by Design & by Default. No personal data categories in scope by architectural constraint.',
    color: 'emerald',
  },
];

/* ─── Color helpers ──────────────────────────────────────────────────────── */

const verdictStyles: Record<string, string> = {
  emerald: 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400',
  cyan: 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400',
  violet: 'bg-violet-500/10 border border-violet-500/30 text-violet-400',
  rose: 'bg-rose-500/10 border border-rose-500/30 text-rose-400',
  amber: 'bg-amber-500/10 border border-amber-500/30 text-amber-400',
  orange: 'bg-orange-500/10 border border-orange-500/30 text-orange-400',
};

const strideRowBg: Record<string, string> = {
  rose: 'border-l-rose-500/50 bg-rose-500/[0.03]',
  amber: 'border-l-amber-500/50 bg-amber-500/[0.03]',
  orange: 'border-l-orange-500/50 bg-orange-500/[0.03]',
  cyan: 'border-l-cyan-500/50 bg-cyan-500/[0.03]',
  violet: 'border-l-violet-500/50 bg-violet-500/[0.03]',
  emerald: 'border-l-emerald-500/50 bg-emerald-500/[0.03]',
};

const statIconBg: Record<string, string> = {
  cyan: 'bg-cyan-neon/10 border-cyan-neon/30 text-cyan-neon',
  violet: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  rose: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function PrivacyPage() {
  const [expandedStride, setExpandedStride] = useState<number | null>(null);

  const toggleStride = (i: number) =>
    setExpandedStride(expandedStride === i ? null : i);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-cyan-neon" />
          <h1 className="text-3xl font-heading font-bold text-white">
            Security &amp; Privacy Architecture
          </h1>
        </div>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl">
          Comprehensive threat modeling, STRIDE analysis, and formal Privacy-by-Design
          verification for the VeilSense IoT platform.
        </p>
      </div>

      {/* ── Guarantee Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {guaranteeStats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="glass-panel rounded-2xl p-5 border-white/10 flex flex-col gap-3"
            >
              <div
                className={`p-2.5 rounded-xl border w-fit ${statIconBg[s.color]}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-heading font-bold text-white">
                  {s.value}
                </div>
                <div className="text-xs font-mono font-semibold text-slate-300 mt-0.5">
                  {s.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 1. Privacy Boundary Comparison Matrix ── */}
      <div className="glass-panel-glow rounded-2xl p-6 sm:p-8 space-y-5">
        <div>
          <h2 className="font-heading font-bold text-white text-xl">
            The Privacy Boundary: Collected vs. Never Collected
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Explicit architectural guarantees contrasting VeilSense against conventional
            commercial smart monitoring systems.
          </p>
        </div>

        {/* Mobile cards */}
        <div className="flex flex-col gap-3 sm:hidden">
          {comparisonData.map((row, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white font-sans">
                  {row.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${verdictStyles[row.verdictColor]}`}
                >
                  {row.verdict}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-rose-300">
                  <span className="text-slate-500 uppercase text-[10px] block mb-0.5">
                    Conventional
                  </span>
                  {row.conventional}
                </p>
                <p className="text-cyan-neon font-medium">
                  <span className="text-slate-500 uppercase text-[10px] block mb-0.5">
                    VeilSense
                  </span>
                  {row.veilsense}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 font-mono">Telemetry Dimension</th>
                <th className="py-3 px-4 font-mono text-rose-400">
                  Conventional Smart Home / IoT
                </th>
                <th className="py-3 px-4 font-mono text-cyan-neon">
                  VeilSense Zero-Intrusion Model
                </th>
                <th className="py-3 px-4 font-mono text-emerald-400 text-center w-48 min-w-[192px]">
                  Security Guarantee
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {comparisonData.map((row, i) => (
                <tr
                  key={i}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-4 px-4 text-white font-semibold font-sans leading-snug">
                    {row.category}
                  </td>
                  <td className="py-4 px-4 text-rose-300 font-sans leading-snug">
                    {row.conventional}
                  </td>
                  <td className="py-4 px-4 text-cyan-neon font-sans font-medium leading-snug">
                    {row.veilsense}
                  </td>
                  <td className="py-4 px-4 text-center align-middle">
                    <span
                      className={`inline-block px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap ${verdictStyles[row.verdictColor]}`}
                    >
                      {row.verdict}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. On-Device Edge Aggregation ── */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border-white/10 space-y-6">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-violet-400" />
          <div>
            <h2 className="font-heading font-bold text-white text-xl">
              On-Device Edge Aggregation Explained
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              How VeilSense prevents acoustic or biometric leakage at the physical
              micro-controller boundary.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-400 font-bold">Step 1 · 1 Hz Raw Sampling</span>
              <span className="text-slate-500 text-[10px]">Volatile RAM</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              DHT22 and MQ-135 are sampled every 1,000 ms. Readings accumulate in temporary
              RAM floats (<code className="text-amber-300">tempAccumulator += t</code>).
            </p>
            <div className="p-2.5 rounded-lg bg-black/40 font-mono text-[10px] text-slate-400">
              30 raw micro-samples stored in private device memory.
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative p-5 rounded-xl bg-cyan-neon/5 border border-cyan-neon/25 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-neon font-bold">Step 2 · 30 s Statistical Window</span>
              <span className="text-cyan-neon text-[10px]">Compression</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              At the 30-second boundary the MCU computes arithmetic mean and pulse count.
              Fine-grained biometric vibrations disappear into the aggregate.
            </p>
            <div className="p-2.5 rounded-lg bg-black/40 font-mono text-[10px] text-cyan-neon">
              avgTemp = Σt / 30; &nbsp; avgPPM = Σppm / 30;
            </div>
            {/* connector arrows */}
            <ArrowRight className="hidden md:block absolute -left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <ArrowRight className="hidden md:block absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-bold">Step 3 · Buffer Zeroing</span>
              <span className="text-emerald-400 text-[10px]">Purge</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Raw 1-second samples are cleared immediately
              (<code className="text-emerald-300">tempAccumulator = 0.0</code>). Only the
              single aggregate is signed and transmitted over TLS.
            </p>
            <div className="p-2.5 rounded-lg bg-black/40 font-mono text-[10px] text-emerald-300">
              Zero historical raw sensor traces persist on device.
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. STRIDE Threat Model ── */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-heading font-bold text-white text-xl">
                STRIDE Threat Model — In-Scope Vectors
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Full six-category STRIDE analysis for the VeilSense MQTT telemetry pipeline.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 self-start sm:self-auto whitespace-nowrap">
            All 6 Vectors Mitigated
          </span>
        </div>

        <div className="space-y-2">
          {strideThreats.map((item, i) => {
            const open = expandedStride === i;
            return (
              <div
                key={i}
                className={`rounded-xl border border-l-4 transition-colors ${strideRowBg[item.color]} border-white/10`}
              >
                <button
                  onClick={() => toggleStride(i)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                  {/* STRIDE letter badge */}
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${verdictStyles[item.color]}`}
                  >
                    {item.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-slate-300">
                        {item.name}
                      </span>
                      <span className="text-xs font-sans font-medium text-white truncate">
                        — {item.threat}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="hidden sm:inline px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                      {item.status}
                    </span>
                    {open ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {open && (
                  <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <span className="text-slate-300 font-semibold">Attack Vector: </span>
                      {item.vector}
                    </p>
                    <p className="text-xs text-cyan-neon leading-relaxed">
                      <span className="text-slate-300 font-semibold">Mitigation: </span>
                      {item.mitigation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Out-of-Scope */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4 text-slate-500" />
            <h3 className="font-heading font-semibold text-slate-300 text-sm">
              Out-of-Scope Threats — Documented Boundaries
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {outOfScope.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <strong className="text-slate-300 font-mono">{item.threat}</strong>
                  </div>
                  <p className="text-slate-500 leading-relaxed pl-5">{item.reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 4. Cryptographic & Compliance Checklist ── */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-neon" />
            <h2 className="font-heading font-bold text-white text-xl">
              Cryptographic &amp; Compliance Checklist
            </h2>
          </div>
          <span className="text-xs font-mono text-emerald-400 self-start sm:self-auto">
            All 6 Controls Enforced ✓
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cryptoChecklist.map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-sans text-[13px]">
                  {item.label}
                </strong>
                <span className="text-slate-400 text-[11px] leading-relaxed">
                  {item.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
