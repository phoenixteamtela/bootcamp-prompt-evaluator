import { colors, gradients } from '../../theme';
import type { WorkspaceState } from '../../types/workspace';

const steps = [
  { label: 'Define Task', icon: '1' },
  { label: 'Generate Dataset', icon: '2' },
  { label: 'Write Prompt', icon: '3' },
  { label: 'Run Evaluation', icon: '4' },
  { label: 'Analyze Results', icon: '5' },
];

function getStepHint(index: number, state: WorkspaceState): string {
  const readyDatasets = state.datasets.filter(d => d.status === 'ready');
  switch (index) {
    case 0:
      return 'Defined';
    case 1:
      if (state.generatingDatasetId && !state.datasetSSE.done) return 'Generating...';
      return readyDatasets.length > 0 ? `${readyDatasets.length} dataset${readyDatasets.length !== 1 ? 's' : ''}` : 'No datasets';
    case 2:
      if (state.selectedVersion) return `v${state.selectedVersion.version_number}`;
      return state.versions.length > 0 ? `${state.versions.length} version${state.versions.length !== 1 ? 's' : ''}` : 'No versions';
    case 3:
      if (state.activeRunId && !state.evalSSE.done) return 'Running...';
      return state.selectedVersion && state.selectedDatasetId ? 'Ready' : 'Select data';
    case 4:
      return state.evalRuns.length > 0 ? `${state.evalRuns.length} run${state.evalRuns.length !== 1 ? 's' : ''}` : 'No runs';
    default:
      return '';
  }
}

interface Props {
  activeStep: number;
  state: WorkspaceState;
  onStepClick: (step: number) => void;
}

export default function WorkspaceStepper({ activeStep, state, onStepClick }: Props) {
  return (
    <div style={{ position: 'relative', marginBottom: 28, padding: '0 24px' }}>
      {/* Connecting line */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: '10%',
        right: '10%',
        height: 3,
        background: gradients.phoenix,
        borderRadius: 2,
        zIndex: 0,
      }} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
        position: 'relative',
        zIndex: 1,
      }}>
        {steps.map((step, i) => {
          const isActive = i === activeStep;
          const hasData = i < activeStep;
          const hint = getStepHint(i, state);

          let circleBg: string;
          let circleColor: string;
          let circleBorder: string;
          if (isActive) {
            circleBg = gradients.phoenix;
            circleColor = colors.white;
            circleBorder = 'none';
          } else if (hasData) {
            circleBg = colors.navy;
            circleColor = colors.white;
            circleBorder = 'none';
          } else {
            circleBg = colors.white;
            circleColor = colors.gray[500];
            circleBorder = `2px solid ${colors.gray[300]}`;
          }

          return (
            <div
              key={i}
              onClick={() => onStepClick(i)}
              style={{ textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: circleBg,
                color: circleColor,
                border: circleBorder,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontSize: 15,
                fontWeight: 700,
                transition: 'all 0.2s',
              }}>
                {step.icon}
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: 700,
                color: isActive ? colors.navy : colors.gray[600],
                marginBottom: 2,
              }}>
                {step.label}
              </div>
              <div style={{
                fontSize: 11,
                color: colors.gray[400],
              }}>
                {hint}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
