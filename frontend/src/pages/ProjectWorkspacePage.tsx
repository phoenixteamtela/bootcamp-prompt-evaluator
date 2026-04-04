import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { colors, gradients } from '../theme';
import { useSSE } from '../hooks/useSSE';
import ScoreBadge from '../components/common/ScoreBadge';

interface Project {
  id: string; name: string; task_description: string; prompt_inputs_spec: Record<string, string>;
  extra_criteria: string | null;
}
interface Version {
  id: string; version_number: number; label: string | null; template: string;
  latest_avg_score: number | null; latest_pass_rate: number | null;
}
interface Dataset {
  id: string; name: string; num_cases: number; status: string; test_cases: { id: string; scenario: string }[];
}
interface EvalRun {
  id: string; status: string; run_model: string; grading_model: string; temperature: number;
  avg_score: number | null; pass_rate: number | null; total_cases: number; completed_cases: number;
  version_number: number | null; version_label: string | null; prompt_version_id: string;
  created_at: string; error_message: string | null;
  results: {
    id: string; scenario: string; prompt_inputs: Record<string, string>; solution_criteria: string[];
    output: string; score: number; reasoning: string; strengths: string[]; weaknesses: string[];
  }[];
}
interface Model { id: string; provider: string; }

export default function ProjectWorkspacePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [evalRuns, setEvalRuns] = useState<EvalRun[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [editingTemplate, setEditingTemplate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [newVersionLabel, setNewVersionLabel] = useState('');

  // Eval config
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [runModel, setRunModel] = useState('claude-haiku-4-5-20251001');
  const [gradingModel, setGradingModel] = useState('claude-haiku-4-5-20251001');
  const [temperature, setTemperature] = useState(1.0);

  // Dataset generation
  const [newDatasetName, setNewDatasetName] = useState('');
  const [numCases, setNumCases] = useState(5);
  const [genModel, setGenModel] = useState('claude-haiku-4-5-20251001');
  const [showDatasetForm, setShowDatasetForm] = useState(false);
  const [generatingDatasetId, setGeneratingDatasetId] = useState<string | null>(null);

  // SSE for dataset generation
  const datasetSSEUrl = generatingDatasetId
    ? api.sseUrl(`/api/projects/${projectId}/datasets/${generatingDatasetId}/progress`)
    : null;
  const datasetSSE = useSSE(datasetSSEUrl);

  // SSE for eval run
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const evalSSEUrl = activeRunId
    ? api.sseUrl(`/api/projects/${projectId}/eval-runs/${activeRunId}/progress`)
    : null;
  const evalSSE = useSSE(evalSSEUrl);

  // Selected run for viewing results
  const [viewingRun, setViewingRun] = useState<EvalRun | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    const [p, v, d, r, m] = await Promise.all([
      api.get<Project>(`/api/projects/${projectId}`),
      api.get<Version[]>(`/api/projects/${projectId}/versions`),
      api.get<Dataset[]>(`/api/projects/${projectId}/datasets`),
      api.get<EvalRun[]>(`/api/projects/${projectId}/eval-runs`),
      api.get<{ models: Model[] }>('/api/models'),
    ]);
    setProject(p);
    setVersions(v);
    setDatasets(d);
    setEvalRuns(r);
    setModels(m.models);
    if (!selectedVersion && v.length > 0) {
      setSelectedVersion(v[0]);
      setEditingTemplate(v[0].template);
    }
  }, [projectId, selectedVersion]);

  useEffect(() => { load(); }, [load]);

  // Reload when SSE completes
  useEffect(() => {
    if (datasetSSE.done) { load(); setGeneratingDatasetId(null); }
  }, [datasetSSE.done, load]);

  useEffect(() => {
    if (evalSSE.done) { load(); setActiveRunId(null); }
  }, [evalSSE.done, load]);

  const handleSaveVersion = async () => {
    if (!projectId) return;
    const v = await api.post<Version>(`/api/projects/${projectId}/versions`, {
      template: editingTemplate,
      label: newVersionLabel || null,
    });
    setVersions([v, ...versions]);
    setSelectedVersion(v);
    setIsEditing(false);
    setNewVersionLabel('');
  };

  const handleGenerateDataset = async () => {
    if (!projectId) return;
    const d = await api.post<Dataset>(`/api/projects/${projectId}/datasets`, {
      name: newDatasetName || `Dataset ${datasets.length + 1}`,
      num_cases: numCases,
      generation_model: genModel,
    });
    setGeneratingDatasetId(d.id);
    setShowDatasetForm(false);
    setNewDatasetName('');
  };

  const handleRunEval = async () => {
    if (!projectId || !selectedVersion || !selectedDatasetId) return;
    const run = await api.post<EvalRun>(`/api/projects/${projectId}/eval-runs`, {
      prompt_version_id: selectedVersion.id,
      dataset_id: selectedDatasetId,
      run_model: runModel,
      grading_model: gradingModel,
      temperature,
    });
    setActiveRunId(run.id);
  };

  const handleViewRun = async (runId: string) => {
    if (!projectId) return;
    const run = await api.get<EvalRun>(`/api/projects/${projectId}/eval-runs/${runId}`);
    setViewingRun(run);
  };

  const handleDownloadProject = () => {
    if (!projectId || !project) return;
    api.download(`/api/projects/${projectId}/export`, `${project.name}.zip`);
  };

  const handleDownloadRun = (runId: string) => {
    if (!projectId) return;
    api.download(`/api/projects/${projectId}/eval-runs/${runId}/export`, `eval_run_${runId.slice(0,8)}.zip`);
  };

  if (!project) return <p style={{ color: colors.gray[500] }}>Loading...</p>;

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

  const readyDatasets = datasets.filter(d => d.status === 'ready');

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Link to="/projects" style={{ color: colors.gray[400], textDecoration: 'none', fontSize: 13 }}>Projects</Link>
          <span style={{ color: colors.gray[300], margin: '0 8px' }}>/</span>
          <h1 style={{ color: colors.navy, margin: 0, fontSize: 22, display: 'inline' }}>{project.name}</h1>
        </div>
        <button onClick={handleDownloadProject} style={btnStyle('secondary')}>Download Project</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Version Sidebar */}
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.gray[200]}`, fontWeight: 600, fontSize: 14, color: colors.navy }}>
            Versions
          </div>
          {versions.map(v => (
            <div
              key={v.id}
              onClick={() => { setSelectedVersion(v); setEditingTemplate(v.template); setIsEditing(false); setViewingRun(null); }}
              style={{
                padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: selectedVersion?.id === v.id ? colors.gray[50] : 'transparent',
                borderLeft: selectedVersion?.id === v.id ? `3px solid ${colors.orange}` : '3px solid transparent',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.navy }}>v{v.version_number}</div>
                {v.label && <div style={{ fontSize: 11, color: colors.gray[500] }}>{v.label}</div>}
              </div>
              <ScoreBadge score={v.latest_avg_score} size="sm" />
            </div>
          ))}
          <div
            onClick={() => {
              setIsEditing(true);
              setEditingTemplate(selectedVersion?.template || '');
              setViewingRun(null);
            }}
            style={{
              padding: '10px 16px', cursor: 'pointer', color: colors.orange, fontWeight: 600, fontSize: 13,
              borderTop: `1px solid ${colors.gray[200]}`, textAlign: 'center',
            }}
          >
            + New Version
          </div>
        </div>

        {/* Main Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Prompt Editor */}
          <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: colors.navy }}>
                {isEditing ? 'New Version' : `Version ${selectedVersion?.version_number || '--'}`}
                {selectedVersion?.label && !isEditing && <span style={{ color: colors.gray[400], fontWeight: 400 }}> — {selectedVersion.label}</span>}
              </h2>
              {isEditing && (
                <input
                  value={newVersionLabel}
                  onChange={e => setNewVersionLabel(e.target.value)}
                  placeholder="Label (optional)"
                  style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${colors.gray[300]}`, fontSize: 13, width: 180 }}
                />
              )}
            </div>
            <div style={{ fontSize: 11, color: colors.gray[400], marginBottom: 8 }}>
              Variables: {Object.keys(project.prompt_inputs_spec).map(k => `{${k}}`).join(', ')}
            </div>
            <textarea
              value={editingTemplate}
              onChange={e => setEditingTemplate(e.target.value)}
              readOnly={!isEditing}
              rows={12}
              style={{
                width: '100%', padding: 14, borderRadius: 8, border: `1px solid ${colors.gray[200]}`,
                fontSize: 13, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box',
                background: isEditing ? colors.white : colors.gray[50], outline: 'none',
              }}
            />
            {isEditing && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                <button onClick={() => setIsEditing(false)} style={btnStyle('secondary')}>Cancel</button>
                <button onClick={handleSaveVersion} style={btnStyle('primary')}>Save New Version</button>
              </div>
            )}
          </div>

          {/* Eval Config */}
          <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 16, color: colors.navy }}>Evaluation Config</h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Dataset</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={selectedDatasetId} onChange={e => setSelectedDatasetId(e.target.value)} style={selectStyle}>
                    <option value="">Select dataset...</option>
                    {readyDatasets.map(d => <option key={d.id} value={d.id}>{d.name} ({d.test_cases.length} cases)</option>)}
                  </select>
                  <button onClick={() => setShowDatasetForm(!showDatasetForm)} style={btnStyle('secondary')}>
                    {showDatasetForm ? 'Cancel' : '+ Generate'}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Run Model</label>
                <select value={runModel} onChange={e => setRunModel(e.target.value)} style={selectStyle}>
                  {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Grading Model</label>
                <select value={gradingModel} onChange={e => setGradingModel(e.target.value)} style={selectStyle}>
                  {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Temperature</label>
                <input type="number" step="0.1" min="0" max="2" value={temperature} onChange={e => setTemperature(Number(e.target.value))}
                  style={{ ...selectStyle, width: 80 }} />
              </div>
              <button
                onClick={handleRunEval}
                disabled={!selectedVersion || !selectedDatasetId || !!activeRunId}
                style={{
                  ...btnStyle('primary'),
                  opacity: (!selectedVersion || !selectedDatasetId || !!activeRunId) ? 0.5 : 1,
                  cursor: (!selectedVersion || !selectedDatasetId || !!activeRunId) ? 'not-allowed' : 'pointer',
                }}
              >
                {activeRunId ? 'Running...' : 'Run Evaluation'}
              </button>
            </div>

            {/* Dataset generation form */}
            {showDatasetForm && (
              <div style={{ marginTop: 12, padding: 12, background: colors.gray[50], borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Name</label>
                  <input value={newDatasetName} onChange={e => setNewDatasetName(e.target.value)} placeholder={`Dataset ${datasets.length + 1}`}
                    style={{ ...selectStyle, width: 160 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Cases</label>
                  <input type="number" min="1" max="50" value={numCases} onChange={e => setNumCases(Number(e.target.value))}
                    style={{ ...selectStyle, width: 70 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Model</label>
                  <select value={genModel} onChange={e => setGenModel(e.target.value)} style={selectStyle}>
                    {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                  </select>
                </div>
                <button onClick={handleGenerateDataset} disabled={!!generatingDatasetId} style={btnStyle('primary')}>
                  {generatingDatasetId ? 'Generating...' : 'Generate'}
                </button>
              </div>
            )}

            {/* Dataset SSE Progress */}
            {generatingDatasetId && !datasetSSE.done && datasetSSE.lastEvent && (
              <div style={{ marginTop: 12, padding: 10, background: colors.gray[50], borderRadius: 8, fontSize: 13, color: colors.gray[600] }}>
                {datasetSSE.lastEvent.event === 'progress' && (
                  <>Generating test cases: {String(datasetSSE.lastEvent.data.completed)} / {String(datasetSSE.lastEvent.data.total)}</>
                )}
                {datasetSSE.lastEvent.event === 'status' && <>Status: {String(datasetSSE.lastEvent.data.status)}</>}
                {datasetSSE.lastEvent.event === 'error' && <span style={{ color: colors.error }}>Error: {String(datasetSSE.lastEvent.data.message)}</span>}
              </div>
            )}
          </div>

          {/* Eval Progress */}
          {activeRunId && !evalSSE.done && evalSSE.lastEvent && (
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
              {evalSSE.lastEvent.event === 'status' && <p style={{ fontSize: 13, color: colors.gray[600] }}>Status: {String(evalSSE.lastEvent.data.status)}</p>}
              {evalSSE.lastEvent.event === 'error' && <p style={{ color: colors.error, fontSize: 13 }}>Error: {String(evalSSE.lastEvent.data.message)}</p>}
            </div>
          )}

          {/* Results / Run History */}
          <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 16, color: colors.navy }}>
              {viewingRun ? `Run Results — ${viewingRun.run_model}` : 'Evaluation Runs'}
            </h2>

            {viewingRun ? (
              <div>
                <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                  <div style={{ background: colors.gray[50], padding: 12, borderRadius: 8, flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: colors.gray[500] }}>Avg Score</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: colors.navy }}>{viewingRun.avg_score?.toFixed(1) ?? '--'}</div>
                  </div>
                  <div style={{ background: colors.gray[50], padding: 12, borderRadius: 8, flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: colors.gray[500] }}>Pass Rate</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: colors.navy }}>{viewingRun.pass_rate?.toFixed(1) ?? '--'}%</div>
                  </div>
                  <div style={{ background: colors.gray[50], padding: 12, borderRadius: 8, flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: colors.gray[500] }}>Test Cases</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: colors.navy }}>{viewingRun.total_cases}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button onClick={() => setViewingRun(null)} style={btnStyle('secondary')}>Back to Runs</button>
                  <button onClick={() => handleDownloadRun(viewingRun.id)} style={btnStyle('secondary')}>Download</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['Scenario', 'Prompt Inputs', 'Criteria', 'Output', 'Score', 'Reasoning'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 12, fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viewingRun.results.map(r => (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                          <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 160 }}>{r.scenario}</td>
                          <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 160, fontSize: 12 }}>
                            {Object.entries(r.prompt_inputs).map(([k, v]) => (
                              <div key={k}><strong>{k}:</strong> {String(v).slice(0, 80)}</div>
                            ))}
                          </td>
                          <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 160, fontSize: 12 }}>
                            {r.solution_criteria.map((c, i) => <div key={i}>- {c}</div>)}
                          </td>
                          <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 200 }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 11, background: colors.gray[50], padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
                              {r.output}
                            </pre>
                          </td>
                          <td style={{ padding: '10px 8px', verticalAlign: 'top' }}><ScoreBadge score={r.score} /></td>
                          <td style={{ padding: '10px 8px', verticalAlign: 'top', maxWidth: 200, fontSize: 12 }}>{r.reasoning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              evalRuns.length === 0 ? (
                <p style={{ color: colors.gray[400], fontSize: 13 }}>No evaluation runs yet. Configure and run an evaluation above.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Version', 'Model', 'Score', 'Pass Rate', 'Cases', 'Status', 'Date', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 12, fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evalRuns.map(run => (
                      <tr key={run.id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                        <td style={{ padding: '10px 8px' }}>v{run.version_number}{run.version_label ? ` (${run.version_label})` : ''}</td>
                        <td style={{ padding: '10px 8px', fontSize: 12 }}>{run.run_model}</td>
                        <td style={{ padding: '10px 8px' }}><ScoreBadge score={run.avg_score} size="sm" /></td>
                        <td style={{ padding: '10px 8px' }}>{run.pass_rate !== null ? `${run.pass_rate.toFixed(0)}%` : '--'}</td>
                        <td style={{ padding: '10px 8px' }}>{run.completed_cases}/{run.total_cases}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: run.status === 'completed' ? colors.successBg : run.status === 'failed' ? colors.errorBg : colors.warningBg,
                            color: run.status === 'completed' ? colors.success : run.status === 'failed' ? colors.error : colors.warning,
                          }}>{run.status}</span>
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: 12 }}>{new Date(run.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '10px 8px' }}>
                          {run.status === 'completed' && (
                            <button onClick={() => handleViewRun(run.id)} style={{ ...btnStyle('secondary'), padding: '4px 10px', fontSize: 12 }}>View</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
