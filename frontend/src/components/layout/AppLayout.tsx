import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div style={{ minHeight: '100vh', background: colors.gray[50] }}>
      <header style={{
        background: colors.navy,
        color: colors.white,
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/projects" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src="/logos/PhoenixTeam Horizontal_Reverse Gradient.png"
              alt="PhoenixTeam"
              style={{ height: 32 }}
            />
          </Link>
          <nav style={{ display: 'flex', gap: 4 }}>
            {[
              { to: '/projects', label: 'Projects' },
              { to: '/leaderboard', label: 'Leaderboard' },
              ...(user?.is_admin ? [{ to: '/admin', label: 'Admin' }] : []),
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  color: colors.white,
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  background: isActive(link.to) ? 'rgba(255,255,255,0.15)' : 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 14 }}>
          <span style={{ opacity: 0.8 }}>{user?.display_name}</span>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: colors.white,
              padding: '6px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
