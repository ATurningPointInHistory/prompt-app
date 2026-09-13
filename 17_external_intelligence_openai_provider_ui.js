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
    return p&&p.defaultSecretReferenceId||"SECRET-OPENAI-PRIMARY";
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function money(value) { const n=Number(value); return Number.isFinite(n) ? "$"+n.toFixed(n < 1 ? 4 : 2) : "—"; }
  function readDraft() {
    const empty={model:"",maxOutputTokens:"",perRequestHardCapUsd:"",budgetId:"",secretReferenceId:defaultSecretReferenceId()};
    try { const raw=global.localStorage && global.localStorage.getItem(STORAGE_KEY); if(!raw)return empty; return Object.assign(empty,JSON.parse(raw)||{}); } catch(_){ return empty; }
  }
  function writeDraft(draft) {
    try { if(global.localStorage)global.localStorage.setItem(STORAGE_KEY,JSON.stringify(draft)); return true; } catch(_){ return false; }
  }
  function source() { return typeof n.getExternalIntelligenceSource==="function" ? n.getExternalIntelligenceSource("SOURCE-OPENAI") : null; }
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
  function getOpenAIProviderUiSnapshot() {
    const src=source(), draft=readDraft(), profiles=typeof n.listOpenAIModelPricingProfiles==="function"?n.listOpenAIModelPricingProfiles():[], activation=src&&src.paidActivationPolicy||null;
    const selectedBudget=draft.budgetId||activation&&activation.budgetIds&&activation.budgetIds[0]||"";
    const selectedSecretReferenceId=src&&src.secretReferenceId||draft.secretReferenceId||defaultSecretReferenceId();
    const metadata=secretMetadata(selectedSecretReferenceId), secret=metadata?secretState(selectedSecretReferenceId):null;
    const b=budgetSnapshot(selectedBudget);
    let level="YELLOW",label="準備中",reason="Provider / Secret Reference / Budget / Authority の設定を確認してください。";
    if(src&&src.lifecycleState==="ACTIVE"&&secret&&secret.ok===true&&b){level="GREEN";label="通常利用範囲";reason="承認済み範囲内は毎回の人間承認なしで利用できます。";}
    if(src&&src.lifecycleState==="ACTIVE"&&(!secret||!secret.ok||!b)){level="RED";label="実行停止推奨";reason="Active Sourceに必要なSecretまたはUSD Budgetが確認できません。";}
    return {source:src,draft,profiles,activeUsdBudgets:budgets(),selectedBudget:b,secret:secret,secretMetadata:metadata,selectedSecretReferenceId:selectedSecretReferenceId,secretReferenceIds:secretReferenceIds(),risk:{level,label,reason},activation:activation,externalTransmission:"TEXT_TO_OPENAI",toolsEnabled:false,streamingEnabled:false,backgroundEnabled:false,secretValueInputAllowed:false,capturedAt:i.nowIso()};
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
    const x=getOpenAIProviderUiSnapshot(), src=x.source||{}, b=x.selectedBudget, activation=x.activation||{};
    const cap=x.draft.perRequestHardCapUsd||activation.perRequestHardCapUsd||"";
    const model=x.draft.model||"未選択";
    const max=x.draft.maxOutputTokens||"未設定";
    return '<section class="external-section openai-config-section">'+
      '<div class="external-section-head"><h4>OpenAI API</h4><span class="openai-risk openai-risk-'+esc(x.risk.level.toLowerCase())+'">'+esc(x.risk.level)+' · '+esc(x.risk.label)+'</span></div>'+
      '<div class="external-help">'+esc(x.risk.reason)+' APIキー本体はこの画面に入力しません。Gateway側のSecret Referenceだけを使用します。</div>'+
      '<div class="openai-summary-grid">'+
        '<div><span>Provider</span><strong>'+esc(src.lifecycleState||'未登録')+'</strong></div>'+
        '<div><span>Secret Reference</span><strong>'+esc(x.selectedSecretReferenceId)+' / '+esc(x.secretMetadata?x.secretMetadata.status:'未準備')+'</strong></div>'+
        '<div><span>現在モデル</span><strong>'+esc(model)+'</strong></div>'+
        '<div><span>1回上限</span><strong>'+esc(cap?money(cap):'未設定')+'</strong></div>'+
        '<div><span>USD Budget</span><strong>'+esc(b?money(b.consumed)+' / '+money(b.hardLimit):'未選択')+'</strong></div>'+
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
      '</div><div class="external-note">Source登録承認は SOURCE-OPENAI のRegistry登録だけに限定します。Paid API有効化・Budget変更・Operation Contract登録・実API通信は行いません。</div>'+
      '<div id="externalOpenAIImpact" class="external-note">変更前後を確認してから保存してください。保存は設定候補のみで、有料APIを自動有効化しません。</div></details>'+
      '<details class="openai-config-details"><summary>料金・利用量</summary><div class="external-boundary-grid">'+
        '<div>選択Budget<strong>'+esc(b?b.budgetId:'未選択')+'</strong></div><div>使用額<strong>'+esc(b?money(b.consumed):'—')+'</strong></div><div>Hard Limit<strong>'+esc(b?money(b.hardLimit):'—')+'</strong></div><div>1回Hard Cap<strong>'+esc(cap?money(cap):'未設定')+'</strong></div>'+
      '</div><div class="external-note">実Request送信前に入力量とmax_output_tokensからFINANCIAL_COSTを再見積りし、Budgetと1回上限の両方を確認します。料金ProfileはVersioned Metadataとして扱います。</div></details>'+
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
    return {model:get('externalOpenAIModel')&&get('externalOpenAIModel').value||'',maxOutputTokens:get('externalOpenAIMaxOutput')&&get('externalOpenAIMaxOutput').value||'',perRequestHardCapUsd:get('externalOpenAIPerRequestCap')&&get('externalOpenAIPerRequestCap').value||'',budgetId:get('externalOpenAIBudget')&&get('externalOpenAIBudget').value||'',secretReferenceId:get('externalOpenAISecretReference')&&get('externalOpenAISecretReference').value||readDraft().secretReferenceId||defaultSecretReferenceId()};
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
    const result={ok:Boolean(registered&&registered.ok===true),code:registered&&registered.code||"EXTERNAL010_OPENAI_SECRET_METADATA_REGISTRATION_FAILED",secretReferenceId,gatewayStatus,metadata:registered&&registered.data&&registered.data.secretMetadata||null,metadataRegistrationPerformed:Boolean(registered&&registered.ok===true),secretValueStored:false,secretValueRequested:false,nextRequiredAction:registered&&registered.ok===true?"SOURCE_REGISTRATION_AUTHORITY":"REVIEW_SECRET_METADATA_REGISTRATION"};
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
  Object.assign(global,{externalOpenAIPreviewConfiguration,externalOpenAISaveDraft,externalOpenAIPrepareSecretReference,externalOpenAIReviewSourceRegistration,externalOpenAIApproveSourceRegistration,externalOpenAIShowProviderCandidates});
  n.modules.openaiProviderUi={id:"EXTERNAL-010-OPENAI-PROVIDER-UI",version:m.getModuleVersion("openaiProviderUi")||m.release.version,status:"Loaded",decision:"055",secretValueInputAllowed:false,automaticPaidActivationAllowed:false,loadedAt:i.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
