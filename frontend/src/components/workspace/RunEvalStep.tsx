import { useState, useEffect } from 'react';
import { colors, gradients } from '../../theme';
import Tooltip from '../common/Tooltip';
import ScoreBadge from '../common/ScoreBadge';
import type { WorkspaceState, WorkspaceActions } from '../../types/workspace';

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: `1px solid ${colors.gray[300]}`,
  fontSize: 13, outline: 'none', background: colors.white, cursor: 'pointer', minWidth: 160,
};

const btnStyle = (variant: 'primary' | 'secondary'): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 8, border: variant === 'secondary' ? `1px solid ${colors.gray[300]}` : 'none',
  background: variant === 'primary' ? gradients.phoenix : colors.white,
  color: variant === 'primary' ? colors.white : colors.gray[700],
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
});

interface Props {
  state: WorkspaceState;
  actions: WorkspaceActions;
}

export default function RunEvalStep({ state, actions }: Props) {
  const { models, selectedVersion, selectedDatasetId, datasets, activeRunId, evalSSE } = state;

  const [runModel, setRunModel] = useState('claude-haiku-4-5-20251001');
  const [gradingModel, setGradingModel] = useState('claude-haiku-4-5-20251001');
  const [temperature, setTemperature] = useState(1.0);

  const isRunning = !!activeRunId && !evalSSE.done;
  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);
  const canRun = !!selectedVersion && !!selectedDatasetId && !isRunning;

  // Auto-advance to results when eval completes
  useEffect(() => {
    if (activeRunId && evalSSE.done) {
      actions.goToStep(4);
    }
  }, [activeRunId, evalSSE.done, actions]);

  const handleRun = async () => {
    if (!selectedVersion || !selectedDatasetId) return;
    await actions.runEval(selectedDatasetId, selectedVersion.id, runModel, gradingModel, temperature);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div
          onClick={() => actions.goToStep(1)}
          style={{
            flex: 1, background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`,
            padding: '14px 18px', cursor: 'pointer', transition: 'border-color 0.15s',
          }}
        >
          <div style={{ fontSize: 11, color: colors.gray[500], marginBottom: 4 }}>Dataset</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: selectedDataset ? colors.navy : colors.gray[400] }}>
            {selectedDataset ? `${selectedDataset.name} (${selectedDataset.test_cases.length} cases)` : 'None selected'}
          </div>
        </div>
        <div
          onClick={() => actions.goToStep(2)}
          style={{
            flex: 1, background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`,
            padding: '14px 18px', cursor: 'pointer', transition: 'border-color 0.15s',
          }}
        >
          <div style={{ fontSize: 11, color: colors.gray[500], marginBottom: 4 }}>Prompt Version</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: selectedVersion ? colors.navy : colors.gray[400] }}>
            {selectedVersion ? `v${selectedVersion.version_number}${selectedVersion.label ? ` — ${selectedVersion.label}` : ''}` : 'None selected'}
          </div>
        </div>
      </div>

      {/* Model Config */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: colors.navy }}>Evaluation Config</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, color: colors.gray[500], display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              Run Model
              <Tooltip text="The AI model that will execute your prompt. Different models have different capabilities and costs." />
            </label>
            <select value={runModel} onChange={e => setRunModel(e.target.value)} style={selectStyle}>
              {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: colors.gray[500], display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              Grading Model
              <Tooltip text="The AI model that judges output quality. Acts as an automated grader scoring each response 1-10." />
            </label>
            <select value={gradingModel} onChange={e => setGradingModel(e.target.value)} style={selectStyle}>
              {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: colors.gray[500], display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              Temperature
              <Tooltip text="Controls randomness. Lower (0-0.3) = focused and deterministic. Higher (0.7-1.0) = creative and varied." />
            </label>
            <input
              type="number" step="0.1" min="0" max="2" value={temperature}
              onChange={e => setTemperature(Number(e.target.value))}
              style={{ ...selectStyle, width: 80 }}
            />
          </div>
          <button
            onClick={handleRun}
            disabled={!canRun}
            style={{
              ...btnStyle('primary'),
              padding: '10px 24px',
              fontSize: 14,
              opacity: canRun ? 1 : 0.5,
              cursor: canRun ? 'pointer' : 'not-allowed',
            }}
          >
            {isRunning ? 'Running...' : 'Run Evaluation'}
          </button>
        </div>
      </div>

      {/* Eval Progress */}
      {isRunning && evalSSE.lastEvent && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: colors.navy }}>Evaluation Progress</h2>
          {evalSSE.lastEvent.event === 'result' && (
            <div style={{ fontSize: 13, color: colors.gray[600] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Completed: {String(evalSSE.lastEvent.data.completed)} / {String(evalSSE.lastEvent.data.total)}</span>
                <span>Latest: <ScoreBadge score={evalSSE.lastEvent.data.score as number} size="sm" /></span>
              </div>
              <div style={{ background: colors.gray[100], borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{
                  background: gradients.phoenix, height: '100%', borderRadius: 4,
                  width: `${((evalSSE.lastEvent.data.completed as number) / (evalSSE.lastEvent.data.total as number)) * 100}%`,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}
          {evalSSE.lastEvent.event === 'status' && (
            <p style={{ fontSize: 13, color: colors.gray[600], margin: 0 }}>Status: {String(evalSSE.lastEvent.data.status)}</p>
          )}
          {evalSSE.lastEvent.event === 'error' && (
            <p style={{ color: colors.error, fontSize: 13, margin: 0 }}>Error: {String(evalSSE.lastEvent.data.message)}</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => actions.goToStep(2)} style={btnStyle('secondary')}>← Write Prompt</button>
        <button onClick={() => actions.goToStep(4)} style={btnStyle('secondary')}>View Results →</button>
      </div>
    </div>
  );
}
