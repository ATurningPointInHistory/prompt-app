/* ============================================================
   FILE: 13_development_automation_guide.js
   IDE-190 Development Automation
   Release: 1.10.0 / Module: Guide 1.0.0
   Post-Release Compatible Feature: UI / Usage Guide
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 Guide blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("guide");

  const GUIDE = internal.deepFreeze({
    guideId: "IDE-190-USAGE-GUIDE",
    guideVersion: MODULE_VERSION,
    componentId: "IDE-190",
    title: "IDE-190 Development Automation 使い方",
    purpose: "安全な開発自動化の状態確認・利用手順・手動反映手順を説明する読み取り専用Guide。",
    quickStart: [
      {
        step: 1,
        title: "IDE-190を開く",
        description: "IDE Launcherから『IDE-190 Development Automation』を開きます。Mobile Consoleから openDevelopmentAutomationConsole() を実行しても開けます。"
      },
      {
        step: 2,
        title: "Safety状態を確認",
        description: "Repository Trust が Trusted、Mutation Lock が false であることを確認します。"
      },
      {
        step: 3,
        title: "開発内容を依頼",
        description: "『このバグをIDE-190で修正して』『この機能をIDE-190で追加して』のように、実施したい開発内容を明示します。UI自体はApproval・Dispatch・Mutationを実行しません。"
      }
    ],
    workflow: [
      { step: 1, stage: "Intake / Ground", title: "根拠を確認", description: "IDE-180 Navigation/Handoffを使い、対象Source・関係・EvidenceをGroundingします。" },
      { step: 2, stage: "Plan", title: "変更計画を作成", description: "対象、目的、Automation/Mutation/Approval Level、Validation条件をPlanとして固定します。" },
      { step: 3, stage: "Propose / Dry Run / Preflight", title: "実行前検証", description: "変更候補をProposal化し、Dry RunとPreflightで実行可能性とSafetyを確認します。" },
      { step: 4, stage: "Gate", title: "必要なApproval", description: "Controlled Mutation TrialではP2 Project Owner Approvalを明示的に取得し、V4 Gateを通過させます。" },
      { step: 5, stage: "Dispatch", title: "IDE-160へDispatch", description: "IDE-190から直接Mutation Engineを呼ばず、IDE-160 Adapter経由でControlled処理へ進みます。" },
      { step: 6, stage: "Verify", title: "Temporary Mutation Trial", description: "IDE-150で一時変更を適用し、Post Validationを実行します。Persistent Commitは行いません。" },
      { step: 7, stage: "V6 / V7", title: "IntegrityとRollback", description: "Repository Integrityを検証し、Mandatory RollbackでSourceを元の内容へ完全復元します。" },
      { step: 8, stage: "V8 / Close", title: "Audit / Receipt", description: "Audit hash chainとAutomation Receiptを残します。Runtime Sessionは永続化しません。" },
      { step: 9, stage: "Reflection", title: "人間が最終反映", description: "必要ファイルだけをReflection Packageへ明示選択し、ZIPを準備して既存の手動反映フローへ渡します。" }
    ],
    reflection: {
      externalEffectLevel: "X1",
      title: "Reflection Packageの使い方",
      steps: [
        "Reflectionタブで反映対象ファイルを1行1ファイルで明示します。",
        "必要ならAutomation Receipt IDを指定し、『Reflection Package準備』を実行します。",
        "Package内容とSHA-256を確認し、ユーザー操作で『ZIPを手動保存』します。",
        "既存のZIP貼付管理 / Diff ZIP管理を開き、手動で最終反映します。"
      ],
      notes: [
        "ファイル選択は自動推測しません。",
        "Package準備だけではDownloadを開始しません。",
        "GitHubへの自動writeは行いません。",
        "Repository Persistent Commitは行いません。"
      ]
    },
    safety: {
      allowed: [
        "Status / Receipt / Safety情報の読み取り",
        "Ground / Plan / Proposal / Dry Run / Preflight",
        "承認済みControlled Runtime処理",
        "P2承認付きTemporary Mutation Trial + Mandatory Rollback",
        "X1 User-Mediated Reflection Preparation"
      ],
      prohibited: [
        "Persistent Repository Commit",
        "GitHub Automatic Reflection",
        "Approval bypass",
        "Direct Repository Mutation from UI",
        "Automatic Workflow Execution",
        "Automatic Repository Repair",
        "Missing Source inference"
      ],
      uiExecutionControlsExposed: false,
      permissionChangesFromDisplayMode: false
    },
    fallbackCommands: [
      { label: "IDE-190 UIを開く", command: "openDevelopmentAutomationConsole()" },
      { label: "IDE-190状態を確認", command: "getDevelopmentAutomationStatus()" }
    ],
    troubleshooting: [
      { symptom: "Repository Trust が Untrusted", action: "Mutationを再実行せず、Recovery / Restoration evidenceを確認します。" },
      { symptom: "Mutation Lock が true", action: "新しいMutationを開始せず、既存処理の終了・Recovery状態を確認します。" },
      { symptom: "Reflection Packageが準備できない", action: "対象ファイル名を明示し、Runtime File Store / Static ManifestにSourceが存在するか確認します。" },
      { symptom: "Androidで表示が違う", action: "表示差は許容されますが、Sensitive PermissionはPC/Webと同一でなければなりません。" }
    ],
    authority: {
      navigation: "IDE-180",
      workflow: "IDE-160",
      controlledMutation: "IDE-150",
      automationOrchestration: "IDE-190"
    },
    readOnly: true,
    executionControlsExposed: false
  });

  function getDevelopmentAutomationGuide() {
    return internal.clone(GUIDE);
  }

  function getDevelopmentAutomationGuideStatus() {
    return {
      componentId: "IDE-190",
      guideId: GUIDE.guideId,
      guideVersion: GUIDE.guideVersion,
      status: "Ready",
      quickStartStepCount: GUIDE.quickStart.length,
      workflowStepCount: GUIDE.workflow.length,
      reflectionExternalEffectLevel: GUIDE.reflection.externalEffectLevel,
      readOnly: true,
      executionControlsExposed: false,
      permissionChangesFromDisplayMode: false
    };
  }

  function initializeDevelopmentAutomationGuide() {
    namespace.modules.guide.status = "Ready";
    return internal.buildResult(true, "IDE190_GUIDE_INITIALIZED", "Ready", getDevelopmentAutomationGuideStatus());
  }

  Object.assign(namespace.api, {
    initializeDevelopmentAutomationGuide: initializeDevelopmentAutomationGuide,
    getDevelopmentAutomationGuide: getDevelopmentAutomationGuide,
    getDevelopmentAutomationGuideStatus: getDevelopmentAutomationGuideStatus
  });
  Object.assign(namespace, namespace.api);
  global.getDevelopmentAutomationGuide = getDevelopmentAutomationGuide;
  global.getDevelopmentAutomationGuideStatus = getDevelopmentAutomationGuideStatus;

  namespace.modules.guide = {
    id: "IDE-190-USAGE-GUIDE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 10,
    postReleaseFeature: true,
    readOnly: true,
    executionControlsExposed: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
