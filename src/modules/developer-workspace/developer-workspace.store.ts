import { useStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import type { DeveloperWorkspace, WorkspaceStep } from './workspace.model';
import {
  createDeveloperWorkspace,
  createWorkspaceStep,
  moveWorkspaceStep,
  sendWorkspaceOutputToNext,
  usePreviousWorkspaceOutput,
} from './workspace.model';

const WORKSPACES_STORAGE_KEY = 'eplusDeveloperWorkspacesV1';
const ACTIVE_WORKSPACE_STORAGE_KEY = 'eplusDeveloperWorkspaceActiveIdV1';

export const useDeveloperWorkspaceStore = defineStore('developer-workspace', () => {
  const workspaces = useStorage<DeveloperWorkspace[]>(WORKSPACES_STORAGE_KEY, []);
  const activeWorkspaceId = useStorage<string | null>(ACTIVE_WORKSPACE_STORAGE_KEY, null);

  const activeWorkspace = computed(() => (
    workspaces.value.find(workspace => workspace.id === activeWorkspaceId.value)
    ?? workspaces.value[0]
    ?? null
  ));

  function persistWorkspace(workspaceId: string, updater: (workspace: DeveloperWorkspace) => DeveloperWorkspace) {
    workspaces.value = workspaces.value.map((workspace) => {
      if (workspace.id !== workspaceId) {
        return workspace;
      }

      return {
        ...updater(workspace),
        updatedAt: Date.now(),
      };
    });
  }

  function ensureActiveWorkspace(firstToolPath = '') {
    if (workspaces.value.length === 0) {
      const workspace = createDeveloperWorkspace({ firstToolPath });
      workspaces.value = [workspace];
      activeWorkspaceId.value = workspace.id;
      return workspace;
    }

    const current = workspaces.value.find(workspace => workspace.id === activeWorkspaceId.value);
    if (current) {
      return current;
    }

    activeWorkspaceId.value = workspaces.value[0].id;
    return workspaces.value[0];
  }

  function createWorkspace(name?: string, firstToolPath = '') {
    const workspace = createDeveloperWorkspace({ name, firstToolPath });
    workspaces.value = [workspace, ...workspaces.value];
    activeWorkspaceId.value = workspace.id;
    return workspace;
  }

  function deleteWorkspace(workspaceId: string) {
    workspaces.value = workspaces.value.filter(workspace => workspace.id !== workspaceId);

    if (workspaces.value.length === 0) {
      createWorkspace();
      return;
    }

    if (activeWorkspaceId.value === workspaceId) {
      activeWorkspaceId.value = workspaces.value[0].id;
    }
  }

  function renameWorkspace(workspaceId: string, name: string) {
    persistWorkspace(workspaceId, workspace => ({
      ...workspace,
      name: name.trim() || 'My developer workspace',
    }));
  }

  function selectWorkspace(workspaceId: string) {
    if (workspaces.value.some(workspace => workspace.id === workspaceId)) {
      activeWorkspaceId.value = workspaceId;
    }
  }

  function addStep(workspaceId: string, toolPath = '') {
    persistWorkspace(workspaceId, workspace => ({
      ...workspace,
      steps: [...workspace.steps, createWorkspaceStep(toolPath)],
    }));
  }

  function removeStep(workspaceId: string, stepId: string) {
    persistWorkspace(workspaceId, (workspace) => {
      const steps = workspace.steps.filter(step => step.id !== stepId);
      return {
        ...workspace,
        steps: steps.length > 0 ? steps : [createWorkspaceStep()],
      };
    });
  }

  function updateStep(workspaceId: string, stepId: string, patch: Partial<Omit<WorkspaceStep, 'id'>>) {
    persistWorkspace(workspaceId, workspace => ({
      ...workspace,
      steps: workspace.steps.map(step => (
        step.id === stepId
          ? { ...step, ...patch }
          : step
      )),
    }));
  }

  function moveStep(workspaceId: string, stepId: string, direction: -1 | 1) {
    persistWorkspace(workspaceId, workspace => ({
      ...workspace,
      steps: moveWorkspaceStep(workspace.steps, stepId, direction),
    }));
  }

  function sendOutputToNext(workspaceId: string, stepId: string) {
    persistWorkspace(workspaceId, workspace => ({
      ...workspace,
      steps: sendWorkspaceOutputToNext(workspace.steps, stepId),
    }));
  }

  function usePreviousOutput(workspaceId: string, stepId: string) {
    persistWorkspace(workspaceId, workspace => ({
      ...workspace,
      steps: usePreviousWorkspaceOutput(workspace.steps, stepId),
    }));
  }

  function clearStepData(workspaceId: string, stepId: string) {
    updateStep(workspaceId, stepId, {
      input: '',
      output: '',
      notes: '',
    });
  }

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    ensureActiveWorkspace,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    selectWorkspace,
    addStep,
    removeStep,
    updateStep,
    moveStep,
    sendOutputToNext,
    usePreviousOutput,
    clearStepData,
  };
});
