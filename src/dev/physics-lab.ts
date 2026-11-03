import Phaser from 'phaser';
import { SiegeScene } from '../game/scene';
import { physicsScenarios } from '../content/physics-scenarios';
import type { GameEvent } from '../game/physics';
import './physics-lab.css';
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const scene = new SiegeScene();
const chooser = $<HTMLSelectElement>('#scenario');
let frame = 0,
  events: GameEvent[] = [],
  current = physicsScenarios[0];

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1440,
  height: 810,
  backgroundColor: '#46d0b8',
  antialias: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [scene],
  audio: { noAudio: true },
});
scene.audio.enabled = false;
scene.reducedMotion = true;
let graphics: Phaser.GameObjects.Graphics;
for (const [index, s] of physicsScenarios.entries()) {
  const o = document.createElement('option');
  o.value = String(index);
  o.textContent = `${String(index + 1).padStart(2, '0')} · ${s.name}`;
  chooser.append(o);
}
function updateInfo() {
  const sim = scene.sim;
  if (!sim) return;
  $('#frame').textContent = `Frame ${frame} / ${current.scenarioFrames || 360}`;
  const result = current.verify(sim);
  const complete = frame >= (current.scenarioFrames || 360);
  $('#outcome').textContent = complete
    ? `${result.passed ? 'PASS' : 'FAIL'} · ${result.detail}`
    : `${scene.paused ? 'PAUSED' : 'RUNNING'} · ${result.detail}`;
  $('#outcome').dataset.result = complete ? (result.passed ? 'pass' : 'fail') : 'pending';
  $('#details').textContent =
    [...sim.entities.values()]
      .filter((e) => e.type === 'monster')
      .map(
        (e) =>
          `${e.id} · dynamic=${!e.body.isStatic} · ${e.body.isSleeping ? 'SLEEPING' : 'AWAKE'}\nposition=(${e.body.position.x.toFixed(2)}, ${e.body.position.y.toFixed(2)}) angle=${e.body.angle.toFixed(3)}\nvelocity=(${e.body.velocity.x.toFixed(2)}, ${e.body.velocity.y.toFixed(2)}) health=${e.health.toFixed(2)}/${e.maxHealth.toFixed(2)}`,
      )
      .join('\n\n') || 'No live monsters remain.';
  $('#events').textContent =
    events
      .slice(-16)
      .map(
        (e) =>
          `${e.type} ${e.material || ''} @ ${Math.round(e.x)},${Math.round(e.y)}${'amount' in e ? ' damage=' + Number(e.amount).toFixed(2) : ''}${'source' in e ? ' source=' + e.source : ''}`,
      )
      .join('\n') || 'No damaging events yet.';
  $('#run').textContent = scene.paused ? 'RUN' : 'PAUSE';
  $<HTMLButtonElement>('#run').disabled = complete;
  $<HTMLButtonElement>('#step').disabled = complete;
}
function load(index: number) {
  current = physicsScenarios[index] || physicsScenarios[0];
  frame = 0;
  events = [];
  scene.loadLevel(structuredClone(current.level));
  current.setup(scene.sim!);
  scene.sim!.drainEvents();
  scene.paused = true;
  const sim = scene.sim!,
    rawStep = sim.step.bind(sim),
    rawDrain = sim.drainEvents.bind(sim);
  sim.step = () => {
    if (frame >= (current.scenarioFrames || 360)) return;
    rawStep();
    current.afterStep?.(sim, frame);
    frame++;
    if (frame >= (current.scenarioFrames || 360)) scene.paused = true;
  };
  sim.drainEvents = () => {
    const batch = rawDrain();
    events.push(...batch);
    events = events.slice(-100);
    return batch;
  };
  $('#name').textContent = current.name;
  $('#description').textContent = current.description;
  updateInfo();
}
game.events.once('ready', () => {
  scene.input.enabled = false;
  graphics = scene.add.graphics().setDepth(100);
  load(0);
  scene.events.on('postupdate', () => {
    graphics.clear();
    if ($<HTMLInputElement>('#bodies').checked && scene.sim)
      for (const e of scene.sim.entities.values()) {
        graphics.lineStyle(
          e.type === 'monster' ? 2 : 1,
          e.body.isSleeping ? 0xa87efa : 0x242139,
          0.8,
        );
        graphics.strokePoints(
          e.body.vertices.map((v) => ({ x: v.x, y: v.y })),
          true,
        );
      }
    updateInfo();
  });
});
chooser.addEventListener('change', () => load(Number(chooser.value)));
$('#run').addEventListener('click', () => {
  scene.paused = !scene.paused;
  updateInfo();
});
$('#step').addEventListener('click', () => {
  scene.paused = true;
  scene.sim?.step();
  updateInfo();
});
$('#reset').addEventListener('click', () => load(Number(chooser.value)));

/** Deliberate lab-only inspection API used by deterministic browser regression tests. */
Object.assign(window, {
  plushPhysicsLab: {
    advance(steps: number) {
      scene.paused = true;
      for (let i = 0; i < Math.min(1200, Math.max(0, steps)); i++) scene.sim?.step();
      scene.sim?.drainEvents();
      updateInfo();
    },
    snapshot() {
      const sim = scene.sim!;
      return {
        scenario: current.id,
        frame,
        result: current.verify(sim),
        rendered: scene.renderedMonsters,
        monsters: [...sim.entities.values()]
          .filter((e) => e.type === 'monster')
          .map((e) => ({
            id: e.id,
            bodyId: e.body.id,
            x: e.body.position.x,
            y: e.body.position.y,
            angle: e.body.angle,
            health: e.health,
            maxHealth: e.maxHealth,
            isStatic: e.body.isStatic,
            isSleeping: e.body.isSleeping,
            mass: e.body.mass,
          })),
        damage: sim.damageHistory,
        entities: sim.entities.size,
      };
    },
  },
});
