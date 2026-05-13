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

let downloadUrl = null;
let downloadFilename = "resume-ats.pdf";
let selectedFormat = null;
let uploadedFile = null;

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

    uploadedFile = file;
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
        formData.append("file", file);
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
            throw new Error(`Server error (${response.status})`);
        }

        setProcessingStep("finalize");
        setProgress(90, "Preparing your download...");

        const contentType = response.headers.get("content-type") || "";
        let blob;

        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (data.fileUrl) {
                downloadUrl = data.fileUrl;
            } else if (data.fileBase64) {
                const binary = atob(data.fileBase64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                const mimeType = data.mimeType || "application/pdf";
                blob = new Blob([bytes], { type: mimeType });
                downloadUrl = URL.createObjectURL(blob);
            } else if (data.text) {
                blob = new Blob([data.text], { type: "text/plain" });
                downloadUrl = URL.createObjectURL(blob);
            } else {
                throw new Error("Unexpected response format from server.");
            }
        } else {
            blob = await response.blob();
            downloadUrl = URL.createObjectURL(blob);
        }

        setProgress(100, "Done!");
        await sleep(500);

        showStep("complete");
    } catch (err) {
        console.error("Upload failed:", err);
        showStep("error");

        if (N8N_WEBHOOK_URL === "YOUR_N8N_WEBHOOK_URL_HERE") {
            errorMessage.textContent =
                "Webhook URL not configured. Update N8N_WEBHOOK_URL in script.js.";
        } else {
            errorMessage.textContent =
                err.message || "We couldn't process your file. Please try again.";
        }
    }
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// ── Download ──
downloadBtn.addEventListener("click", async () => {
    if (!selectedFormat) return;

    downloadLoading.classList.remove("hidden");
    downloadBtn.style.display = "none";

    try {
        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("filename", uploadedFile.name);
        formData.append("format", selectedFormat);

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Server error (${response.status})`);
        }

        const contentType = response.headers.get("content-type") || "";
        let blob;
        const fname = downloadFilename + "." + selectedFormat;

        if (contentType.includes("application/json")) {
            const data = await response.json();

            if (data.fileUrl) {
                triggerDownload(data.fileUrl, fname);
                downloadLoading.classList.add("hidden");
                downloadBtn.style.display = "inline-flex";
                return;
            } else if (data.fileBase64) {
                const binary = atob(data.fileBase64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                const mimeType = data.mimeType || "application/octet-stream";
                blob = new Blob([bytes], { type: mimeType });
            } else if (data.text) {
                blob = new Blob([data.text], { type: "text/plain" });
            } else {
                throw new Error("Unexpected response format.");
            }
        } else {
            blob = await response.blob();
        }

        const url = URL.createObjectURL(blob);
        triggerDownload(url, fname);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Download failed:", err);

        if (N8N_WEBHOOK_URL === "YOUR_N8N_WEBHOOK_URL_HERE") {
            alert("Webhook URL not configured. Update N8N_WEBHOOK_URL in script.js.");
        } else {
            alert("Failed to download: " + (err.message || "Unknown error"));
        }
    }

    downloadLoading.classList.add("hidden");
    downloadBtn.style.display = "inline-flex";
});

function triggerDownload(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ── Reset ──
convertAnother.addEventListener("click", resetToUpload);
tryAgain.addEventListener("click", resetToUpload);

function resetToUpload() {
    if (downloadUrl && downloadUrl.startsWith("blob:")) {
        URL.revokeObjectURL(downloadUrl);
    }
    downloadUrl = null;
    uploadedFile = null;
    selectedFormat = null;
    fileInput.value = "";
    showStep("upload");
}
