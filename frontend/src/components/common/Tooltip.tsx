import { useState, ReactNode } from 'react';
import { colors } from '../../theme';

interface TooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: ReactNode;
}

export default function Tooltip({ text, position = 'top', children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionStyle: React.CSSProperties =
    position === 'top' ? { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 } :
    position === 'bottom' ? { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 } :
    position === 'left' ? { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 } :
    { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 };

  const bubble: React.CSSProperties = {
    position: 'absolute',
    ...positionStyle,
    background: colors.gray[800],
    color: colors.white,
    fontSize: 12,
    lineHeight: 1.4,
    padding: '8px 10px',
    borderRadius: 6,
    width: 220,
    zIndex: 1000,
    pointerEvents: 'none',
    fontWeight: 400,
  };

  const icon = (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', border: `1px solid ${colors.gray[400]}`, fontSize: 10, color: colors.gray[500], cursor: 'help', flexShrink: 0, marginLeft: 4, userSelect: 'none' }}
    >
      i
    </span>
  );

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children || icon}
      {visible && <span style={bubble}>{text}</span>}
    </span>
  );
}
