/* ============================================================
   FILE: 13_ai_development_workflow_planning.js
   IDE-160 AI Development Workflow Planning
   Version: 2.0.0
   Phase: Complete - Monitoring / Package / Completion / Integration / Release
   Design Freeze: 2026-08-04
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = namespace.version;
  const MAX_CANDIDATE_PLANS = 10;

  const PLAN_STATUSES = Object.freeze([
    "Draft",
    "Candidate",
    "Validating",
    "Ready",
    "Selected",
    "Frozen",
    "Active",
    "Completed",
    "Superseded",
    "Invalidated"
  ]);

  const DEPENDENCY_TYPES = Object.freeze([
    "Data Dependency",
    "Execution Dependency",
    "Validation Dependency",
    "Approval Dependency",
    "Policy Dependency",
    "Repository Dependency",
    "Capability Dependency",
    "Recovery Dependency"
  ]);

  const SIDE_EFFECT_TYPES = Object.freeze([
    "Pure Calculation",
    "Read-Only",
    "Temporary State",
    "Controlled Mutation",
    "External Side Effect"
  ]);

  const PLAN_SELECTION_PRIORITIES = Object.freeze([
    "Safety",
    "Policy Compliance",
    "Evidence Coverage",
    "Repository Integrity",
    "Rollback Capability",
    "Validation Coverage",
    "Scope Accuracy",
    "Dependency Reliability",
    "Capability Availability",
    "Backward Compatibility",
    "Change Size",
    "Performance",
    "Cost"
  ]);

  function getWorkflowMutable(workflowId) {
    return state.workflows.get(String(workflowId || "")) || null;
  }

  function normalizeObject(value) {
    return internal.isPlainObject(value) ? internal.clone(value) : {};
  }

  function normalizeReferenceArray(value) {
    return internal.asArray(value).filter(function filterReference(item) {
      return item != null && (typeof item === "string" || internal.isPlainObject(item));
    }).map(function mapReference(item) {
      return typeof item === "string" ? { id: item } : internal.clone(item);
    });
  }

  function normalizeTaskNode(input, planId, workflow, index) {
    const source = internal.isPlainObject(input) ? input : {};
    const taskId = internal.text(source.taskId || source.id, planId + "-TASK-" + String(index + 1).padStart(3, "0"));
    return {
      taskId: taskId,
      taskVersion: internal.text(source.taskVersion || source.version, "1.0.0"),
      taskName: internal.text(source.taskName || source.name || source.title, taskId),
      taskType: internal.text(source.taskType || source.type, "Workflow Task"),
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      planId: planId,
      targetComponent: internal.text(source.targetComponent || source.componentId, ""),
      requiredCapability: internal.text(source.requiredCapability || source.capability, ""),
      operationType: internal.text(source.operationType || source.operation, "Read-Only"),
      inputReferences: normalizeReferenceArray(source.inputReferences || source.inputs),
      expectedOutput: source.expectedOutput == null ? null : internal.clone(source.expectedOutput),
      preconditions: internal.asArray(source.preconditions).map(internal.clone),
      postconditions: internal.asArray(source.postconditions).map(internal.clone),
      declaredDependencies: internal.unique(source.dependencies || source.dependsOn),
      mutationScope: normalizeObject(source.mutationScope),
      sideEffectType: SIDE_EFFECT_TYPES.includes(source.sideEffectType)
        ? source.sideEffectType
        : internal.text(source.sideEffectType, "Read-Only"),
      approvalRequirement: normalizeObject(source.approvalRequirement),
      validationRequirement: normalizeObject(source.validationRequirement),
      rollbackRequirement: normalizeObject(source.rollbackRequirement),
      monitoringRequirement: normalizeObject(source.monitoringRequirement),
      risk: normalizeObject(source.risk),
      evidenceRequirement: normalizeReferenceArray(source.evidenceRequirement || source.requiredEvidence),
      completionCondition: normalizeObject(source.completionCondition),
      traceabilityReferences: normalizeReferenceArray(source.traceabilityReferences || source.traceability),
      createdAt: internal.text(source.createdAt, internal.nowIso()),
      updatedAt: internal.nowIso()
    };
  }

  function normalizeDependencyEdge(input, planId, index) {
    const source = internal.isPlainObject(input) ? input : {};
    return {
      dependencyId: internal.text(source.dependencyId || source.id, planId + "-DEPENDENCY-" + String(index + 1).padStart(3, "0")),
      fromTaskId: internal.text(source.fromTaskId || source.from, ""),
      toTaskId: internal.text(source.toTaskId || source.to, ""),
      dependencyType: DEPENDENCY_TYPES.includes(source.dependencyType)
        ? source.dependencyType
        : internal.text(source.dependencyType, "Execution Dependency"),
      requiredOutput: source.requiredOutput == null ? null : internal.clone(source.requiredOutput),
      requiredCondition: source.requiredCondition == null ? null : internal.clone(source.requiredCondition),
      blockingRule: internal.text(source.blockingRule, "Block Until Dependency Succeeded"),
      evidenceReference: source.evidenceReference == null ? null : internal.clone(source.evidenceReference)
    };
  }

  function buildDeclaredDependencyEdges(tasks, planId, existing) {
    const edges = existing.slice();
    const keys = new Set(edges.map(function mapEdge(edge) {
      return edge.fromTaskId + "::" + edge.toTaskId;
    }));
    tasks.forEach(function addDeclared(task) {
      task.declaredDependencies.forEach(function addDependency(fromTaskId) {
        const key = fromTaskId + "::" + task.taskId;
        if (keys.has(key)) return;
        keys.add(key);
        edges.push(normalizeDependencyEdge({
          fromTaskId: fromTaskId,
          toTaskId: task.taskId,
          dependencyType: "Execution Dependency",
          blockingRule: "Block Until Dependency Succeeded"
        }, planId, edges.length));
      });
    });
    return edges;
  }

  function normalizeRepositoryBinding(input, workflow) {
    const source = internal.isPlainObject(input) ? input : {};
    const definitionBaseline = workflow && workflow.definition && internal.isPlainObject(workflow.definition.repositoryBaseline)
      ? workflow.definition.repositoryBaseline
      : {};
    return {
      repositoryId: internal.text(source.repositoryId || definitionBaseline.repositoryId, ""),
      repositoryVersion: internal.text(source.repositoryVersion || definitionBaseline.repositoryVersion || definitionBaseline.version, ""),
      repositoryBaselineId: internal.text(source.repositoryBaselineId || definitionBaseline.repositoryBaselineId || definitionBaseline.id, ""),
      repositoryHash: internal.text(source.repositoryHash || definitionBaseline.repositoryHash || definitionBaseline.hash, ""),
      sourceCount: Number.isFinite(Number(source.sourceCount != null ? source.sourceCount : definitionBaseline.sourceCount))
        ? Number(source.sourceCount != null ? source.sourceCount : definitionBaseline.sourceCount)
        : null,
      boundAt: internal.nowIso()
    };
  }

  function normalizeComponentBindings(input) {
    return internal.asArray(input).filter(internal.isPlainObject).map(function mapBinding(item) {
      return {
        componentId: internal.text(item.componentId || item.id, ""),
        componentVersion: internal.text(item.componentVersion || item.version, ""),
        capability: internal.text(item.capability || item.requiredCapability, ""),
        compatibility: internal.text(item.compatibility, "Not Evaluated")
      };
    });
  }

  function normalizeCandidatePlan(workflow, input, options) {
    const source = internal.isPlainObject(input) ? input : {};
    const settings = internal.isPlainObject(options) ? options : {};
    const planId = internal.text(settings.planId || source.planId || source.id, internal.nextId("IDE-160-PLAN"));
    const tasks = internal.asArray(source.tasks).map(function mapTask(task, index) {
      return normalizeTaskNode(task, planId, workflow, index);
    });
    const explicitDependencies = internal.asArray(source.dependencies).map(function mapDependency(item, index) {
      return normalizeDependencyEdge(item, planId, index);
    });
    const dependencies = buildDeclaredDependencyEdges(tasks, planId, explicitDependencies);
    const timestamp = internal.nowIso();
    return {
      planId: planId,
      planVersion: internal.text(settings.planVersion || source.planVersion || source.version, "1.0.0"),
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      status: "Candidate",
      goal: internal.text(source.goal, workflow.definition.goal),
      scope: internal.isPlainObject(source.scope) ? internal.clone(source.scope) : internal.clone(workflow.definition.scope || {}),
      excludedScope: internal.isPlainObject(source.excludedScope) ? internal.clone(source.excludedScope) : internal.clone(workflow.definition.excludedScope || {}),
      repositoryBinding: normalizeRepositoryBinding(source.repositoryBinding, workflow),
      componentBindings: normalizeComponentBindings(source.componentBindings),
      tasks: tasks,
      dependencies: dependencies,
      approvalRequirements: internal.asArray(source.approvalRequirements).map(internal.clone),
      validationRequirements: internal.asArray(source.validationRequirements).map(internal.clone),
      rollbackRequirements: internal.asArray(source.rollbackRequirements).map(internal.clone),
      monitoringPoints: internal.asArray(source.monitoringPoints).map(internal.clone),
      completionConditions: internal.asArray(source.completionConditions).map(internal.clone),
      risks: internal.asArray(source.risks).map(internal.clone),
      remainingRisk: internal.asArray(source.remainingRisk).map(internal.clone),
      evidenceReferences: normalizeReferenceArray(source.evidenceReferences || source.evidence),
      selectionMetadata: null,
      validation: null,
      graph: null,
      planHash: null,
      hashAlgorithm: null,
      previousPlanId: internal.text(source.previousPlanId || settings.previousPlanId, "") || null,
      previousPlanVersion: internal.text(source.previousPlanVersion || settings.previousPlanVersion, "") || null,
      createdBy: internal.text(settings.actor || source.createdBy, "Project Owner"),
      createdAt: timestamp,
      updatedAt: timestamp,
      selectedAt: null,
      frozenAt: null
    };
  }

  function ensurePlanningContainer(workflow) {
    if (!workflow.planning || !internal.isPlainObject(workflow.planning)) {
      workflow.planning = {
        status: "Not Started",
        candidatePlans: [],
        selectedPlanId: null,
        activePlanId: null,
        planningPackage: null,
        createdAt: internal.nowIso(),
        updatedAt: internal.nowIso()
      };
    }
    if (!Array.isArray(workflow.planning.candidatePlans)) workflow.planning.candidatePlans = [];
    return workflow.planning;
  }

  function findPlanMutable(workflow, planId) {
    const planning = ensurePlanningContainer(workflow);
    return planning.candidatePlans.find(function findPlan(plan) {
      return plan.planId === String(planId || "");
    }) || null;
  }

  function isMutationTask(task) {
    return Boolean(
      task && (
        task.sideEffectType === "Controlled Mutation" ||
        (task.mutationScope && Object.keys(task.mutationScope).length > 0)
      )
    );
  }

  function buildGraph(plan) {
    const taskIds = plan.tasks.map(function mapTask(task) { return task.taskId; });
    const taskSet = new Set(taskIds);
    const incoming = new Map(taskIds.map(function mapTaskId(id) { return [id, []]; }));
    const outgoing = new Map(taskIds.map(function mapTaskId(id) { return [id, []]; }));
    const invalidReferences = [];

    plan.dependencies.forEach(function mapEdge(edge) {
      if (!taskSet.has(edge.fromTaskId) || !taskSet.has(edge.toTaskId)) {
        invalidReferences.push({
          dependencyId: edge.dependencyId,
          fromTaskId: edge.fromTaskId,
          toTaskId: edge.toTaskId
        });
        return;
      }
      outgoing.get(edge.fromTaskId).push(edge.toTaskId);
      incoming.get(edge.toTaskId).push(edge.fromTaskId);
    });

    const entries = taskIds.filter(function findEntry(id) { return incoming.get(id).length === 0; });
    const exits = taskIds.filter(function findExit(id) { return outgoing.get(id).length === 0; });
    const isolated = taskIds.filter(function findIsolated(id) {
      return taskIds.length > 1 && incoming.get(id).length === 0 && outgoing.get(id).length === 0;
    });

    const indegree = new Map(taskIds.map(function mapTaskId(id) { return [id, incoming.get(id).length]; }));
    const queue = entries.slice();
    const order = [];
    while (queue.length) {
      const current = queue.shift();
      order.push(current);
      outgoing.get(current).forEach(function reduceIndegree(next) {
        const nextDegree = indegree.get(next) - 1;
        indegree.set(next, nextDegree);
        if (nextDegree === 0) queue.push(next);
      });
    }
    const hasCycle = order.length !== taskIds.length;

    const reachableFromEntry = new Set();
    const forwardQueue = entries.slice();
    while (forwardQueue.length) {
      const current = forwardQueue.shift();
      if (reachableFromEntry.has(current)) continue;
      reachableFromEntry.add(current);
      outgoing.get(current).forEach(function addNext(next) { forwardQueue.push(next); });
    }

    const canReachExit = new Set();
    const reverseQueue = exits.slice();
    while (reverseQueue.length) {
      const current = reverseQueue.shift();
      if (canReachExit.has(current)) continue;
      canReachExit.add(current);
      incoming.get(current).forEach(function addPrevious(previous) { reverseQueue.push(previous); });
    }

    return {
      taskCount: taskIds.length,
      dependencyCount: plan.dependencies.length,
      entries: entries,
      exits: exits,
      isolatedTasks: isolated,
      invalidReferences: invalidReferences,
      executionOrder: hasCycle ? [] : order,
      hasCycle: hasCycle,
      allReachableFromEntry: reachableFromEntry.size === taskIds.length,
      allCanReachExit: canReachExit.size === taskIds.length
    };
  }

  function validatePlanObject(plan) {
    const checks = [];
    function check(name, passed, detail, group) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: internal.text(detail, ""),
        group: internal.text(group, "Planning")
      });
    }

    const graph = buildGraph(plan);
    const taskIds = plan.tasks.map(function mapTask(task) { return task.taskId; });
    const uniqueTaskIds = new Set(taskIds);
    const dependencyIds = plan.dependencies.map(function mapDependency(edge) { return edge.dependencyId; });
    const uniqueDependencyIds = new Set(dependencyIds);
    const binding = plan.repositoryBinding || {};
    const componentMap = new Map(plan.componentBindings.map(function mapBinding(item) {
      return [item.componentId, item];
    }));

    check("Plan identity", Boolean(plan.planId), plan.planId, "Identity");
    check("Plan version", Boolean(plan.planVersion), plan.planVersion, "Identity");
    check("Workflow binding", Boolean(plan.workflowId && plan.attemptId), plan.workflowId + "/" + plan.attemptId, "Identity");
    check("Goal defined", Boolean(plan.goal), plan.goal, "Scope");
    check("Scope defined", Boolean(plan.scope && Object.keys(plan.scope).length), "Scope", "Scope");
    check("Repository ID bound", Boolean(binding.repositoryId), binding.repositoryId, "Repository");
    check("Repository version bound", Boolean(binding.repositoryVersion), binding.repositoryVersion, "Repository");
    check("Repository baseline bound", Boolean(binding.repositoryBaselineId), binding.repositoryBaselineId, "Repository");
    check("Repository hash bound", Boolean(binding.repositoryHash), binding.repositoryHash, "Repository");
    check("Task exists", plan.tasks.length > 0, "count=" + plan.tasks.length, "Task");
    check("Task IDs unique", uniqueTaskIds.size === taskIds.length, "unique=" + uniqueTaskIds.size, "Task");
    check("Dependency IDs unique", uniqueDependencyIds.size === dependencyIds.length, "unique=" + uniqueDependencyIds.size, "Dependency");
    check("Dependency references valid", graph.invalidReferences.length === 0, JSON.stringify(graph.invalidReferences), "Dependency");
    check("Entry node exists", graph.entries.length > 0, JSON.stringify(graph.entries), "Graph");
    check("Exit node exists", graph.exits.length > 0, JSON.stringify(graph.exits), "Graph");
    check("Dependency graph acyclic", graph.hasCycle === false, graph.hasCycle ? "Cycle detected" : "DAG", "Graph");
    check("Orphan task absent", graph.isolatedTasks.length === 0 || plan.tasks.length === 1, JSON.stringify(graph.isolatedTasks), "Graph");
    check("All tasks reachable", graph.allReachableFromEntry === true, String(graph.allReachableFromEntry), "Graph");
    check("All tasks reach exit", graph.allCanReachExit === true, String(graph.allCanReachExit), "Graph");

    plan.tasks.forEach(function validateTask(task) {
      const prefix = "Task " + task.taskId + " ";
      check(prefix + "target component", Boolean(task.targetComponent), task.targetComponent, "Task Contract");
      check(prefix + "capability", Boolean(task.requiredCapability), task.requiredCapability, "Task Contract");
      check(prefix + "expected output", task.expectedOutput != null, task.expectedOutput == null ? "Missing" : "Defined", "Task Contract");
      check(prefix + "evidence requirement", task.evidenceRequirement.length > 0, "count=" + task.evidenceRequirement.length, "Evidence");
      check(prefix + "component binding", componentMap.has(task.targetComponent), task.targetComponent, "Capability");
      if (isMutationTask(task)) {
        check(prefix + "mutation approval", task.approvalRequirement.required === true, JSON.stringify(task.approvalRequirement), "Mutation Safety");
        check(prefix + "mutation validation", Object.keys(task.validationRequirement).length > 0, JSON.stringify(task.validationRequirement), "Mutation Safety");
        check(prefix + "mutation rollback", task.rollbackRequirement.required === true, JSON.stringify(task.rollbackRequirement), "Mutation Safety");
        check(prefix + "mutation scope", Object.keys(task.mutationScope).length > 0, JSON.stringify(task.mutationScope), "Mutation Safety");
      }
      check(prefix + "external side effect prohibited", task.sideEffectType !== "External Side Effect", task.sideEffectType, "Safety");
    });

    check("Completion condition defined", plan.completionConditions.length > 0, "count=" + plan.completionConditions.length, "Completion");
    check("Plan evidence exists", plan.evidenceReferences.length > 0, "count=" + plan.evidenceReferences.length, "Evidence");

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const groups = {};
    checks.forEach(function groupCheck(item) {
      if (!groups[item.group]) groups[item.group] = { passed: 0, failed: 0, total: 0 };
      groups[item.group].total += 1;
      if (item.passed) groups[item.group].passed += 1;
      else groups[item.group].failed += 1;
    });

    return {
      valid: failed === 0,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      status: failed === 0 ? "Passed" : "Failed",
      groups: groups,
      checks: checks,
      graph: graph,
      validatedAt: internal.nowIso()
    };
  }

  function beginPlanningIfReady(workflow, evidence, actor) {
    if (workflow.state.primaryPhase === "Planning" && workflow.state.controlStatus === "Running") {
      return internal.buildResult(true, "PLANNING_ALREADY_RUNNING", "Running", { state: internal.clone(workflow.state) });
    }
    if (workflow.state.primaryPhase !== "Planning" || workflow.state.controlStatus !== "Ready") {
      return internal.buildResult(false, "PLANNING_STATE_NOT_READY", "Blocked", {
        currentState: internal.clone(workflow.state)
      }, {
        error: { message: "Workflow is not ready to enter Planning Running.", category: "Policy Failure", severity: "High" }
      });
    }
    return namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Planning",
      fromStatus: "Ready",
      toPhase: "Planning",
      toStatus: "Running",
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: "PLANNING_STARTED",
      evidenceReferences: evidence,
      actor: internal.text(actor, "IDE-160"),
      sourceComponent: namespace.componentId
    });
  }

  function createCandidatePlan(workflowId, input, options) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) {
      return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null, {
        error: { message: "Workflow not found.", category: "Input Failure", severity: "High" }
      });
    }
    const evidence = normalizeReferenceArray(input && (input.evidenceReferences || input.evidence));
    if (!evidence.length) {
      return internal.buildResult(false, "PLAN_EVIDENCE_REQUIRED", "Blocked", null, {
        error: { message: "Candidate Plan requires Evidence.", category: "Input Failure", severity: "High" }
      });
    }
    const planningState = beginPlanningIfReady(workflow, evidence, options && options.actor);
    if (!planningState.ok) return planningState;

    const planning = ensurePlanningContainer(workflow);
    if (planning.candidatePlans.length >= MAX_CANDIDATE_PLANS) {
      return internal.buildResult(false, "CANDIDATE_PLAN_LIMIT", "Blocked", {
        maximum: MAX_CANDIDATE_PLANS
      }, {
        error: { message: "Candidate Plan limit reached.", category: "Policy Failure", severity: "Medium" }
      });
    }
    const plan = normalizeCandidatePlan(workflow, input, options);
    if (findPlanMutable(workflow, plan.planId)) {
      return internal.buildResult(false, "PLAN_ID_EXISTS", "Blocked", { planId: plan.planId }, {
        error: { message: "Plan ID already exists.", category: "Input Failure", severity: "Medium" }
      });
    }
    planning.candidatePlans.push(plan);
    planning.status = "Planning";
    planning.updatedAt = internal.nowIso();
    workflow.context.planningReference = {
      status: "Planning",
      candidatePlanCount: planning.candidatePlans.length,
      updatedAt: planning.updatedAt
    };
    workflow.updatedAt = internal.nowIso();
    internal.touch();
    const persistence = internal.persistRuntimeIfAvailable();
    return internal.buildResult(true, "CANDIDATE_PLAN_CREATED", "Candidate", {
      plan: internal.clone(plan),
      candidatePlanCount: planning.candidatePlans.length,
      planningState: planningState.data || null,
      persistence: persistence
    });
  }

  function getCandidatePlan(workflowId, planId) {
    const workflow = getWorkflowMutable(workflowId);
    const plan = workflow ? findPlanMutable(workflow, planId) : null;
    return plan ? internal.clone(plan) : null;
  }

  function listCandidatePlans(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return [];
    return ensurePlanningContainer(workflow).candidatePlans.map(internal.clone);
  }

  function validateCandidatePlan(workflowId, planId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const plan = workflow ? findPlanMutable(workflow, planId) : null;
    if (!workflow || !plan) {
      return internal.buildResult(false, "CANDIDATE_PLAN_NOT_FOUND", "Blocked", null, {
        error: { message: "Candidate Plan not found.", category: "Input Failure", severity: "High" }
      });
    }
    if (["Frozen", "Active", "Completed"].includes(plan.status) && !(options && options.verifyOnly === true)) {
      return internal.buildResult(false, "FROZEN_PLAN_IMMUTABLE", "Blocked", { planId: plan.planId, status: plan.status }, {
        error: { message: "Frozen or active Plan cannot be changed by Validation.", category: "Policy Failure", severity: "High" }
      });
    }

    const previousStatus = plan.status;
    plan.status = "Validating";
    const validation = validatePlanObject(plan);
    plan.graph = internal.clone(validation.graph);
    plan.validation = internal.clone(validation);
    plan.status = validation.valid ? (previousStatus === "Selected" ? "Selected" : "Ready") : "Invalidated";
    plan.updatedAt = internal.nowIso();
    ensurePlanningContainer(workflow).updatedAt = plan.updatedAt;
    internal.touch();
    internal.persistRuntimeIfAvailable();
    return internal.buildResult(validation.valid, validation.valid ? "CANDIDATE_PLAN_VALID" : "CANDIDATE_PLAN_INVALID", validation.valid ? "Ready" : "Failed", {
      plan: internal.clone(plan),
      validation: validation
    }, validation.valid ? {} : {
      error: { message: "Candidate Plan Validation failed.", category: "Validation Failure", severity: "High" }
    });
  }

  function compareCandidatePlans(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow) return null;
    const planning = ensurePlanningContainer(workflow);
    return {
      workflowId: workflow.identity.workflowId,
      attemptId: workflow.currentAttempt.attemptId,
      priorities: PLAN_SELECTION_PRIORITIES.slice(),
      candidates: planning.candidatePlans.map(function mapPlan(plan) {
        return {
          planId: plan.planId,
          planVersion: plan.planVersion,
          status: plan.status,
          valid: Boolean(plan.validation && plan.validation.valid),
          health: plan.validation ? plan.validation.health : null,
          taskCount: plan.tasks.length,
          dependencyCount: plan.dependencies.length,
          mutationTaskCount: plan.tasks.filter(isMutationTask).length,
          riskCount: plan.risks.length,
          remainingRiskCount: plan.remainingRisk.length,
          repositoryHash: plan.repositoryBinding.repositoryHash
        };
      }),
      generatedAt: internal.nowIso()
    };
  }

  function selectActivePlan(workflowId, planId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const plan = workflow ? findPlanMutable(workflow, planId) : null;
    const settings = internal.isPlainObject(options) ? options : {};
    if (!workflow || !plan) {
      return internal.buildResult(false, "CANDIDATE_PLAN_NOT_FOUND", "Blocked", null, {
        error: { message: "Candidate Plan not found.", category: "Input Failure", severity: "High" }
      });
    }
    if (plan.status !== "Ready") {
      return internal.buildResult(false, "PLAN_NOT_READY_FOR_SELECTION", "Blocked", { planId: plan.planId, status: plan.status }, {
        error: { message: "Plan must pass Validation before Selection.", category: "Policy Failure", severity: "High" }
      });
    }
    const selectionReason = internal.text(settings.selectionReason || settings.reason, "");
    const evidence = normalizeReferenceArray(settings.evidenceReferences || settings.evidence);
    if (!selectionReason || !evidence.length) {
      return internal.buildResult(false, "PLAN_SELECTION_EVIDENCE_REQUIRED", "Blocked", null, {
        error: { message: "Plan Selection requires Reason and Evidence.", category: "Input Failure", severity: "High" }
      });
    }
    const planning = ensurePlanningContainer(workflow);
    if (planning.activePlanId && planning.activePlanId !== plan.planId) {
      return internal.buildResult(false, "SINGLE_ACTIVE_PLAN_VIOLATION", "Blocked", {
        activePlanId: planning.activePlanId,
        requestedPlanId: plan.planId
      }, {
        error: { message: "Only one Active Plan is allowed per Attempt.", category: "Policy Failure", severity: "High" }
      });
    }
    planning.candidatePlans.forEach(function clearSelection(candidate) {
      if (candidate.planId !== plan.planId && candidate.status === "Selected") candidate.status = "Ready";
    });
    plan.status = "Selected";
    plan.selectedAt = internal.nowIso();
    plan.selectionMetadata = {
      selectionReason: selectionReason,
      evidenceReferences: evidence,
      actor: internal.text(settings.actor, "Project Owner"),
      selectedAt: plan.selectedAt,
      comparison: compareCandidatePlans(workflowId)
    };
    planning.selectedPlanId = plan.planId;
    planning.activePlanId = plan.planId;
    planning.status = "Selected";
    planning.updatedAt = plan.selectedAt;
    workflow.updatedAt = plan.selectedAt;
    internal.touch();
    internal.persistRuntimeIfAvailable();
    return internal.buildResult(true, "ACTIVE_PLAN_SELECTED", "Selected", {
      selectedPlan: internal.clone(plan),
      activePlanId: planning.activePlanId
    });
  }

  function buildPlanHashPayload(plan) {
    return {
      planId: plan.planId,
      planVersion: plan.planVersion,
      workflowId: plan.workflowId,
      workflowVersion: plan.workflowVersion,
      attemptId: plan.attemptId,
      goal: plan.goal,
      scope: plan.scope,
      excludedScope: plan.excludedScope,
      repositoryBinding: plan.repositoryBinding,
      componentBindings: plan.componentBindings,
      tasks: plan.tasks.map(function mapTask(task) {
        const copy = internal.clone(task);
        delete copy.createdAt;
        delete copy.updatedAt;
        return copy;
      }),
      dependencies: plan.dependencies,
      approvalRequirements: plan.approvalRequirements,
      validationRequirements: plan.validationRequirements,
      rollbackRequirements: plan.rollbackRequirements,
      monitoringPoints: plan.monitoringPoints,
      completionConditions: plan.completionConditions,
      risks: plan.risks,
      remainingRisk: plan.remainingRisk,
      evidenceReferences: plan.evidenceReferences,
      previousPlanId: plan.previousPlanId,
      previousPlanVersion: plan.previousPlanVersion
    };
  }

  function verifyPlanHash(workflowId, planId) {
    const workflow = getWorkflowMutable(workflowId);
    const plan = workflow ? findPlanMutable(workflow, planId) : null;
    if (!plan || !plan.planHash || !plan.hashAlgorithm) {
      return internal.buildResult(false, "PLAN_HASH_NOT_AVAILABLE", "Blocked", null, {
        error: { message: "Plan Hash is not available.", category: "Validation Failure", severity: "High" }
      });
    }
    const integrity = internal.hashCanonicalSync(buildPlanHashPayload(plan));
    const verified = integrity.algorithm === plan.hashAlgorithm && integrity.hash === plan.planHash;
    return internal.buildResult(verified, verified ? "PLAN_HASH_VERIFIED" : "PLAN_HASH_MISMATCH", verified ? "Verified" : "Failed", {
      planId: plan.planId,
      expected: { algorithm: plan.hashAlgorithm, hash: plan.planHash },
      actual: integrity
    }, verified ? {} : {
      error: { message: "Plan Hash does not match.", category: "Repository Integrity Failure", severity: "Critical" }
    });
  }

  function buildPlanningPackage(workflow, plan) {
    const planning = ensurePlanningContainer(workflow);
    const candidateComparison = compareCandidatePlans(workflow.identity.workflowId);
    const packageWithoutHash = {
      planningPackageId: internal.nextId("IDE-160-PLANNING-PACKAGE"),
      workflowId: workflow.identity.workflowId,
      workflowVersion: workflow.identity.workflowVersion,
      attemptId: workflow.currentAttempt.attemptId,
      workflowDefinitionReference: {
        id: workflow.definition.workflowDefinitionId,
        version: workflow.definition.workflowDefinitionVersion
      },
      candidatePlanReferences: planning.candidatePlans.map(function mapCandidate(candidate) {
        return {
          planId: candidate.planId,
          planVersion: candidate.planVersion,
          status: candidate.status,
          planHash: candidate.planHash
        };
      }),
      candidateComparison: candidateComparison,
      selectedPlanReference: {
        planId: plan.planId,
        planVersion: plan.planVersion,
        planHash: plan.planHash,
        hashAlgorithm: plan.hashAlgorithm
      },
      selectionReason: internal.clone(plan.selectionMetadata),
      planValidationResult: internal.clone(plan.validation),
      repositoryBaseline: internal.clone(plan.repositoryBinding),
      componentBindings: internal.clone(plan.componentBindings),
      requiredApproval: internal.clone(plan.approvalRequirements),
      requiredValidation: internal.clone(plan.validationRequirements),
      rollbackRequirement: internal.clone(plan.rollbackRequirements),
      monitoringPoints: internal.clone(plan.monitoringPoints),
      completionConditions: internal.clone(plan.completionConditions),
      risk: internal.clone(plan.risks),
      remainingRisk: internal.clone(plan.remainingRisk),
      traceability: internal.clone(plan.evidenceReferences),
      generatedAt: internal.nowIso()
    };
    const integrity = internal.hashCanonicalSync(packageWithoutHash);
    return Object.assign({}, packageWithoutHash, {
      integrity: integrity
    });
  }

  function freezeActivePlan(workflowId, options) {
    const workflow = getWorkflowMutable(workflowId);
    const settings = internal.isPlainObject(options) ? options : {};
    if (!workflow) {
      return internal.buildResult(false, "WORKFLOW_NOT_FOUND", "Blocked", null, {
        error: { message: "Workflow not found.", category: "Input Failure", severity: "High" }
      });
    }
    const planning = ensurePlanningContainer(workflow);
    const plan = findPlanMutable(workflow, planning.selectedPlanId || planning.activePlanId);
    if (!plan) {
      return internal.buildResult(false, "SELECTED_PLAN_NOT_FOUND", "Blocked", null, {
        error: { message: "Selected Plan not found.", category: "Input Failure", severity: "High" }
      });
    }
    if (plan.status !== "Selected") {
      return internal.buildResult(false, "PLAN_NOT_SELECTED", "Blocked", { planId: plan.planId, status: plan.status }, {
        error: { message: "Plan must be Selected before Freeze.", category: "Policy Failure", severity: "High" }
      });
    }
    if (workflow.state.primaryPhase !== "Planning" || workflow.state.controlStatus !== "Running") {
      return internal.buildResult(false, "PLANNING_NOT_RUNNING", "Blocked", { state: internal.clone(workflow.state) }, {
        error: { message: "Planning must be Running before Plan Freeze.", category: "Policy Failure", severity: "High" }
      });
    }

    const currentRepository = internal.isPlainObject(settings.currentRepository) ? settings.currentRepository : null;
    if (currentRepository) {
      const expected = plan.repositoryBinding;
      const match = [
        ["repositoryId", expected.repositoryId, currentRepository.repositoryId],
        ["repositoryVersion", expected.repositoryVersion, currentRepository.repositoryVersion],
        ["repositoryBaselineId", expected.repositoryBaselineId, currentRepository.repositoryBaselineId],
        ["repositoryHash", expected.repositoryHash, currentRepository.repositoryHash]
      ].every(function compare(item) {
        return String(item[1] || "") === String(item[2] || "");
      });
      if (!match) {
        plan.status = "Invalidated";
        plan.updatedAt = internal.nowIso();
        internal.persistRuntimeIfAvailable();
        return internal.buildResult(false, "REPOSITORY_BASELINE_MISMATCH", "Blocked", {
          expected: internal.clone(expected),
          actual: internal.clone(currentRepository)
        }, {
          error: { message: "Repository Baseline does not match the selected Plan.", category: "Repository Integrity Failure", severity: "Critical" }
        });
      }
    }

    const validation = validatePlanObject(plan);
    if (!validation.valid) {
      plan.status = "Invalidated";
      plan.validation = validation;
      plan.graph = validation.graph;
      plan.updatedAt = internal.nowIso();
      internal.persistRuntimeIfAvailable();
      return internal.buildResult(false, "PLAN_FREEZE_VALIDATION_FAILED", "Failed", {
        validation: validation
      }, {
        error: { message: "Plan Validation failed before Freeze.", category: "Validation Failure", severity: "High" }
      });
    }

    const integrity = internal.hashCanonicalSync(buildPlanHashPayload(plan));
    plan.status = "Frozen";
    plan.validation = validation;
    plan.graph = validation.graph;
    plan.planHash = integrity.hash;
    plan.hashAlgorithm = integrity.algorithm;
    plan.frozenAt = internal.nowIso();
    plan.updatedAt = plan.frozenAt;
    const planningPackage = buildPlanningPackage(workflow, plan);
    planning.planningPackage = planningPackage;
    planning.status = "Frozen";
    planning.activePlanId = plan.planId;
    planning.updatedAt = plan.frozenAt;
    workflow.context.planningReference = {
      planningPackageId: planningPackage.planningPackageId,
      planId: plan.planId,
      planVersion: plan.planVersion,
      planHash: plan.planHash,
      status: "Frozen"
    };
    workflow.updatedAt = plan.frozenAt;

    const evidence = [{
      type: "Frozen Plan",
      id: plan.planId,
      version: plan.planVersion,
      hash: plan.planHash
    }];
    const planningSucceeded = namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Planning",
      fromStatus: "Running",
      toPhase: "Planning",
      toStatus: "Succeeded",
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: "PLAN_VALIDATED_AND_FROZEN",
      evidenceReferences: evidence,
      actor: internal.text(settings.actor, "IDE-160"),
      sourceComponent: namespace.componentId
    });
    if (!planningSucceeded.ok) return planningSucceeded;

    const executionReady = namespace.api.transitionWorkflowState(workflow.identity.workflowId, {
      fromPhase: "Planning",
      fromStatus: "Succeeded",
      toPhase: "Execution",
      toStatus: "Ready",
      attemptId: workflow.currentAttempt.attemptId,
      reasonCode: "PLANNING_HANDOFF_TO_EXECUTION",
      evidenceReferences: evidence,
      actor: "IDE-160",
      sourceComponent: namespace.componentId
    });
    if (!executionReady.ok) return executionReady;

    internal.touch();
    const persistence = internal.persistRuntimeIfAvailable();
    return internal.buildResult(true, "ACTIVE_PLAN_FROZEN", "Frozen", {
      plan: internal.clone(plan),
      planningPackage: internal.clone(planningPackage),
      workflowState: internal.clone(workflow.state),
      persistence: persistence
    });
  }

  function getPlanningPackage(workflowId) {
    const workflow = getWorkflowMutable(workflowId);
    if (!workflow || !workflow.planning) return null;
    return internal.clone(workflow.planning.planningPackage || null);
  }

  function createPlanRevision(workflowId, sourcePlanId, changes, options) {
    const workflow = getWorkflowMutable(workflowId);
    const sourcePlan = workflow ? findPlanMutable(workflow, sourcePlanId) : null;
    if (!workflow || !sourcePlan) {
      return internal.buildResult(false, "SOURCE_PLAN_NOT_FOUND", "Blocked", null, {
        error: { message: "Source Plan not found.", category: "Input Failure", severity: "High" }
      });
    }
    const patch = internal.isPlainObject(changes) ? changes : {};
    const nextInput = Object.assign({}, internal.clone(sourcePlan), patch, {
      planId: undefined,
      id: undefined,
      status: undefined,
      validation: undefined,
      graph: undefined,
      planHash: undefined,
      hashAlgorithm: undefined,
      previousPlanId: sourcePlan.planId,
      previousPlanVersion: sourcePlan.planVersion,
      evidenceReferences: patch.evidenceReferences || sourcePlan.evidenceReferences
    });
    const settings = Object.assign({}, internal.isPlainObject(options) ? options : {}, {
      previousPlanId: sourcePlan.planId,
      previousPlanVersion: sourcePlan.planVersion
    });
    return createCandidatePlan(workflowId, nextInput, settings);
  }

  function validateWorkflowPlanning(options) {
    const checks = [];
    function check(name, passed, detail, group) {
      checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: internal.text(group, "Planning") });
    }

    const originalState = internal.exportRuntimeState();
    const originalJournal = internal.transitionJournal ? internal.transitionJournal.map(internal.clone) : [];
    const originalValidation = internal.clone(state.lastValidation);
    const originalPersistence = internal.clone(state.lastPersistence);
    const originalError = internal.clone(state.lastError);
    const originalUpdatedAt = state.updatedAt;
    const memory = namespace.api.createIDE160MemoryStorage();

    namespace.api.runWithIDE160Storage(memory, function runPlanningValidation() {
      try {
        state.definitions.clear();
        state.workflows.clear();
        state.activeWorkflowId = null;
        if (internal.transitionJournal) internal.transitionJournal.splice(0, internal.transitionJournal.length);

        check("Planning module loaded", Boolean(namespace.modules.planning), namespace.modules.planning && namespace.modules.planning.status, "Module");
        check("Plan lifecycle constants", PLAN_STATUSES.length === 10, "count=" + PLAN_STATUSES.length, "Module");
        check("Selection priorities", PLAN_SELECTION_PRIORITIES[0] === "Safety", PLAN_SELECTION_PRIORITIES.join(" > "), "Policy");

        const definitionResult = namespace.api.createWorkflowDefinition({
          workflowDefinitionId: "IDE-160-PLANNING-TEST-DEFINITION",
          workflowDefinitionVersion: "1.0.0",
          name: "Planning Validation Workflow",
          goal: "Validate IDE-160 Phase 2 Planning",
          scope: { description: "Planning validation" },
          excludedScope: {},
          requiredComponents: ["IDE-110", "IDE-140", "IDE-150"],
          requiredCapabilities: ["Diagnostic", "Analytics", "Controlled Refactoring"],
          inputContract: { validation: true },
          requiredEvidence: ["Validation Evidence"],
          requiredPolicies: ["Evidence First", "Rollback Required"],
          executionRequirement: { serial: true },
          approvalRequirement: { required: true },
          monitoringRequirement: { required: true },
          completionRequirement: { planning: true },
          repositoryBaseline: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-PHASE2-BASELINE",
            repositoryHash: "TEST-REPOSITORY-HASH",
            sourceCount: 110
          },
          handoffTarget: "IDE-170"
        });
        check("Planning definition created", definitionResult.ok === true, definitionResult.code, "Setup");
        const workflowResult = namespace.api.createWorkflow("IDE-160-PLANNING-TEST-DEFINITION", { validation: true }, { workflowId: "IDE-160-PLANNING-TEST-WORKFLOW" });
        check("Planning workflow created", workflowResult.ok === true, workflowResult.code, "Setup");
        const started = namespace.api.startWorkflow("IDE-160-PLANNING-TEST-WORKFLOW", { actor: "Validation" });
        check("Workflow ready for Planning", started.ok === true && namespace.api.getWorkflowState("IDE-160-PLANNING-TEST-WORKFLOW").primaryPhase === "Planning", started.code, "Setup");

        const invalidPlan = namespace.api.createCandidatePlan("IDE-160-PLANNING-TEST-WORKFLOW", {
          goal: "Invalid Plan",
          scope: { description: "No tasks" },
          repositoryBinding: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-PHASE2-BASELINE",
            repositoryHash: "TEST-REPOSITORY-HASH"
          },
          componentBindings: [],
          tasks: [],
          dependencies: [],
          completionConditions: [],
          evidenceReferences: [{ type: "Validation Evidence", id: "PLAN-EVIDENCE" }]
        }, { planId: "IDE-160-INVALID-PLAN", actor: "Validation" });
        check("Invalid candidate created for validation", invalidPlan.ok === true, invalidPlan.code, "Candidate");
        const invalidValidation = namespace.api.validateCandidatePlan("IDE-160-PLANNING-TEST-WORKFLOW", "IDE-160-INVALID-PLAN");
        check("Invalid plan rejected", invalidValidation.ok === false && invalidValidation.code === "CANDIDATE_PLAN_INVALID", invalidValidation.code, "Validation");

        const candidateInput = {
          goal: "Validate Planning DAG",
          scope: { description: "Diagnostic to analytics to controlled refactoring" },
          excludedScope: { persistentCommit: true, zipMutation: true },
          repositoryBinding: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-PHASE2-BASELINE",
            repositoryHash: "TEST-REPOSITORY-HASH",
            sourceCount: 110
          },
          componentBindings: [
            { componentId: "IDE-110", componentVersion: "1.1.0", capability: "Diagnostic" },
            { componentId: "IDE-140", componentVersion: "1.2.2", capability: "Analytics" },
            { componentId: "IDE-150", componentVersion: "1.2.8", capability: "Controlled Refactoring" }
          ],
          tasks: [
            {
              taskId: "TASK-DIAGNOSTIC",
              taskName: "Diagnostic",
              targetComponent: "IDE-110",
              requiredCapability: "Diagnostic",
              operationType: "Read-Only",
              sideEffectType: "Read-Only",
              expectedOutput: { type: "Diagnostic Result" },
              validationRequirement: { required: true },
              monitoringRequirement: { required: true },
              evidenceRequirement: [{ type: "Workflow Definition" }]
            },
            {
              taskId: "TASK-ANALYTICS",
              taskName: "Analytics",
              targetComponent: "IDE-140",
              requiredCapability: "Analytics",
              operationType: "Read-Only",
              sideEffectType: "Read-Only",
              expectedOutput: { type: "Analytics Handoff" },
              validationRequirement: { required: true },
              monitoringRequirement: { required: true },
              evidenceRequirement: [{ type: "Diagnostic Result" }]
            },
            {
              taskId: "TASK-REFACTOR",
              taskName: "Controlled Refactoring",
              targetComponent: "IDE-150",
              requiredCapability: "Controlled Refactoring",
              operationType: "Controlled Mutation",
              sideEffectType: "Controlled Mutation",
              expectedOutput: { type: "Controlled Application Result" },
              mutationScope: { targetFile: "13_ai_development_workflow_planning.js", targetFunction: "validateCandidatePlan" },
              approvalRequirement: { required: true, type: "Component-Level Approval" },
              validationRequirement: { required: true, postApplication: true },
              rollbackRequirement: { required: true, mandatory: true },
              monitoringRequirement: { required: true },
              evidenceRequirement: [{ type: "Analytics Handoff" }]
            }
          ],
          dependencies: [
            { dependencyId: "DEP-1", fromTaskId: "TASK-DIAGNOSTIC", toTaskId: "TASK-ANALYTICS", dependencyType: "Data Dependency" },
            { dependencyId: "DEP-2", fromTaskId: "TASK-ANALYTICS", toTaskId: "TASK-REFACTOR", dependencyType: "Approval Dependency" }
          ],
          approvalRequirements: [{ type: "Component-Level Approval", taskId: "TASK-REFACTOR" }],
          validationRequirements: [{ type: "Plan Validation" }, { type: "Post-Application Validation" }],
          rollbackRequirements: [{ taskId: "TASK-REFACTOR", mandatory: true }],
          monitoringPoints: [{ type: "Repository Integrity" }],
          completionConditions: [{ type: "All Required Tasks Complete" }, { type: "Repository Restored" }],
          risks: [{ level: "Medium", type: "Controlled Mutation" }],
          remainingRisk: [],
          evidenceReferences: [{ type: "Validation Evidence", id: "PLAN-EVIDENCE" }]
        };

        const candidate = namespace.api.createCandidatePlan("IDE-160-PLANNING-TEST-WORKFLOW", candidateInput, { planId: "IDE-160-VALID-PLAN", actor: "Validation" });
        check("Valid candidate created", candidate.ok === true && candidate.data.plan.status === "Candidate", candidate.code, "Candidate");
        const currentPlanningState = namespace.api.getWorkflowState("IDE-160-PLANNING-TEST-WORKFLOW");
        check("Planning entered Running", currentPlanningState.primaryPhase === "Planning" && currentPlanningState.controlStatus === "Running", JSON.stringify(currentPlanningState), "State");
        const validated = namespace.api.validateCandidatePlan("IDE-160-PLANNING-TEST-WORKFLOW", "IDE-160-VALID-PLAN");
        check("Valid DAG accepted", validated.ok === true && validated.data.validation.graph.hasCycle === false, validated.code, "Validation");
        check("Execution order generated", JSON.stringify(validated.data.validation.graph.executionOrder) === JSON.stringify(["TASK-DIAGNOSTIC", "TASK-ANALYTICS", "TASK-REFACTOR"]), JSON.stringify(validated.data.validation.graph.executionOrder), "Graph");
        check("Entry and exit detected", validated.data.validation.graph.entries[0] === "TASK-DIAGNOSTIC" && validated.data.validation.graph.exits[0] === "TASK-REFACTOR", JSON.stringify(validated.data.validation.graph), "Graph");
        check("Mutation safety requirements", validated.data.validation.checks.filter(function filter(item) { return item.group === "Mutation Safety"; }).every(function every(item) { return item.passed; }), "Mutation safety", "Safety");

        const cycleInput = internal.clone(candidateInput);
        cycleInput.dependencies.push({ dependencyId: "DEP-CYCLE", fromTaskId: "TASK-REFACTOR", toTaskId: "TASK-DIAGNOSTIC", dependencyType: "Execution Dependency" });
        const cycleCandidate = namespace.api.createCandidatePlan("IDE-160-PLANNING-TEST-WORKFLOW", cycleInput, { planId: "IDE-160-CYCLE-PLAN", actor: "Validation" });
        const cycleValidation = namespace.api.validateCandidatePlan("IDE-160-PLANNING-TEST-WORKFLOW", "IDE-160-CYCLE-PLAN");
        check("Dependency cycle rejected", cycleCandidate.ok === true && cycleValidation.ok === false && cycleValidation.data.validation.graph.hasCycle === true, cycleValidation.code, "Graph");

        const comparison = namespace.api.compareCandidatePlans("IDE-160-PLANNING-TEST-WORKFLOW");
        check("Multiple candidates compared", comparison && comparison.candidates.length === 3, "count=" + (comparison && comparison.candidates.length), "Selection");
        const selected = namespace.api.selectActivePlan("IDE-160-PLANNING-TEST-WORKFLOW", "IDE-160-VALID-PLAN", {
          selectionReason: "Safety and complete validation coverage",
          evidenceReferences: [{ type: "Plan Validation", id: validated.data.validation.validatedAt }],
          actor: "Project Owner"
        });
        check("Single Active Plan selected", selected.ok === true && selected.data.activePlanId === "IDE-160-VALID-PLAN", selected.code, "Selection");
        const selectInvalid = namespace.api.selectActivePlan("IDE-160-PLANNING-TEST-WORKFLOW", "IDE-160-INVALID-PLAN", {
          selectionReason: "Invalid selection test",
          evidenceReferences: [{ type: "Validation Evidence", id: "INVALID" }]
        });
        check("Invalid Plan selection rejected", selectInvalid.ok === false, selectInvalid.code, "Selection");

        const frozen = namespace.api.freezeActivePlan("IDE-160-PLANNING-TEST-WORKFLOW", {
          actor: "Project Owner",
          currentRepository: {
            repositoryId: "AI-PROMPT-OS",
            repositoryVersion: "v6.0",
            repositoryBaselineId: "IDE-160-PHASE2-BASELINE",
            repositoryHash: "TEST-REPOSITORY-HASH"
          }
        });
        check("Selected Plan frozen", frozen.ok === true && frozen.data.plan.status === "Frozen", frozen.code, "Freeze");
        check("Plan hash generated", frozen.ok === true && Boolean(frozen.data.plan.planHash) && Boolean(frozen.data.plan.hashAlgorithm), frozen.data.plan.planHash, "Integrity");
        const hashVerified = namespace.api.verifyWorkflowPlanHash("IDE-160-PLANNING-TEST-WORKFLOW", "IDE-160-VALID-PLAN");
        check("Plan hash verified", hashVerified.ok === true, hashVerified.code, "Integrity");
        const packageResult = namespace.api.getPlanningPackage("IDE-160-PLANNING-TEST-WORKFLOW");
        check("Planning Package generated", Boolean(packageResult && packageResult.integrity && packageResult.selectedPlanReference.planHash), packageResult && packageResult.planningPackageId, "Package");
        const executionState = namespace.api.getWorkflowState("IDE-160-PLANNING-TEST-WORKFLOW");
        check("Execution handoff ready", executionState.primaryPhase === "Execution" && executionState.controlStatus === "Ready", JSON.stringify(executionState), "State");
        const storedPlan = namespace.api.getCandidatePlan("IDE-160-PLANNING-TEST-WORKFLOW", "IDE-160-VALID-PLAN");
        check("Frozen Plan read-back", storedPlan && storedPlan.status === "Frozen" && storedPlan.planHash === frozen.data.plan.planHash, storedPlan && storedPlan.planHash, "Persistence");
      } finally {
        internal.importRuntimeState(originalState);
        if (internal.transitionJournal) internal.transitionJournal.splice(0, internal.transitionJournal.length, ...originalJournal);
        state.lastValidation = originalValidation;
        state.lastPersistence = originalPersistence;
        state.lastError = originalError;
        state.updatedAt = originalUpdatedAt;
      }
    });

    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const groups = {};
    checks.forEach(function groupCheck(item) {
      if (!groups[item.group]) groups[item.group] = { passed: 0, failed: 0, total: 0 };
      groups[item.group].total += 1;
      if (item.passed) groups[item.group].passed += 1;
      else groups[item.group].failed += 1;
    });
    return {
      id: internal.nextId("IDE-160-PLANNING-VALIDATION"),
      componentId: namespace.componentId,
      version: VERSION,
      mode: internal.text(options && options.mode, "Phase 2 Workflow Planning"),
      valid: failed === 0,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null,
      status: failed === 0 ? "Passed" : "Failed",
      groups: groups,
      checks: checks,
      warnings: [],
      storageIsolation: true,
      executedAt: internal.nowIso()
    };
  }

  namespace.constants.PLAN_STATUSES = PLAN_STATUSES;
  namespace.constants.DEPENDENCY_TYPES = DEPENDENCY_TYPES;
  namespace.constants.SIDE_EFFECT_TYPES = SIDE_EFFECT_TYPES;
  namespace.constants.PLAN_SELECTION_PRIORITIES = PLAN_SELECTION_PRIORITIES;

  Object.assign(internal, {
    normalizeCandidatePlan: normalizeCandidatePlan,
    validatePlanObject: validatePlanObject,
    buildWorkflowPlanGraph: buildGraph,
    buildWorkflowPlanHashPayload: buildPlanHashPayload,
    isWorkflowMutationTask: isMutationTask
  });

  Object.assign(namespace.api, {
    createCandidatePlan: createCandidatePlan,
    getCandidatePlan: getCandidatePlan,
    listCandidatePlans: listCandidatePlans,
    validateCandidatePlan: validateCandidatePlan,
    compareCandidatePlans: compareCandidatePlans,
    selectActivePlan: selectActivePlan,
    freezeActivePlan: freezeActivePlan,
    verifyWorkflowPlanHash: verifyPlanHash,
    getPlanningPackage: getPlanningPackage,
    createPlanRevision: createPlanRevision,
    validateWorkflowPlanning: validateWorkflowPlanning
  });

  namespace.modules.planning = {
    id: "IDE-160-PLANNING",
    version: VERSION,
    status: "Ready",
    planStatusCount: PLAN_STATUSES.length,
    dependencyTypeCount: DEPENDENCY_TYPES.length,
    maximumCandidatePlans: MAX_CANDIDATE_PLANS,
    loadedAt: internal.nowIso()
  };

  internal.touch();
})(typeof window !== "undefined" ? window : globalThis);