AI Prompt OS One-Click Launcher v1.0.0
========================================

このランチャーは次の操作を自動化します。

1. C:\AI_Prompt_OS で
   py -m http.server 8000
   を起動

2. C:\AI_Prompt_OS\external_gateway で
   start_phase6_pc_runtime.bat
   を起動

3. 以下が起動するまで確認
   Web Server : 8000
   Gateway    : 43110
   Fixture    : 43130

4. 自動で
   http://localhost:8000/
   を既定ブラウザで開く

導入方法
--------
ZIP内の

- AI_Prompt_OS_Launcher.pyw
- Start_AI_Prompt_OS.bat

を C:\AI_Prompt_OS\ にコピーしてください。

普段は
Start_AI_Prompt_OS.bat
をダブルクリックするだけです。

おすすめ:
Start_AI_Prompt_OS.bat のショートカットをデスクトップに作成。

終了方法
--------
起動時に開いた

- Web Server用の黒い画面
- Gateway用の黒い画面

を閉じれば停止します。

重複起動対策
------------
8000 / 43110 / 43130 がすでに起動済みなら、
同じサービスを重複起動しません。

外部Pythonライブラリ
--------------------
不要です。Python標準機能のみ使用します。

注意
----
現在のGateway起動ファイルとして
start_phase6_pc_runtime.bat
を明示的に使用しています。

将来Canonical Gateway Launcher名が変更された場合は、
AI_Prompt_OS_Launcher.pyw 上部の GATEWAY_BAT を変更します。
