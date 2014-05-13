gmacs2
======

Emacs like text editor working on web browser or web component

TODO list:

   * [X]画面を適当につくる
   * [X]keyEvent処理系をつくる（シーケンスのハンドリング）
   * [X]シーケンスとイベント処理の部分をつくる
   * [X]イベント処理で、画面に映すところをつくる
   * [X]複数入力のシーケンス処理を導入
      * [ ]キーシケンスの定義部分を独立化できるように
      * [ ]操作用関数リスト（I/F）
   * [X]日本語入力
   * [X]カーソル位置表示
   * スクロール処理
      * [X]一番下/上（ないし、設定された位置）であることの検知
      * [X]適切な量（ないし、設定された量）のスクロール実行
   * [ ]コピー&ペースト
	    * [ ]テキストの選択を可能にする -> mark & move
				* [X]マーク配置
				* [X]過去のマークへ移動
				* [X]カーソルとマークの置き換え 
        * [X]キルリングの導入
        * [X]カーソルとマークの間の文字列をカットしてキルリングへ(cut and push())
        * [X]カーソルとマークの間の文字列をコピーしてキルリングへ(copy and push())
        * [X]カーソルにキルリングの内容をペースト（not pop() but top())
        * [ ]カーソルにキルリングの内容をペースト直後、M-yで前のキル内容をペースト
           * [ ] 直前のコマンドを知る手段が必要 -> コマンドヒストリ -> keyEventMapに登録している関数はすべてコマンド
                                                                       コマンドは名前で呼べるようにする
																																			 コマンドをまとめるオブジェクトを用意する？
																																			 コマンド登録のI/Fを公開する?
																																			 などなど、コマンドI/Fの検討が必要になる。
																																			 いずれ、undoの対応もするはずだし。
																																			 -> ということでここでundo/redo対策も視野に入れながらコマンドヒストリを設計・実装する

				* [ ]transient mark mode(on/off)
			* [ ]何らかの処理を選択エリアに対して実行する仕組みと、それを使ったコピー/カット処理
			* [X]カーソル動作、テキスト追加、削除などの動作に対してイベントハンドリングの仕組みを導入する
			   * [X] テキスト変化イベント
            * [X] テキスト追加（->カーソル移動）
						* [X] テキスト削除（-> Deleteの場合はカーソル移動なし,backspaceはあり）
         * [X] カーソル移動イベント
            * [X] カーソル水平移動
						* [X] カーソル垂直移動
         * [X] ステータス表示にこれを使ってみる
				 * [ ] mark操作に対してもイベントを起こす

   * [ ]ステータス表示とmini-bufferをちゃんとする
      * [ ]ステータス表示はviewごとにある
         * [ ]viewは必ず一つのbufferを持つ
         * [ ]bufferは複数のviewを持ちうる
         * [ ]viewごとにカーソルがある
         * [ ]同じbufferを持つviewに対しても、変更は伝搬する
         * [ ]全viewに他のviewのカーソルもつっこんでおき、全viewに対してカーソルに対する処理を実行させればいいはず
      * [ ]mini-bufferのほうは、コマンド入力をサポートするダイアログという位置づけ
			   * [ ]まずはtransient-mark modeのon/offをしたいかも
   * [ ]ステータス表示とmini-bufferをちゃんとする
   * [ ]オブジェクトに分けることを考慮しつつ、複数Bufferを導入。
   * [ ]別ファイルnew/open
   * [ ]バッファ切り替え
   * [ ]分割バッファを導入
      * [ ]C-x 2
      * [ ]C-x ^
      * [ ]C-x 3
      * [ ]C-x { / }
   * [ ]mini-buffer（というか、モーダルダイアログ）
      * [ ]検索機能（incremental search / exp)
      * [ ]置換機能 
   * [ ]C-u 数字 コマンド
   * [ ]vimっぽい動作も可能にする
   * [ ]シンタックスハイライト
   * [ ]auto-indent
   * [ ]auto-completion
   * [ ]multiple-cursors
   * [ ]何らかの形で（仮想的な）ファイルシステムと連動。ローカルファイルも触れるとうれしい。
	 * [ ]undo/redo

