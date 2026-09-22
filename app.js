"use strict";

// このファイルはUI検証用です。コードの解析や計算は行いません。
const sampleCode = `#include <stdio.h>

int main(void) {
    int sum = 0;
    int i;

    for (i = 1; i <= 3; i++) {
        sum = sum + i;
    }

    printf("%d\\n", sum);
    return 0;
}`;

const historyEntries = [
  { time: "12:55", name: "ループ練習", result: "可視化できた", code: sampleCode, mode: "success" },
  { time: "12:47", name: "for文 練習", result: "あともう一歩", code: sampleCode.replace("sum = sum + i;", "sum = sum + i"), mode: "failure" },
  { time: "12:41", name: "printf 練習", result: "可視化できた", code: `#include <stdio.h>\n\nint main(void) {\n    printf("こんにちは\\n");\n    return 0;\n}`, mode: "success" }
];

// 同じ7行目に何度も戻ることで、for文の反復を体験できます。
const steps = [
  { line: 4, title: "最初の値を用意", detail: "合計を入れる sum を 0 にします。", change: "sum", before: "—", after: "0", next: "5行目：i を用意" },
  { line: 5, title: "数えるための変数を用意", detail: "繰り返しに使う i を用意します。", change: "i", before: "—", after: "未代入", next: "7行目：繰り返しを開始" },
  { line: 7, title: "繰り返しを開始", detail: "i を 1 にして、繰り返しを始めます。", change: "i", before: "未代入", after: "1", next: "7行目：条件を調べる" },
  { line: 7, title: "条件を調べる", detail: "i は 1。1 <= 3 は真なので、中の処理に進みます。", change: "i <= 3", before: "1 <= 3", after: "真", next: "8行目：sum を更新" },
  { line: 8, title: "合計を更新", detail: "現在の sum に i の 1 を加えます。", change: "sum", before: "0", after: "1", next: "7行目：i を増やす" },
  { line: 7, title: "i を増やす", detail: "一周したので、i を 1 増やします。", change: "i", before: "1", after: "2", next: "7行目：条件をもう一度調べる" },
  { line: 7, title: "条件をもう一度調べる", detail: "i は 2。2 <= 3 は真。もう一度、同じ行へ進みます。", change: "i <= 3", before: "2 <= 3", after: "真", next: "8行目：sum を更新" },
  { line: 8, title: "合計を更新", detail: "現在の sum に i の 2 を加えます。", change: "sum", before: "1", after: "3", next: "7行目：i を増やす" },
  { line: 7, title: "i を増やす", detail: "次の周回に向け、i を増やします。", change: "i", before: "2", after: "3", next: "7行目：条件を調べる" },
  { line: 7, title: "条件を調べる", detail: "i は 3。3 <= 3 は真です。", change: "i <= 3", before: "3 <= 3", after: "真", next: "8行目：sum を更新" },
  { line: 8, title: "合計を更新", detail: "現在の sum に i の 3 を加えます。", change: "sum", before: "3", after: "6", next: "7行目：i を増やす" },
  { line: 7, title: "i を増やす", detail: "i を 4 にします。", change: "i", before: "3", after: "4", next: "7行目：条件を調べる" },
  { line: 7, title: "ループを抜ける", detail: "4 <= 3 は偽。繰り返しが終わります。", change: "i <= 3", before: "4 <= 3", after: "偽", next: "11行目：結果を表示" },
  { line: 11, title: "結果を表示", detail: "sum の値 6 を表示します。", change: "出力", before: "—", after: "6", next: "12行目：処理を終了" },
  { line: 12, title: "処理を終了", detail: "最後までたどり着きました。", change: "sum", before: "6", after: "6", next: "ここで終了" }
];

