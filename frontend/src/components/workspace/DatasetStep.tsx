import { useState } from 'react';
import { colors, gradients } from '../../theme';
import Tooltip from '../common/Tooltip';
import type { WorkspaceState, WorkspaceActions, Dataset } from '../../types/workspace';

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
  const [viewingDataset, setViewingDataset] = useState<Dataset | null>(null);

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
          <Tooltip text="A dataset is a collection of test scenarios the AI will be tested on. Each scenario has input data and criteria for what a good response looks like. Select one to use when you run your evaluation." />
        </h2>

        {readyDatasets.length === 0 && !isGenerating ? (
          <p style={{ color: colors.gray[400], fontSize: 13 }}>No datasets yet. Generate your first dataset below.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {readyDatasets.map(d => (
              <div
                key={d.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: `1px solid ${selectedDatasetId === d.id ? colors.orange : colors.gray[200]}`,
                  borderLeft: selectedDatasetId === d.id ? `3px solid ${colors.orange}` : `3px solid transparent`,
                  background: selectedDatasetId === d.id ? colors.gray[50] : colors.white,
                  transition: 'all 0.15s',
                }}
              >
                <div
                  onClick={() => actions.setSelectedDatasetId(d.id)}
                  style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.navy }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: colors.gray[500] }}>{d.test_cases.length} test cases</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setViewingDataset(viewingDataset?.id === d.id ? null : d); }}
                      style={{ ...btnStyle('secondary'), padding: '4px 10px', fontSize: 12 }}
                    >
                      {viewingDataset?.id === d.id ? 'Hide' : 'View'}
                    </button>
                    {selectedDatasetId === d.id && (
                      <span style={{ color: colors.orange, fontSize: 13, fontWeight: 600 }}>Selected</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dataset Viewer */}
      {viewingDataset && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: colors.navy }}>{viewingDataset.name} — Test Cases</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['#', 'Scenario', 'Inputs', 'Criteria'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 12, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {viewingDataset.test_cases.map((tc, i) => (
                  <tr key={tc.id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                    <td style={{ padding: '10px 8px', verticalAlign: 'top', color: colors.gray[400], fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 200 }}>{tc.scenario}</td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 300 }}>
                      {Object.entries(tc.prompt_inputs).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: 6 }}>
                          <strong>{k}:</strong>
                          <div style={{ whiteSpace: 'pre-wrap', background: colors.gray[50], padding: 6, borderRadius: 4, maxHeight: 120, overflow: 'auto', marginTop: 2, fontSize: 11 }}>
                            {String(v)}
                          </div>
                        </div>
                      ))}
                    </td>
                    <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 200, fontSize: 12 }}>
                      {tc.solution_criteria.map((c, j) => <div key={j}>- {c}</div>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          <Tooltip text="The AI will create a variety of realistic test scenarios for your task. Each scenario includes sample input data and success criteria so you can measure how well your prompt performs." />
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
              <Tooltip text="How many different test scenarios to create. More scenarios give you a better picture of how your prompt handles different situations, but take longer to generate and evaluate." />
            </label>
            <input
              type="number" min="1" max="50" value={numCases}
              onChange={e => setNumCases(Number(e.target.value))}
              style={{ ...selectStyle, width: 70 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: colors.gray[500], display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              Model
              <Tooltip text="Which AI model creates your test scenarios. A smaller, faster model usually works well here since it's just generating test data, not solving the task itself." />
            </label>
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
