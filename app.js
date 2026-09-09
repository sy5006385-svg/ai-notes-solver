import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const pdfInput = document.getElementById("pdfInput");
const imageInput = document.getElementById("imageInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const pdfWrap = document.getElementById("pdfWrap");
const empty = document.getElementById("empty");
const pageInfo = document.getElementById("pageInfo");

const question = document.getElementById("question");
const form = document.getElementById("form");
const chat = document.getElementById("chat");
const status = document.getElementById("status");

const prev = document.getElementById("prev");
const next = document.getElementById("next");
const zoomIn = document.getElementById("zoomIn");
const zoomOut = document.getElementById("zoomOut");
const clearBtn = document.getElementById("clear");

const selection = document.getElementById("selection");
const askSelected = document.getElementById("askSelected");
const selectionPopup = document.getElementById("selectionPopup");

const voiceBtn = document.getElementById("voiceBtn");
const floatingAI = document.getElementById("floatingAI");
const aiPanel = document.getElementById("aiPanel");

let pdfDoc = null;
let currentPage = 1;
let scale = 1.4;
let pageText = "";
let selectedText = "";
let history = [];
let selectedImage = null;

function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function renderPage() {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(currentPage);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  const textContent = await page.getTextContent();

  pageText = textContent.items
    .map(item => item.str)
    .join(" ");

  pageInfo.textContent =
    `Page ${currentPage} of ${pdfDoc.numPages}`;
}

pdfInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const data = new Uint8Array(await file.arrayBuffer());

  pdfDoc = await pdfjsLib.getDocument({
    data
  }).promise;

  currentPage = 1;

  empty.classList.add("hidden");
  pdfWrap.classList.remove("hidden");

  await renderPage();
});

prev.addEventListener("click", async () => {
  if (!pdfDoc || currentPage <= 1) return;

  currentPage--;
  await renderPage();
});

next.addEventListener("click", async () => {
  if (!pdfDoc || currentPage >= pdfDoc.numPages) return;

  currentPage++;
  await renderPage();
});

zoomIn.addEventListener("click", async () => {
  if (!pdfDoc) return;

  scale += 0.2;
  await renderPage();
});

zoomOut.addEventListener("click", async () => {
  if (!pdfDoc || scale <= 0.6) return;

  scale -= 0.2;
  await renderPage();
});

document.addEventListener("mouseup", () => {
  const text = window.getSelection().toString().trim();

  if (text.length > 0) {
    selectedText = text;

    selection.textContent =
      `Selected: ${text.slice(0, 200)}`;

    selection.classList.remove("hidden");
    selectionPopup.classList.remove("hidden");
  }
});

askSelected.addEventListener("click", () => {
  question.value =
    "Explain this selected text simply: " + selectedText;

  question.focus();

  selectionPopup.classList.add("hidden");
});

imageInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  selectedImage = await new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.readAsDataURL(file);
  });

  addMessage(
    "assistant",
    "Question image selected. Now ask your question or
