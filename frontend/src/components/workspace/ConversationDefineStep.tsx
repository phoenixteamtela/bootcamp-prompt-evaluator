import { colors, gradients } from '../../theme';
import type { WorkspaceState, WorkspaceActions } from '../../types/workspace';

const PILLARS = [
  {
    name: 'Clarity & Directness',
    description: 'First line states the task, simple language, action verbs, persona when appropriate.',
    weight: '0 - 2.5',
  },
  {
    name: 'Specificity',
    description: 'Guidelines/steps provided, output qualities defined, subtask decomposition.',
    weight: '0 - 2.5',
  },
  {
    name: 'Examples',
    description: 'Sample input/output pairs, edge cases addressed, content tags, explains why ideal.',
    weight: '0 - 2.5',
  },
  {
    name: 'Structure',
    description: 'XML tags/delimiters, content separation, clear boundaries between sections.',
    weight: '0 - 2.5',
  },
];

interface Props {
  state: WorkspaceState;
  actions: WorkspaceActions;
}

export default function ConversationDefineStep({ state, actions }: Props) {
  return (
    <div>
      {/* Task Description */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[700], marginBottom: 8 }}>Task Description</div>
        <div style={{ background: colors.gray[50], padding: 16, borderRadius: 8, fontSize: 14, color: colors.gray[700], lineHeight: 1.6 }}>
          {state.project.task_description}
        </div>
      </div>

      {state.project.extra_criteria && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[700], marginBottom: 8 }}>Extra Criteria</div>
          <div style={{ background: colors.gray[50], padding: 16, borderRadius: 8, fontSize: 14, color: colors.gray[700], lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {state.project.extra_criteria}
          </div>
        </div>
      )}

      {/* Rubric Reference */}
      <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.gray[700], marginBottom: 12 }}>
          Grading Rubric — Four Pillars of Prompt Engineering
        </div>
        <div style={{ fontSize: 13, color: colors.gray[500], marginBottom: 16, lineHeight: 1.5 }}>
          Your prompt will be scored on these four pillars. Each pillar is worth 0-2.5 points, summed for a total score of 1-10.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {PILLARS.map(p => (
            <div key={p.name} style={{
              background: colors.gray[50], borderRadius: 8, padding: 16,
              borderLeft: `3px solid ${colors.orange}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.navy }}>{p.name}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: colors.orange }}>{p.weight}</div>
              </div>
              <div style={{ fontSize: 12, color: colors.gray[600], lineHeight: 1.5 }}>{p.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <button
          onClick={() => actions.goToStep(1)}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: gradients.phoenix, color: colors.white,
            cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}
        >
          Next: Write Prompt
        </button>
      </div>
    </div>
  );
}
