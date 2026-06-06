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

        const bodyText = await response.text();

        if (!bodyText || bodyText.trim().length === 0) {
            throw new Error("The server returned an empty response. Check that your n8n workflow is active and the Gemini node is working.");
        }

        let data = null;
        try {
            let parsed = JSON.parse(bodyText);
            // n8n double-encodes when respondWith:"json" + JSON.stringify() — unwrap if needed
            if (typeof parsed === "string") {
                parsed = JSON.parse(parsed);
            }
            data = parsed;
        } catch {
            // Response is plain text — treat it as the resume content directly
            optimizedText = bodyText;
            atsScoreEl.textContent = "--";
        }

        if (data !== null) {
            if (data.success === false) {
                throw new Error(data.error || "Processing failed.");
            }
            optimizedText = data.text || data.optimizedResume || "";
            atsScoreEl.textContent = data.atsScore || "--";
        }

        if (!optimizedText || optimizedText.trim().length < 10) {
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

function sanitizeForPDF(text) {
    return text
        .replace(/[‘’ʼ]/g, "'")
        .replace(/[“”«»]/g, '"')
        .replace(/—|―/g, '--')
        .replace(/–/g, '-')
        .replace(/[•●◆▪■‣]/g, '-')
        .replace(/…/g, '...')
        .replace(/ /g, ' ')
        .replace(/[^\x00-\xFF]/g, '');
}

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
    if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error("PDF library failed to load. Please try TXT format instead.");
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const mx = 50;
    const maxW = pageW - mx * 2;
    let y = mx;

    const navy  = [26,  54,  93];
    const blue  = [28,  78, 140];
    const dgray = [60,  60,  60];
    const lgray = [110, 110, 110];
    const black = [30,  30,  30];

    function checkPage(h) { if (y + h > pageH - mx) { doc.addPage(); y = mx; } }

    const lines = text.split("\n").map(l => l.trimEnd());

    // ── Skip "CONTACT INFORMATION" if Gemini puts it first ──
    let startIdx = 0;
    for (let s = 0; s < Math.min(lines.length, 3); s++) {
        if (lines[s].trim().toUpperCase() === "CONTACT INFORMATION") { startIdx = s + 1; break; }
    }

    // ── Header: name / subtitle / contact ──
    let headerLines = [];
    let i = startIdx;

    // Skip any leading blank lines, then always treat the first non-empty line as the name
    while (i < lines.length && !lines[i].trim()) i++;
    if (i < lines.length) { headerLines.push(lines[i].trim()); i++; }

    // Collect subtitle and contact lines until a real section heading
    while (i < lines.length && headerLines.length < 5) {
        const t = lines[i].trim();
        if (!t) { if (headerLines.length > 1) { i++; break; } i++; continue; }
        if (isHeading(t)) break;
        headerLines.push(t);
        i++;
    }

    if (headerLines[0]) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(...navy);
        doc.text(headerLines[0], pageW / 2, y, { align: "center" });
        y += 28;
    }
    if (headerLines[1] && !isHeading(headerLines[1])) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(...dgray);
        doc.text(headerLines[1], pageW / 2, y, { align: "center" });
        y += 16;
    }

    // Contact lines — render remaining header lines (phone, email, website, etc.)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...lgray);
    for (let ci = 2; ci < headerLines.length; ci++) {
        const cl = headerLines[ci];
        if (cl) { doc.text(cl, pageW / 2, y, { align: "center" }); y += 13; }
    }

    // Separator
    y += 6;
    doc.setDrawColor(...blue);
    doc.setLineWidth(1.2);
    doc.line(mx, y, pageW - mx, y);
    y += 14;

    // ── Body ──
    for (; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) { y += 5; continue; }

        // Section heading
        if (isHeading(line)) {
            checkPage(28);
            if (y > mx + 20) y += 4;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.setTextColor(...blue);
            doc.text(line, mx, y);
            y += 4;
            doc.setDrawColor(...blue);
            doc.setLineWidth(0.5);
            doc.line(mx, y, pageW - mx, y);
            y += 12;
            doc.setTextColor(...black);
            continue;
        }

        // Bullet point
        if (line.startsWith("-")) {
            const content = line.slice(1).trim();
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(...black);
            const wrapped = doc.splitTextToSize(content, maxW - 14);
            checkPage(wrapped.length * 13);
            wrapped.forEach((wl, wi) => {
                if (wi === 0) doc.text("•", mx + 3, y);
                doc.text(wl, mx + 13, y);
                y += 13;
            });
            continue;
        }

        // Date line
        if (/\b(19|20)\d{2}\b/.test(line) && (line.includes(" - ") || /present/i.test(line))) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(...lgray);
            doc.text(line, mx, y);
            y += 13;
            continue;
        }

        // Job title / company — title-case short line → bold
        const wrapped = doc.splitTextToSize(line, maxW);
        const looksLikeTitle = line.length < 70 && /^[A-Z]/.test(line) && !/[.]{2,}/.test(line);
        doc.setFont("helvetica", looksLikeTitle ? "bold" : "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...black);
        checkPage(wrapped.length * 13);
        wrapped.forEach(wl => { doc.text(wl, mx, y); y += 13; });
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

    try {
        switch (selectedFormat) {
            case "pdf":
                generatePDF(sanitizeForPDF(optimizedText), fname);
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
    } catch (err) {
        console.error("Download generation failed:", err);
        showStep("error");
        errorMessage.textContent = "Download failed: " + (err.message || "unknown error");
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
