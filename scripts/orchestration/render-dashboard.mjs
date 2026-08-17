#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { validateLedger } from './validate-ledger.mjs';

const STATUS_LABELS = {
  pending: '⚪ PENDING',
  in_progress: '🟡 IN_PROGRESS',
  completed: '🟢 COMPLETED',
  blocked: '🔴 BLOCKED',
  blocked_by_human: '🟠 BLOCKED_BY_HUMAN'
};

function statusLabel(status) {
  return STATUS_LABELS[status] ?? `⚫ ${String(status).toUpperCase()}`;
}

function markdownCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function taskList(taskIds, emptyLabel = 'Ninguna') {
  return taskIds.length > 0 ? taskIds.join(', ') : emptyLabel;
}

export function renderDashboard(ledger) {
  const rows = Object.entries(ledger.tasks).map(([taskId, task]) =>
    `| [${taskId}](./${taskId}.md) | ${markdownCell(task.name)} | ${statusLabel(task.status)} | ${taskList(task.dependsOn, '—')} | ${markdownCell(task.branch)} |`
  );

  return [
    `# ${ledger.project}`,
    '',
    '> Archivo generado desde `orchestration/ledger.json`. No editar manualmente.',
    '',
    `- **Base:** ${ledger.base}`,
    `- **Rama de integración:** ${ledger.integrationBranch}`,
    `- **Ruta crítica:** ${ledger.criticalPath.join(' → ')}`,
    '',
    '## Tareas',
    '',
    '| ID | Tarea | Estado | Depende de | Rama |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    ''
  ].join('\n');
}

export function renderTaskCard(taskId, ledger) {
  const task = ledger.tasks[taskId];
  if (!task) throw new Error(`No existe la tarea ${taskId}.`);

  const ownership = task.ownership.map((pattern) => `- \`${pattern}\``);

  return [
    `# ${taskId} — ${task.name}`,
    '',
    '> Archivo generado desde `orchestration/ledger.json`. No editar manualmente.',
    '',
    `- **Estado:** ${statusLabel(task.status)}`,
    `- **Rama:** \`${task.branch}\``,
    `- **Worktree:** \`${task.worktree}\``,
    `- **Depende de:** ${taskList(task.dependsOn)}`,
    `- **Desbloquea:** ${taskList(task.unlocks)}`,
    `- **Intentos:** ${task.attempts ?? 0}`,
    '',
    '## Ownership',
    '',
    ...ownership,
    '',
    '## Evidencia',
    '',
    task.evidence || '_Pendiente._',
    '',
    '## Nota',
    '',
    task.note || '_Sin nota._',
    ''
  ].join('\n');
}

export async function writeDashboard(ledger, outputDirectory) {
  const errors = validateLedger(ledger);
  if (errors.length > 0) {
    throw new Error(`Ledger inválido:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  }

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    resolve(outputDirectory, '_dashboard.md'),
    renderDashboard(ledger),
    'utf8'
  );

  await Promise.all(
    Object.keys(ledger.tasks).map((taskId) =>
      writeFile(
        resolve(outputDirectory, `${taskId}.md`),
        renderTaskCard(taskId, ledger),
        'utf8'
      )
    )
  );
}

async function main() {
  const [ledgerArgument, outputArgument] = process.argv.slice(2);
  if (ledgerArgument === '--help' || ledgerArgument === '-h') {
    console.log(
      'Uso: node scripts/orchestration/render-dashboard.mjs [ruta-al-ledger.json] [directorio-de-salida]'
    );
    return;
  }

  const ledgerPath = ledgerArgument
    ? resolve(ledgerArgument)
    : fileURLToPath(new URL('../../orchestration/ledger.json', import.meta.url));
  const outputDirectory = outputArgument
    ? resolve(outputArgument)
    : fileURLToPath(new URL('../../orchestration/tablero/', import.meta.url));

  try {
    const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
    await writeDashboard(ledger, outputDirectory);
    console.log(`Tablero generado: ${Object.keys(ledger.tasks).length} tarjetas en ${outputDirectory}.`);
  } catch (error) {
    console.error(`No se pudo generar el tablero: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
