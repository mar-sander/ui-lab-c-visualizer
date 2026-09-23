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

const scanfCode = `#include <stdio.h>

int main(void) {
    int n;

    scanf("%d", &n);

    printf("%d\\n", n);
    return 0;
}`;

const samples = {
  for: { code: sampleCode, usesInput: false },
  scanf: { code: scanfCode, usesInput: true }
};

const historyEntries = [
  { time: "12:55", name: "ループ練習", result: "可視化できた", code: sampleCode, mode: "success", sample: "for" },
  { time: "12:47", name: "for文 練習", result: "あともう一歩", code: sampleCode.replace("sum = sum + i;", "sum = sum + i"), mode: "failure", sample: "for" },
  { time: "12:41", name: "printf 練習", result: "可視化できた", code: `#include <stdio.h>\n\nint main(void) {\n    printf("こんにちは\\n");\n    return 0;\n}`, mode: "success", sample: "custom" }
];

// 同じ7行目に何度も戻ることで、for文の反復を体験できます。
const forSteps = [
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
  { line: 11, title: "結果を表示", detail: "sum の値 6 を表示します。", change: "出力", before: "—", after: "6", next: "12行目：処理を終了", output: "6" },
  { line: 12, title: "処理を終了", detail: "最後までたどり着きました。", change: "sum", before: "6", after: "6", next: "ここで終了" }
];

// 入力値だけを差し替える、scanfサンプル専用の固定デモです。
function scanfSteps(value) {
  return [
    { line: 4, title: "入力先を用意", detail: "整数を入れる n を用意します。", change: "n", before: "—", after: "未代入", next: "6行目：入力値を受け取る" },
    { line: 6, title: "入力値を受け取る", detail: `scanf で入力値 ${value} を n に入れます。`, change: "n", before: "未代入", after: value, next: "8行目：n を表示" },
    { line: 8, title: "結果を表示", detail: `printf で n の値 ${value} を表示します。`, change: "出力", before: "—", after: value, next: "9行目：処理を終了", output: value },
    { line: 9, title: "処理を終了", detail: "入力した値が出力されました。", change: "n", before: value, after: value, next: "ここで終了" }
  ];
}

const $ = (id) => document.getElementById(id);
const flow = $("flow-content");
const feedback = $("feedback");
const visualizeButton = $("visualize");
const demoMode = $("demo-mode");
const sampleSelect = $("sample-select");
const scanfInput = $("scanf-input");
const outputCard = document.querySelector(".output-card");
const editor = CodeMirror.fromTextArea($("code-input"), {
  value: sampleCode,
  mode: "text/x-csrc",
  lineNumbers: true,
  matchBrackets: true,
  tabSize: 4,
  indentUnit: 4,
  gutters: ["CodeMirror-linenumbers"]
});
editor.setValue(sampleCode);

let activeStep = -1;
let currentCursorLine = -1;
let highlightedLine = -1;
let resultCode = null;
let resultInput = null;
let resultInputRaw = "";
let activeSample = "for";
let currentSteps = [];
let pendingRequest = 0;
let alignmentCheckPending = false;

// 表示幅変更後、各行のガター描画と本文の座標が実際にずれた場合だけ再計算します。
function checkEditorAlignment() {
  if (alignmentCheckPending) return;
  alignmentCheckPending = true;
  requestAnimationFrame(() => {
    alignmentCheckPending = false;
    const wrapper = editor.getWrapperElement();
    const gutters = wrapper.querySelector(".CodeMirror-gutters");
    const sizer = wrapper.querySelector(".CodeMirror-sizer");
    const scroll = wrapper.querySelector(".CodeMirror-scroll");
    const gutterRect = gutters.getBoundingClientRect();
    const numberRects = wrapper.querySelectorAll(".CodeMirror-code .CodeMirror-gutter-wrapper .CodeMirror-linenumber");
    const displacedNumber = Array.from(numberRects).some((number) => {
      const rect = number.getBoundingClientRect();
      return Math.abs(rect.left - gutterRect.left) > 1 || rect.right > gutterRect.right + 1;
    });
    if (Math.abs(sizer.getBoundingClientRect().left + scroll.scrollLeft - gutterRect.right) > 1 || displacedNumber) {
      editor.refresh();
    }
  });
}

