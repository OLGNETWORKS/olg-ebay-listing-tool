#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { posix, resolve, win32 } from 'node:path';
import { pathToFileURL } from 'node:url';

const ALLOWED_STATUSES = new Set([
  'pending',
  'in_progress',
  'completed',
  'blocked',
  'blocked_by_human'
]);
const TASK_ID_PATTERN = /^T[1-9]\d*$/;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeWorktree(value) {
  return win32.normalize(win32.resolve(value.trim())).toLowerCase();
}

function isStrictlyInsideRoot(candidate, root) {
  const relative = win32.relative(root, candidate);
  return relative.length > 0
    && relative !== '..'
    && !relative.startsWith(`..${win32.sep}`)
    && !win32.isAbsolute(relative);
}

function normalizeOwnershipPattern(value) {
  return posix
    .normalize(value.trim().replaceAll('\\', '/'))
    .replace(/\/+$/, '')
    .toLowerCase();
}

function normalizeBranch(value) {
  return value
    .trim()
    .replaceAll('\\', '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .toLowerCase();
}

function validateStringArray(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} debe ser un arreglo.`);
    return false;
  }

  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push(`${path}[${index}] debe ser un texto no vacío.`);
    }
  });
  return true;
}

function findDependencyCycle(tasks) {
  const visited = new Set();
  const visiting = new Set();
  const trail = [];

  function visit(taskId) {
    if (visiting.has(taskId)) {
      return [...trail.slice(trail.indexOf(taskId)), taskId];
    }
    if (visited.has(taskId)) return null;

    visiting.add(taskId);
    trail.push(taskId);
    const dependencies = Array.isArray(tasks[taskId]?.dependsOn)
      ? tasks[taskId].dependsOn
      : [];

    for (const dependencyId of dependencies) {
      if (!(dependencyId in tasks)) continue;
      const cycle = visit(dependencyId);
      if (cycle) return cycle;
    }

    trail.pop();
    visiting.delete(taskId);
    visited.add(taskId);
    return null;
  }

  for (const taskId of Object.keys(tasks)) {
    const cycle = visit(taskId);
    if (cycle) return cycle;
  }
  return null;
}

export function validateLedger(ledger) {
  const errors = [];

  if (!isRecord(ledger)) return ['El ledger debe ser un objeto JSON.'];

  for (const field of [
    'project',
    'base',
    'integrationBranch',
    'integrationWorktree',
    'worktreesRoot'
  ]) {
    if (!isNonEmptyString(ledger[field])) {
      errors.push(`${field} debe ser un texto no vacío.`);
    }
  }

  if (!Array.isArray(ledger.criticalPath)) {
    errors.push('criticalPath debe ser un arreglo.');
  }

  if (!isRecord(ledger.tasks) || Object.keys(ledger.tasks).length === 0) {
    errors.push('tasks debe ser un objeto no vacío.');
    return errors;
  }

  const taskIds = new Set(Object.keys(ledger.tasks));
  const worktrees = new Map();
  const ownershipPatterns = new Map();
  const branches = new Map();
  const integrationBranch = isNonEmptyString(ledger.integrationBranch)
    ? normalizeBranch(ledger.integrationBranch)
    : null;
  const integrationWorktree = isNonEmptyString(ledger.integrationWorktree)
    ? normalizeWorktree(ledger.integrationWorktree)
    : null;
  const worktreesRoot = isNonEmptyString(ledger.worktreesRoot)
    ? normalizeWorktree(ledger.worktreesRoot)
    : null;

  if (
    integrationWorktree
    && worktreesRoot
    && !isStrictlyInsideRoot(integrationWorktree, worktreesRoot)
  ) {
    errors.push('integrationWorktree debe estar estrictamente dentro de worktreesRoot.');
  }

  for (const [taskId, task] of Object.entries(ledger.tasks)) {
    if (!TASK_ID_PATTERN.test(taskId)) {
      errors.push(`ID de tarea inválido: ${taskId}. Debe usar el formato T seguido de un entero positivo canónico.`);
    }

    if (!isRecord(task)) {
      errors.push(`tasks.${taskId} debe ser un objeto.`);
      continue;
    }

    for (const field of ['name', 'branch', 'worktree']) {
      if (!isNonEmptyString(task[field])) {
        errors.push(`tasks.${taskId}.${field} debe ser un texto no vacío.`);
      }
    }

    if (!ALLOWED_STATUSES.has(task.status)) {
      errors.push(`tasks.${taskId}.status no es válido: ${String(task.status)}.`);
    }

    if (!Number.isInteger(task.attempts) || task.attempts < 0) {
      errors.push(`tasks.${taskId}.attempts debe ser un entero no negativo.`);
    }

    if (typeof task.evidence !== 'string') {
      errors.push(`tasks.${taskId}.evidence debe ser un string.`);
    }

    if (task.note !== undefined && typeof task.note !== 'string') {
      errors.push(`tasks.${taskId}.note debe ser un string si está presente.`);
    }

    if (isNonEmptyString(task.branch)) {
      const normalized = normalizeBranch(task.branch);
      if (normalized === integrationBranch) {
        errors.push(`tasks.${taskId}.branch no puede reutilizar integrationBranch.`);
      }
      if (branches.has(normalized)) {
        errors.push(
          `branch duplicada entre ${branches.get(normalized)} y ${taskId}: ${task.branch}.`
        );
      } else {
        branches.set(normalized, taskId);
      }
    }

    const hasDependencies = validateStringArray(
      task.dependsOn,
      `tasks.${taskId}.dependsOn`,
      errors
    );
    const hasUnlocks = validateStringArray(
      task.unlocks,
      `tasks.${taskId}.unlocks`,
      errors
    );
    const hasOwnership = validateStringArray(
      task.ownership,
      `tasks.${taskId}.ownership`,
      errors
    );

    if (hasOwnership && task.ownership.length === 0) {
      errors.push(`tasks.${taskId}.ownership no puede estar vacío.`);
    }

    if (hasOwnership) {
      for (const pattern of task.ownership.filter(isNonEmptyString)) {
        const normalized = normalizeOwnershipPattern(pattern);
        const previousTaskId = ownershipPatterns.get(normalized);
        if (previousTaskId && previousTaskId !== taskId) {
          errors.push(
            `ownership duplicado entre ${previousTaskId} y ${taskId}: ${pattern}.`
          );
        } else {
          ownershipPatterns.set(normalized, taskId);
        }
      }
    }

    if (hasDependencies) {
      for (const dependencyId of task.dependsOn) {
        if (!taskIds.has(dependencyId)) {
          errors.push(`tasks.${taskId}.dependsOn referencia el ID desconocido ${dependencyId}.`);
        }
      }
    }

    if (hasUnlocks) {
      for (const unlockedId of task.unlocks) {
        if (!taskIds.has(unlockedId)) {
          errors.push(`tasks.${taskId}.unlocks referencia el ID desconocido ${unlockedId}.`);
        }
      }
    }

    if (isNonEmptyString(task.worktree)) {
      const normalized = normalizeWorktree(task.worktree);
      if (worktreesRoot && !isStrictlyInsideRoot(normalized, worktreesRoot)) {
        errors.push(`tasks.${taskId}.worktree debe estar estrictamente dentro de worktreesRoot.`);
      }
      if (normalized === integrationWorktree) {
        errors.push(`tasks.${taskId}.worktree no puede reutilizar integrationWorktree.`);
      }
      if (worktrees.has(normalized)) {
        const previousTaskId = worktrees.get(normalized);
        errors.push(
          `worktree duplicado entre ${previousTaskId} y ${taskId}: ${task.worktree}.`
        );
      } else {
        worktrees.set(normalized, taskId);
      }
    }
  }

  if (Array.isArray(ledger.criticalPath)) {
    ledger.criticalPath.forEach((taskId, index) => {
      if (!isNonEmptyString(taskId)) {
        errors.push(`criticalPath[${index}] debe ser un texto no vacío.`);
      } else if (!taskIds.has(taskId)) {
        errors.push(`criticalPath referencia el ID desconocido ${taskId}.`);
      }
    });

    for (let index = 0; index < ledger.criticalPath.length - 1; index += 1) {
      const currentTaskId = ledger.criticalPath[index];
      const nextTaskId = ledger.criticalPath[index + 1];
      const currentTask = ledger.tasks[currentTaskId];
      const nextTask = ledger.tasks[nextTaskId];
      if (!isRecord(currentTask) || !isRecord(nextTask)) continue;

      const isForwardEdge = Array.isArray(currentTask.unlocks)
        && currentTask.unlocks.includes(nextTaskId)
        && Array.isArray(nextTask.dependsOn)
        && nextTask.dependsOn.includes(currentTaskId);
      if (!isForwardEdge) {
        errors.push(
          `criticalPath no sigue una arista real en orden: ${currentTaskId} -> ${nextTaskId}.`
        );
      }
    }
  }

  for (const [taskId, task] of Object.entries(ledger.tasks)) {
    if (!isRecord(task)) continue;

    if (Array.isArray(task.dependsOn)) {
      for (const dependencyId of task.dependsOn) {
        const dependency = ledger.tasks[dependencyId];
        if (
          isRecord(dependency)
          && (!Array.isArray(dependency.unlocks) || !dependency.unlocks.includes(taskId))
        ) {
          errors.push(
            `Falta reciprocidad: tasks.${taskId}.dependsOn incluye ${dependencyId}, pero tasks.${dependencyId}.unlocks no incluye ${taskId}.`
          );
        }
      }
    }

    if (Array.isArray(task.unlocks)) {
      for (const unlockedId of task.unlocks) {
        const unlocked = ledger.tasks[unlockedId];
        if (
          isRecord(unlocked)
          && (!Array.isArray(unlocked.dependsOn) || !unlocked.dependsOn.includes(taskId))
        ) {
          errors.push(
            `Falta reciprocidad: tasks.${taskId}.unlocks incluye ${unlockedId}, pero tasks.${unlockedId}.dependsOn no incluye ${taskId}.`
          );
        }
      }
    }
  }

  const cycle = findDependencyCycle(ledger.tasks);
  if (cycle) errors.push(`El grafo de dependencias contiene un ciclo: ${cycle.join(' -> ')}.`);

  return errors;
}

async function main() {
  const argument = process.argv[2];
  if (argument === '--help' || argument === '-h') {
    console.log('Uso: node scripts/orchestration/validate-ledger.mjs [ruta-al-ledger.json]');
    return;
  }

  const ledgerUrl = argument
    ? pathToFileURL(resolve(argument)).href
    : new URL('../../orchestration/ledger.json', import.meta.url).href;

  try {
    const ledger = JSON.parse(await readFile(new URL(ledgerUrl), 'utf8'));
    const errors = validateLedger(ledger);
    if (errors.length > 0) {
      console.error(`Ledger inválido (${errors.length} errores):`);
      errors.forEach((error) => console.error(`- ${error}`));
      process.exitCode = 1;
      return;
    }
    console.log(`Ledger válido: ${Object.keys(ledger.tasks).length} tareas.`);
  } catch (error) {
    console.error(`No se pudo validar el ledger: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
