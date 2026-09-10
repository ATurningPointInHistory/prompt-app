"use strict";
const path=require("node:path");
const {spawn}=require("node:child_process");
const {randomBytes}=require("node:crypto");
const cwd=__dirname;
const secret=randomBytes(32).toString("base64url");
const baseEnv={...process.env};
const fixture=spawn(process.execPath,[path.join(cwd,"phase6_fixture.cjs")],{cwd,env:{...baseEnv,EXTERNAL010_PHASE6_FIXTURE_PORT:"43130",EXTERNAL010_PHASE6_EXPECTED_SECRET:secret},stdio:["ignore","inherit","inherit"]});
const gateway=spawn(process.execPath,[path.join(cwd,"gateway.cjs")],{cwd,env:{...baseEnv,EXTERNAL010_GATEWAY_PORT:"43110",EXTERNAL010_ALLOWED_ORIGINS:"https://aturningpointinhistory.github.io,http://localhost:8000,http://127.0.0.1:8000",EXTERNAL010_ACQUISITION_ALLOWED_HOSTS:"127.0.0.1,localhost",EXTERNAL010_ALLOW_HTTP_ACQUISITION:"true",EXTERNAL010_SECRET_SECRET_PHASE6_TEST:secret},stdio:["ignore","inherit","inherit"]});
console.log("EXTERNAL-010 Phase 06 PC Runtime Launcher");
console.log("Fixture: http://127.0.0.1:43130");
console.log("Gateway: http://127.0.0.1:43110");
console.log("Provider Secret: generated in memory and not printed");
let stopping=false;
function stop(code){if(stopping)return;stopping=true;for(const child of [gateway,fixture]){if(child&&child.exitCode==null)child.kill("SIGTERM");}setTimeout(()=>process.exit(code||0),250).unref();}
process.on("SIGINT",()=>stop(0));process.on("SIGTERM",()=>stop(0));
gateway.on("exit",code=>{if(!stopping&&code!==0){console.error("Gateway exited unexpectedly:",code);stop(code||1);}});
fixture.on("exit",code=>{if(!stopping&&code!==0){console.error("Fixture exited unexpectedly:",code);stop(code||1);}});
