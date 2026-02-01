import React from 'react';
import { useSimulation } from './hooks/useSimulation';
import ControlPanel from './components/ControlPanel';
import SimulationClock from './components/SimulationClock';
import QueueChart from './components/QueueChart';
import WaitTimeChart from './components/WaitTimeChart';
import LOSChart from './components/LOSChart';
import ThroughputChart from './components/ThroughputChart';
import StaffingTimeline from './components/StaffingTimeline';
import ComparisonView from './components/ComparisonView';
import SummaryCard from './components/SummaryCard';
import InsightsPanel from './components/InsightsPanel';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#ef4444', fontFamily: 'monospace' }}>
          <h2>Runtime Error</h2>
          <pre>{this.state.error.message}</pre>
          <pre>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function Dashboard() {
  const sim = useSimulation();

  const comparisonDataArr = sim.comparisonRun?.data || null;

  return (
    <div className="app-layout">
      <ControlPanel
        status={sim.status}
        connected={sim.connected}
        onStart={sim.start}
        onPause={sim.pause}
        onReset={sim.reset}
        onSpeedChange={sim.setSpeed}
        onPolicySwitch={sim.switchPolicy}
        onConfigUpdate={sim.updateConfig}
        onSaveComparison={sim.saveComparison}
        onClearComparison={sim.clearComparison}
        onRunComparison={sim.runComparison}
        comparisonRun={sim.comparisonRun}
        comparisonState={sim.comparisonState}
      />

      <main className="main-content">
        {/* Error banner */}
        {sim.error && <div className="error-banner">{sim.error}</div>}

        {/* Clock / progress */}
        <SimulationClock status={sim.status} latestPoint={sim.latestPoint} />

        {/* Insights */}
        <InsightsPanel insights={sim.insights} />

        {/* Primary charts */}
        <div className="chart-grid">
          <QueueChart data={sim.dataPoints} comparisonData={comparisonDataArr} />
          <WaitTimeChart data={sim.dataPoints} comparisonData={comparisonDataArr} />
          <LOSChart data={sim.dataPoints} comparisonData={comparisonDataArr} />
          <ThroughputChart data={sim.dataPoints} comparisonData={comparisonDataArr} />
        </div>

        {/* Staffing timeline */}
        <StaffingTimeline data={sim.dataPoints} />

        {/* End-of-run summary */}
        {sim.summary && (
          <SummaryCard
            summary={sim.summary}
            comparisonSummary={sim.comparisonRun?.summary}
          />
        )}

        {/* Comparison overlay */}
        {sim.comparisonRun && sim.dataPoints.length > 0 && (
          <ComparisonView
            currentData={sim.dataPoints}
            currentSummary={sim.summary}
            comparisonRun={sim.comparisonRun}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