// STEPの追跡では行の上下だけを移動し、先頭文字を隠す横スクロールを起こしません。
function scrollExecutionLineIntoView(line) {
  const { top, clientHeight } = editor.getScrollInfo();
  const linePosition = editor.charCoords({ line, ch: 0 }, "local");
  const margin = 50;
  let nextTop = top;
  if (linePosition.top < top + margin) nextTop = Math.max(0, linePosition.top - margin);
  else if (linePosition.bottom > top + clientHeight - margin) {
    nextTop = linePosition.bottom - clientHeight + margin;
  }
  editor.scrollTo(0, nextTop);
}

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

function setOutput(state, value = null) {
  const descriptions = {
    idle: "まだ出力されていません",
    progress: "printfへ進むと表示されます",
    stale: "更新前の出力を閉じました",
    failure: "出力は確定していません",
    ready: "printfで表示しました"
  };
  $("output-state").textContent = descriptions[state];
  $("output-value").textContent = state === "ready" ? value : "—";
  outputCard.classList.toggle("has-output", state === "ready");
}

function syncInputField() {
  const usesInput = samples[activeSample]?.usesInput ?? false;
  scanfInput.disabled = !usesInput;
  $("scanf-hint").textContent = usesInput
    ? "整数を1つ入力してください（UIモック用）"
    : "このサンプルでは使用しません";
}

function readDemoInput() {
  const raw = scanfInput.value.trim();
  if (!raw) return { error: "入力値（scanf）に整数を1つ入力してください。" };
  if (!/^[+-]?\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    return { error: "入力値（scanf）には整数を1つ入力してください。" };
  }
  return { value: String(Number(raw)) };
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
  $("quick-result").disabled = true;
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
  checkEditorAlignment();
}

function showExecutionLine(lineNumber) {
  if (highlightedLine >= 0) {
    editor.removeLineClass(highlightedLine, "background", "CodeMirror-execution-line");
    editor.removeLineClass(highlightedLine, "gutter", "CodeMirror-execution-gutter");
  }
  highlightedLine = lineNumber === null ? -1 : lineNumber - 1;
  if (highlightedLine < 0 || highlightedLine >= editor.lineCount()) return;
  editor.addLineClass(highlightedLine, "background", "CodeMirror-execution-line");
  editor.addLineClass(highlightedLine, "gutter", "CodeMirror-execution-gutter");
  scrollExecutionLineIntoView(highlightedLine);
  checkEditorAlignment();
}

