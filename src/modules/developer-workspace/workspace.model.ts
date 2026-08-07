export interface WorkspaceStep {
  id: string
  toolPath: string
  input: string
  output: string
  notes: string
}

export interface DeveloperWorkspace {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  steps: WorkspaceStep[]
}

function createLocalId(prefix: string) {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

export function createWorkspaceStep(toolPath = '', id = createLocalId('step')): WorkspaceStep {
  return {
    id,
    toolPath,
    input: '',
    output: '',
    notes: '',
  };
}

export function createDeveloperWorkspace({
  name = 'My developer workspace',
  firstToolPath = '',
  id = createLocalId('workspace'),
  now = Date.now(),
}: {
  name?: string
  firstToolPath?: string
  id?: string
  now?: number
} = {}): DeveloperWorkspace {
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    steps: [createWorkspaceStep(firstToolPath)],
  };
}

export function moveWorkspaceStep(
  steps: WorkspaceStep[],
  stepId: string,
  direction: -1 | 1,
): WorkspaceStep[] {
  const index = steps.findIndex(step => step.id === stepId);
  const targetIndex = index + direction;

  if (index < 0 || targetIndex < 0 || targetIndex >= steps.length) {
    return steps;
  }

  const next = [...steps];
  const [step] = next.splice(index, 1);
  next.splice(targetIndex, 0, step);
  return next;
}

export function insertWorkspaceStepAfter(
  steps: WorkspaceStep[],
  stepId: string,
  newStep: WorkspaceStep,
): WorkspaceStep[] {
  const index = steps.findIndex(step => step.id === stepId);
  if (index < 0) {
    return steps;
  }

  const nextStep = steps[index + 1];
  const canReuseNextStep = nextStep
    && !nextStep.toolPath
    && !nextStep.input.trim()
    && !nextStep.output.trim()
    && !nextStep.notes.trim();

  if (canReuseNextStep) {
    return steps.map(step => step.id === nextStep.id
      ? { ...newStep, id: nextStep.id }
      : step);
  }

  const next = [...steps];
  next.splice(index + 1, 0, newStep);
  return next;
}

export function sendWorkspaceOutputToNext(
  steps: WorkspaceStep[],
  stepId: string,
): WorkspaceStep[] {
  const index = steps.findIndex(step => step.id === stepId);
  const nextStep = steps[index + 1];

  if (index < 0 || !nextStep) {
    return steps;
  }

  const output = steps[index].output;
  if (!output.trim()) {
    return steps;
  }

  return steps.map((step, stepIndex) => (
    stepIndex === index + 1
      ? { ...step, input: output }
      : step
  ));
}

export function usePreviousWorkspaceOutput(
  steps: WorkspaceStep[],
  stepId: string,
): WorkspaceStep[] {
  const index = steps.findIndex(step => step.id === stepId);

  if (index <= 0) {
    return steps;
  }

  const previousOutput = steps[index - 1].output;
  if (!previousOutput.trim()) {
    return steps;
  }

  return steps.map(step => (
    step.id === stepId
      ? { ...step, input: previousOutput }
      : step
  ));
}

export function getWorkspaceProgress(steps: WorkspaceStep[]) {
  const configured = steps.filter(step => Boolean(step.toolPath)).length;
  const withOutput = steps.filter(step => Boolean(step.output.trim())).length;

  return {
    total: steps.length,
    configured,
    withOutput,
  };
}
