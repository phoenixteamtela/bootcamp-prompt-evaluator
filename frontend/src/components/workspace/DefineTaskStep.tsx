import { colors, gradients } from '../../theme';
import Tooltip from '../common/Tooltip';
import type { WorkspaceState, WorkspaceActions } from '../../types/workspace';

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

export default function DefineTaskStep({ state, actions }: Props) {
  const { project } = state;
  const inputKeys = Object.keys(project.prompt_inputs_spec);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Task Description */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: colors.navy, display: 'flex', alignItems: 'center' }}>
          Task Description
          <Tooltip text="The goal your prompt is trying to achieve. All test cases and grading are based on how well the AI accomplishes this task." />
        </h2>
        <div style={{
          padding: 14, borderRadius: 8, background: colors.gray[50],
          fontSize: 14, lineHeight: 1.6, color: colors.gray[700],
          whiteSpace: 'pre-wrap',
        }}>
          {project.task_description}
        </div>
      </div>

      {/* Input Variables */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 16, color: colors.navy, display: 'flex', alignItems: 'center' }}>
          Input Variables
          <Tooltip text="The pieces of information that change with each test case. When you run an evaluation, each test scenario provides different values for these variables so the AI is tested on a variety of inputs." />
        </h2>
        {inputKeys.length === 0 ? (
          <p style={{ color: colors.gray[400], fontSize: 13 }}>No input variables defined.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inputKeys.map(key => (
              <div key={key} style={{
                display: 'flex', gap: 12, alignItems: 'baseline',
                padding: '10px 14px', borderRadius: 8, background: colors.gray[50],
              }}>
                <code style={{
                  fontSize: 13, fontWeight: 600, color: colors.orange,
                  background: colors.white, padding: '2px 8px', borderRadius: 4,
                  border: `1px solid ${colors.gray[200]}`,
                }}>
                  {`{${key}}`}
                </code>
                <span style={{ fontSize: 13, color: colors.gray[600] }}>
                  {project.prompt_inputs_spec[key]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extra Criteria */}
      {project.extra_criteria && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: colors.navy, display: 'flex', alignItems: 'center' }}>
            Extra Grading Criteria
            <Tooltip text="Extra rules that apply to every response. The AI grader will check these on top of the scenario-specific criteria. Anything here that's violated means an automatic low score." />
          </h2>
          <div style={{
            padding: 14, borderRadius: 8, background: colors.gray[50],
            fontSize: 14, lineHeight: 1.6, color: colors.gray[700],
            whiteSpace: 'pre-wrap',
          }}>
            {project.extra_criteria}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => actions.goToStep(1)} style={btnStyle('primary')}>
          Next: Generate Dataset →
        </button>
      </div>
    </div>
  );
}
