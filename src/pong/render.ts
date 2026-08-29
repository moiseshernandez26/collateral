import { S } from '../state';
import { paint } from '../controller';
import { PONG, ball, paddle, running, thinking, agentFace, humanFace } from './state';
import { step, moveHumanPaddle } from './actions';

const canvas = document.getElementById('pongCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const css = getComputedStyle(document.documentElement);
const col = (name: string, fallback: string): string => css.getPropertyValue(name).trim() || fallback;
const INK = col('--ink', '#141613');
const PANEL = col('--panel', '#EDEFEA');
const HUMAN = col('--human', '#C24A2C');
const AGENT = col('--agent', '#3F35B8');
const RULE = col('--rule', '#7C8878');

let raf = 0;
let fallback = 0;
let lastAt = 0;
let wired = false;
let paintedThinking = false;

function pointerY(clientY: number): number {
  const r = canvas.getBoundingClientRect();
  return ((clientY - r.top) / r.height) * PONG.h;
}

function wire(): void {
  if (wired) return;
  wired = true;

  canvas.addEventListener('pointermove', (e) => {
    if (S.game !== 'pong' || S.over) return;
    e.preventDefault();
    moveHumanPaddle(pointerY(e.clientY));
  });
  // Keyboard is not a nicety here: the canvas is the only control, so without
  // it Pong would be unplayable without a pointer (R11.5).
  canvas.addEventListener('keydown', (e) => {
    if (S.game !== 'pong' || S.over) return;
    const stepPx = e.shiftKey ? 8 : 24;
    if (e.key === 'ArrowUp') moveHumanPaddle(paddle.human - stepPx);
    else if (e.key === 'ArrowDown') moveHumanPaddle(paddle.human + stepPx);
    else return;
    e.preventDefault();
  });
}

export function buildGrid(): void {
  wire();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = PONG.w * dpr;
  canvas.height = PONG.h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  startLoop();
}

export function stopLoop(): void {
  if (raf) cancelAnimationFrame(raf);
  if (fallback) clearInterval(fallback);
  raf = 0;
  fallback = 0;
  lastAt = 0;
}

// requestAnimationFrame does not run at all in a hidden tab, and a hidden tab
// is not hypothetical here: the agent driving the game may well live in
// another window, which is exactly when Pong must keep running. So the clock
// is wall-time and a timer takes over whenever frames stop coming. Both
// drivers share `lastAt`, so whichever fires first consumes the elapsed time
// and they can never double-step.
function advance(): void {
  const t = performance.now();
  const dt = lastAt ? t - lastAt : 16;
  lastAt = t;
  const scored = step(dt);
  // The turn box has to follow the slow-motion window too, otherwise it keeps
  // reading "Rally" the whole time the agent is deciding. Repainting on the
  // transition covers every way it can flip: handed to the agent, answered by
  // pong_move, or given up on by the think timeout.
  if (scored || thinking !== paintedThinking) {
    paintedThinking = thinking;
    paint();
  }
}

function startLoop(): void {
  if (!raf) {
    lastAt = 0;
    raf = requestAnimationFrame(frame);
  }
  if (!fallback) {
    fallback = window.setInterval(() => {
      if (S.game !== 'pong') return stopLoop();
      if (document.hidden && running && !S.over) advance();
    }, 100);
  }
}

function frame(): void {
  raf = 0;
  if (S.game !== 'pong') return; // switched away: let the loop die
  advance();
  draw();
  raf = requestAnimationFrame(frame);
}

export function paintBoard(): void {
  draw();
  // A round that ended (or has not been served yet) gets no ticks, so the loop
  // has to be revived explicitly whenever play resumes.
  if (running && !S.over) startLoop();
}

function draw(): void {
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, PONG.w, PONG.h);

  ctx.strokeStyle = RULE;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 9]);
  ctx.beginPath();
  ctx.moveTo(PONG.w / 2, 0);
  ctx.lineTo(PONG.w / 2, PONG.h);
  ctx.stroke();
  ctx.setLineDash([]);

  const half = PONG.paddleH / 2;
  if (S.duel) {
    ctx.fillStyle = AGENT;
    ctx.fillRect(PONG.inset, paddle.agent - half, PONG.paddleW, PONG.paddleH);
  } else {
    // Single player: the left edge is a wall, drawn as one.
    ctx.fillStyle = RULE;
    ctx.fillRect(0, 0, 5, PONG.h);
  }

  ctx.fillStyle = HUMAN;
  ctx.fillRect(humanFace, paddle.human - half, PONG.paddleW, PONG.paddleH);

  // While the agent is deciding, mark where the ball is going to arrive. It is
  // the same number pong_read handed it, so the room can see the agent was
  // given the answer and judge whether it used it.
  if (thinking && S.duel && ball.vx < 0) {
    ctx.strokeStyle = AGENT;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(agentFace, ball.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, PONG.ballR, 0, Math.PI * 2);
  ctx.fill();

  if (thinking && S.duel) {
    ctx.fillStyle = AGENT;
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('agent thinking · ball slowed', PONG.w / 2, 18);
  }
}
