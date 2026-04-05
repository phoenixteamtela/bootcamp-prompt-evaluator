import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { colors, gradients } from '../theme';
import Tooltip from '../components/common/Tooltip';

const DATA_TYPES = [
  { id: 'short_text', label: 'Short text' },
  { id: 'paragraph', label: 'Paragraph' },
  { id: 'document', label: 'Document' },
  { id: 'integer', label: 'Integer' },
  { id: 'decimal', label: 'Decimal' },
  { id: 'currency_usd', label: 'Currency (USD)' },
  { id: 'list', label: 'List' },
  { id: 'json', label: 'JSON' },
] as const;

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'template' | 'conversation'>('template');
  const [name, setName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [extraCriteria, setExtraCriteria] = useState('');
  const [inputs, setInputs] = useState<{ key: string; description: string; type: string }[]>([
    { key: '', description: '', type: 'short_text' },
  ]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const addInput = () => setInputs([...inputs, { key: '', description: '', type: 'short_text' }]);
  const removeInput = (i: number) => setInputs(inputs.filter((_, idx) => idx !== i));
  const updateInput = (i: number, field: 'key' | 'description' | 'type', value: string) => {
    const updated = [...inputs];
    updated[i][field] = value;
    setInputs(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'template') {
      const spec: Record<string, { description: string; type: string }> = {};
      for (const input of inputs) {
        if (!input.key.trim()) continue;
        spec[input.key.trim()] = { description: input.description.trim(), type: input.type };
      }
      if (Object.keys(spec).length === 0) {
        setError('At least one prompt input is required for template projects');
        return;
      }
      setSaving(true);
      try {
        const project = await api.post<{ id: string }>('/api/projects', {
          name,
          mode: 'template',
          task_description: taskDescription,
          prompt_inputs_spec: spec,
          extra_criteria: extraCriteria || null,
        });
        navigate(`/projects/${project.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create project');
      } finally {
        setSaving(false);
      }
    } else {
      setSaving(true);
      try {
        const project = await api.post<{ id: string }>('/api/projects', {
          name,
          mode: 'conversation',
          task_description: taskDescription,
          extra_criteria: extraCriteria || null,
        });
        navigate(`/projects/${project.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create project');
      } finally {
        setSaving(false);
      }
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${colors.gray[300]}`,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600 as const,
    color: colors.gray[700],
    marginBottom: 6,
  };

  const modeButtonStyle = (active: boolean) => ({
    flex: 1,
    padding: '12px 16px',
    borderRadius: 8,
    border: active ? `2px solid ${colors.orange}` : `1px solid ${colors.gray[300]}`,
    background: active ? 'rgba(232,131,42,0.06)' : colors.white,
    cursor: 'pointer' as const,
    textAlign: 'left' as const,
    transition: 'all 0.15s',
  });

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ color: colors.navy, fontSize: 24, marginBottom: 24, display: 'flex', alignItems: 'center' }}>
        New Project
        <Tooltip text="A project is one prompt engineering challenge. It contains your task definition, test datasets, prompt versions, and evaluation results — everything you need to iterate toward a better prompt." />
      </h1>
      <form onSubmit={handleSubmit}>
        {/* Mode Toggle */}
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 24, marginBottom: 16 }}>
          <label style={{ ...labelStyle, marginBottom: 12, display: 'flex', alignItems: 'center' }}>
            Project Mode
            <Tooltip text="Template mode uses input variables and test datasets for rigorous evaluation. Conversation mode is simpler — write a plain prompt and get scored on prompt engineering best practices." />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={() => setMode('template')} style={modeButtonStyle(mode === 'template')}>
              <div style={{ fontWeight: 600, fontSize: 14, color: colors.navy, marginBottom: 4 }}>Template</div>
              <div style={{ fontSize: 12, color: colors.gray[500], lineHeight: 1.4 }}>
                Define input variables, generate test datasets, write prompt templates with {'{'}<span style={{ color: colors.orange }}>variables</span>{'}'}, and evaluate across multiple test cases.
              </div>
            </button>
            <button type="button" onClick={() => setMode('conversation')} style={modeButtonStyle(mode === 'conversation')}>
              <div style={{ fontWeight: 600, fontSize: 14, color: colors.navy, marginBottom: 4 }}>Conversation</div>
              <div style={{ fontSize: 12, color: colors.gray[500], lineHeight: 1.4 }}>
                Write a plain prompt (no variables), run it once, and get scored on four prompt engineering pillars: Clarity, Specificity, Examples, and Structure.
              </div>
            </button>
          </div>
        </div>

        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 24, marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Project Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle} placeholder="e.g., Meal Plan Generator" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center' }}>
              Task Description
              <Tooltip text={mode === 'template'
                ? "What do you want the AI to do? For example: 'Summarize legal documents' or 'Generate meal plans based on dietary needs.' This guides the kind of test scenarios that get created."
                : "Describe the task your prompt addresses. For example: 'Handle an angry customer complaint about a late delivery.' The grader uses this to understand what your prompt should accomplish."
              } />
            </label>
            <textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} required rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Describe what the prompt should accomplish..." />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center' }}>
              Extra Criteria (optional)
              <Tooltip text="Rules that every AI response must follow, no matter what. For example: 'Always respond in bullet points' or 'Never exceed 200 words.' Violations here mean an automatic low score." />
            </label>
            <textarea value={extraCriteria} onChange={e => setExtraCriteria(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Mandatory requirements that override all other criteria..." />
          </div>
        </div>

        {mode === 'template' && (
          <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 24, marginBottom: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 12, display: 'flex', alignItems: 'center' }}>
              Prompt Input Variables
              <Tooltip text="These are the pieces of information that change with each test case. For example, a summarization task might have a 'document' variable — each test case provides a different document for the AI to summarize." />
            </label>
            {inputs.map((input, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  value={input.key}
                  onChange={e => updateInput(i, 'key', e.target.value)}
                  placeholder="Variable name"
                  style={{ ...inputStyle, width: 160, flex: 'none' }}
                />
                <select
                  value={input.type}
                  onChange={e => updateInput(i, 'type', e.target.value)}
                  style={{ ...inputStyle, width: 150, flex: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23666\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: 28 }}
                >
                  {DATA_TYPES.map(dt => (
                    <option key={dt.id} value={dt.id}>{dt.label}</option>
                  ))}
                </select>
                <input
                  value={input.description}
                  onChange={e => updateInput(i, 'description', e.target.value)}
                  placeholder="Description"
                  style={{ ...inputStyle, flex: 1 }}
                />
                {inputs.length > 1 && (
                  <button type="button" onClick={() => removeInput(i)} style={{
                    background: 'none', border: 'none', color: colors.gray[400], cursor: 'pointer', fontSize: 18, padding: 4,
                  }}>
                    x
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addInput} style={{
              background: 'none', border: `1px dashed ${colors.gray[300]}`, color: colors.gray[500], padding: '8px 16px',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, marginTop: 4,
            }}>
              + Add Variable
            </button>
          </div>
        )}

        {error && <div style={{ color: colors.error, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate('/projects')} style={{
            padding: '10px 20px', borderRadius: 8, border: `1px solid ${colors.gray[300]}`, background: colors.white,
            cursor: 'pointer', fontSize: 14, color: colors.gray[600],
          }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none', background: gradients.phoenix,
            color: colors.white, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
