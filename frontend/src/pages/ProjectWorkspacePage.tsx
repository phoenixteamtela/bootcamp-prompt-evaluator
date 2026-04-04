import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { colors } from '../theme';
import { useSSE } from '../hooks/useSSE';
import WorkspaceStepper from '../components/workspace/WorkspaceStepper';
import DefineTaskStep from '../components/workspace/DefineTaskStep';
import DatasetStep from '../components/workspace/DatasetStep';
import PromptStep from '../components/workspace/PromptStep';
import RunEvalStep from '../components/workspace/RunEvalStep';
import ResultsStep from '../components/workspace/ResultsStep';
import type { Project, Version, Dataset, EvalRun, Model, WorkspaceState, WorkspaceActions } from '../types/workspace';

function computeInitialStep(datasets: Dataset[], versions: Version[], evalRuns: EvalRun[]): number {
  const readyDatasets = datasets.filter(d => d.status === 'ready');
  if (readyDatasets.length === 0) return 1;
  if (versions.length === 0) return 2;
  if (evalRuns.length === 0) return 3;
  return 4;
}

export default function ProjectWorkspacePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [evalRuns, setEvalRuns] = useState<EvalRun[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [generatingDatasetId, setGeneratingDatasetId] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [initialStepSet, setInitialStepSet] = useState(false);

  // SSE for dataset generation
  const datasetSSEUrl = generatingDatasetId
    ? api.sseUrl(`/api/projects/${projectId}/datasets/${generatingDatasetId}/progress`)
    : null;
  const datasetSSE = useSSE(datasetSSEUrl);

  // SSE for eval run
  const evalSSEUrl = activeRunId
    ? api.sseUrl(`/api/projects/${projectId}/eval-runs/${activeRunId}/progress`)
    : null;
  const evalSSE = useSSE(evalSSEUrl);

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
    }
    // Reconnect SSE for in-progress run
    const inProgressRun = r.find(run => run.status === 'running' || run.status === 'pending');
    if (inProgressRun && !activeRunId) setActiveRunId(inProgressRun.id);
    // Reconnect SSE for generating dataset
    const genDataset = d.find(ds => ds.status === 'generating' || ds.status === 'pending');
    if (genDataset && !generatingDatasetId) setGeneratingDatasetId(genDataset.id);
    // Smart initial step (only on first load)
    if (!initialStepSet) {
      setActiveStep(computeInitialStep(d, v, r));
      setInitialStepSet(true);
    }
  }, [projectId, selectedVersion, activeRunId, generatingDatasetId, initialStepSet]);

  useEffect(() => { load(); }, [load]);

  // Reload when SSE completes
  useEffect(() => {
    if (datasetSSE.done) { load(); setGeneratingDatasetId(null); }
  }, [datasetSSE.done, load]);

  useEffect(() => {
    if (evalSSE.done) { load(); setActiveRunId(null); }
  }, [evalSSE.done, load]);

  // Actions passed to step components
  const actions: WorkspaceActions = useMemo(() => ({
    goToStep: setActiveStep,
    setSelectedVersion,
    setSelectedDatasetId,
    setGeneratingDatasetId,
    setActiveRunId,
    reload: load,
    saveVersion: async (template: string, label: string | null) => {
      if (!projectId) throw new Error('No project');
      const v = await api.post<Version>(`/api/projects/${projectId}/versions`, { template, label });
      setVersions(prev => [v, ...prev]);
      return v;
    },
    generateDataset: async (name: string, numCases: number, model: string) => {
      if (!projectId) return;
      const d = await api.post<Dataset>(`/api/projects/${projectId}/datasets`, {
        name, num_cases: numCases, generation_model: model,
      });
      setGeneratingDatasetId(d.id);
    },
    runEval: async (datasetId: string, versionId: string, runModel: string, gradingModel: string, temperature: number) => {
      if (!projectId) return;
      const run = await api.post<EvalRun>(`/api/projects/${projectId}/eval-runs`, {
        prompt_version_id: versionId, dataset_id: datasetId,
        run_model: runModel, grading_model: gradingModel, temperature,
      });
      setActiveRunId(run.id);
    },
    viewRun: async (runId: string) => {
      if (!projectId) throw new Error('No project');
      return api.get<EvalRun>(`/api/projects/${projectId}/eval-runs/${runId}`);
    },
    downloadProject: () => {
      if (!projectId || !project) return;
      api.download(`/api/projects/${projectId}/export`, `${project.name}.zip`);
    },
    downloadRun: (runId: string) => {
      if (!projectId) return;
      api.download(`/api/projects/${projectId}/eval-runs/${runId}/export`, `eval_run_${runId.slice(0, 8)}.zip`);
    },
  }), [projectId, project, load]);

  if (!project) return <p style={{ color: colors.gray[500] }}>Loading...</p>;

  const state: WorkspaceState = {
    project, versions, datasets, evalRuns, models,
    selectedVersion, selectedDatasetId,
    generatingDatasetId, activeRunId,
    datasetSSE: { lastEvent: datasetSSE.lastEvent, done: datasetSSE.done, connected: datasetSSE.connected },
    evalSSE: { lastEvent: evalSSE.lastEvent, done: evalSSE.done, connected: evalSSE.connected },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Link to="/projects" style={{ color: colors.gray[400], textDecoration: 'none', fontSize: 13 }}>Projects</Link>
          <span style={{ color: colors.gray[300], margin: '0 8px' }}>/</span>
          <h1 style={{ color: colors.navy, margin: 0, fontSize: 22, display: 'inline' }}>{project.name}</h1>
        </div>
      </div>

      <WorkspaceStepper activeStep={activeStep} state={state} onStepClick={setActiveStep} />

      {activeStep === 0 && <DefineTaskStep state={state} actions={actions} />}
      {activeStep === 1 && <DatasetStep state={state} actions={actions} />}
      {activeStep === 2 && <PromptStep state={state} actions={actions} />}
      {activeStep === 3 && <RunEvalStep state={state} actions={actions} />}
      {activeStep === 4 && <ResultsStep state={state} actions={actions} />}
    </div>
  );
}
