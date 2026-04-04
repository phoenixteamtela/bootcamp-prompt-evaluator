import { Link } from 'react-router-dom';
import { colors, gradients } from '../theme';

const workflowSteps = [
  {
    num: 1,
    title: 'Define Task',
    desc: 'Describe the AI task you want your prompt to solve.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  {
    num: 2,
    title: 'Generate Dataset',
    desc: 'Auto-generate diverse test cases with reference answers.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    num: 3,
    title: 'Write Prompt',
    desc: 'Craft your system prompt and iterate on wording.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    num: 4,
    title: 'Run Evaluation',
    desc: 'Execute your prompt against every test case.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    num: 5,
    title: 'Analyze Results',
    desc: 'Review LLM-as-judge scores and detailed feedback.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    num: 6,
    title: 'Iterate',
    desc: 'Refine your prompt and re-run to improve scores.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    ),
  },
];

const features = [
  {
    title: 'Multi-Model Support',
    desc: 'Test prompts across Anthropic Claude and OpenAI GPT models side by side.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    title: 'LLM-as-Judge Grading',
    desc: 'Automated 1–10 scoring with detailed rationale for every test case.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    title: 'Real-Time Progress',
    desc: 'Watch evaluations stream live with SSE-powered progress updates.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    title: 'Version History',
    desc: 'Track every prompt revision with full run history and score comparisons.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: 'Leaderboard',
    desc: 'Compete with classmates — see who can engineer the best prompts.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
  },
  {
    title: 'Export & Download',
    desc: 'Download ZIP packages with HTML reports for offline review.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
];

const scoreRanges = [
  { range: '8 – 10', label: 'Excellent', bg: colors.successBg, fg: colors.success, desc: 'Prompt produces high-quality, accurate outputs' },
  { range: '6 – 7', label: 'Needs Work', bg: colors.warningBg, fg: colors.warning, desc: 'Partial credit — room for improvement in clarity or completeness' },
  { range: '1 – 5', label: 'Poor', bg: colors.errorBg, fg: colors.error, desc: 'Significant issues — rethink your approach or wording' },
];

export default function AboutPage() {
  return (
    <div style={{ margin: '-24px -24px 0' }}>
      {/* Hero Banner */}
      <section style={{
        background: colors.navy,
        color: colors.white,
        padding: '64px 32px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>
          Prompt Evaluator
        </h1>
        <p style={{
          fontSize: 18,
          opacity: 0.85,
          maxWidth: 640,
          margin: '16px auto 0',
          lineHeight: 1.6,
        }}>
          Master the art of prompt engineering through iterative testing. Write prompts,
          generate test datasets, run evaluations with LLM-as-judge grading, and
          refine until your prompts perform.
        </p>
      </section>

      {/* Workflow Section */}
      <section style={{ padding: '56px 32px', background: colors.white }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 24,
          fontWeight: 700,
          color: colors.navy,
          margin: '0 0 8px',
        }}>
          How It Works
        </h2>
        <p style={{
          textAlign: 'center',
          color: colors.gray[600],
          fontSize: 15,
          margin: '0 0 48px',
        }}>
          The iterative prompt engineering workflow
        </p>

        <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto' }}>
          {/* Connecting line */}
          <div style={{
            position: 'absolute',
            top: 28,
            left: '8%',
            right: '8%',
            height: 3,
            background: gradients.phoenix,
            borderRadius: 2,
            zIndex: 0,
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 16,
            position: 'relative',
            zIndex: 1,
          }}>
            {workflowSteps.map(step => (
              <div key={step.num} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: gradients.phoenix,
                  color: colors.white,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: 14,
                  flexDirection: 'column',
                  gap: 2,
                }}>
                  {step.icon}
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: colors.navy,
                  marginBottom: 4,
                }}>
                  {step.title}
                </div>
                <div style={{
                  fontSize: 12,
                  color: colors.gray[600],
                  lineHeight: 1.4,
                }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{
        padding: '56px 32px',
        background: colors.gray[50],
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 24,
          fontWeight: 700,
          color: colors.navy,
          margin: '0 0 8px',
        }}>
          Features
        </h2>
        <p style={{
          textAlign: 'center',
          color: colors.gray[600],
          fontSize: 15,
          margin: '0 0 40px',
        }}>
          Everything you need to build better prompts
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          maxWidth: 900,
          margin: '0 auto',
        }}>
          {features.map(f => (
            <div key={f.title} style={{
              background: colors.white,
              borderRadius: 12,
              padding: '28px 24px',
              border: `1px solid ${colors.gray[200]}`,
            }}>
              <div style={{ marginBottom: 12 }}>{f.icon}</div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: colors.navy,
                marginBottom: 6,
              }}>
                {f.title}
              </div>
              <div style={{
                fontSize: 13,
                color: colors.gray[600],
                lineHeight: 1.5,
              }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring Guide */}
      <section style={{ padding: '56px 32px', background: colors.white }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 24,
          fontWeight: 700,
          color: colors.navy,
          margin: '0 0 8px',
        }}>
          Scoring Guide
        </h2>
        <p style={{
          textAlign: 'center',
          color: colors.gray[600],
          fontSize: 15,
          margin: '0 0 40px',
        }}>
          How the LLM judge evaluates your prompt outputs
        </p>

        <div style={{
          display: 'flex',
          gap: 20,
          maxWidth: 780,
          margin: '0 auto',
          justifyContent: 'center',
        }}>
          {scoreRanges.map(s => (
            <div key={s.range} style={{
              flex: 1,
              borderRadius: 12,
              padding: '24px 20px',
              border: `1px solid ${colors.gray[200]}`,
              textAlign: 'center',
            }}>
              <span style={{
                display: 'inline-block',
                background: s.bg,
                color: s.fg,
                fontWeight: 700,
                fontSize: 18,
                padding: '6px 16px',
                borderRadius: 8,
                marginBottom: 12,
              }}>
                {s.range}
              </span>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: colors.navy,
                marginBottom: 4,
              }}>
                {s.label}
              </div>
              <div style={{
                fontSize: 13,
                color: colors.gray[600],
                lineHeight: 1.5,
              }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{
        padding: '48px 32px',
        background: colors.navy,
        textAlign: 'center',
      }}>
        <h2 style={{
          color: colors.white,
          fontSize: 22,
          fontWeight: 700,
          margin: '0 0 16px',
        }}>
          Ready to start?
        </h2>
        <Link to="/projects" style={{
          display: 'inline-block',
          background: gradients.phoenix,
          color: colors.white,
          padding: '12px 32px',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'opacity 0.2s',
        }}>
          Go to Projects
        </Link>
      </section>
    </div>
  );
}