const $ = (id) => document.getElementById(id);
const flow = $("flow-content");
const feedback = $("feedback");
const visualizeButton = $("visualize");
const demoMode = $("demo-mode");
const editor = CodeMirror.fromTextArea($("code-input"), {
  value: sampleCode,
  mode: "text/x-csrc",
  lineNumbers: true,
  matchBrackets: true,
  tabSize: 4,
  indentUnit: 4,
  gutters: ["CodeMirror-linenumbers", "execution-markers"]
});
editor.setValue(sampleCode);

let activeStep = -1;
let currentCursorLine = -1;
let highlightedLine = -1;
let resultCode = null;
let pendingRequest = 0;

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function setFeedback(kind, title, message, actionLabel, action) {
  feedback.replaceChildren();
  const card = element("div", `feedback-card ${kind}`);
  const description = element("div");
  description.append(element("strong", "", title), element("p", "", message));
  card.append(description);
  if (actionLabel) {
    const button = element("button", "feedback-action", actionLabel);
    button.type = "button";
    button.addEventListener("click", action);
    card.append(button);
  }
  feedback.append(card);
}

function showIdle(title, description, icon = "◎") {
  const box = element("div", "idle-state");
  box.append(element("span", "idle-icon", icon), element("h3", "", title), element("p", "", description));
  flow.replaceChildren(box);
  $("step-count").textContent = "— / —";
  $("step-prev").disabled = true;
  $("step-next").disabled = true;
}

// 編集カーソルの位置はガターだけに示し、実行位置と混同しないようにします。
function updateCursor() {
  const line = editor.getCursor().line;
  if (line === currentCursorLine) return;
  if (currentCursorLine >= 0 && currentCursorLine < editor.lineCount()) {
    editor.removeLineClass(currentCursorLine, "gutter", "CodeMirror-activeline-gutter");
  }
  currentCursorLine = line;
  editor.addLineClass(line, "gutter", "CodeMirror-activeline-gutter");
}

function showExecutionLine(lineNumber) {
  if (highlightedLine >= 0) {
    editor.removeLineClass(highlightedLine, "background", "CodeMirror-execution-line");
    editor.removeLineClass(highlightedLine, "gutter", "CodeMirror-execution-gutter");
    editor.setGutterMarker(highlightedLine, "execution-markers", null);
  }
  highlightedLine = lineNumber === null ? -1 : lineNumber - 1;
  if (highlightedLine < 0 || highlightedLine >= editor.lineCount()) return;
  editor.addLineClass(highlightedLine, "background", "CodeMirror-execution-line");
  editor.addLineClass(highlightedLine, "gutter", "CodeMirror-execution-gutter");
  const marker = element("span", "CodeMirror-execution-marker", "▶");
  marker.setAttribute("aria-label", "実行中");
  editor.setGutterMarker(highlightedLine, "execution-markers", marker);
  editor.scrollIntoView({ line: highlightedLine, ch: 0 }, 50);
}

function renderStep() {
  const step = steps[activeStep];
  showExecutionLine(step.line);
  const top = element("div", "step-top");
  top.append(element("span", "", `STEP ${String(activeStep + 1).padStart(2, "0")} / ${steps.length}`), element("span", "", `${step.line} 行目`));
  const track = element("div", "step-track");
  const fill = element("span");
  fill.style.width = `${(activeStep + 1) / steps.length * 100}%`;
  track.append(fill);
  const code = element("div", "step-code");
  code.append(element("small", "", "いま実行している行"), element("code", "", editor.getLine(step.line - 1)));
  const detail = element("div", "flow-detail");
  detail.append(element("small", "", "コンピュータはいま何をしている？"), element("h3", "", step.title), element("p", "", step.detail));
  const value = element("div", "value-card");
  value.append(element("strong", "", step.change), element("span", "", step.before), element("span", "", "→"), element("em", "", step.after));
  const next = element("div", "next-line");
  next.append(element("span", "", "次： "), element("strong", "", step.next));
  flow.replaceChildren(top, track, code, detail, value, next);
  $("step-count").textContent = `${activeStep + 1} / ${steps.length}`;
  $("step-prev").disabled = activeStep === 0;
  $("step-next").disabled = activeStep === steps.length - 1;
  if (activeStep === steps.length - 1) {
    setFeedback("success", "やった！ 最後までたどれました", "このデモの対応範囲で処理の流れを可視化できました。別の操作も試してみましょう。", "もう一度見る", () => { activeStep = 0; renderStep(); });
  } else {
    setFeedback("success", "可視化を始めました", "次へを押して、同じ行へ戻る様子を追ってみましょう。");
  }
}

