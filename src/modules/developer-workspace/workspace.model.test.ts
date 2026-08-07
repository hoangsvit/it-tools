import { describe, expect, it } from 'vitest';
import {
  createDeveloperWorkspace,
  getWorkspaceProgress,
  moveWorkspaceStep,
  sendWorkspaceOutputToNext,
  usePreviousWorkspaceOutput,
} from './workspace.model';
import type { WorkspaceStep } from './workspace.model';

function step(id: string, values: Partial<WorkspaceStep> = {}): WorkspaceStep {
  return {
    id,
    toolPath: '',
    input: '',
    output: '',
    notes: '',
    ...values,
  };
}

describe('developer workspace model', () => {
  it('creates a deterministic workspace when id and time are supplied', () => {
    const workspace = createDeveloperWorkspace({
      id: 'workspace-1',
      name: 'API triage',
      firstToolPath: '/jwt-parser',
      now: 1234,
    });

    expect(workspace.id).toBe('workspace-1');
    expect(workspace.name).toBe('API triage');
    expect(workspace.createdAt).toBe(1234);
    expect(workspace.updatedAt).toBe(1234);
    expect(workspace.steps).toHaveLength(1);
    expect(workspace.steps[0].toolPath).toBe('/jwt-parser');
  });

  it('moves steps without mutating the original list', () => {
    const steps = [step('a'), step('b'), step('c')];
    const moved = moveWorkspaceStep(steps, 'b', -1);

    expect(moved.map(item => item.id)).toEqual(['b', 'a', 'c']);
    expect(steps.map(item => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('sends one step output into the next step input', () => {
    const steps = [
      step('a', { output: '{"sub":"123"}' }),
      step('b', { input: 'old' }),
    ];

    const next = sendWorkspaceOutputToNext(steps, 'a');
    expect(next[1].input).toBe('{"sub":"123"}');
    expect(steps[1].input).toBe('old');
  });

  it('can pull the previous output from the receiving step', () => {
    const steps = [
      step('a', { output: 'decoded-value' }),
      step('b'),
    ];

    const next = usePreviousWorkspaceOutput(steps, 'b');
    expect(next[1].input).toBe('decoded-value');
  });

  it('reports configured and completed workspace progress', () => {
    const steps = [
      step('a', { toolPath: '/jwt-parser', output: 'done' }),
      step('b', { toolPath: '/json-viewer' }),
      step('c'),
    ];

    expect(getWorkspaceProgress(steps)).toEqual({
      total: 3,
      configured: 2,
      withOutput: 1,
    });
  });

  it('leaves steps unchanged when a handoff has no destination or output', () => {
    const steps = [step('a'), step('b')];

    expect(sendWorkspaceOutputToNext(steps, 'a')).toBe(steps);
    expect(sendWorkspaceOutputToNext(steps, 'b')).toBe(steps);
    expect(usePreviousWorkspaceOutput(steps, 'a')).toBe(steps);
  });

  it('treats whitespace-only output as empty for handoffs and progress', () => {
    const steps = [
      step('a', { toolPath: '/jwt-parser', output: '   \n\t' }),
      step('b', { toolPath: '/json-viewer', input: 'keep-me' }),
    ];

    expect(sendWorkspaceOutputToNext(steps, 'a')).toBe(steps);
    expect(usePreviousWorkspaceOutput(steps, 'b')).toBe(steps);
    expect(steps[1].input).toBe('keep-me');
    expect(getWorkspaceProgress(steps)).toEqual({
      total: 2,
      configured: 2,
      withOutput: 0,
    });
  });
});
