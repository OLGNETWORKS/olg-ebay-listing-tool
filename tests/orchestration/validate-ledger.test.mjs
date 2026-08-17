import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { validateLedger } from '../../scripts/orchestration/validate-ledger.mjs';

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
        status: 'completed',
        branch: 'task/T1-foundation',
        dependsOn: [],
        unlocks: ['T2'],
        attempts: 0,
        ownership: ['orchestration/**'],
        worktree: 'C:/worktrees/w-T1/repo',
        evidence: ''
      },
      T2: {
        name: 'Espera humana',
        status: 'blocked_by_human',
        branch: 'task/T2-human',
        dependsOn: ['T1'],
        unlocks: [],
        attempts: 0,
        ownership: ['src/**'],
        worktree: 'C:/worktrees/w-T2/repo',
        evidence: '',
        note: 'Espera autorización.'
      }
    }
  };
}

test('acepta un ledger válido y el estado blocked_by_human', () => {
  assert.deepEqual(validateLedger(makeLedger()), []);
});

test('rechaza una estructura básica incompleta', () => {
  const ledger = makeLedger();
  ledger.project = '';
  ledger.tasks = [];

  const errors = validateLedger(ledger);

  assert.ok(errors.some((error) => error.includes('project')));
  assert.ok(errors.some((error) => error.includes('tasks')));
});

test('rechaza IDs desconocidos en dependsOn, unlocks y criticalPath', () => {
  const ledger = makeLedger();
  ledger.tasks.T2.dependsOn.push('T404');
  ledger.tasks.T1.unlocks.push('T405');
  ledger.criticalPath.push('T406');

  const errors = validateLedger(ledger);

  assert.ok(errors.some((error) => error.includes('T404')));
  assert.ok(errors.some((error) => error.includes('T405')));
  assert.ok(errors.some((error) => error.includes('T406')));
});

test('rechaza ciclos en el grafo de dependencias', () => {
  const ledger = makeLedger();
  ledger.tasks.T1.dependsOn.push('T2');

  assert.ok(validateLedger(ledger).some((error) => error.includes('ciclo')));
});

test('rechaza ownership vacío o con patrones vacíos', () => {
  const ledger = makeLedger();
  ledger.tasks.T1.ownership = [];
  ledger.tasks.T2.ownership = ['  '];

  const errors = validateLedger(ledger);

  assert.ok(errors.some((error) => error.includes('T1.ownership')));
  assert.ok(errors.some((error) => error.includes('T2.ownership')));
});

test('rechaza worktrees duplicados aunque cambien slash, mayúsculas o slash final', () => {
  const ledger = makeLedger();
  ledger.tasks.T2.worktree = 'c:\\WORKTREES\\w-T1\\repo\\';

  assert.ok(validateLedger(ledger).some((error) => error.includes('worktree duplicado')));
});

test('rechaza worktrees físicamente equivalentes después de resolver punto y punto-punto', () => {
  const ledger = makeLedger();
  ledger.tasks.T2.worktree = 'c:\\WORKTREES\\w-T1\\otro\\..\\repo\\.';

  assert.ok(validateLedger(ledger).some((error) => error.includes('worktree duplicado')));
});

test('rechaza que una tarea reutilice el worktree de integración', () => {
  const ledger = makeLedger();
  ledger.tasks.T2.worktree = 'c:\\WORKTREES\\integration\\.';

  assert.ok(validateLedger(ledger).some((error) => error.includes('integrationWorktree')));
});

test('rechaza IDs que no sean T seguido de un entero positivo canónico', async (t) => {
  for (const invalidTaskId of ['T0', 'T01', 't1', '../escape']) {
    await t.test(invalidTaskId, () => {
      const ledger = makeLedger();
      ledger.tasks[invalidTaskId] = ledger.tasks.T2;
      delete ledger.tasks.T2;
      ledger.criticalPath = ['T1'];
      ledger.tasks.T1.unlocks = [];

      assert.ok(validateLedger(ledger).some((error) => error.includes('ID de tarea')));
    });
  }
});

test('requiere integrationWorktree como texto no vacío', async (t) => {
  for (const invalidValue of [undefined, '   ']) {
    await t.test(String(invalidValue), () => {
      const ledger = makeLedger();
      ledger.integrationWorktree = invalidValue;

      assert.ok(validateLedger(ledger).some((error) => error.includes('integrationWorktree')));
    });
  }
});

test('requiere attempts entero y no negativo en cada tarea', async (t) => {
  for (const invalidValue of [undefined, -1, 1.5, '0']) {
    await t.test(String(invalidValue), () => {
      const ledger = makeLedger();
      ledger.tasks.T1.attempts = invalidValue;

      assert.ok(validateLedger(ledger).some((error) => error.includes('T1.attempts')));
    });
  }
});

test('requiere evidence string', async (t) => {
  for (const invalidValue of [undefined, null, 1]) {
    await t.test(String(invalidValue), () => {
      const ledger = makeLedger();
      ledger.tasks.T1.evidence = invalidValue;

      assert.ok(validateLedger(ledger).some((error) => error.includes('T1.evidence')));
    });
  }
});

test('acepta note ausente pero lo rechaza si no es string', () => {
  const ledgerWithoutNote = makeLedger();
  delete ledgerWithoutNote.tasks.T2.note;
  assert.deepEqual(validateLedger(ledgerWithoutNote), []);

  const ledgerWithInvalidNote = makeLedger();
  ledgerWithInvalidNote.tasks.T2.note = 42;
  assert.ok(validateLedger(ledgerWithInvalidNote).some((error) => error.includes('T2.note')));
});

test('el CLI valida un archivo explícito y devuelve un resumen claro', () => {
  const directory = mkdtempSync(join(tmpdir(), 'olg-ledger-'));
  const ledgerPath = join(directory, 'ledger.json');
  writeFileSync(ledgerPath, JSON.stringify(makeLedger()), 'utf8');

  const result = spawnSync(
    process.execPath,
    ['scripts/orchestration/validate-ledger.mjs', ledgerPath],
    { cwd: new URL('../..', import.meta.url), encoding: 'utf8' }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Ledger válido: 2 tareas/);
});
