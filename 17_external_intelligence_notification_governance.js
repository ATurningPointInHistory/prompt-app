/* ============================================================
   FILE: 17_external_intelligence_notification_governance.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.15.0
   Phase 16: Human Attention / Notification Governance
   Primary Decision: 046
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal, state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("notificationGovernance");
  const CONFIG = VERSION_MANIFEST.notificationGovernance || {};
  ["notificationCandidates", "notificationThreads", "notificationDeliveries", "notificationFingerprintIndex"].forEach(function ensure(k) { if (!(state[k] instanceof Map)) state[k] = new Map(); });
  const LEVELS = new Set(CONFIG.levels || []), TYPES = new Set(CONFIG.types || []), STATES = new Set(CONFIG.deliveryStates || []), CHANNELS = new Set(CONFIG.initialChannels || ["IN_APP", "DASHBOARD"]);
  function upper(v,f){return internal.text(v,f||"").toUpperCase();}
  function iso(v){const t=Date.parse(internal.text(v,""));return Number.isFinite(t)?new Date(t).toISOString():null;}
  function validateRecord(contractKey,schemaId,record){const c=namespace.validateExternalIntelligenceContract(contractKey,record),s=namespace.validateExternalIntelligenceRecord(schemaId,record);return c.valid&&s.valid?null:{contract:c,schema:s};}
  function audit(type,outcome,details){if(typeof namespace.appendExternalIntelligenceAuditEvent==="function")namespace.appendExternalIntelligenceAuditEvent({eventType:type,actor:"Phase16 Notification",outcome:outcome,details:internal.clone(details||{})});}
  function levelRank(level){return (CONFIG.levels||[]).indexOf(level);}
  function getThread(id){const r=state.notificationThreads.get(internal.text(id,""));return r?internal.clone(r):null;}

  function ensureThread(input){
    const x=internal.isPlainObject(input)?input:{};
    const explicit=internal.text(x.notificationThreadId,"");
    if(explicit&&state.notificationThreads.has(explicit))return state.notificationThreads.get(explicit);
    const id=explicit||internal.nextId("EXTERNAL-010-NOTIFICATION-THREAD");
    const record=internal.deepFreeze({notificationThreadId:id,incidentKey:internal.text(x.incidentKey,id),notificationCount:0,lastNotificationId:null,lastMaterialFingerprint:null,lastUpdatedAt:internal.nowIso(),immutable:true});
    state.notificationThreads.set(id,record);return record;
  }
  function updateThread(thread,patch){const next=internal.deepFreeze(Object.assign({},internal.clone(thread),internal.clone(patch||{}),{lastUpdatedAt:internal.nowIso(),immutable:true}));state.notificationThreads.set(thread.notificationThreadId,next);return next;}

  function createCandidate(input){
    const x=internal.isPlainObject(input)?input:{};
    const type=upper(x.notificationType,"INFORMATION"), level=upper(x.level,"N1 - INFO").replace(/_/g," ");
    const canonicalLevel=(CONFIG.levels||[]).find(function match(v){return v===upper(x.level,"")||v.indexOf(upper(x.level,""))===0;})||upper(x.level,"N1_INFO");
    const normalizedLevel=LEVELS.has(canonicalLevel)?canonicalLevel:"N1_INFO";
    if(!TYPES.has(type))return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_TYPE_INVALID","Blocked",{notificationType:type});
    const thread=ensureThread(x);
    const fingerprint=internal.text(x.materialFingerprint,"")||[type,internal.text(x.sourceReferenceId,""),internal.text(x.title,"")].join("|");
    const priorId=state.notificationFingerprintIndex.get(thread.notificationThreadId+"::"+fingerprint);
    const materialUpdate=x.materialUpdate===true||x.severityChanged===true||x.officialConfirmation===true;
    const duplicate=Boolean(priorId&&!materialUpdate);
    const stateValue=duplicate?"SUPPRESSED":"CANDIDATE";
    const expiresAt=x.expiresAt?iso(x.expiresAt):null;
    const record=internal.deepFreeze({notificationCandidateId:internal.text(x.notificationCandidateId,"")||internal.nextId("EXTERNAL-010-NOTIFICATION"),notificationThreadId:thread.notificationThreadId,notificationType:type,level:normalizedLevel,severity:upper(x.severity,"INFO"),urgency:upper(x.urgency,"NORMAL"),materiality:upper(x.materiality,"MEDIUM"),sourceReferenceType:upper(x.sourceReferenceType,"MATERIAL_CHANGE"),sourceReferenceId:internal.text(x.sourceReferenceId,""),title:internal.text(x.title,"External Intelligence Update"),message:internal.text(x.message,""),materialFingerprint:fingerprint,materialUpdate:materialUpdate,duplicateOfNotificationId:priorId||null,deliveryState:stateValue,deliveryMode:upper(x.deliveryMode,normalizedLevel==="N5_CRITICAL"?"IMMEDIATE":"IN_APP"),requestedChannels:internal.unique((x.requestedChannels||["IN_APP"]).map(function(v){return upper(v,"");})),expiresAt:expiresAt,acknowledgementRequired:x.acknowledgementRequired===true||["N4_URGENT","N5_CRITICAL"].includes(normalizedLevel),acknowledgedAt:null,approvalGranted:false,executionAuthorityGranted:false,tradingAuthorityGranted:false,notificationEqualsRecommendation:false,acknowledgedEqualsApproved:false,createdAt:internal.nowIso(),immutable:true});
    const invalid=validateRecord("notificationCandidate","EXTERNAL-010-SCHEMA-NOTIFICATION-CANDIDATE",record);if(invalid)return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_CANDIDATE_INVALID","Blocked",invalid);
    state.notificationCandidates.set(record.notificationCandidateId,record);
    if(!duplicate)state.notificationFingerprintIndex.set(thread.notificationThreadId+"::"+fingerprint,record.notificationCandidateId);
    updateThread(thread,{notificationCount:thread.notificationCount+1,lastNotificationId:record.notificationCandidateId,lastMaterialFingerprint:fingerprint});
    audit(duplicate?"NOTIFICATION_DUPLICATE_SUPPRESSED":"NOTIFICATION_CANDIDATE_CREATED",stateValue,{notificationCandidateId:record.notificationCandidateId,notificationThreadId:record.notificationThreadId});
    return internal.buildResult(true,duplicate?"EXTERNAL010_NOTIFICATION_DUPLICATE_SUPPRESSED":"EXTERNAL010_NOTIFICATION_CANDIDATE_CREATED",stateValue,{notification:internal.clone(record),shouldNotify:!duplicate&&normalizedLevel!=="N0_RECORD_ONLY",detectedEqualsShouldNotify:false});
  }

  function replaceCandidate(id,patch){const current=state.notificationCandidates.get(id);if(!current)return null;const next=internal.deepFreeze(Object.assign({},internal.clone(current),internal.clone(patch||{}),{immutable:true}));state.notificationCandidates.set(id,next);return next;}

  function queueCandidate(input){
    const x=internal.isPlainObject(input)?input:{};const id=internal.text(x.notificationCandidateId,"");const current=state.notificationCandidates.get(id);if(!current)return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_NOT_FOUND","Blocked",null);
    if(current.deliveryState==="SUPPRESSED")return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_SUPPRESSED","Blocked",{notification:internal.clone(current)});
    if(current.expiresAt&&Date.now()>=Date.parse(current.expiresAt)){const expired=replaceCandidate(id,{deliveryState:"EXPIRED"});return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_EXPIRED","Expired",{notification:internal.clone(expired)});}
    const requested=internal.unique((x.channels||current.requestedChannels||["IN_APP"]).map(function(v){return upper(v,"");}));
    if(!requested.every(function ok(c){return CHANNELS.has(c);})){return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_EXTERNAL_CHANNEL_NOT_ENABLED","Blocked",{requestedChannels:requested,initialChannels:Array.from(CHANNELS)});}
    const next=replaceCandidate(id,{deliveryState:"QUEUED",requestedChannels:requested});
    return internal.buildResult(true,"EXTERNAL010_NOTIFICATION_QUEUED","Queued",{notification:internal.clone(next),externalTransmissionPerformed:false});
  }

  function recordDelivery(input){
    const x=internal.isPlainObject(input)?input:{};const id=internal.text(x.notificationCandidateId,"");const current=state.notificationCandidates.get(id);if(!current)return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_NOT_FOUND","Blocked",null);
    const channel=upper(x.channel,"IN_APP");if(!CHANNELS.has(channel))return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_CHANNEL_NOT_ENABLED","Blocked",{channel:channel});
    const deliveryState=upper(x.deliveryState,"DELIVERED");if(!STATES.has(deliveryState))return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_DELIVERY_STATE_INVALID","Blocked",{deliveryState:deliveryState});
    const delivery=internal.deepFreeze({notificationDeliveryId:internal.nextId("EXTERNAL-010-NOTIFICATION-DELIVERY"),notificationCandidateId:id,channel:channel,deliveryState:deliveryState,attemptedAt:internal.nowIso(),deliveredAt:deliveryState==="DELIVERED"?internal.nowIso():null,seenAt:null,acknowledgedAt:null,immutable:true});
    const invalid=validateRecord("notificationDelivery","EXTERNAL-010-SCHEMA-NOTIFICATION-DELIVERY",delivery);if(invalid)return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_DELIVERY_INVALID","Blocked",invalid);
    state.notificationDeliveries.set(delivery.notificationDeliveryId,delivery);replaceCandidate(id,{deliveryState:deliveryState});audit("NOTIFICATION_"+deliveryState,deliveryState,{notificationCandidateId:id,channel:channel});
    return internal.buildResult(true,"EXTERNAL010_NOTIFICATION_DELIVERY_RECORDED",deliveryState,{delivery:internal.clone(delivery),notificationSentEqualsDelivered:false});
  }

  function markSeen(id){const current=state.notificationCandidates.get(internal.text(id,""));if(!current)return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_NOT_FOUND","Blocked",null);const next=replaceCandidate(current.notificationCandidateId,{deliveryState:"SEEN",seenAt:internal.nowIso()});return internal.buildResult(true,"EXTERNAL010_NOTIFICATION_SEEN","Seen",{notification:internal.clone(next),seenEqualsAcknowledged:false});}
  function acknowledge(id){const current=state.notificationCandidates.get(internal.text(id,""));if(!current)return internal.buildResult(false,"EXTERNAL010_NOTIFICATION_NOT_FOUND","Blocked",null);const next=replaceCandidate(current.notificationCandidateId,{deliveryState:"ACKNOWLEDGED",acknowledgedAt:internal.nowIso(),approvalGranted:false,executionAuthorityGranted:false,acknowledgedEqualsApproved:false});audit("NOTIFICATION_ACKNOWLEDGED","Acknowledged",{notificationCandidateId:current.notificationCandidateId});return internal.buildResult(true,"EXTERNAL010_NOTIFICATION_ACKNOWLEDGED","Acknowledged",{notification:internal.clone(next),approvalGranted:false,executionAuthorityGranted:false});}

  function expireStale(now){const t=Date.parse(iso(now)||internal.nowIso());let count=0;state.notificationCandidates.forEach(function each(n,id){if(n.expiresAt&&Date.parse(n.expiresAt)<=t&&!["ACKNOWLEDGED","EXPIRED","CANCELLED"].includes(n.deliveryState)){replaceCandidate(id,{deliveryState:"EXPIRED"});count+=1;}});return internal.buildResult(true,"EXTERNAL010_NOTIFICATION_EXPIRATION_EVALUATED","Ready",{expiredCount:count});}
  function inbox(){return Array.from(state.notificationCandidates.values()).filter(function f(n){return n.deliveryState!=="SUPPRESSED";}).sort(function(a,b){const lr=levelRank(b.level)-levelRank(a.level);return lr!==0?lr:Date.parse(b.createdAt)-Date.parse(a.createdAt);}).map(internal.clone);}
  function dashboard(){const items=inbox();const counts={};items.forEach(function each(n){counts[n.deliveryState]=(counts[n.deliveryState]||0)+1;});return {total:items.length,critical:items.filter(function(n){return n.level==="N5_CRITICAL";}).length,unacknowledged:items.filter(function(n){return n.acknowledgementRequired&&!n.acknowledgedAt;}).length,states:counts,latest:items.slice(0,10),notificationIsExecutionAuthority:false};}
  function stateSummary(){return{candidateCount:state.notificationCandidates.size,threadCount:state.notificationThreads.size,deliveryCount:state.notificationDeliveries.size,inboxCount:inbox().length,initialChannels:Array.from(CHANNELS),version:MODULE_VERSION};}

  Object.assign(namespace.api,{createExternalIntelligenceNotificationCandidate:createCandidate,queueExternalIntelligenceNotificationCandidate:queueCandidate,recordExternalIntelligenceNotificationDelivery:recordDelivery,markExternalIntelligenceNotificationSeen:markSeen,acknowledgeExternalIntelligenceNotification:acknowledge,expireExternalIntelligenceNotifications:expireStale,listExternalIntelligenceNotificationInbox:inbox,getExternalIntelligenceNotificationDashboardSummary:dashboard,getExternalIntelligenceNotificationThread:getThread,getExternalIntelligenceNotificationState:stateSummary});
  Object.assign(namespace,namespace.api);
  namespace.modules.notificationGovernance={id:"EXTERNAL-010-NOTIFICATION-GOVERNANCE",version:MODULE_VERSION,status:"Ready",phase:16,decisions:["046"],stableNotificationCandidate:true,threading:true,deduplication:true,acknowledgementSeparateFromApproval:true,initialChannels:["IN_APP","DASHBOARD"],loadedAt:internal.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
