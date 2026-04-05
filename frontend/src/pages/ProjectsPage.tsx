import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { colors, gradients } from '../theme';
import ScoreBadge from '../components/common/ScoreBadge';
import Tooltip from '../components/common/Tooltip';

interface Project {
  id: string;
  name: string;
  mode: 'template' | 'conversation';
  task_description: string;
  version_count: number;
  latest_avg_score: number | null;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Project[]>('/api/projects').then(setProjects).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ color: colors.navy, margin: 0, fontSize: 24, display: 'flex', alignItems: 'center' }}>
          My Projects
          <Tooltip text="A project is one prompt engineering challenge. It contains your task definition, test datasets, prompt versions, and evaluation results — everything you need to iterate toward a better prompt." />
        </h1>
        <Link
          to="/projects/new"
          style={{
            background: gradients.phoenix,
            color: colors.white,
            padding: '10px 20px',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          + New Project
        </Link>
      </div>

      {loading ? (
        <p style={{ color: colors.gray[500] }}>Loading...</p>
      ) : projects.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: colors.white,
          borderRadius: 12,
          border: `1px solid ${colors.gray[200]}`,
        }}>
          <p style={{ color: colors.gray[500], fontSize: 16, marginBottom: 16 }}>No projects yet</p>
          <Link
            to="/projects/new"
            style={{ color: colors.orange, fontWeight: 600, textDecoration: 'none' }}
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {projects.map(p => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              style={{
                textDecoration: 'none',
                background: colors.white,
                borderRadius: 12,
                border: `1px solid ${colors.gray[200]}`,
                padding: 20,
                display: 'block',
                transition: 'box-shadow 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = colors.orange;
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(232,131,42,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = colors.gray[200];
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ color: colors.navy, margin: 0, fontSize: 16 }}>{p.name}</h3>
                  <span style={{
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                    padding: '2px 6px', borderRadius: 4,
                    background: p.mode === 'conversation' ? 'rgba(232,131,42,0.1)' : colors.gray[100],
                    color: p.mode === 'conversation' ? colors.orange : colors.gray[500],
                  }}>{p.mode}</span>
                </div>
                <ScoreBadge score={p.latest_avg_score} size="sm" />
              </div>
              <p style={{ color: colors.gray[600], fontSize: 13, margin: '0 0 12px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {p.task_description}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.gray[400] }}>
                <span>{p.version_count} version{p.version_count !== 1 ? 's' : ''}</span>
                <span>{new Date(p.updated_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
