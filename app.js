import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

const pdfInput = document.getElementById("pdfInput");
const imageInput = document.getElementById("imageInput");
const canvas = document.getElementById("canvas");
const ctx = canvas?.getContext("2d");

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
  if (!chat) return;

  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = text;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function setStatus(text) {
  if (status) status.textContent = text;
}

async function renderPage() {
  if (!pdfDoc || !canvas || !ctx) return;

  try {
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

    if (pageInfo) {
      pageInfo.textContent =
        `Page ${currentPage} of ${pdfDoc.numPages}`;
    }
  } catch (error) {
    console.error(error);
    setStatus("PDF page load failed");
  }
}

/* PDF upload */
if (pdfInput) {
  pdfInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    try {
      setStatus("Loading PDF...");

      const data = new Uint8Array(
        await file.arrayBuffer()
      );

      pdfDoc = await pdfjsLib.getDocument({
        data
      }).promise;

      currentPage = 1;

      if (empty) empty.classList.add("hidden");
      if (pdfWrap) pdfWrap.classList.remove("hidden");

      await renderPage();

      setStatus("PDF ready");
    } catch (error) {
      console.error(error);
      setStatus("Could not open PDF");
      addMessage(
        "assistant",
        "PDF open nahi ho paya. Please try another PDF."
      );
    }
  });
}

/* Previous page */
if (prev) {
  prev.addEventListener("click", async () => {
    if (!pdfDoc || currentPage <= 1) return;

    currentPage--;
    await renderPage();
  });
}

/* Next page */
if (next) {
  next.addEventListener("click", async () => {
    if (!pdfDoc || currentPage >= pdfDoc.numPages) return;

    currentPage++;
    await renderPage();
  });
}

/* Zoom in */
if (zoomIn) {
  zoomIn.addEventListener("click", async () => {
    if (!pdfDoc) return;

    scale += 0.2;
    await renderPage();
  });
}

/* Zoom out */
if (zoomOut) {
  zoomOut.addEventListener("click", async () => {
    if (!pdfDoc || scale <= 0.6) return;

    scale -= 0.2;
    await renderPage();
  });
}

/* Text selection */
document.addEventListener("mouseup", () => {
  const text = window.getSelection()?.toString().trim();

  if (text && text.length > 0) {
    selectedText = text;

    if (selection) {
      selection.textContent =
        `Selected: ${text.slice(0, 200)}`;

      selection.classList.remove("hidden");
    }

    if (selectionPopup) {
      selectionPopup.classList.remove("hidden");
    }
  }
});

/* Ask selected text */
if (askSelected) {
  askSelected.addEventListener("click", () => {
    if (!question) return;

    question.value =
      "Explain this selected text simply: " +
      selectedText;

    question.focus();

    if (selectionPopup) {
      selectionPopup.classList.add("hidden");
    }
  });
}

/* Image upload */
if (imageInput) {
  imageInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    try {
      selectedImage = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(file);
      });

      addMessage(
        "assistant",
        "Question image selected. Now ask your question."
      );
    } catch (error) {
      console.error(error);
      addMessage(
        "assistant",
        "Question image load nahi ho payi."
      );
    }
  });
}

/* =========================
   MAIN SEND / ASK FUNCTION
   ========================= */

async function sendQuestion() {
  const q = question?.value.trim();

  if (!q && !selectedText && !selectedImage) {
    addMessage(
      "assistant",
      "Please pehle apna question likho."
    );
    return;
  }

  addMessage(
    "user",
    q || "Please explain the selected content."
  );

  if (question) {
    question.value = "";
  }

  setStatus("AI is thinking...");

  try {
    const response = await fetch("/api/ask", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        question: q,
        selectedText: selectedText,
        pageText: pageText,
        history: history.slice(-6),
        image: selectedImage
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "AI request failed"
      );
    }

    const answer =
      data.answer ||
      "AI ne koi answer return nahi kiya.";

    addMessage("assistant", answer);

    history.push({
      role: "user",
      content: q || "Explain selected content"
    });

    history.push({
      role: "assistant",
      content: answer
    });

    setStatus("Ready");

    selectedImage = null;
  } catch (error) {
    console.error("ASK ERROR:", error);

    addMessage(
      "assistant",
      "AI se connection nahi ho paya. Please thodi der baad try karo."
    );

    setStatus("AI request failed");
  }
}

/* IMPORTANT: Prevent page reload */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    await sendQuestion();
  });
}

/* Extra protection for Send buttons */
const sendButton = form?.querySelector(
  'button[type="submit"]'
);

if (sendButton) {
  sendButton.addEventListener("click", (e) => {
    e.preventDefault();
  });
}

/* Clear chat */
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (chat) chat.innerHTML = "";

    history = [];
    selectedText = "";
    selectedImage = null;

    if (question) {
      question.value = "";
    }

    setStatus("Ready");
  });
}

/* Floating AI button */
if (floatingAI && aiPanel) {
  floatingAI.addEventListener("click", () => {
    aiPanel.classList.toggle("hidden");

    if (!aiPanel.classList.contains("hidden")) {
      question?.focus();
    }
  });
}

/* Voice input */
if (voiceBtn) {
  voiceBtn.addEventListener("click", () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addMessage(
        "assistant",
        "Voice input is not supported in this browser."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setStatus("Listening...");
    };

    recognition.onresult = (event) => {
      const text =
        event.results[0][0].transcript;

      if (question) {
        question.value = text;
        question.focus();
      }

      setStatus("Ready");
    };

    recognition.onerror = (event) => {
      console.error(event);
      setStatus("Voice input failed");
    };

    recognition.onend = () => {
      setStatus("Ready");
    };

    recognition.start();
  });
}

setStatus("Ready");
