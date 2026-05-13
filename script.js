// ── Configuration ──
const N8N_WEBHOOK_URL = "https://vmi3226117.contaboserver.net/webhook/ats-resume-convert";

// ── DOM Elements ──
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const browseBtn = document.getElementById("browse-btn");
const progressFill = document.getElementById("progress-fill");
const progressStatus = document.getElementById("progress-status");
const progressPercent = document.getElementById("progress-percent");
const fileNameEl = document.getElementById("file-name");
const fileSizeEl = document.getElementById("file-size");
const downloadBtn = document.getElementById("download-btn");
const downloadBtnText = document.getElementById("download-btn-text");
const downloadSection = document.getElementById("download-section");
const downloadLoading = document.getElementById("download-loading");
const convertAnother = document.getElementById("convert-another");
const tryAgain = document.getElementById("try-again");
const errorMessage = document.getElementById("error-message");
const formatBtns = document.querySelectorAll(".format-btn");
const atsScoreEl = document.getElementById("ats-score");

let optimizedText = null;
let downloadFilename = "resume-ats";
let selectedFormat = null;

// ── Background Canvas ──
(function initCanvas() {
    const canvas = document.getElementById("bg-canvas");
    const ctx = canvas.getContext("2d");
    let particles = [];
    let mouse = { x: -1000, y: -1000 };

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    document.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.4 + 0.1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 150) {
                const force = (150 - dist) / 150;
                this.x -= (dx / dist) * force * 0.8;
                this.y -= (dy / dist) * force * 0.8;
                this.opacity = Math.min(0.8, this.opacity + 0.02);
            } else {
                this.opacity += (Math.random() * 0.4 + 0.1 - this.opacity) * 0.01;
            }

            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(108, 92, 231, ${this.opacity})`;
            ctx.fill();
        }
    }

    const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(108, 92, 231, ${0.06 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }

    animate();
})();

// ── Drop Zone Mouse Glow ──
dropZone.addEventListener("mousemove", (e) => {
    const rect = dropZone.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    dropZone.style.setProperty("--mouse-x", x + "%");
    dropZone.style.setProperty("--mouse-y", y + "%");
});

// ── File Handling ──
browseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
});

dropZone.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const ALLOWED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

function isValidFile(file) {
    const ext = "." + file.name.split(".").pop().toLowerCase();
    return ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);
}

function handleFile(file) {
    if (!isValidFile(file)) {
        showStep("error");
        errorMessage.textContent =
            "Unsupported file type. Please upload a PDF, DOC, or DOCX file.";
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showStep("error");
        errorMessage.textContent = "File is too large. Maximum size is 10 MB.";
        return;
    }

    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatFileSize(file.size);
    downloadFilename = file.name.replace(/\.[^.]+$/, "") + "-ats";

    showStep("processing");
    uploadFile(file);
}

// ── Step Navigation ──
function showStep(stepName) {
    document.querySelectorAll(".step").forEach((s) => s.classList.remove("active"));
    document.getElementById("step-" + stepName).classList.add("active");

    if (stepName === "processing") {
        resetProgress();
    }

    if (stepName === "complete") {
        resetFormatSelection();
    }
}

function resetFormatSelection() {
    selectedFormat = null;
    formatBtns.forEach((btn) => btn.classList.remove("selected"));
    downloadSection.classList.add("hidden");
    downloadLoading.classList.add("hidden");
}

function resetProgress() {
    progressFill.style.width = "0%";
    progressPercent.textContent = "0%";
    progressStatus.textContent = "Uploading...";
    document.querySelectorAll(".p-step").forEach((s) => {
        s.classList.remove("active", "done");
    });
}

function setProgress(percent, status) {
    progressFill.style.width = percent + "%";
    progressPercent.textContent = Math.round(percent) + "%";
    if (status) progressStatus.textContent = status;
}

function setProcessingStep(stepName) {
    const steps = ["upload", "extract", "convert", "finalize"];
    const idx = steps.indexOf(stepName);

    document.querySelectorAll(".p-step").forEach((el, i) => {
        el.classList.remove("active", "done");
        if (i < idx) el.classList.add("done");
        if (i === idx) el.classList.add("active");
    });
}

// ── Format Selection ──
formatBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        const format = btn.dataset.format;

        formatBtns.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");

        selectedFormat = format;
        downloadBtnText.textContent = "Download as " + format.toUpperCase();
        downloadSection.classList.remove("hidden");
    });
});

// ── Upload & Process ──
async function uploadFile(file) {
    try {
        setProcessingStep("upload");
        setProgress(10, "Uploading your resume...");

        const formData = new FormData();
        formData.append("resume", file);
        formData.append("filename", file.name);

        await sleep(400);
        setProgress(30, "Uploading your resume...");

        setProcessingStep("extract");
        setProgress(45, "Extracting content...");

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            body: formData,
        });

        setProcessingStep("convert");
        setProgress(70, "Converting to ATS format...");

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                errorData?.error || `Server error (${response.status})`
            );
        }

        setProcessingStep("finalize");
        setProgress(90, "Preparing your download...");

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (data.success === false) {
                throw new Error(data.error || "Processing failed.");
            }

            optimizedText = data.text || "";
            const score = data.atsScore || 0;
            atsScoreEl.textContent = score;
        } else {
            const text = await response.text();
            optimizedText = text;
            atsScoreEl.textContent = "--";
        }

        if (!optimizedText || optimizedText.length < 10) {
            throw new Error("The server returned an empty result. Please try again.");
        }

        setProgress(100, "Done!");
        await sleep(500);

        showStep("complete");
    } catch (err) {
        console.error("Upload failed:", err);
        showStep("error");
        errorMessage.textContent =
            err.message || "We couldn't process your file. Please try again.";
    }
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// ── File Generators ──

function isHeading(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return (
        trimmed === trimmed.toUpperCase() &&
        trimmed.length > 2 &&
        trimmed.length < 60 &&
        /^[A-Z]/.test(trimmed)
    );
}

function generatePDF(text, filename) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 50;
    const maxW = pageW - margin * 2;
    const bodySize = 10.5;
    const headingSize = 12;
    const lineGap = 5;

    let y = margin;

    const lines = text.split("\n");

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();

        if (line.trim() === "") {
            y += bodySize + lineGap;
            if (y > pageH - margin) { doc.addPage(); y = margin; }
            continue;
        }

        const heading = isHeading(line);
        const fontSize = heading ? headingSize : bodySize;
        const fontStyle = heading ? "bold" : "normal";

        doc.setFont("helvetica", fontStyle);
        doc.setFontSize(fontSize);

        if (heading && y > margin + 10) {
            y += 6;
        }

        const wrapped = doc.splitTextToSize(line, maxW);

        for (const wl of wrapped) {
            if (y > pageH - margin) { doc.addPage(); y = margin; }
            doc.text(wl, margin, y);
            y += fontSize + lineGap;
        }

        if (heading) {
            y += 2;
            doc.setDrawColor(180);
            doc.setLineWidth(0.5);
            doc.line(margin, y - 4, pageW - margin, y - 4);
        }
    }

    doc.save(filename);
}

function generateWordDoc(text, filename) {
    const paragraphs = text.split("\n").map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return "<p>&nbsp;</p>";
        if (isHeading(trimmed)) {
            return `<h2 style="font-size:13pt;font-weight:bold;color:#1a1a2e;border-bottom:1px solid #ccc;padding-bottom:3pt;margin-top:12pt;margin-bottom:4pt;">${escapeHtml(trimmed)}</h2>`;
        }
        if (trimmed.startsWith("-")) {
            return `<p style="margin-left:18pt;text-indent:-12pt;margin-top:2pt;margin-bottom:2pt;">${escapeHtml(trimmed)}</p>`;
        }
        return `<p style="margin-top:2pt;margin-bottom:2pt;">${escapeHtml(trimmed)}</p>`;
    });

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4;color:#222;margin:1in;}
h2{font-family:Calibri,Arial,sans-serif;}
p{font-family:Calibri,Arial,sans-serif;}
</style></head>
<body>${paragraphs.join("\n")}</body></html>`;

    const blob = new Blob(["﻿" + html], { type: "application/msword" });
    triggerBlobDownload(blob, filename);
}

function generateTXT(text, filename) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    triggerBlobDownload(blob, filename);
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ── Download ──
downloadBtn.addEventListener("click", () => {
    if (!selectedFormat || !optimizedText) return;

    const fname = downloadFilename + "." + selectedFormat;

    switch (selectedFormat) {
        case "pdf":
            generatePDF(optimizedText, fname);
            break;
        case "docx":
        case "doc":
            generateWordDoc(optimizedText, fname);
            break;
        case "txt":
        default:
            generateTXT(optimizedText, fname);
            break;
    }
});

// ── Reset ──
convertAnother.addEventListener("click", resetToUpload);
tryAgain.addEventListener("click", resetToUpload);

function resetToUpload() {
    optimizedText = null;
    selectedFormat = null;
    fileInput.value = "";
    showStep("upload");
}
