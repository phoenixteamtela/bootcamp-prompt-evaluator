import { useState, useRef, useLayoutEffect, ReactNode } from 'react';
import { colors } from '../../theme';

interface TooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: ReactNode;
}

export default function Tooltip({ text, position = 'bottom', children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [nudge, setNudge] = useState(0);

  useLayoutEffect(() => {
    if (!visible || !bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    let shift = 0;
    if (rect.left < 8) shift = 8 - rect.left;
    else if (rect.right > window.innerWidth - 8) shift = window.innerWidth - 8 - rect.right;
    setNudge(shift);
  }, [visible]);

  const positionStyle: React.CSSProperties =
    position === 'top' ? { bottom: '100%', left: '50%', transform: `translateX(calc(-50% + ${nudge}px))`, marginBottom: 6 } :
    position === 'bottom' ? { top: '100%', left: '50%', transform: `translateX(calc(-50% + ${nudge}px))`, marginTop: 6 } :
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
    width: 240,
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
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => { setNudge(0); setVisible(true); }}
      onMouseLeave={() => setVisible(false)}
    >
      {children || icon}
      {visible && <span ref={bubbleRef} style={bubble}>{text}</span>}
    </span>
  );
}
