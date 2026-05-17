import { useEffect, useRef } from 'react';
import type { User } from '../types';

interface WatermarkProps {
  user: User | null;
}

function getRangeInfo(): { visitor: number; online: number; total: number } | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)range_info=([^;]+)/);
    if (!match) return null;
    const obj = JSON.parse(decodeURIComponent(match[1]));
    if (typeof obj.v === 'number') return { visitor: obj.v, online: obj.t, total: obj.m };
  } catch {}
  return null;
}

function buildWatermarkLines(user: User | null): string[] {
  const range = getRangeInfo();
  const base = range
    ? [`蓝山工作室安全组考核用`, `第 ${range.visitor} 位 · 在线 ${range.online}/${range.total}`]
    : ['蓝山工作室安全组考核用'];
  if (!user) return base;
  return [...base, user.authCode, user.username];
}

function drawWatermark(canvas: HTMLCanvasElement, lines: string[]) {
  const dpr = window.devicePixelRatio || 1;
  const tileW = 240;
  const tileH = 140;
  canvas.width = tileW * dpr;
  canvas.height = tileH * dpr;
  canvas.style.width = `${tileW}px`;
  canvas.style.height = `${tileH}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, tileW, tileH);
  ctx.save();

  ctx.translate(tileW / 2, tileH / 2);
  ctx.rotate(-Math.PI / 6); // -30°

  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(120, 120, 120, 0.13)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lineHeight = 18;
  const totalHeight = lines.length * lineHeight;
  lines.forEach((line, i) => {
    const y = -totalHeight / 2 + i * lineHeight + lineHeight / 2;
    ctx.fillText(line, 0, y);
  });

  ctx.restore();
}

export default function Watermark({ user }: WatermarkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lines = buildWatermarkLines(user);
    drawWatermark(canvasRef.current, lines);
    const dataUrl = canvasRef.current.toDataURL('image/png');

    if (divRef.current) {
      divRef.current.style.backgroundImage = `url(${dataUrl})`;
    }
  }, [user]);

  useEffect(() => {
    if (!getRangeInfo()) return undefined;

    const sendHeartbeat = () => {
      fetch('/_range/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => undefined);
    };

    sendHeartbeat();
    const heartbeatId = window.setInterval(sendHeartbeat, 60_000);
    return () => window.clearInterval(heartbeatId);
  }, []);

  return (
    <div
      ref={divRef}
      aria-hidden="true"
      className="wm-overlay"
    />
  );
}
