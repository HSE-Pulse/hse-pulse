import {
  FlaskConical, BarChart3, Container, GitBranch,
  Gauge, Bell, ExternalLink
} from 'lucide-react'
import SectionHeading from '../components/SectionHeading'
import TechBadge from '../components/TechBadge'
import { config } from '../config'

const tools = [
  {
    icon: FlaskConical,
    title: 'MLflow Experiment Tracking',
    description: 'Every training run logs hyperparameters, loss curves, evaluation metrics, and model artifacts. Model registry maintains version lineage from development to production.',
    badges: [
      { label: 'MLflow', color: 'blue' as const },
      { label: 'MinIO S3', color: 'cyan' as const },
    ],
    link: { label: 'MLflow Dashboard', url: config.MLFLOW_URL },
  },
  {
    icon: Gauge,
    title: 'Prometheus Metrics',
    description: 'Services expose /metrics endpoints with inference latency histograms, request throughput counters, error rates, and model-specific performance indicators.',
    badges: [
      { label: 'Prometheus', color: 'amber' as const },
      { label: 'PromQL', color: 'amber' as const },
    ],
    link: { label: 'Prometheus', url: config.PROMETHEUS_URL },
  },
  {
    icon: BarChart3,
    title: 'Grafana Dashboards',
    description: 'Pre-configured dashboards for each service: p50/p95/p99 latency, request volume, container resource utilisation, and custom model health panels.',
    badges: [
      { label: 'Grafana', color: 'green' as const },
      { label: 'Dashboards', color: 'green' as const },
    ],
    link: { label: 'Grafana', url: config.GRAFANA_URL },
  },
  {
    icon: Container,
    title: 'Container Orchestration',
    description: '17 containers orchestrated via Docker Compose with health checks, dependency ordering, and network isolation. Kubernetes-ready architecture with Helm chart structure for production deployment.',
    badges: [
      { label: 'Docker', color: 'blue' as const },
      { label: 'Kubernetes', color: 'blue' as const },
      { label: 'Helm', color: 'blue' as const },
    ],
    link: { label: 'K8s Dashboard', url: config.DASHBOARD_URL },
  },
  {
    icon: GitBranch,
    title: 'CI/CD Pipeline',
    description: 'GitHub Actions workflows handle linting, testing, Docker image builds, and conditional deployment. Change detection triggers only affected service builds.',
    badges: [
      { label: 'GitHub Actions', color: 'purple' as const },
      { label: 'Multi-stage', color: 'slate' as const },
    ],
    link: null,
  },
  {
    icon: Bell,
    title: 'Health & Readiness',
    description: 'Every service implements /health endpoints with dependency checks. Docker health checks, Kubernetes readiness probes, and Nginx upstream monitoring ensure zero-downtime operation.',
    badges: [
      { label: 'Health Checks', color: 'green' as const },
      { label: 'Probes', color: 'green' as const },
    ],
    link: null,
  },
]

export default function MLOps() {
  return (
    <section id="mlops" className="section-padding relative bg-gray-50/80">
      <div className="max-w-7xl mx-auto">
        <SectionHeading
          tag="Infrastructure"
          title="MLOps & Observability"
          description="Production infrastructure for training, deploying, and monitoring machine learning models - from experiment tracking to real-time performance dashboards."
        />

        {/* Data flow */}
        <div className="glass rounded-2xl p-8 mb-12">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">ML Lifecycle</h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { step: 'Data Prep', sub: 'MIMIC-IV / HSE' },
              { step: 'Training', sub: 'PyTorch' },
              { step: 'Tracking', sub: 'MLflow' },
              { step: 'Registry', sub: 'MinIO S3' },
              { step: 'Serving', sub: 'FastAPI' },
              { step: 'Monitoring', sub: 'Prometheus' },
              { step: 'Dashboards', sub: 'Grafana' },
            ].map((item, i) => (
              <div key={item.step} className="flex items-center gap-3">
                <div className="text-center">
                  <div className="px-4 py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-sm text-primary-600 font-medium">
                    {item.step}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{item.sub}</div>
                </div>
                {i < 6 && <span className="text-gray-300 hidden sm:block">&rarr;</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Tools grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => (
            <div key={tool.title} className="glass glass-hover rounded-2xl p-6 transition-all">
              <tool.icon className="w-5 h-5 text-primary-600 mb-4" />
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{tool.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{tool.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tool.badges.map((b) => (
                  <TechBadge key={b.label} label={b.label} color={b.color} />
                ))}
              </div>
              {tool.link && (
                <a
                  href={tool.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 transition-colors"
                >
                  {tool.link.label} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
