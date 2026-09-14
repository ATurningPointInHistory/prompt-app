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
    let level="YELLOW",label="準備中",reason="Provider / Secret Reference / Budget / Authority の設定を確認してください。";
    if(src&&src.lifecycleState==="ACTIVE"&&secret&&secret.ok===true&&b){level="GREEN";label="通常利用範囲";reason="承認済み範囲内は毎回の人間承認なしで利用できます。";}
    if(src&&src.lifecycleState==="ACTIVE"&&(!secret||!secret.ok||!b)){level="RED";label="実行停止推奨";reason="Active Sourceに必要なSecretまたはUSD Budgetが確認できません。";}
    return {source:src,operationContract:op,draft,profiles,activeUsdBudgets:budgets(),selectedBudget:b,pendingBudgetCandidate:pendingBudget,activeUsagePolicy:activeUsagePolicy,pendingUsagePolicyCandidate:pendingUsagePolicy,secret:secret,secretMetadata:metadata,selectedSecretReferenceId:selectedSecretReferenceId,secretReferenceIds:secretReferenceIds(),risk:{level,label,reason},activation:activation,externalTransmission:"TEXT_TO_OPENAI",toolsEnabled:false,streamingEnabled:false,backgroundEnabled:false,secretValueInputAllowed:false,capturedAt:i.nowIso()};
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
  function renderOpenAIProviderIntegrationPanelHtml() {
    const x=getOpenAIProviderUiSnapshot(), src=x.source||{}, op=x.operationContract||null, b=x.selectedBudget, activation=x.activation||{};
    const cap=x.draft.perRequestHardCapUsd||activation.perRequestHardCapUsd||"";
    const model=x.draft.model||"未選択";
    const max=x.draft.maxOutputTokens||"未設定";
    return '<section class="external-section openai-config-section">'+
      '<div class="external-section-head"><h4>OpenAI API</h4><span class="openai-risk openai-risk-'+esc(x.risk.level.toLowerCase())+'">'+esc(x.risk.level)+' · '+esc(x.risk.label)+'</span></div>'+
      '<div class="external-help">'+esc(x.risk.reason)+' APIキー本体はこの画面に入力しません。Gateway側のSecret Referenceだけを使用します。</div>'+
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
      '</div>'+
      '<details class="openai-config-details" open><summary>簡単設定</summary><div class="openai-form-grid">'+
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
      '</div><div class="external-note">Source登録承認は SOURCE-OPENAI のRegistry登録だけに限定します。成功後は上部の「Provider」が REGISTERED に変わり、「現在のデータ」の Sources が 1 増えます。Paid API有効化・Budget変更・Operation Contract登録・実API通信は行いません。</div>'+
      '<div class="external-actions openai-actions">'+
        '<button class="btn-secondary" onclick="externalOpenAIReviewOperationContractRegistration()"'+(!src||!src.sourceId?' disabled':'')+'>Operation登録内容を確認</button>'+
        '<button class="btn-primary" onclick="externalOpenAIApproveOperationContractRegistration(event)"'+(!src||!src.sourceId||op?' disabled':'')+'>Project OwnerとしてOperation登録</button>'+
      '</div><div class="external-note">Operation登録承認は EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS のContract登録だけに限定します。成功後は上部の「Operation」が REGISTERED に変わります。Source有効化・Paid API有効化・Budget変更・実API通信は行いません。</div>'+
      '<div id="externalOpenAIImpact" class="external-note">変更前後を確認してから保存してください。保存は設定候補のみで、有料APIを自動有効化しません。</div></details>'+
      '<details class="openai-config-details" open><summary>料金・利用量</summary><div class="external-boundary-grid">'+
        '<div>選択Budget<strong>'+esc(b?b.budgetId:'未選択')+'</strong></div><div>使用額<strong>'+esc(b?money(b.consumed):'—')+'</strong></div><div>Hard Limit<strong>'+esc(b?money(b.hardLimit):'—')+'</strong></div><div>1回Hard Cap（簡単設定で変更）<strong>'+esc(cap?money(cap):'未設定')+'</strong></div>'+
        '<div>Budget Candidate<strong>'+esc(x.pendingBudgetCandidate?x.pendingBudgetCandidate.budgetId:'未作成')+'</strong></div><div>Candidate State<strong>'+esc(x.pendingBudgetCandidate?x.pendingBudgetCandidate.state:'—')+'</strong></div>'+
      '</div><div class="openai-form-grid">'+
        '<label>警告ライン（USD）<input id="externalOpenAIBudgetSoftLimit" type="number" min="0" step="0.01" value="'+esc(x.draft.budgetSoftLimitUsd)+'" placeholder="空欄ならHard Limitの80%"><small>警告用です。超過してもHard Limitまでは自動停止しません。</small></label>'+
        '<label>Budget Hard Limit（USD）<input id="externalOpenAIBudgetHardLimit" type="number" min="0.01" step="0.01" value="'+esc(x.draft.budgetHardLimitUsd)+'" placeholder="例: 5.00"><small>このBudgetの累積FINANCIAL_COST上限です。自動増額・自動チャージは行いません。</small></label>'+
      '</div><div class="external-actions openai-actions">'+
        '<button class="btn-secondary" onclick="externalOpenAIReviewUsdBudget()"'+(!op?' disabled':'')+'>Budget内容を確認</button>'+
        '<button class="btn-secondary" onclick="externalOpenAICreateUsdBudgetCandidate()"'+(!op?' disabled':'')+'>Budget候補を作成</button>'+
        '<button class="btn-primary" onclick="externalOpenAIApproveUsdBudget(event)"'+(!x.pendingBudgetCandidate||x.pendingBudgetCandidate.state!=="CANDIDATE"?' disabled':'')+'>Project OwnerとしてBudget有効化</button>'+
      '</div><div class="external-note">Budget候補の作成だけでは有料APIは有効になりません。Budget有効化はUSDのFINANCIAL_COST境界だけを承認します。期間は現行Budget Engine上のCurrent Allocationで、自動月次リセットや自動チャージはまだ行いません。</div>'+ 
      '<div class="external-note">実Request送信前に入力量とmax_output_tokensからFINANCIAL_COSTを再見積りし、Budgetと1回上限の両方を確認します。料金ProfileはVersioned Metadataとして扱います。1回Hard Capを変更する場合は上の「簡単設定」で変更してください。</div></details>'+
      '<details class="openai-config-details" open><summary>Usage Policy</summary><div class="external-boundary-grid">'+
        '<div>Operation<strong>INTERNAL_ANALYSIS</strong></div><div>Active Policy<strong>'+esc(x.activeUsagePolicy?x.activeUsagePolicy.usagePolicyId:'未設定')+'</strong></div><div>Candidate<strong>'+esc(x.pendingUsagePolicyCandidate?x.pendingUsagePolicyCandidate.usagePolicyId:'未作成')+'</strong></div><div>Legal Authority<strong>NO</strong></div>'+
      '</div><div class="external-actions openai-actions">'+
        '<button class="btn-secondary" onclick="externalOpenAIReviewUsagePolicy()"'+(!b||!op?' disabled':'')+'>Usage Policy内容を確認</button>'+
        '<button class="btn-secondary" onclick="externalOpenAICreateUsagePolicyCandidate()"'+(!b||!op||x.activeUsagePolicy?' disabled':'')+'>Usage Policy候補を作成</button>'+
        '<button class="btn-primary" onclick="externalOpenAIApproveUsagePolicy(event)"'+(!x.pendingUsagePolicyCandidate||!["CANDIDATE","REVIEW_REQUIRED"].includes(x.pendingUsagePolicyCandidate.status)||x.activeUsagePolicy?' disabled':'')+'>Project OwnerとしてUsage Policy有効化</button>'+
      '</div><div class="external-note">これはAIがOpenAI利用規約を法的許可と断定するGateではありません。Project Ownerが登録済みAPIを INTERNAL_ANALYSIS 用途で運用することを承認するPlatform Policyです。Provider規約・Account義務は外部義務として残り、legalAuthorityGranted=falseを維持します。</div></details>'+
      '<details class="openai-config-details"><summary>詳細設定</summary><div class="external-boundary-grid">'+
        '<div>Endpoint<strong>/v1/responses</strong></div><div>Method<strong>POST JSON</strong></div><div>Retry<strong>最大1回</strong></div><div>Max Output<strong>'+esc(max)+'</strong></div>'+
      '</div><div class="external-note">初期ScopeではStreaming / Background / Tools / Files / Web Search / Computer Useは無効です。これらを追加する場合はCapability境界変更として扱います。</div></details>'+
      '<details class="openai-config-details"><summary>安全・権限</summary><div class="external-boundary-grid">'+
        '<div>store<strong>常に false</strong></div><div>Secret Value入力<strong>禁止</strong></div><div>Paid自動有効化<strong>禁止</strong></div><div>Budget自動増額<strong>禁止</strong></div>'+ 
      '</div><div class="external-note">予算拡大・新しいCapability・Authority拡大は承認境界です。承認済み範囲内の通常Requestでは毎回確認を出しません。</div></details>'+ 
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

  function externalOpenAIShowProviderCandidates() {
    const draft=currentForm(); const src=source();
    const secretReferenceId=src&&src.secretReferenceId||draft.secretReferenceId||defaultSecretReferenceId();
    const metadata=secretMetadata(secretReferenceId);
    const validation=metadata?secretState(secretReferenceId):null;
    const sourceCandidate=typeof n.buildOpenAIProviderSourceRegistration==="function"?n.buildOpenAIProviderSourceRegistration({secretReferenceId:secretReferenceId}):{ok:false,code:"OPENAI_PROVIDER_MODULE_UNAVAILABLE"};
    const operationCandidate=typeof n.buildOpenAIResponsesOperationContract==="function"?n.buildOpenAIResponsesOperationContract({}):{ok:false,code:"OPENAI_PROVIDER_MODULE_UNAVAILABLE"};
    const value={sourceCandidate,operationCandidate,secretReference:{secretReferenceId:secretReferenceId,metadataRegistered:Boolean(metadata),active:Boolean(validation&&validation.ok===true),nextRequiredAction:validation&&validation.ok===true?"SOURCE_REGISTRATION_AUTHORITY":"SET_GATEWAY_SECRET_AND_REGISTER_REFERENCE_METADATA"},draft,paidActivationPerformed:false,secretValueRequested:false};setImpact(value);return value;
  }
  Object.assign(n.api,{getOpenAIProviderUiSnapshot,renderOpenAIProviderIntegrationPanelHtml});Object.assign(n,n.api);
  Object.assign(global,{externalOpenAIPreviewConfiguration,externalOpenAISaveDraft,externalOpenAIPrepareSecretReference,externalOpenAIReviewSourceRegistration,externalOpenAIApproveSourceRegistration,externalOpenAIReviewOperationContractRegistration,externalOpenAIApproveOperationContractRegistration,externalOpenAIReviewUsdBudget,externalOpenAICreateUsdBudgetCandidate,externalOpenAIApproveUsdBudget,externalOpenAIReviewUsagePolicy,externalOpenAICreateUsagePolicyCandidate,externalOpenAIApproveUsagePolicy,externalOpenAIShowProviderCandidates});
  n.modules.openaiProviderUi={id:"EXTERNAL-010-OPENAI-PROVIDER-UI",version:m.getModuleVersion("openaiProviderUi")||m.release.version,status:"Loaded",decision:"055",secretValueInputAllowed:false,automaticPaidActivationAllowed:false,loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
