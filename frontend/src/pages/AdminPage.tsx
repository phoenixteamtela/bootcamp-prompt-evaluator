import { useEffect, useState, FormEvent } from 'react';
import { api } from '../api/client';
import { colors, gradients } from '../theme';

interface User {
  id: string; username: string; display_name: string; is_admin: boolean; is_active: boolean; created_at: string;
}
interface UsageStat {
  user_id: string; username: string; display_name: string; total_calls: number; total_input_tokens: number; total_output_tokens: number;
}
interface Limit {
  id: string | null; user_id: string | null; username: string | null; max_calls_per_day: number; max_calls_per_hour: number;
}

export default function AdminPage() {
  const [tab, setTab] = useState<'users' | 'usage' | 'limits'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStat[]>([]);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', display_name: '', password: '', is_admin: false });
  const [error, setError] = useState('');

  // Global limit edit
  const [globalDay, setGlobalDay] = useState(100);
  const [globalHour, setGlobalHour] = useState(30);

  useEffect(() => {
    if (tab === 'users') api.get<User[]>('/api/admin/users').then(setUsers);
    if (tab === 'usage') api.get<UsageStat[]>('/api/admin/usage').then(setUsageStats);
    if (tab === 'limits') api.get<Limit[]>('/api/admin/limits').then(lims => {
      setLimits(lims);
      const global = lims.find(l => l.user_id === null);
      if (global) { setGlobalDay(global.max_calls_per_day); setGlobalHour(global.max_calls_per_hour); }
    });
  }, [tab]);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/api/admin/users', newUser);
      setShowCreateUser(false);
      setNewUser({ username: '', display_name: '', password: '', is_admin: false });
      api.get<User[]>('/api/admin/users').then(setUsers);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
  };

  const toggleActive = async (user: User) => {
    await api.patch(`/api/admin/users/${user.id}`, { is_active: !user.is_active });
    api.get<User[]>('/api/admin/users').then(setUsers);
  };

  const saveGlobalLimits = async () => {
    await api.put('/api/admin/limits/global', { max_calls_per_day: globalDay, max_calls_per_hour: globalHour });
    api.get<Limit[]>('/api/admin/limits').then(setLimits);
  };

  const inputStyle = { padding: '8px 12px', borderRadius: 8, border: `1px solid ${colors.gray[300]}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const };
  const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', background: gradients.phoenix, color: colors.white, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
  const btnSecondary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: `1px solid ${colors.gray[300]}`, background: colors.white, color: colors.gray[700], fontSize: 13, cursor: 'pointer' };

  return (
    <div>
      <h1 style={{ color: colors.navy, fontSize: 24, marginBottom: 24 }}>Admin Panel</h1>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['users', 'usage', 'limits'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === t ? colors.navy : colors.gray[100], color: tab === t ? colors.white : colors.gray[600],
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, color: colors.navy }}>Users</h2>
            <button onClick={() => setShowCreateUser(!showCreateUser)} style={btnPrimary}>+ Create User</button>
          </div>

          {showCreateUser && (
            <form onSubmit={handleCreateUser} style={{ marginBottom: 16, padding: 16, background: colors.gray[50], borderRadius: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Username</label>
                <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Display Name</label>
                <input value={newUser.display_name} onChange={e => setNewUser({ ...newUser, display_name: e.target.value })} required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Password</label>
                <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required style={inputStyle} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={newUser.is_admin} onChange={e => setNewUser({ ...newUser, is_admin: e.target.checked })} /> Admin
              </label>
              <button type="submit" style={btnPrimary}>Create</button>
              {error && <span style={{ color: colors.error, fontSize: 12 }}>{error}</span>}
            </form>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Username', 'Display Name', 'Admin', 'Active', 'Created', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 12, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                  <td style={{ padding: '10px 8px' }}>{u.username}</td>
                  <td style={{ padding: '10px 8px' }}>{u.display_name}</td>
                  <td style={{ padding: '10px 8px' }}>{u.is_admin ? 'Yes' : 'No'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: u.is_active ? colors.successBg : colors.errorBg, color: u.is_active ? colors.success : colors.error }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <button onClick={() => toggleActive(u)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11 }}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Usage Tab */}
      {tab === 'usage' && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, color: colors.navy }}>API Usage by User</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['User', 'Total Calls', 'Input Tokens', 'Output Tokens'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 12, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usageStats.map(s => (
                <tr key={s.user_id} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{s.display_name} <span style={{ color: colors.gray[400], fontWeight: 400 }}>@{s.username}</span></td>
                  <td style={{ padding: '10px 8px' }}>{s.total_calls.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px' }}>{s.total_input_tokens.toLocaleString()}</td>
                  <td style={{ padding: '10px 8px' }}>{s.total_output_tokens.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Limits Tab */}
      {tab === 'limits' && (
        <div style={{ background: colors.white, borderRadius: 12, border: `1px solid ${colors.gray[200]}`, padding: 20 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, color: colors.navy }}>API Limits</h2>
          <div style={{ padding: 16, background: colors.gray[50], borderRadius: 8, marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Global - Calls/Day</label>
              <input type="number" value={globalDay} onChange={e => setGlobalDay(Number(e.target.value))} style={{ ...inputStyle, width: 100 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: colors.gray[500], display: 'block', marginBottom: 4 }}>Global - Calls/Hour</label>
              <input type="number" value={globalHour} onChange={e => setGlobalHour(Number(e.target.value))} style={{ ...inputStyle, width: 100 }} />
            </div>
            <button onClick={saveGlobalLimits} style={btnPrimary}>Save</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Scope', 'Calls/Day', 'Calls/Hour'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${colors.gray[200]}`, color: colors.navy, fontSize: 12, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {limits.map((l, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.gray[100]}` }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{l.user_id ? l.username || l.user_id : 'Global (default)'}</td>
                  <td style={{ padding: '10px 8px' }}>{l.max_calls_per_day}</td>
                  <td style={{ padding: '10px 8px' }}>{l.max_calls_per_hour}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
