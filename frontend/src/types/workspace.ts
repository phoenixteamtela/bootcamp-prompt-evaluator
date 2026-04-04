export interface Project {
  id: string;
  name: string;
  task_description: string;
  prompt_inputs_spec: Record<string, string>;
  extra_criteria: string | null;
}

export interface Version {
  id: string;
  version_number: number;
  label: string | null;
  template: string;
  latest_avg_score: number | null;
  latest_pass_rate: number | null;
}

export interface TestCase {
  id: string;
  scenario: string;
  prompt_inputs: Record<string, string>;
  solution_criteria: string[];
}

export interface Dataset {
  id: string;
  name: string;
  num_cases: number;
  status: string;
  test_cases: TestCase[];
}

export interface EvalRun {
  id: string;
  status: string;
  run_model: string;
  grading_model: string;
  temperature: number;
  avg_score: number | null;
  pass_rate: number | null;
  total_cases: number;
  completed_cases: number;
  version_number: number | null;
  version_label: string | null;
  prompt_version_id: string;
  created_at: string;
  error_message: string | null;
  results: EvalResult[];
}

export interface EvalResult {
  id: string;
  scenario: string;
  prompt_inputs: Record<string, string>;
  solution_criteria: string[];
  rendered_prompt: string | null;
  output: string;
  score: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
}

export interface Model {
  id: string;
  provider: string;
}

export interface SSEState {
  lastEvent: { event: string; data: Record<string, unknown> } | null;
  done: boolean;
  connected: boolean;
}

export interface WorkspaceState {
  project: Project;
  versions: Version[];
  datasets: Dataset[];
  evalRuns: EvalRun[];
  models: Model[];
  selectedVersion: Version | null;
  selectedDatasetId: string;
  generatingDatasetId: string | null;
  activeRunId: string | null;
  datasetSSE: SSEState;
  evalSSE: SSEState;
}

export interface WorkspaceActions {
  goToStep: (step: number) => void;
  setSelectedVersion: (v: Version | null) => void;
  setSelectedDatasetId: (id: string) => void;
  setGeneratingDatasetId: (id: string | null) => void;
  setActiveRunId: (id: string | null) => void;
  reload: () => Promise<void>;
  saveVersion: (template: string, label: string | null) => Promise<Version>;
  generateDataset: (name: string, numCases: number, model: string) => Promise<void>;
  runEval: (datasetId: string, versionId: string, runModel: string, gradingModel: string, temperature: number) => Promise<void>;
  viewRun: (runId: string) => Promise<EvalRun>;
  downloadProject: () => void;
  downloadRun: (runId: string) => void;
}