function renderStep() {
  const step = currentSteps[activeStep];
  showExecutionLine(step.line);
  const top = element("div", "step-top");
  top.append(element("span", "", `STEP ${String(activeStep + 1).padStart(2, "0")} / ${currentSteps.length}`), element("span", "", `${step.line} 行目`));
  const track = element("div", "step-track");
  const fill = element("span");
  fill.style.width = `${(activeStep + 1) / currentSteps.length * 100}%`;
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
  $("step-count").textContent = `${activeStep + 1} / ${currentSteps.length}`;
  $("step-prev").disabled = activeStep === 0;
  $("step-next").disabled = activeStep === currentSteps.length - 1;
  $("quick-result").disabled = activeStep === currentSteps.length - 1;
  const printedStep = currentSteps.slice(0, activeStep + 1).reverse().find((item) => item.output !== undefined);
  setOutput(printedStep ? "ready" : "progress", printedStep?.output);
  if (activeStep === currentSteps.length - 1) {
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
  resultInput = null;
  resultInputRaw = "";
  currentSteps = [];
  showExecutionLine(null);
  setOutput("stale");
  showIdle("更新を待っています", "コードとSTEPがずれないように、古い結果を閉じました。", "↻");
  setFeedback("stale", "もう一度、試せます", message, "可視化する", () => visualizeButton.click());
}

editor.on("cursorActivity", updateCursor);
editor.on("change", () => {
  if (resultCode !== null) invalidateResult();
});
scanfInput.addEventListener("input", () => {
  if (resultCode !== null) invalidateResult("入力値が変更されました。もう一度可視化してください。");
});
sampleSelect.addEventListener("change", () => {
  activeSample = sampleSelect.value;
  scanfInput.value = "";
  syncInputField();
  editor.setValue(samples[activeSample].code);
  invalidateResult("サンプルを変更しました。もう一度可視化してください。");
});
updateCursor();
syncInputField();
window.addEventListener("resize", checkEditorAlignment);
window.visualViewport?.addEventListener("resize", checkEditorAlignment);
showIdle("準備ができました", "左のコードを見たり書き換えたりして、可視化ボタンを押してください。");

visualizeButton.addEventListener("pointerdown", () => visualizeButton.classList.add("pressed"));
for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
  visualizeButton.addEventListener(eventName, () => visualizeButton.classList.remove("pressed"));
}
visualizeButton.addEventListener("click", () => {
  const request = ++pendingRequest;
  const mode = demoMode.value;
  const input = activeSample === "scanf" ? readDemoInput() : null;
  if (activeSample === "custom" || input?.error) {
    resultCode = null;
    resultInput = null;
    resultInputRaw = "";
    currentSteps = [];
    activeStep = -1;
    showExecutionLine(null);
    setOutput("failure");
    const message = input?.error ?? "この履歴のコードには固定STEPがありません。ヘッダーからサンプルを選んでください。";
    showIdle("準備を確認しましょう", message, "!");
    setFeedback("failure", "あともう一歩！", message);
    return;
  }
  resultCode = editor.getValue();
  resultInput = input?.value ?? null;
  resultInputRaw = scanfInput.value.trim();
  currentSteps = activeSample === "scanf" ? scanfSteps(resultInput) : forSteps;
  activeStep = -1;
  showExecutionLine(null);
  setOutput("progress");
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
      const targetLine = activeSample === "scanf" ? 5 : 7;
      const hint = activeSample === "scanf"
        ? "DEMO：6行目のscanfと入力値の設定を確認してみましょう。"
        : "DEMO：8行目の文末のセミコロンを確認してみましょう。";
      setOutput("failure");
      showIdle("あともう一歩！", `${hint} 入力コードの正誤を判定した結果ではありません。`, "!");
      setFeedback("failure", "あともう一歩！", `${hint} 確認したら、もう一度可視化できます。`, `${targetLine + 1}行目を見る`, () => {
        editor.focus();
        const line = Math.min(targetLine, editor.lineCount() - 1);
        editor.setCursor({ line, ch: 0 });
        scrollExecutionLineIntoView(line);
      });
    } else {
      activeStep = 0;
      renderStep();
    }
  }, 180);
});

function hasCurrentResult() {
  return editor.getValue() === resultCode && scanfInput.value.trim() === resultInputRaw;
}

$("step-next").addEventListener("click", () => {
  if (activeStep < 0 || activeStep >= currentSteps.length - 1 || !hasCurrentResult()) return;
  activeStep++;
  renderStep();
});
$("step-prev").addEventListener("click", () => {
  if (activeStep <= 0 || !hasCurrentResult()) return;
  activeStep--;
  renderStep();
});
$("quick-result").addEventListener("click", () => {
  if (activeStep < 0 || !currentSteps.length || !hasCurrentResult()) return;
  activeStep = currentSteps.length - 1;
  renderStep();
});
demoMode.addEventListener("change", () => { if (resultCode !== null) invalidateResult("DEMOの結果を切り替えました。もう一度可視化してください。"); });

const dialog = $("history-dialog");
for (const entry of historyEntries) {
  const item = element("button", "history-item");
  item.type = "button";
  item.append(element("strong", "", entry.name), element("small", "", `${entry.time}　${entry.result} · DEMO`));
  item.addEventListener("click", () => {
    activeSample = entry.sample;
    sampleSelect.value = activeSample;
    scanfInput.value = "";
    syncInputField();
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
