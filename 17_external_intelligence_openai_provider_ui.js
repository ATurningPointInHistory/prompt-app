/* ============================================================
   FILE: 17_external_intelligence_openai_provider_ui.js
   EXTERNAL-010 / OpenAI API Integration UI Candidate
   Decisions: EXTERNAL-010-DECISION-055 / 056
   Scope: Cost / Risk aware configuration UI (no secret value input)
   ============================================================ */
(function (global) {
  "use strict";
  const n = global.EXTERNAL010ExternalIntelligence;
  const m = global.EXTERNAL010VersionManifest;
  if (!n || !n.__internal || !m) return;
  const i = n.__internal;
  const STORAGE_KEY = "EXTERNAL010_OPENAI_UI_DRAFT_V1";
  function defaultSecretReferenceId() {
    const p=typeof n.getOpenAIProviderIntegrationProfile==="function"?n.getOpenAIProviderIntegrationProfile():null;
    return p&&p.defaultSecretReferenceId||"SECRET-OPENAI-LEGACY";
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function money(value) { const n=Number(value); return Number.isFinite(n) ? "$"+n.toFixed(n < 1 ? 4 : 2) : "—"; }
  function readDraft() {
    const empty={model:"",maxOutputTokens:"",perRequestHardCapUsd:"",budgetId:"",budgetCandidateId:"",budgetSoftLimitUsd:"",budgetHardLimitUsd:"",usagePolicyCandidateId:"",secretReferenceId:defaultSecretReferenceId()};
    try { const raw=global.localStorage && global.localStorage.getItem(STORAGE_KEY); if(!raw)return empty; return Object.assign(empty,JSON.parse(raw)||{}); } catch(_){ return empty; }
  }
  function writeDraft(draft) {
    try { if(global.localStorage)global.localStorage.setItem(STORAGE_KEY,JSON.stringify(draft)); return true; } catch(_){ return false; }
  }
  function source() { return typeof n.getExternalIntelligenceSource==="function" ? n.getExternalIntelligenceSource("SOURCE-OPENAI") : null; }
  function operationContract() { return typeof n.getExternalIntelligenceSourceOperationContract==="function" ? n.getExternalIntelligenceSourceOperationContract("SOURCE-OPENAI","INTERNAL_ANALYSIS") : null; }
  function budgets() { return typeof n.listExternalIntelligenceResourceBudgets==="function" ? n.listExternalIntelligenceResourceBudgets().filter(b=>b&&b.state==="ACTIVE"&&String(b.currency||"").toUpperCase()==="USD"&&b.limits&&b.limits.FINANCIAL_COST) : []; }
  function secretMetadata(id) { return id&&typeof n.getExternalIntelligenceSecretMetadata==="function" ? n.getExternalIntelligenceSecretMetadata(id) : null; }
  function secretState(id) { if(!id||typeof n.validateExternalIntelligenceSecretReference!=="function")return null; return n.validateExternalIntelligenceSecretReference({secretReferenceId:id}); }
  function secretReferenceIds() {
    const values=["SECRET-OPENAI-LEGACY","SECRET-OPENAI-PRIMARY"]; const def=defaultSecretReferenceId(); if(def)values.push(def);
    if(typeof n.listExternalIntelligenceSecretMetadata==="function") n.listExternalIntelligenceSecretMetadata().forEach(function(m){
      if(!m||!m.secretReferenceId)return; const provider=String(m.provider||"").toUpperCase(); const type=String(m.secretType||"").toUpperCase();
      if((!provider||provider==="OPENAI"||provider==="LOCAL_GATEWAY")&&(type==="BEARER_TOKEN"||type==="API_KEY"||type==="CUSTOM_SECRET")) values.push(m.secretReferenceId);
    });
    return Array.from(new Set(values));
  }
  function budgetSnapshot(id) {
    const b=budgets().find(x=>x.budgetId===id); if(!b)return null;
    const lim=b.limits.FINANCIAL_COST||{}; return {budgetId:b.budgetId,currency:b.currency,consumed:Number(b.consumed&&b.consumed.FINANCIAL_COST||0),softLimit:lim.softLimit==null?null:Number(lim.softLimit),hardLimit:lim.hardLimit==null?null:Number(lim.hardLimit),period:i.clone(b.period||{})};
  }
  function budgetRecord(id) { return id&&typeof n.getExternalIntelligenceResourceBudget==="function" ? n.getExternalIntelligenceResourceBudget(id) : null; }
  function budgetRecordSnapshot(id) {
    const b=budgetRecord(id); if(!b||!b.limits||!b.limits.FINANCIAL_COST)return null;
    const lim=b.limits.FINANCIAL_COST; return {budgetId:b.budgetId,state:b.state,currency:b.currency,consumed:Number(b.consumed&&b.consumed.FINANCIAL_COST||0),softLimit:lim.softLimit==null?null:Number(lim.softLimit),hardLimit:lim.hardLimit==null?null:Number(lim.hardLimit),period:i.clone(b.period||{})};
  }
  function getOpenAIProviderUiSnapshot() {
    const src=source(), op=operationContract(), draft=readDraft(), profiles=typeof n.listOpenAIModelPricingProfiles==="function"?n.listOpenAIModelPricingProfiles():[], activation=src&&src.paidActivationPolicy||null;
    const selectedBudget=draft.budgetId||activation&&activation.budgetIds&&activation.budgetIds[0]||"";
    const selectedSecretReferenceId=src&&src.secretReferenceId||draft.secretReferenceId||defaultSecretReferenceId();
    const metadata=secretMetadata(selectedSecretReferenceId), secret=metadata?secretState(selectedSecretReferenceId):null;
    const b=budgetSnapshot(selectedBudget);
    const pendingBudget=budgetRecordSnapshot(draft.budgetCandidateId||"");
    const activeUsagePolicy=typeof n.getActiveExternalIntelligenceUsagePolicyForSource==="function"?n.getActiveExternalIntelligenceUsagePolicyForSource("SOURCE-OPENAI"):null;
    const pendingUsagePolicy=draft.usagePolicyCandidateId&&typeof n.getExternalIntelligenceUsagePolicy==="function"?n.getExternalIntelligenceUsagePolicy(draft.usagePolicyCandidateId):null;
    const realApiTestValidation=typeof n.getOpenAIRealApiTestValidation==="function"?n.getOpenAIRealApiTestValidation():(src&&src.realApiTestValidation||null);
    let level="YELLOW",label="準備中",reason="Provider / Secret Reference / Budget / Authority の設定を確認してください。";
    if(src&&src.lifecycleState==="ACTIVE"&&secret&&secret.ok===true&&b){level="GREEN";label="通常利用範囲";reason="承認済み範囲内は毎回の人間承認なしで利用できます。";}
    if(src&&src.lifecycleState==="ACTIVE"&&(!secret||!secret.ok||!b)){level="RED";label="実行停止推奨";reason="Active Sourceに必要なSecretまたはUSD Budgetが確認できません。";}
    const gatewayClientState=typeof n.getExternalIntelligenceGatewayClientState==="function"?n.getExternalIntelligenceGatewayClientState():null;
    return {source:src,operationContract:op,draft,profiles,activeUsdBudgets:budgets(),selectedBudget:b,pendingBudgetCandidate:pendingBudget,activeUsagePolicy:activeUsagePolicy,pendingUsagePolicyCandidate:pendingUsagePolicy,realApiTestValidation:realApiTestValidation,secret:secret,secretMetadata:metadata,selectedSecretReferenceId:selectedSecretReferenceId,secretReferenceIds:secretReferenceIds(),risk:{level,label,reason},activation:activation,gatewayClientState:gatewayClientState,externalTransmission:"TEXT_TO_OPENAI",toolsEnabled:false,streamingEnabled:false,backgroundEnabled:false,secretValueInputAllowed:false,capturedAt:i.nowIso()};
  }
  function modelOptions(snapshot) {
    return '<option value="">モデルを選択</option>'+snapshot.profiles.map(function(p){const selected=snapshot.draft.model===p.model?' selected':'';return '<option value="'+esc(p.model)+'"'+selected+'>'+esc(p.model)+' — 入力 '+esc(money(p.inputPerMTokUsd))+'/MTok / 出力 '+esc(money(p.outputPerMTokUsd))+'/MTok</option>';}).join('');
  }
  function budgetOptions(snapshot) {
    return '<option value="">USD Budgetを選択</option>'+snapshot.activeUsdBudgets.map(function(b){const selected=snapshot.draft.budgetId===b.budgetId?' selected':'';const lim=b.limits&&b.limits.FINANCIAL_COST||{};return '<option value="'+esc(b.budgetId)+'"'+selected+'>'+esc(b.budgetId)+' — '+esc(money(b.consumed&&b.consumed.FINANCIAL_COST||0))+' / '+esc(money(lim.hardLimit))+'</option>';}).join('');
  }
  function secretReferenceOptions(snapshot) {
    return snapshot.secretReferenceIds.map(function(id){const selected=snapshot.selectedSecretReferenceId===id?' selected':'';const m=secretMetadata(id);const status=m?String(m.status||'REGISTERED'):'Metadata未登録';return '<option value="'+esc(id)+'"'+selected+'>'+esc(id)+' — '+esc(status)+'</option>';}).join('');
  }
  function gatewayRuntimeReady(snapshot) {
    const g=snapshot&&snapshot.gatewayClientState||null;
    const s=g&&g.session||null;
    if(!g||String(g.healthState||"").toUpperCase()!=="READY"||!s||String(s.state||"").toUpperCase()!=="ACTIVE") return false;
    if(s.expiresAt){const t=Date.parse(s.expiresAt);if(Number.isFinite(t)&&Date.now()>=t)return false;}
    return g.sessionTokenPresentInMemory===true;
  }
  function getOpenAISetupWorkflowState(input) {
    const x=input&&input.source!==undefined?input:getOpenAIProviderUiSnapshot();
    const runtimeComplete=gatewayRuntimeReady(x);
    const sourceComplete=Boolean(x.source&&x.source.sourceId);
    const operationComplete=Boolean(x.operationContract);
    const budgetComplete=Boolean(x.selectedBudget);
    const usagePolicyComplete=Boolean(x.activeUsagePolicy&&x.activeUsagePolicy.status==="ACTIVE");
    const paidActivationComplete=Boolean(x.source&&x.source.lifecycleState==="ACTIVE"&&x.source.enabled===true&&x.activation);
    const realApiTestComplete=Boolean(x.realApiTestValidation&&x.realApiTestValidation.passed===true);
    let currentStep=1,nextAction="Gateway Sessionを開始してください";
    if(runtimeComplete){currentStep=2;nextAction="OpenAI設定 / Secret / Source登録";}
    if(runtimeComplete&&sourceComplete){currentStep=3;nextAction="Operation Contract登録";}
    if(runtimeComplete&&sourceComplete&&operationComplete){currentStep=4;nextAction="USD Resource Budget";}
    if(runtimeComplete&&sourceComplete&&operationComplete&&budgetComplete){currentStep=5;nextAction="Usage Policy";}
    if(runtimeComplete&&sourceComplete&&operationComplete&&budgetComplete&&usagePolicyComplete){currentStep=6;nextAction="Paid Source Activation";}
    if(runtimeComplete&&sourceComplete&&operationComplete&&budgetComplete&&usagePolicyComplete&&paidActivationComplete){currentStep=7;nextAction="Real API Test";}
    if(runtimeComplete&&sourceComplete&&operationComplete&&budgetComplete&&usagePolicyComplete&&paidActivationComplete&&realApiTestComplete){currentStep=8;nextAction="Final Validation";}
    const completed={1:runtimeComplete,2:sourceComplete,3:operationComplete,4:budgetComplete,5:usagePolicyComplete,6:paidActivationComplete,7:realApiTestComplete,8:false};
    return {currentStep:currentStep,nextAction:nextAction,runtimeComplete:runtimeComplete,completed:completed,paidActivationComplete:paidActivationComplete,realApiTestComplete:realApiTestComplete,steps:[
      {step:1,label:"Runtime",complete:runtimeComplete},
      {step:2,label:"Provider / Secret",complete:sourceComplete},
      {step:3,label:"Operation",complete:operationComplete},
      {step:4,label:"USD Budget",complete:budgetComplete},
      {step:5,label:"Usage Policy",complete:usagePolicyComplete},
      {step:6,label:"Paid Activation",complete:paidActivationComplete},
      {step:7,label:"Real API Test",complete:realApiTestComplete},
      {step:8,label:"Final Validation",complete:false}
    ]};
  }
  function workflowChip(step,workflow) {
    const done=workflow.completed[step]===true;
    const current=workflow.currentStep===step;
    const state=done?"✅":current?"▶":"🔒";
    const item=workflow.steps.find(function(v){return v.step===step;});
    return '<div style="padding:7px 8px;border:1px solid var(--border);border-radius:9px;min-width:0;font-size:10px;line-height:1.35;'+(current?'outline:1px solid currentColor;':'')+'"><strong style="display:block;font-size:11px">'+state+' '+step+'. '+esc(item&&item.label||'')+'</strong><span style="opacity:.7">'+(done?'完了':current?'現在':'待機')+'</span></div>';
  }
  function workflowDetails(step,title,complete,current,body) {
    const open=current?' open':'';
    const icon=complete?'✅':current?'▶':'○';
    return '<details class="openai-config-details"'+open+'><summary>'+icon+' STEP '+step+' · '+esc(title)+(complete?' · 完了':current?' · 現在':'')+'</summary>'+body+'</details>';
  }
  function renderOpenAIProviderIntegrationPanelHtml() {
    const x=getOpenAIProviderUiSnapshot(), src=x.source||{}, op=x.operationContract||null, b=x.selectedBudget, activation=x.activation||{};
    const cap=x.draft.perRequestHardCapUsd||activation.perRequestHardCapUsd||"";
    const model=x.draft.model||"未選択";
    const max=x.draft.maxOutputTokens||"未設定";
    const w=getOpenAISetupWorkflowState(x);
    const runtime=x.gatewayClientState||{};
    const session=runtime.session||null;
    const consoleSnapshot=typeof n.getExternalIntelligenceConsoleSnapshot==="function"?n.getExternalIntelligenceConsoleSnapshot():null;
    const step1Body='<div class="external-boundary-grid"><div>Foundation<strong>'+(consoleSnapshot&&consoleSnapshot.foundationInitialized?'READY':'NOT READY')+'</strong></div><div>Gateway<strong>'+esc(runtime.healthState||'UNKNOWN')+'</strong></div><div>Session<strong>'+esc(session&&session.state||'INACTIVE')+'</strong></div><div>Token<strong>'+(runtime.sessionTokenPresentInMemory?'MEMORY':'NONE')+'</strong></div></div><div class="external-actions openai-actions"><button onclick="externalConsoleInitialize()">① Foundation初期化</button><button onclick="externalConsoleCheckGateway()">② Gateway確認</button><button onclick="externalConsoleOpenSession()">③ Gateway Session開始</button></div><div class="external-note">STEP 1内で①→②→③の順に実行します。SessionがACTIVEになるとSTEP 1は自動的に畳まれ、STEP 2が開きます。</div>';
    const step2Body='<div class="openai-form-grid">'+
        '<label>Secret Reference<select id="externalOpenAISecretReference">'+secretReferenceOptions(x)+'</select><small>APIキー本体ではなくGateway用の参照IDです。LauncherのAPI / Secret ManagerでLEGACY / PRIMARYを管理します。</small></label>'+ 
        '<label>モデル<select id="externalOpenAIModel">'+modelOptions(x)+'</select><small>モデル変更は料金と性能に影響します。</small></label>'+ 
        '<label>max_output_tokens<input id="externalOpenAIMaxOutput" type="number" min="1" max="128000" step="1" value="'+esc(x.draft.maxOutputTokens)+'" placeholder="例: 8000"><small>上げるほど1回の最大料金が増えます。</small></label>'+ 
        '<label>1回の最大許可額（USD）<input id="externalOpenAIPerRequestCap" type="number" min="0.000001" step="0.001" value="'+esc(x.draft.perRequestHardCapUsd)+'" placeholder="例: 0.10"><small>この値を超えるRequestは送信前に停止します。</small></label>'+ 
        '<label>利用Budget<select id="externalOpenAIBudget">'+budgetOptions(x)+'</select><small>USDのActive Budgetのみ表示します。</small></label>'+ 
      '</div><div class="external-actions openai-actions">'+
        '<button class="btn-secondary" onclick="externalOpenAIPreviewConfiguration()">変更の影響を確認</button>'+ 
        '<button class="btn-secondary" onclick="externalOpenAISaveDraft()">設定候補を保存</button>'+ 
        '<button class="btn-secondary" onclick="externalOpenAIPrepareSecretReference()">Secret準備確認</button>'+ 
        '<button class="btn-secondary" onclick="externalOpenAIShowProviderCandidates()">Provider候補を確認</button>'+ 
      '</div><div class="external-actions openai-actions">'+
        '<button class="btn-secondary" onclick="externalOpenAIReviewSourceRegistration()">Source登録内容を確認</button>'+ 
        '<button class="btn-primary" onclick="externalOpenAIApproveSourceRegistration(event)"'+(src&&src.sourceId?' disabled':'')+'>Project OwnerとしてSource登録</button>'+ 
      '</div><div class="external-note">STEP 2の完了条件は SOURCE-OPENAI の登録です。Paid API有効化・Budget変更・Operation登録・実API通信はまだ行いません。</div>';
    const step3Body='<div class="external-boundary-grid"><div>Source<strong>'+esc(src.sourceId||'未登録')+'</strong></div><div>Operation<strong>'+esc(op?'REGISTERED':'未登録')+'</strong></div><div>Method<strong>POST JSON</strong></div><div>store<strong>false固定</strong></div></div><div class="external-actions openai-actions"><button class="btn-secondary" onclick="externalOpenAIReviewOperationContractRegistration()"'+(!src||!src.sourceId?' disabled':'')+'>Operation登録内容を確認</button><button class="btn-primary" onclick="externalOpenAIApproveOperationContractRegistration(event)"'+(!src||!src.sourceId||op?' disabled':'')+'>Project OwnerとしてOperation登録</button></div><div class="external-note">STEP 3はResponses APIのOperation Contract登録のみです。Source有効化・Paid API・Budget・実通信は行いません。</div>';
    const step4Body='<div class="external-boundary-grid"><div>選択Budget<strong>'+esc(b?b.budgetId:'未選択')+'</strong></div><div>使用額<strong>'+esc(b?money(b.consumed):'—')+'</strong></div><div>Hard Limit<strong>'+esc(b?money(b.hardLimit):'—')+'</strong></div><div>1回Hard Cap（STEP 2で変更）<strong>'+esc(cap?money(cap):'未設定')+'</strong></div><div>Budget Candidate<strong>'+esc(x.pendingBudgetCandidate?x.pendingBudgetCandidate.budgetId:'未作成')+'</strong></div><div>Candidate State<strong>'+esc(x.pendingBudgetCandidate?x.pendingBudgetCandidate.state:'—')+'</strong></div></div><div class="openai-form-grid"><label>警告ライン（USD）<input id="externalOpenAIBudgetSoftLimit" type="number" min="0" step="0.01" value="'+esc(x.draft.budgetSoftLimitUsd)+'" placeholder="空欄ならHard Limitの80%"><small>警告用です。Hard Limitまでは自動停止しません。</small></label><label>Budget Hard Limit（USD）<input id="externalOpenAIBudgetHardLimit" type="number" min="0.01" step="0.01" value="'+esc(x.draft.budgetHardLimitUsd)+'" placeholder="例: 5.00"><small>累積FINANCIAL_COST上限です。自動増額・自動チャージは行いません。</small></label></div><div class="external-actions openai-actions"><button class="btn-secondary" onclick="externalOpenAIReviewUsdBudget()"'+(!op?' disabled':'')+'>Budget内容を確認</button><button class="btn-secondary" onclick="externalOpenAICreateUsdBudgetCandidate()"'+(!op?' disabled':'')+'>Budget候補を作成</button><button class="btn-primary" onclick="externalOpenAIApproveUsdBudget(event)"'+(!x.pendingBudgetCandidate||x.pendingBudgetCandidate.state!=="CANDIDATE"?' disabled':'')+'>Project OwnerとしてBudget有効化</button></div><div class="external-note">STEP 4はUSDのFINANCIAL_COST境界のみを承認します。Current Allocationで、自動月次リセット・自動チャージはまだ行いません。</div>';
    const step5Body='<div class="external-boundary-grid"><div>Operation<strong>INTERNAL_ANALYSIS</strong></div><div>Active Policy<strong>'+esc(x.activeUsagePolicy?x.activeUsagePolicy.usagePolicyId:'未設定')+'</strong></div><div>Candidate<strong>'+esc(x.pendingUsagePolicyCandidate?x.pendingUsagePolicyCandidate.usagePolicyId:'未作成')+'</strong></div><div>Legal Authority<strong>NO</strong></div></div><div class="external-actions openai-actions"><button class="btn-secondary" onclick="externalOpenAIReviewUsagePolicy()"'+(!b||!op?' disabled':'')+'>Usage Policy内容を確認</button><button class="btn-secondary" onclick="externalOpenAICreateUsagePolicyCandidate()"'+(!b||!op||x.activeUsagePolicy?' disabled':'')+'>Usage Policy候補を作成</button><button class="btn-primary" onclick="externalOpenAIApproveUsagePolicy(event)"'+(!x.pendingUsagePolicyCandidate||!["CANDIDATE","REVIEW_REQUIRED"].includes(x.pendingUsagePolicyCandidate.status)||x.activeUsagePolicy?' disabled':'')+'>Project OwnerとしてUsage Policy有効化</button></div><div class="external-note">STEP 5はProject OwnerがINTERNAL_ANALYSIS用途を承認するPlatform Policyです。OpenAI規約を法的許可と断定せず、legalAuthorityGranted=falseを維持します。</div>';
    const step6Body='<div class="external-boundary-grid"><div>Provider<strong>'+esc(src.lifecycleState||'未登録')+'</strong></div><div>Credential<strong>'+esc(x.selectedSecretReferenceId||'未選択')+'</strong></div><div>Operation<strong>'+esc(op?'REGISTERED':'未登録')+'</strong></div><div>Budget<strong>'+esc(b?'ACTIVE':'未設定')+'</strong></div><div>Usage Policy<strong>'+esc(x.activeUsagePolicy?'ACTIVE':'未設定')+'</strong></div><div>1回Hard Cap<strong>'+esc(cap?money(cap):'未設定')+'</strong></div></div><div class="external-actions openai-actions"><button class="btn-secondary" onclick="externalOpenAIReviewPaidActivation()"'+(!op||!b||!x.activeUsagePolicy?' disabled':'')+'>Paid Activation内容を確認</button><button class="btn-primary" onclick="externalOpenAIApprovePaidActivation(event)"'+(!op||!b||!x.activeUsagePolicy||w.completed[6]?' disabled':'')+'>Project OwnerとしてPaid Source有効化</button></div><div class="external-note">STEP 6は登録済みOpenAI Sourceを承認済みBudget / Usage Policy / 1回Hard Capの範囲で有料実行可能にします。汎用 ACTIVATE_PAID_API Hard Denyは維持し、実OpenAI Request自体はまだ送信しません。承認済み範囲内では毎Requestの人間承認は行いません。</div>';
    const realTest=x.realApiTestValidation||null;
    const step7Body='<div class="external-boundary-grid"><div>Provider<strong>'+esc(w.completed[6]?'ACTIVE':'未有効化')+'</strong></div><div>Budget<strong>'+esc(b?money(b.consumed)+' / '+money(b.hardLimit):'未設定')+'</strong></div><div>1回Hard Cap<strong>'+esc(cap?money(cap):'未設定')+'</strong></div><div>実API Request<strong>'+esc(realTest&&realTest.passed?'PASS':'未実行')+'</strong></div><div>Test Input<strong>固定短文のみ</strong></div><div>store<strong>false</strong></div></div><div class="external-actions openai-actions"><button class="btn-secondary" onclick="externalOpenAIReviewRealApiTest()"'+(!w.completed[6]||w.completed[7]?' disabled':'')+'>Real API Test内容を確認</button><button class="btn-primary" onclick="externalOpenAIApproveRealApiTest(event)"'+(!w.completed[6]||w.completed[7]?' disabled':'')+'>Project Ownerとして1回テスト送信</button></div><div class="external-note">STEP 7は固定文字列「Reply exactly with: OK」だけをOpenAIへ送る初回実通信テストです。Projectや会話本文は送信しません。store=false、Tools/Streaming OFF、最大1回、送信前Cost Preflight、Budget/1回Hard Cap確認を行い、usage取得と実コスト照合までPASSした場合だけ完了します。</div>';
    let workflowHtml=workflowDetails(1,'Runtime',w.completed[1],w.currentStep===1,step1Body);
    if(w.runtimeComplete) workflowHtml+=workflowDetails(2,'Provider / Secret',w.completed[2],w.currentStep===2,step2Body);
    if(w.currentStep>=3) workflowHtml+=workflowDetails(3,'Operation Contract',w.completed[3],w.currentStep===3,step3Body);
    if(w.currentStep>=4) workflowHtml+=workflowDetails(4,'USD Resource Budget',w.completed[4],w.currentStep===4,step4Body);
    if(w.currentStep>=5) workflowHtml+=workflowDetails(5,'Usage Policy',w.completed[5],w.currentStep===5,step5Body);
    if(w.currentStep>=6) workflowHtml+=workflowDetails(6,'Paid Source Activation',w.completed[6],w.currentStep===6,step6Body);
    if(w.currentStep>=7) workflowHtml+=workflowDetails(7,'Real API Test',w.completed[7],w.currentStep===7,step7Body);
    if(w.currentStep>=8) workflowHtml+=workflowDetails(8,'Final Validation',false,w.currentStep===8,'<div class="external-note">Real API TestはPASSしました。次はPC/Androidを含むFinal Validation / Release Gateです。このv0.3.8 CandidateではまだFinal Gateを自動実行しません。</div>');
    return '<section class="external-section openai-config-section">'+
      '<div class="external-section-head"><h4>OpenAI API</h4><span class="openai-risk openai-risk-'+esc(x.risk.level.toLowerCase())+'">'+esc(x.risk.level)+' · '+esc(x.risk.label)+'</span></div>'+ 
      '<div class="external-help">'+esc(x.risk.reason)+' APIキー本体はこの画面に入力しません。Gateway側のSecret Referenceだけを使用します。</div>'+ 
      '<div class="external-note" style="font-size:12px"><strong>NEXT ACTION · STEP '+w.currentStep+'</strong><br>'+esc(w.nextAction)+'</div>'+ 
      '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:10px">'+w.steps.map(function(s){return workflowChip(s.step,w);}).join('')+'</div>'+ 
      '<div class="openai-summary-grid">'+
        '<div><span>Provider</span><strong>'+esc(src.lifecycleState||'未登録')+'</strong></div>'+ 
        '<div><span>Operation</span><strong>'+esc(op?'REGISTERED':'未登録')+'</strong></div>'+ 
        '<div><span>Secret Reference</span><strong>'+esc(x.selectedSecretReferenceId)+' / '+esc(x.secretMetadata?x.secretMetadata.status:'未準備')+'</strong></div>'+ 
        '<div><span>現在モデル</span><strong>'+esc(model)+'</strong></div>'+ 
        '<div><span>1回上限</span><strong>'+esc(cap?money(cap):'未設定')+'</strong></div>'+ 
        '<div><span>USD Budget</span><strong>'+esc(b?money(b.consumed)+' / '+money(b.hardLimit):'未選択')+'</strong></div>'+ 
        '<div><span>Usage Policy</span><strong>'+esc(x.activeUsagePolicy?'ACTIVE':x.pendingUsagePolicyCandidate?x.pendingUsagePolicyCandidate.status:'未設定')+'</strong></div>'+ 
        '<div><span>外部送信</span><strong>Text only</strong></div>'+ 
        '<div><span>Tools / Stream</span><strong>OFF / OFF</strong></div>'+ 
      '</div>'+workflowHtml+
      '<details class="openai-config-details"><summary>詳細設定</summary><div class="external-boundary-grid"><div>Endpoint<strong>/v1/responses</strong></div><div>Method<strong>POST JSON</strong></div><div>Retry<strong>最大1回</strong></div><div>Max Output<strong>'+esc(max)+'</strong></div></div><div class="external-note">初期ScopeではStreaming / Background / Tools / Files / Web Search / Computer Useは無効です。</div></details>'+ 
      '<details class="openai-config-details"><summary>安全・権限</summary><div class="external-boundary-grid"><div>store<strong>常に false</strong></div><div>Secret Value入力<strong>禁止</strong></div><div>Paid自動有効化<strong>禁止</strong></div><div>Budget自動増額<strong>禁止</strong></div></div><div class="external-note">予算拡大・新Capability・Authority拡大は承認境界です。承認済み範囲内の通常Requestでは毎回確認を出しません。</div></details>'+ 
      '<details class="openai-config-details"><summary>実行詳細 / JSON</summary><pre id="externalOpenAIImpact" class="external-output" style="min-height:80px;max-height:260px">実行結果の詳細はここに表示します。通常操作では閉じたままで構いません。</pre></details>'+ 
    '</section>';
  }

  function currentForm() {
    const get=id=>global.document&&global.document.getElementById(id);
    return {model:get('externalOpenAIModel')&&get('externalOpenAIModel').value||'',maxOutputTokens:get('externalOpenAIMaxOutput')&&get('externalOpenAIMaxOutput').value||'',perRequestHardCapUsd:get('externalOpenAIPerRequestCap')&&get('externalOpenAIPerRequestCap').value||'',budgetId:get('externalOpenAIBudget')&&get('externalOpenAIBudget').value||'',budgetCandidateId:readDraft().budgetCandidateId||'',budgetSoftLimitUsd:get('externalOpenAIBudgetSoftLimit')&&get('externalOpenAIBudgetSoftLimit').value||readDraft().budgetSoftLimitUsd||'',budgetHardLimitUsd:get('externalOpenAIBudgetHardLimit')&&get('externalOpenAIBudgetHardLimit').value||readDraft().budgetHardLimitUsd||'',usagePolicyCandidateId:readDraft().usagePolicyCandidateId||'',secretReferenceId:get('externalOpenAISecretReference')&&get('externalOpenAISecretReference').value||readDraft().secretReferenceId||defaultSecretReferenceId()};
  }
  function compareRisk(before,after) {
    const reasons=[];let level="GREEN";
    const bp=typeof n.getOpenAIModelPricingProfile==="function"?n.getOpenAIModelPricingProfile(before.model):null, ap=typeof n.getOpenAIModelPricingProfile==="function"?n.getOpenAIModelPricingProfile(after.model):null;
    if(bp&&ap&&(ap.outputPerMTokUsd>bp.outputPerMTokUsd||ap.inputPerMTokUsd>bp.inputPerMTokUsd)){level="YELLOW";reasons.push("より高い単価のモデルへ変更");}
    const oldCap=Number(before.perRequestHardCapUsd||0),newCap=Number(after.perRequestHardCapUsd||0);
    if(newCap>oldCap&&oldCap>0){level=newCap>=oldCap*4?"RED":"YELLOW";reasons.push("1回上限 "+money(oldCap)+" → "+money(newCap)+(newCap>=oldCap*4?"（4倍以上）":""));}
    const oldOut=Number(before.maxOutputTokens||0),newOut=Number(after.maxOutputTokens||0); if(newOut>oldOut&&oldOut>0){if(level!=="RED")level="YELLOW";reasons.push("最大出力Tokens増加 "+oldOut+" → "+newOut);}
    if(before.budgetId&&after.budgetId&&before.budgetId!==after.budgetId){if(level!=="RED")level="YELLOW";reasons.push("Budget変更");}
    if(before.secretReferenceId&&after.secretReferenceId&&before.secretReferenceId!==after.secretReferenceId){if(level!=="RED")level="YELLOW";reasons.push("Secret Reference変更");}
    if(!reasons.length)reasons.push("費用・権限境界の拡大は検出されませんでした");
    return {level,reasons};
  }
  function setImpact(value) { const e=global.document&&global.document.getElementById('externalOpenAIImpact'); if(e)e.textContent=typeof value==='string'?value:JSON.stringify(value,null,2); }
  function externalOpenAIPreviewConfiguration() {
    const before=readDraft(),after=currentForm(),impact=compareRisk(before,after),p=typeof n.getOpenAIModelPricingProfile==="function"?n.getOpenAIModelPricingProfile(after.model):null;
    const outputOnly=p&&Number(after.maxOutputTokens)>0 ? Number(after.maxOutputTokens)/1000000*p.outputPerMTokUsd : null;
    const result={riskLevel:impact.level,reasons:impact.reasons,before,after,modelPricing:p,outputOnlyMaximumCostUsd:outputOnly==null?null:Math.round(outputOnly*1e8)/1e8,note:"実Requestでは入力Tokensも含め、送信前にFINANCIAL_COSTを再計算します。"};
    setImpact(result);return result;
  }
  function externalOpenAISaveDraft() {
    const before=readDraft(),after=currentForm(),impact=compareRisk(before,after);
    if(impact.level==="RED") { setImpact({saved:false,riskLevel:"RED",message:"大幅な費用境界の拡大を検出しました。ここでは自動保存しません。変更内容を確認し、Authority/Budget側で承認してください。",before,after,reasons:impact.reasons}); return false; }
    const ok=writeDraft(after);
    const result={saved:ok,riskLevel:impact.level,before,after,reasons:impact.reasons,paidActivationPerformed:false,budgetMutationPerformed:false};
    if(ok&&typeof global.externalConsoleRefresh==="function") global.externalConsoleRefresh();
    setImpact(result);
    return ok;
  }
  async function externalOpenAIPrepareSecretReference() {
    const draft=currentForm();
    const src=source();
    const secretReferenceId=src&&src.secretReferenceId||draft.secretReferenceId||defaultSecretReferenceId();
    if(!secretReferenceId){const result={ok:false,code:"EXTERNAL010_OPENAI_SECRET_REFERENCE_REQUIRED",secretValueRequested:false};setImpact(result);return result;}
    if(typeof n.getExternalIntelligenceGatewaySecretMetadataStatus!=="function"){const result={ok:false,code:"EXTERNAL010_GATEWAY_SECRET_STATUS_UNAVAILABLE",secretReferenceId,secretValueRequested:false};setImpact(result);return result;}
    const gatewayStatus=await n.getExternalIntelligenceGatewaySecretMetadataStatus({secretReferenceId:secretReferenceId,secretType:"BEARER_TOKEN"});
    if(!gatewayStatus||gatewayStatus.ok!==true){const result={ok:false,code:gatewayStatus&&gatewayStatus.code||"EXTERNAL010_OPENAI_GATEWAY_SECRET_NOT_READY",secretReferenceId,gatewayStatus:gatewayStatus||null,metadataRegistrationPerformed:false,secretValueRequested:false,nextRequiredAction:"SET_GATEWAY_SECRET_ENVIRONMENT_AND_RESTART_GATEWAY"};setImpact(result);if(typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();return result;}
    if(typeof n.registerExternalIntelligenceSecretMetadata!=="function"){const result={ok:false,code:"EXTERNAL010_SECRET_METADATA_REGISTRY_UNAVAILABLE",secretReferenceId,gatewayStatus,metadataRegistrationPerformed:false,secretValueRequested:false};setImpact(result);return result;}
    const registered=n.registerExternalIntelligenceSecretMetadata({secretReferenceId:secretReferenceId,secretType:"BEARER_TOKEN",provider:"OPENAI",status:"ACTIVE"});
    const registeredOk=Boolean(registered&&registered.ok===true);
    if(registeredOk){
      const persistedDraft=readDraft();
      persistedDraft.secretReferenceId=secretReferenceId;
      writeDraft(persistedDraft);
    }
    const result={ok:registeredOk,code:registered&&registered.code||"EXTERNAL010_OPENAI_SECRET_METADATA_REGISTRATION_FAILED",secretReferenceId,gatewayStatus,metadata:registered&&registered.data&&registered.data.secretMetadata||null,metadataRegistrationPerformed:registeredOk,secretSelectionPersisted:registeredOk,secretValueStored:false,secretValueRequested:false,nextRequiredAction:registeredOk?"SOURCE_REGISTRATION_AUTHORITY":"REVIEW_SECRET_METADATA_REGISTRATION"};
    if(typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();
    setImpact(result);
    return result;
  }


  function externalOpenAIReviewSourceRegistration() {
    const draft=currentForm();
    const existing=source();
    const candidate=typeof n.buildOpenAIProviderSourceRegistration==="function"?n.buildOpenAIProviderSourceRegistration({secretReferenceId:draft.secretReferenceId}):{ok:false,code:"OPENAI_PROVIDER_MODULE_UNAVAILABLE"};
    const ready=Boolean(!existing&&candidate&&candidate.ok===true&&candidate.data&&candidate.data.sourceRegistrationReady===true);
    const result={
      ok:ready,
      code:existing?"EXTERNAL010_OPENAI_SOURCE_ALREADY_REGISTERED":ready?"EXTERNAL010_OPENAI_SOURCE_REGISTRATION_REVIEW_READY":"EXTERNAL010_OPENAI_SOURCE_REGISTRATION_NOT_READY",
      sourceCandidate:candidate&&candidate.data&&candidate.data.sourceCandidate||null,
      secretReference:candidate&&candidate.data&&candidate.data.secretReference||null,
      authority:{action:"REGISTER_EXTERNAL_SOURCE",target:{type:"source",id:"SOURCE-OPENAI"},purpose:"openai-provider-registration",oneTime:true},
      effects:{sourceRegistration:true,operationContractRegistration:false,paidActivation:false,budgetMutation:false,realApiRequest:false},
      projectOwnerApprovalRequired:!existing
    };
    setImpact(result);return result;
  }

  async function externalOpenAIApproveSourceRegistration(event) {
    if(!event||event.isTrusted!==true){const blocked={ok:false,code:"EXTERNAL010_TRUSTED_PROJECT_OWNER_UI_INTERACTION_REQUIRED",registrationPerformed:false,paidActivationPerformed:false};setImpact(blocked);return blocked;}
    const review=externalOpenAIReviewSourceRegistration();
    if(!review.ok){setImpact(review);return review;}
    const c=review.sourceCandidate||{};
    const message=[
      "OpenAI Sourceを登録します。",
      "",
      "Source: "+String(c.sourceId||"SOURCE-OPENAI"),
      "Provider: "+String(c.provider||"OPENAI"),
      "Secret Reference: "+String(c.secretReferenceId||""),
      "Method: "+String((c.allowedMethods||[]).join(", ")),
      "Pricing: "+String(c.pricingMode||"")+" / "+String(c.costCurrency||""),
      "",
      "この承認で行うのはSource Registry登録のみです。",
      "Paid API有効化・Budget変更・実API通信は行いません。",
      "",
      "Project Ownerとして承認しますか？"
    ].join("\n");
    if(typeof global.confirm!=="function"||global.confirm(message)!==true){const cancelled={ok:false,code:"EXTERNAL010_PROJECT_OWNER_SOURCE_REGISTRATION_CANCELLED",registrationPerformed:false,paidActivationPerformed:false};setImpact(cancelled);return cancelled;}
    if(typeof n.registerOpenAIProviderSourceWithProjectOwnerApproval!=="function"){const unavailable={ok:false,code:"EXTERNAL010_OPENAI_SOURCE_REGISTRATION_GATE_UNAVAILABLE",registrationPerformed:false};setImpact(unavailable);return unavailable;}
    const evidenceId="OPENAI-SOURCE-REGISTRATION-OWNER-"+Date.now().toString(36).toUpperCase();
    const result=await n.registerOpenAIProviderSourceWithProjectOwnerApproval({secretReferenceId:currentForm().secretReferenceId,projectOwnerConfirmed:true,ownerInteractionTrusted:true,interactionEvidenceId:evidenceId});
    if(typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();
    setImpact(result);
    return result;
  }

  function externalOpenAIReviewOperationContractRegistration() {
    const src=source();
    const existing=operationContract();
    const candidate=typeof n.buildOpenAIResponsesOperationContract==="function"?n.buildOpenAIResponsesOperationContract({}):{ok:false,code:"OPENAI_PROVIDER_MODULE_UNAVAILABLE"};
    const ready=Boolean(src&&src.lifecycleState==="REGISTERED"&&!existing&&candidate&&candidate.ok===true&&candidate.data&&candidate.data.operationContractCandidate);
    const result={
      ok:ready,
      code:existing?"EXTERNAL010_OPENAI_OPERATION_CONTRACT_ALREADY_REGISTERED":!src?"EXTERNAL010_OPENAI_SOURCE_REGISTRATION_REQUIRED":ready?"EXTERNAL010_OPENAI_OPERATION_CONTRACT_REGISTRATION_REVIEW_READY":"EXTERNAL010_OPENAI_OPERATION_CONTRACT_REGISTRATION_NOT_READY",
      operationContractCandidate:candidate&&candidate.data&&candidate.data.operationContractCandidate||null,
      authority:{action:"REGISTER_SOURCE_OPERATION_CONTRACT",target:{type:"source-operation",id:"EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS"},purpose:"phase4-operation-contract",oneTime:true},
      effects:{operationContractRegistration:true,sourceEnablement:false,paidActivation:false,budgetMutation:false,realApiRequest:false},
      projectOwnerApprovalRequired:!existing
    };
    setImpact(result);return result;
  }

  async function externalOpenAIApproveOperationContractRegistration(event) {
    if(!event||event.isTrusted!==true){const blocked={ok:false,code:"EXTERNAL010_TRUSTED_PROJECT_OWNER_UI_INTERACTION_REQUIRED",operationContractRegistrationPerformed:false,paidActivationPerformed:false};setImpact(blocked);return blocked;}
    const review=externalOpenAIReviewOperationContractRegistration();
    if(!review.ok){setImpact(review);return review;}
    const c=review.operationContractCandidate||{};
    const message=[
      "OpenAI Responses API Operation Contractを登録します。",
      "",
      "Contract: "+String(c.operationContractId||""),
      "Operation: "+String(c.operationId||""),
      "Method: "+String(c.method||""),
      "Endpoint: "+String(c.endpoint&&c.endpoint.exactUrl||""),
      "store: false 固定",
      "Retry: 最大1回",
      "",
      "この承認で行うのはOperation Contract登録のみです。",
      "Source有効化・Paid API有効化・Budget変更・実API通信は行いません。",
      "",
      "Project Ownerとして承認しますか？"
    ].join("\n");
    if(typeof global.confirm!=="function"||global.confirm(message)!==true){const cancelled={ok:false,code:"EXTERNAL010_PROJECT_OWNER_OPERATION_CONTRACT_REGISTRATION_CANCELLED",operationContractRegistrationPerformed:false,paidActivationPerformed:false};setImpact(cancelled);return cancelled;}
    if(typeof n.registerOpenAIResponsesOperationContractWithProjectOwnerApproval!=="function"){const unavailable={ok:false,code:"EXTERNAL010_OPENAI_OPERATION_CONTRACT_REGISTRATION_GATE_UNAVAILABLE",operationContractRegistrationPerformed:false};setImpact(unavailable);return unavailable;}
    const evidenceId="OPENAI-OPERATION-CONTRACT-OWNER-"+Date.now().toString(36).toUpperCase();
    const result=await n.registerOpenAIResponsesOperationContractWithProjectOwnerApproval({projectOwnerConfirmed:true,ownerInteractionTrusted:true,interactionEvidenceId:evidenceId});
    if(typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();
    setImpact(result);
    return result;
  }


  function externalOpenAIReviewUsdBudget() {
    const form=currentForm();
    const result=typeof n.buildOpenAIUsdResourceBudgetReview==="function"?n.buildOpenAIUsdResourceBudgetReview({secretReferenceId:form.secretReferenceId,softLimitUsd:form.budgetSoftLimitUsd,hardLimitUsd:form.budgetHardLimitUsd,perRequestHardCapUsd:form.perRequestHardCapUsd}):{ok:false,code:"EXTERNAL010_OPENAI_USD_BUDGET_GATE_UNAVAILABLE"};
    const wrapped={...result,projectOwnerApprovalRequired:true,paidActivationPerformed:false,realApiRequestPerformed:false};
    setImpact(wrapped);return wrapped;
  }

  function externalOpenAICreateUsdBudgetCandidate() {
    const form=currentForm();
    const review=externalOpenAIReviewUsdBudget();
    if(!review||review.ok!==true)return review;
    if(typeof n.createOpenAIUsdResourceBudgetCandidate!=="function"){const unavailable={ok:false,code:"EXTERNAL010_OPENAI_USD_BUDGET_CANDIDATE_GATE_UNAVAILABLE",budgetMutationPerformed:false};setImpact(unavailable);return unavailable;}
    const result=n.createOpenAIUsdResourceBudgetCandidate({secretReferenceId:form.secretReferenceId,softLimitUsd:form.budgetSoftLimitUsd,hardLimitUsd:form.budgetHardLimitUsd,perRequestHardCapUsd:form.perRequestHardCapUsd});
    if(result&&result.ok===true&&result.data&&result.data.budgetId){const d=readDraft();d.budgetCandidateId=result.data.budgetId;d.budgetSoftLimitUsd=String(result.data.budget&&result.data.budget.limits&&result.data.budget.limits.FINANCIAL_COST&&result.data.budget.limits.FINANCIAL_COST.softLimit!=null?result.data.budget.limits.FINANCIAL_COST.softLimit:form.budgetSoftLimitUsd||"");d.budgetHardLimitUsd=String(result.data.budget&&result.data.budget.limits&&result.data.budget.limits.FINANCIAL_COST&&result.data.budget.limits.FINANCIAL_COST.hardLimit!=null?result.data.budget.limits.FINANCIAL_COST.hardLimit:form.budgetHardLimitUsd||"");writeDraft(d);if(typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();}
    setImpact(result);return result;
  }

  async function externalOpenAIApproveUsdBudget(event) {
    if(!event||event.isTrusted!==true){const blocked={ok:false,code:"EXTERNAL010_TRUSTED_PROJECT_OWNER_UI_INTERACTION_REQUIRED",budgetActivated:false,paidActivationPerformed:false};setImpact(blocked);return blocked;}
    const d=readDraft();const budget=d.budgetCandidateId&&typeof n.getExternalIntelligenceResourceBudget==="function"?n.getExternalIntelligenceResourceBudget(d.budgetCandidateId):null;
    if(!budget||budget.state!=="CANDIDATE"){const blocked={ok:false,code:"EXTERNAL010_OPENAI_USD_BUDGET_CANDIDATE_REQUIRED",budgetId:d.budgetCandidateId||null,budgetActivated:false};setImpact(blocked);return blocked;}
    const lim=budget.limits&&budget.limits.FINANCIAL_COST||{};const message=[
      "OpenAI USD Resource Budgetを有効化します。",
      "",
      "Budget: "+String(budget.budgetId||""),
      "Source: "+String(budget.scopeId||"SOURCE-OPENAI"),
      "通貨: USD",
      "警告ライン: "+money(lim.softLimit),
      "Hard Limit: "+money(lim.hardLimit),
      "1回Hard Cap: "+money(d.perRequestHardCapUsd),
      "",
      "この承認はFINANCIAL_COST Budgetだけを有効化します。",
      "OpenAI Paid Source有効化・実API通信・自動チャージ・Budget自動増額は行いません。",
      "",
      "Project Ownerとして承認しますか？"
    ].join("\n");
    if(typeof global.confirm!=="function"||global.confirm(message)!==true){const cancelled={ok:false,code:"EXTERNAL010_PROJECT_OWNER_USD_BUDGET_ACTIVATION_CANCELLED",budgetActivated:false,paidActivationPerformed:false};setImpact(cancelled);return cancelled;}
    if(typeof n.activateOpenAIUsdResourceBudgetWithProjectOwnerApproval!=="function"){const unavailable={ok:false,code:"EXTERNAL010_OPENAI_USD_BUDGET_ACTIVATION_GATE_UNAVAILABLE",budgetActivated:false};setImpact(unavailable);return unavailable;}
    const evidenceId="OPENAI-USD-BUDGET-OWNER-"+Date.now().toString(36).toUpperCase();
    const result=await n.activateOpenAIUsdResourceBudgetWithProjectOwnerApproval({budgetId:budget.budgetId,secretReferenceId:d.secretReferenceId,perRequestHardCapUsd:d.perRequestHardCapUsd,projectOwnerConfirmed:true,ownerInteractionTrusted:true,interactionEvidenceId:evidenceId});
    if(result&&result.ok===true&&result.data&&result.data.budgetId){const next=readDraft();next.budgetId=result.data.budgetId;next.budgetCandidateId="";writeDraft(next);if(typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();}
    setImpact(result);return result;
  }

  function externalOpenAIReviewUsagePolicy() {
    const d=readDraft();
    const result=typeof n.buildOpenAIUsagePolicyReview==="function"?n.buildOpenAIUsagePolicyReview({budgetId:d.budgetId}):{ok:false,code:"EXTERNAL010_OPENAI_USAGE_POLICY_GATE_UNAVAILABLE"};
    const wrapped={...result,projectOwnerApprovalRequired:true,legalAuthorityGranted:false,paidActivationPerformed:false,realApiRequestPerformed:false};
    setImpact(wrapped);return wrapped;
  }

  function externalOpenAICreateUsagePolicyCandidate() {
    const d=readDraft();
    const review=externalOpenAIReviewUsagePolicy();
    if(!review||review.ok!==true)return review;
    if(review.code==="EXTERNAL010_OPENAI_USAGE_POLICY_ALREADY_ACTIVE")return review;
    if(typeof n.createOpenAIUsagePolicyCandidate!=="function"){const unavailable={ok:false,code:"EXTERNAL010_OPENAI_USAGE_POLICY_CANDIDATE_GATE_UNAVAILABLE",policyMutationPerformed:false};setImpact(unavailable);return unavailable;}
    const result=n.createOpenAIUsagePolicyCandidate({budgetId:d.budgetId});
    if(result&&result.ok===true&&result.data&&result.data.usagePolicyId){const next=readDraft();next.usagePolicyCandidateId=result.data.usagePolicyId;writeDraft(next);if(typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();}
    setImpact(result);return result;
  }

  async function externalOpenAIApproveUsagePolicy(event) {
    if(!event||event.isTrusted!==true){const blocked={ok:false,code:"EXTERNAL010_TRUSTED_PROJECT_OWNER_UI_INTERACTION_REQUIRED",policyActivated:false,paidActivationPerformed:false};setImpact(blocked);return blocked;}
    const d=readDraft();const policy=d.usagePolicyCandidateId&&typeof n.getExternalIntelligenceUsagePolicy==="function"?n.getExternalIntelligenceUsagePolicy(d.usagePolicyCandidateId):null;
    if(!policy||!["CANDIDATE","REVIEW_REQUIRED"].includes(policy.status)){const blocked={ok:false,code:"EXTERNAL010_OPENAI_USAGE_POLICY_CANDIDATE_REQUIRED",usagePolicyId:d.usagePolicyCandidateId||null,policyActivated:false};setImpact(blocked);return blocked;}
    const right=policy.rights&&policy.rights.INTERNAL_ANALYSIS||{};
    const message=[
      "OpenAI Usage Policyを有効化します。",
      "",
      "Policy: "+String(policy.usagePolicyId||""),
      "Source: SOURCE-OPENAI",
      "Operation: INTERNAL_ANALYSIS",
      "Right: "+String(right.state||"UNKNOWN"),
      "",
      "この承認は登録済みOpenAI APIをINTERNAL_ANALYSIS用途で使うPlatform Policyを有効化します。",
      "OpenAI利用規約を法的許可と断定するものではなく、legalAuthorityGranted=falseのままです。",
      "Paid Source有効化・実API通信はまだ行いません。",
      "",
      "Project Ownerとして承認しますか？"
    ].join("\n");
    if(typeof global.confirm!=="function"||global.confirm(message)!==true){const cancelled={ok:false,code:"EXTERNAL010_PROJECT_OWNER_USAGE_POLICY_ACTIVATION_CANCELLED",policyActivated:false,paidActivationPerformed:false};setImpact(cancelled);return cancelled;}
    if(typeof n.activateOpenAIUsagePolicyWithProjectOwnerApproval!=="function"){const unavailable={ok:false,code:"EXTERNAL010_OPENAI_USAGE_POLICY_ACTIVATION_GATE_UNAVAILABLE",policyActivated:false};setImpact(unavailable);return unavailable;}
    const evidenceId="OPENAI-USAGE-POLICY-OWNER-"+Date.now().toString(36).toUpperCase();
    const result=await n.activateOpenAIUsagePolicyWithProjectOwnerApproval({usagePolicyId:policy.usagePolicyId,projectOwnerConfirmed:true,ownerInteractionTrusted:true,interactionEvidenceId:evidenceId});
    if(result&&result.ok===true){const next=readDraft();next.usagePolicyCandidateId="";writeDraft(next);if(typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();}
    setImpact(result);return result;
  }


  function externalOpenAIReviewPaidActivation() {
    const d=readDraft();
    const budgetId=d.budgetId||getOpenAIProviderUiSnapshot().selectedBudget&&getOpenAIProviderUiSnapshot().selectedBudget.budgetId||"";
    const result=typeof n.buildOpenAIPaidSourceActivationReview==="function"?n.buildOpenAIPaidSourceActivationReview({budgetIds:budgetId?[budgetId]:[],perRequestHardCapUsd:d.perRequestHardCapUsd}):{ok:false,code:"EXTERNAL010_OPENAI_PAID_SOURCE_ACTIVATION_GATE_UNAVAILABLE"};
    const wrapped={...result,projectOwnerApprovalRequired:true,realApiRequestPerformed:false};
    setImpact(wrapped);return wrapped;
  }

  async function externalOpenAIApprovePaidActivation(event) {
    if(!event||event.isTrusted!==true){const blocked={ok:false,code:"EXTERNAL010_TRUSTED_PROJECT_OWNER_UI_INTERACTION_REQUIRED",paidActivationPerformed:false,realApiRequestPerformed:false};setImpact(blocked);return blocked;}
    const d=readDraft();const snap=getOpenAIProviderUiSnapshot();const budgetId=d.budgetId||snap.selectedBudget&&snap.selectedBudget.budgetId||"";
    const review=typeof n.buildOpenAIPaidSourceActivationReview==="function"?n.buildOpenAIPaidSourceActivationReview({budgetIds:budgetId?[budgetId]:[],perRequestHardCapUsd:d.perRequestHardCapUsd}):null;
    if(!review||review.ok!==true){const blocked=review||{ok:false,code:"EXTERNAL010_OPENAI_PAID_SOURCE_ACTIVATION_REVIEW_REQUIRED",paidActivationPerformed:false};setImpact(blocked);return blocked;}
    if(review.code==="EXTERNAL010_OPENAI_PAID_SOURCE_ALREADY_ACTIVE"){setImpact(review);if(typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();return review;}
    const r=review.data||{};
    const message=[
      "OpenAI Paid Sourceを有効化します。",
      "",
      "Source: SOURCE-OPENAI",
      "Credential: "+String(r.secretReferenceId||snap.selectedSecretReferenceId||""),
      "Operation: INTERNAL_ANALYSIS",
      "Budget: "+String((r.budgetIds||[]).join(", ")),
      "1回Hard Cap: "+money(r.perRequestHardCapUsd),
      "",
      "この承認後、承認済みBudget / Usage Policy / 1回Hard Capの範囲内では毎Requestの人間承認なしでOpenAI APIを利用可能になります。",
      "汎用 ACTIVATE_PAID_API Hard Deny、自動Budget増額、自動チャージ、自動Credential切替は維持します。",
      "この操作自体ではOpenAIへ実Requestを送信しません。",
      "",
      "Project Ownerとして有効化しますか？"
    ].join("\n");
    if(typeof global.confirm!=="function"||global.confirm(message)!==true){const cancelled={ok:false,code:"EXTERNAL010_PROJECT_OWNER_PAID_SOURCE_ACTIVATION_CANCELLED",paidActivationPerformed:false,realApiRequestPerformed:false};setImpact(cancelled);return cancelled;}
    if(typeof n.activateOpenAIPaidSourceWithProjectOwnerApproval!=="function"){const unavailable={ok:false,code:"EXTERNAL010_OPENAI_PAID_SOURCE_ACTIVATION_GATE_UNAVAILABLE",paidActivationPerformed:false};setImpact(unavailable);return unavailable;}
    const evidenceId="OPENAI-PAID-SOURCE-OWNER-"+Date.now().toString(36).toUpperCase();
    const result=await n.activateOpenAIPaidSourceWithProjectOwnerApproval({budgetIds:r.budgetIds||[],perRequestHardCapUsd:r.perRequestHardCapUsd,projectOwnerConfirmed:true,ownerInteractionTrusted:true,interactionEvidenceId:evidenceId});
    if(result&&result.ok===true&&typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();
    setImpact(result);return result;
  }

  function externalOpenAIReviewRealApiTest() {
    const d=readDraft();
    const snap=getOpenAIProviderUiSnapshot();
    const budgetId=d.budgetId||snap.selectedBudget&&snap.selectedBudget.budgetId||"";
    const result=typeof n.buildOpenAIRealApiTestReview==="function"?n.buildOpenAIRealApiTestReview({model:d.model,maxOutputTokens:d.maxOutputTokens,perRequestHardCapUsd:d.perRequestHardCapUsd,budgetIds:budgetId?[budgetId]:[]}):{ok:false,code:"EXTERNAL010_OPENAI_REAL_API_TEST_GATE_UNAVAILABLE",realApiRequestPerformed:false};
    setImpact(result);return result;
  }

  async function externalOpenAIApproveRealApiTest(event) {
    if(!event||event.isTrusted!==true){const blocked={ok:false,code:"EXTERNAL010_TRUSTED_PROJECT_OWNER_UI_INTERACTION_REQUIRED",realApiRequestPerformed:false,testPassed:false};setImpact(blocked);return blocked;}
    const d=readDraft();const snap=getOpenAIProviderUiSnapshot();const budgetId=d.budgetId||snap.selectedBudget&&snap.selectedBudget.budgetId||"";
    const review=typeof n.buildOpenAIRealApiTestReview==="function"?n.buildOpenAIRealApiTestReview({model:d.model,maxOutputTokens:d.maxOutputTokens,perRequestHardCapUsd:d.perRequestHardCapUsd,budgetIds:budgetId?[budgetId]:[]}):null;
    if(!review||review.ok!==true){const blocked=review||{ok:false,code:"EXTERNAL010_OPENAI_REAL_API_TEST_REVIEW_REQUIRED",realApiRequestPerformed:false};setImpact(blocked);return blocked;}
    if(review.code==="EXTERNAL010_OPENAI_REAL_API_TEST_ALREADY_PASSED"){setImpact(review);if(typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();return review;}
    const r=review.data||{};const estimate=r.costEstimate||{};
    const message=[
      "OpenAIへ初回Real API Testを1回送信します。",
      "",
      "送信文字列: Reply exactly with: OK",
      "Project / 会話本文: 送信しません",
      "Model: "+String(r.model||d.model||""),
      "store: false",
      "max_output_tokens: "+String(r.testBody&&r.testBody.max_output_tokens||""),
      "最大見積Cost: "+money(estimate.maximumEstimatedCostUsd),
      "1回Hard Cap: "+money(r.perRequestHardCapUsd),
      "Budget: "+String((r.budgetIds||[]).join(", ")),
      "Retry: 最大1回",
      "",
      "この操作で初めてOpenAI APIへの実通信と少額課金が発生します。",
      "usage取得・実コスト照合までPASSした場合のみSTEP 7完了になります。",
      "",
      "Project Ownerとして1回テスト送信しますか？"
    ].join("\n");
    if(typeof global.confirm!=="function"||global.confirm(message)!==true){const cancelled={ok:false,code:"EXTERNAL010_PROJECT_OWNER_REAL_API_TEST_CANCELLED",realApiRequestPerformed:false,testPassed:false};setImpact(cancelled);return cancelled;}
    if(typeof n.runOpenAIRealApiTestWithProjectOwnerApproval!=="function"){const unavailable={ok:false,code:"EXTERNAL010_OPENAI_REAL_API_TEST_GATE_UNAVAILABLE",realApiRequestPerformed:false};setImpact(unavailable);return unavailable;}
    const evidenceId="OPENAI-REAL-API-TEST-OWNER-"+Date.now().toString(36).toUpperCase();
    const result=await n.runOpenAIRealApiTestWithProjectOwnerApproval({model:r.model||d.model,maxOutputTokens:r.testBody&&r.testBody.max_output_tokens||d.maxOutputTokens,perRequestHardCapUsd:r.perRequestHardCapUsd||d.perRequestHardCapUsd,budgetIds:r.budgetIds||[],projectOwnerConfirmed:true,ownerInteractionTrusted:true,interactionEvidenceId:evidenceId});
    if(typeof global.externalConsoleRefresh==="function")global.externalConsoleRefresh();
    setImpact(result);return result;
  }

  function externalOpenAIShowProviderCandidates() {
    const draft=currentForm(); const src=source();
    const secretReferenceId=src&&src.secretReferenceId||draft.secretReferenceId||defaultSecretReferenceId();
    const metadata=secretMetadata(secretReferenceId);
    const validation=metadata?secretState(secretReferenceId):null;
    const sourceCandidate=typeof n.buildOpenAIProviderSourceRegistration==="function"?n.buildOpenAIProviderSourceRegistration({secretReferenceId:secretReferenceId}):{ok:false,code:"OPENAI_PROVIDER_MODULE_UNAVAILABLE"};
    const operationCandidate=typeof n.buildOpenAIResponsesOperationContract==="function"?n.buildOpenAIResponsesOperationContract({}):{ok:false,code:"OPENAI_PROVIDER_MODULE_UNAVAILABLE"};
    const value={sourceCandidate,operationCandidate,secretReference:{secretReferenceId:secretReferenceId,metadataRegistered:Boolean(metadata),active:Boolean(validation&&validation.ok===true),nextRequiredAction:validation&&validation.ok===true?"SOURCE_REGISTRATION_AUTHORITY":"SET_GATEWAY_SECRET_AND_REGISTER_REFERENCE_METADATA"},draft,paidActivationPerformed:false,secretValueRequested:false};setImpact(value);return value;
  }
  Object.assign(n.api,{getOpenAIProviderUiSnapshot,getOpenAISetupWorkflowState,renderOpenAIProviderIntegrationPanelHtml});Object.assign(n,n.api);
  Object.assign(global,{externalOpenAIPreviewConfiguration,externalOpenAISaveDraft,externalOpenAIPrepareSecretReference,externalOpenAIReviewSourceRegistration,externalOpenAIApproveSourceRegistration,externalOpenAIReviewOperationContractRegistration,externalOpenAIApproveOperationContractRegistration,externalOpenAIReviewUsdBudget,externalOpenAICreateUsdBudgetCandidate,externalOpenAIApproveUsdBudget,externalOpenAIReviewUsagePolicy,externalOpenAICreateUsagePolicyCandidate,externalOpenAIApproveUsagePolicy,externalOpenAIReviewPaidActivation,externalOpenAIApprovePaidActivation,externalOpenAIReviewRealApiTest,externalOpenAIApproveRealApiTest,externalOpenAIShowProviderCandidates});
  n.modules.openaiProviderUi={id:"EXTERNAL-010-OPENAI-PROVIDER-UI",version:m.getModuleVersion("openaiProviderUi")||m.release.version,status:"Loaded",decision:"055",secretValueInputAllowed:false,automaticPaidActivationAllowed:false,loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
