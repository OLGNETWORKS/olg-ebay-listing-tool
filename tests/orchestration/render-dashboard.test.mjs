import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  renderDashboard,
  renderTaskCard,
  writeDashboard
} from '../../scripts/orchestration/render-dashboard.mjs';

function makeLedger() {
  return {
    project: 'Proyecto de prueba',
    base: 'main',
    integrationBranch: 'integration/test',
    integrationWorktree: 'C:/worktrees/integration',
    worktreesRoot: 'C:/worktrees',
    criticalPath: ['T1', 'T2'],
    tasks: {
      T1: {
        name: 'Fundación',
        status: 'in_progress',
        branch: 'task/T1-foundation',
        dependsOn: [],
        unlocks: ['T2'],
        attempts: 1,
        ownership: ['orchestration/**'],
        worktree: 'C:/worktrees/w-T1/repo',
        evidence: 'node --test: OK',
        note: 'Coordina el trabajo.'
      },
      T2: {
        name: 'Autorización',
        status: 'blocked_by_human',
        branch: 'task/T2-human',
        dependsOn: ['T1'],
        unlocks: [],
        attempts: 0,
        ownership: ['src/**'],
        worktree: 'C:/worktrees/w-T2/repo',
        evidence: '',
        note: 'Espera confirmación.'
      }
    }
  };
}

test('el dashboard enlaza cada tarjeta y expresa el estado con emoji y palabra', () => {
  const dashboard = renderDashboard(makeLedger());

  assert.match(dashboard, /^# Proyecto de prueba/m);
  assert.match(dashboard, /\[T1\]\(\.\/T1\.md\)/);
  assert.match(dashboard, /🟡 IN_PROGRESS/);
  assert.match(dashboard, /🟠 BLOCKED_BY_HUMAN/);
  assert.match(dashboard, /Ruta crítica.*T1 → T2/);
});

test('la tarjeta contiene coordinación, ownership y evidencia de la tarea', () => {
  const card = renderTaskCard('T1', makeLedger());

  assert.match(card, /^# T1 — Fundación/m);
  assert.match(card, /🟡 IN_PROGRESS/);
  assert.match(card, /task\/T1-foundation/);
  assert.match(card, /C:\/worktrees\/w-T1\/repo/);
  assert.match(card, /orchestration\/\*\*/);
  assert.match(card, /Desbloquea.*T2/);
  assert.match(card, /node --test: OK/);
});

test('el CLI genera _dashboard.md y una tarjeta por tarea', () => {
  const directory = mkdtempSync(join(tmpdir(), 'olg-dashboard-'));
  const ledgerPath = join(directory, 'ledger.json');
  const outputDirectory = join(directory, 'tablero');
  writeFileSync(ledgerPath, JSON.stringify(makeLedger()), 'utf8');

  const result = spawnSync(
    process.execPath,
    ['scripts/orchestration/render-dashboard.mjs', ledgerPath, outputDirectory],
    { cwd: new URL('../..', import.meta.url), encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Tablero generado: 2 tarjetas/);
  assert.match(readFileSync(join(outputDirectory, '_dashboard.md'), 'utf8'), /Proyecto de prueba/);
  assert.match(readFileSync(join(outputDirectory, 'T1.md'), 'utf8'), /🟡 IN_PROGRESS/);
  assert.match(readFileSync(join(outputDirectory, 'T2.md'), 'utf8'), /🟠 BLOCKED_BY_HUMAN/);
});

test('writeDashboard rechaza un ID inseguro antes de crear archivos', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'olg-dashboard-escape-'));
  const outputDirectory = join(directory, 'tablero');
  const escapedCard = join(directory, 'escape.md');
  const ledger = makeLedger();
  ledger.tasks['../escape'] = ledger.tasks.T2;
  delete ledger.tasks.T2;
  ledger.criticalPath = ['T1'];
  ledger.tasks.T1.unlocks = [];

  try {
    await assert.rejects(
      writeDashboard(ledger, outputDirectory),
      /ID de tarea/
    );
    assert.equal(existsSync(outputDirectory), false);
    assert.equal(existsSync(escapedCard), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
