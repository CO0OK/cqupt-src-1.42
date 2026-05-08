import { useEffect, useRef } from 'react';
import type { User } from '../types';

interface WatermarkProps {
  user: User | null;
}

function buildWatermarkLines(user: User | null): string[] {
  if (!user) return ['蓝山工作室安全组考核用'];
  return ['蓝山工作室安全组考核用', user.authCode, user.username];
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

  return (
    <div
      ref={divRef}
      aria-hidden="true"
      className="wm-overlay"
    />
  );
}
