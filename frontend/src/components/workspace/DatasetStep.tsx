import { useState } from 'react';
import { colors, gradients } from '../../theme';
import Tooltip from '../common/Tooltip';
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

export default function DatasetStep({ state, actions }: Props) {
  const { datasets, models, generatingDatasetId, datasetSSE, selectedDatasetId } = state;

  const [newDatasetName, setNewDatasetName] = useState('');
  const [numCases, setNumCases] = useState(5);
  const [genModel, setGenModel] = useState('claude-haiku-4-5-20251001');

  const readyDatasets = datasets.filter(d => d.status === 'ready');
  const isGenerating = !!generatingDatasetId && !datasetSSE.done;

  const handleGenerate = async () => {
    await actions.generateDataset(
      newDatasetName || `Dataset ${datasets.length + 1}`,
      numCases,
      genModel,
    );
    setNewDatasetName('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Dataset List */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: colors.navy, display: 'flex', alignItems: 'center' }}>
          Test Datasets
          <Tooltip text="Datasets contain test cases with inputs and expected outputs. Select one to use for evaluation." />
        </h2>

        {readyDatasets.length === 0 && !isGenerating ? (
          <p style={{ color: colors.gray[400], fontSize: 13 }}>No datasets yet. Generate your first dataset below.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {readyDatasets.map(d => (
              <div
                key={d.id}
                onClick={() => actions.setSelectedDatasetId(d.id)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: `1px solid ${selectedDatasetId === d.id ? colors.orange : colors.gray[200]}`,
                  borderLeft: selectedDatasetId === d.id ? `3px solid ${colors.orange}` : `3px solid transparent`,
                  background: selectedDatasetId === d.id ? colors.gray[50] : colors.white,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.navy }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: colors.gray[500] }}>{d.test_cases.length} test cases</div>
                </div>
                {selectedDatasetId === d.id && (
                  <span style={{ color: colors.orange, fontSize: 13, fontWeight: 600 }}>Selected</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dataset SSE Progress */}
      {isGenerating && datasetSSE.lastEvent && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: colors.navy }}>Generating Dataset</h2>
          {datasetSSE.lastEvent.event === 'progress' && (
            <div style={{ fontSize: 13, color: colors.gray[600] }}>
              <div style={{ marginBottom: 8 }}>
                Generating test cases: {String(datasetSSE.lastEvent.data.completed)} / {String(datasetSSE.lastEvent.data.total)}
              </div>
              <div style={{ background: colors.gray[100], borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{
                  background: gradients.phoenix, height: '100%', borderRadius: 4,
                  width: `${((datasetSSE.lastEvent.data.completed as number) / (datasetSSE.lastEvent.data.total as number)) * 100}%`,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}
          {datasetSSE.lastEvent.event === 'status' && (
            <div style={{ fontSize: 13, color: colors.gray[600] }}>Status: {String(datasetSSE.lastEvent.data.status)}</div>
          )}
          {datasetSSE.lastEvent.event === 'error' && (
            <div style={{ color: colors.error, fontSize: 13 }}>Error: {String(datasetSSE.lastEvent.data.message)}</div>
          )}
        </div>
      )}

      {/* Generation Form */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: colors.navy, display: 'flex', alignItems: 'center' }}>
          Generate New Dataset
          <Tooltip text="Auto-generate a new test dataset using AI with diverse test scenarios for your task." />
        </h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Name</label>
            <input
              value={newDatasetName}
              onChange={e => setNewDatasetName(e.target.value)}
              placeholder={`Dataset ${datasets.length + 1}`}
              style={{ ...selectStyle, width: 180 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: colors.gray[500], display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              Cases
              <Tooltip text="Number of unique test scenarios to generate (1-50). More cases = better coverage but takes longer." />
            </label>
            <input
              type="number" min="1" max="50" value={numCases}
              onChange={e => setNumCases(Number(e.target.value))}
              style={{ ...selectStyle, width: 70 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Model</label>
            <select value={genModel} onChange={e => setGenModel(e.target.value)} style={selectStyle}>
              {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              ...btnStyle('primary'),
              opacity: isGenerating ? 0.5 : 1,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate Dataset'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => actions.goToStep(0)} style={btnStyle('secondary')}>← Define Task</button>
        <button onClick={() => actions.goToStep(2)} style={btnStyle('primary')}>
          Next: Write Prompt →
        </button>
      </div>
    </div>
  );
}
