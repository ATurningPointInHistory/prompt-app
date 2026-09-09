AI Prompt OS Launcher v1.4.0 / Canonical Gateway
=================================================

目的
----
Phase依存のGateway起動を、通常運用用のCanonical Gatewayへ分離します。

旧:
external_gateway\start_phase6_pc_runtime.bat

これはPhase 06検証専用で、
Gateway + Phase 06 Fixture + 一時テストSecret
を起動します。

新:
external_gateway\start_external_gateway.bat

これは通常運用用で、
Gateway本体だけを起動します。

重要な分離
----------
通常運用:
start_external_gateway.bat

Phase 06 PC Real Runtime Validation:
start_phase6_pc_runtime.bat

既存のPhase 06検証ファイルは削除・変更しません。

追加ファイル
------------
external_gateway\start_external_gateway.bat
external_gateway\start_external_gateway.cjs

更新ファイル
------------
AI_Prompt_OS_Launcher.pyw
Start_AI_Prompt_OS.bat

ランチャー変更
--------------
[External Gateway付き起動]

Web Server
+
Canonical Gateway

を起動します。

Phase 06 Fixture 43130は通常モードでは起動しません。

安全境界
--------
Canonical Gateway Launcherは以下を維持します。

- Gateway port default: 43110
- localhost / 127.0.0.1:8000 をBrowser Originとして許可
- GitHub Pages Originを維持
- Provider Secret値を表示しない
- Secret値をBrowserへ渡す処理を追加しない
- Acquisition Host allowlistを勝手に拡張しない
- Acquisition Host未設定時はGateway側でfail-closed
- Phase 06のテストSecretを通常運用に生成しない
- Phase 06 Fixtureを通常運用に起動しない

導入
----
ZIPのフォルダ構造を維持して、

C:\AI_Prompt_OS\

へ上書きしてください。

配置後:

C:\AI_Prompt_OS\AI_Prompt_OS_Launcher.pyw
C:\AI_Prompt_OS\Start_AI_Prompt_OS.bat
C:\AI_Prompt_OS\external_gateway\start_external_gateway.bat
C:\AI_Prompt_OS\external_gateway\start_external_gateway.cjs

になります。

普段の起動
----------
Start_AI_Prompt_OS.bat

↓

通常起動
または
External Gateway付き起動

を選択します。

Phase 06検証
------------
Phase 06 Final Gate用のPC Real Runtime 27/27確認では、
Canonical Gatewayではなく従来どおり:

cd C:\AI_Prompt_OS\external_gateway
.\start_phase6_pc_runtime.bat

を使用してください。

Canonical Gatewayの狙い
-----------------------
今後Phase 07 / 08 / 09 ... と進んでも、
通常運用ランチャーがPhase番号へ依存しないようにすることです。

将来Gateway本体のCapabilityが増えても、
start_external_gateway.bat
をCanonical Entry Pointとして維持する構成を目標にします。
