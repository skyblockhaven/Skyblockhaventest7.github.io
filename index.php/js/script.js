const serverIP01 = "ender.skyblockhaven.com";

function copyIP01(){
    navigator.clipboard.writeText(serverIP01);
    alert("Server IP copied: " + serverIP01);
}

const serverIP02 = "";

function copyIP02(){
    navigator.clipboard.writeText(serverIP02);
    alert("Server IP copied: " + serverIP02);
}

// ===== Animated Browser Title =====
const titles = [
    "⛏️ SkyBlockHaven",
    "🌐 Join SkyBlockHaven",
    "🎮 Minecraft Server",
    "✨ Play Today!"
];

let titleIndex = 0;

setInterval(() => {
    document.title = titles[titleIndex];
    titleIndex = (titleIndex + 1) % titles.length;
}, 1500);

// ===== Typing Animation =====
const typing = document.getElementById("typing");

const text = [
    "Welcome to SkyBlockHaven",
    "The Ultimate Minecraft Network",
    "SkyBlockHaven • Survival • Events",
    "SkyBlockHaven SMP",
    "SkyBlockHaven",
    "SkyBlockHaven Discord",
    "SkyBlockHaven",
    "SkyBlockHaven Anarchy",
    "SkyBlockHaven ",
"SkyBlockHaven Network",
"SkyBlockHaven ",
"Join the SkyBlockHaven Discord to receive the latest updates, announcements, events, and server news.",
    "SkyBlockHaven ",
"SkyBlockHaven Website"
];

let textIndex = 0;
let charIndex = 0;
let deleting = false;

function typeEffect() {

    if (!typing) return;

    const current = text[textIndex];

    if (!deleting) {
        typing.textContent = current.substring(0, charIndex++);
    } else {
        typing.textContent = current.substring(0, charIndex--);
    }

    let speed = deleting ? 40 : 80;

    if (!deleting && charIndex > current.length) {
        deleting = true;
        speed = 1500;
    }

    if (deleting && charIndex < 0) {
        deleting = false;
        textIndex = (textIndex + 1) % text.length;
    }

    setTimeout(typeEffect, speed);
}

if (typing) {
    typeEffect();
}

// ===== Scroll Reveal =====
const observer = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }

    });

});

document.querySelectorAll("section, .card").forEach(el => {
    el.classList.add("hidden");
    observer.observe(el);
});

// ===== Floating Particles =====
const canvas = document.createElement("canvas");
canvas.id = "particles";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resize();

window.addEventListener("resize", resize);

const particles = [];

for (let i = 0; i < 80; i++) {

    particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5
    });

}

function animate() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#4cc9ff";

    particles.forEach(p => {

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

    });

    requestAnimationFrame(animate);

}

animate();

// ===== Smooth Navigation Highlight =====
document.querySelectorAll("nav a").forEach(link => {

    // Highlight the link matching the current page on load
    const page = window.location.pathname.split("/").pop() || "index.html";
    if (link.getAttribute("href") === page) {
        link.classList.add("active");
    }

    link.addEventListener("click", () => {

        document.querySelectorAll("nav a").forEach(a => {
            a.classList.remove("active");
        });

        link.classList.add("active");

        // Close the mobile menu after picking a link
        const nav = document.querySelector("nav");
        if (nav) nav.classList.remove("open");

    });

});

// ===== Hamburger Menu Toggle =====
const hamburgerBtn = document.getElementById("hamburgerBtn");
const navEl = document.querySelector("nav");
const headerEl = document.querySelector("header");

// The mobile dropdown positions itself at --header-height, measured live
// (rather than hardcoded) since the header's actual height varies with
// screen width and content. Measured only while nav is closed, since an
// open nav would include itself in the measurement.
function syncHeaderHeightVar(){
    if (!headerEl || (navEl && navEl.classList.contains("open"))) return;
    document.documentElement.style.setProperty("--header-height", headerEl.offsetHeight + "px");
}

if (hamburgerBtn && navEl) {

    syncHeaderHeightVar();
    window.addEventListener("resize", syncHeaderHeightVar);

    hamburgerBtn.addEventListener("click", () => {
        if (!navEl.classList.contains("open")) syncHeaderHeightVar();
        navEl.classList.toggle("open");
    });

}

// ===== Background Music Toggle (persists across page navigation) =====
const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");

if (bgMusic && musicToggle) {

    const savedState = localStorage.getItem("musicPlaying") === "true";
    const savedTime = parseFloat(localStorage.getItem("musicTime")) || 0;

    bgMusic.currentTime = savedTime;

    function setPlayingUI() {
        musicToggle.textContent = "🔊";
        musicToggle.classList.add("playing");
    }

    function setPausedUI() {
        musicToggle.textContent = "🔇";
        musicToggle.classList.remove("playing");
    }

    if (savedState) {
        bgMusic.play().then(setPlayingUI).catch(setPausedUI);
    } else {
        setPausedUI();
    }

    musicToggle.addEventListener("click", () => {

        if (bgMusic.paused) {
            bgMusic.play();
            setPlayingUI();
            localStorage.setItem("musicPlaying", "true");
        } else {
            bgMusic.pause();
            setPausedUI();
            localStorage.setItem("musicPlaying", "false");
        }

    });

    // Keep saved position up to date so the next page picks up where this one left off
    bgMusic.addEventListener("timeupdate", () => {
        localStorage.setItem("musicTime", bgMusic.currentTime);
    });

    window.addEventListener("beforeunload", () => {
        localStorage.setItem("musicTime", bgMusic.currentTime);
    });

}