function invalidateResult(message = "コードが変更されました。もう一度可視化してください。") {
  pendingRequest++;
  visualizeButton.disabled = false;
  visualizeButton.classList.remove("pressed");
  $("visualize-text").textContent = "コードを可視化する";
  activeStep = -1;
  resultCode = null;
  showExecutionLine(null);
  showIdle("更新を待っています", "コードとSTEPがずれないように、古い結果を閉じました。", "↻");
  setFeedback("stale", "もう一度、試せます", message, "可視化する", () => visualizeButton.click());
}

editor.on("cursorActivity", updateCursor);
editor.on("change", () => {
  if (resultCode !== null) invalidateResult();
});
updateCursor();
showIdle("準備ができました", "左のコードを見たり書き換えたりして、可視化ボタンを押してください。");

visualizeButton.addEventListener("pointerdown", () => visualizeButton.classList.add("pressed"));
for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
  visualizeButton.addEventListener(eventName, () => visualizeButton.classList.remove("pressed"));
}
visualizeButton.addEventListener("click", () => {
  const request = ++pendingRequest;
  const mode = demoMode.value;
  resultCode = editor.getValue();
  activeStep = -1;
  showExecutionLine(null);
  showIdle("受け付けました", "固定デモの結果を表示します。", "◌");
  setFeedback("processing", "操作を受け付けました", "結果を表示しています……");
  visualizeButton.disabled = true;
  $("visualize-text").textContent = "受け付けました";
  // 通信や解析待ちではなく、押下と結果の関係を見せる短い反応です。
  window.setTimeout(() => {
    if (request !== pendingRequest) return;
    visualizeButton.disabled = false;
    $("visualize-text").textContent = "もう一度可視化する";
    if (mode === "failure") {
      showIdle("あともう一歩！", "DEMO：8行目を確認する例です。入力コードの正誤を判定した結果ではありません。", "!");
      setFeedback("failure", "あともう一歩！", "DEMO：8行目の文末のセミコロンを確認してみましょう。直したら、もう一度可視化できます。", "8行目を見る", () => {
        editor.focus();
        editor.setCursor({ line: Math.min(7, editor.lineCount() - 1), ch: 0 });
        editor.scrollIntoView({ line: Math.min(7, editor.lineCount() - 1), ch: 0 }, 80);
      });
    } else {
      activeStep = 0;
      renderStep();
    }
  }, 180);
});

$("step-next").addEventListener("click", () => { if (activeStep >= 0 && activeStep < steps.length - 1 && editor.getValue() === resultCode) { activeStep++; renderStep(); } });
$("step-prev").addEventListener("click", () => { if (activeStep > 0 && editor.getValue() === resultCode) { activeStep--; renderStep(); } });
demoMode.addEventListener("change", () => { if (resultCode !== null) invalidateResult("DEMOの結果を切り替えました。もう一度可視化してください。"); });

const dialog = $("history-dialog");
for (const entry of historyEntries) {
  const item = element("button", "history-item");
  item.type = "button";
  item.append(element("strong", "", entry.name), element("small", "", `${entry.time}　${entry.result} · DEMO`));
  item.addEventListener("click", () => {
    editor.setValue(entry.code);
    demoMode.value = entry.mode;
    invalidateResult("履歴のコードを読み込みました。可視化すると、固定デモの結果が表示されます。");
    dialog.close();
    editor.focus();
  });
  $("history-list").append(item);
}
$("history-open").addEventListener("click", () => dialog.showModal());
$("history-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
