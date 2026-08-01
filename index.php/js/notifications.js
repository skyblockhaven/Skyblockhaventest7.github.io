// ============================================================
// SkyBlockHaven Notifications — per-user inbox + header bell
// Client-only demo (localStorage), same pattern as auth.js/forums.js.
// Loaded after auth.js on every page; the bell renders itself into
// the same #authArea that renderSessionUI() builds, so it only shows
// up once someone is signed in.
// ============================================================

function getAllNotifications(){
    return JSON.parse(localStorage.getItem("skyblockhaven_notifications") || "{}");
}

function saveAllNotifications(all){
    localStorage.setItem("skyblockhaven_notifications", JSON.stringify(all));
}

function getNotifications(username){
    if(!username) return [];
    return getAllNotifications()[username] || [];
}

// link is an optional relative URL (e.g. "profile.html?user=X") the
// notification should take you to when clicked.
function addNotification(username, message, link){
    if(!username) return;
    const all = getAllNotifications();
    if(!all[username]) all[username] = [];
    all[username].unshift({
        id: "n_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
        message, link: link || null, createdAt: new Date().toISOString(), read: false
    });
    all[username] = all[username].slice(0, 50); // cap per-user history
    saveAllNotifications(all);
}

function unreadCount(username){
    return getNotifications(username).filter(n => !n.read).length;
}

function markAllRead(username){
    if(!username) return;
    const all = getAllNotifications();
    if(!all[username]) return;
    all[username].forEach(n => n.read = true);
    saveAllNotifications(all);
}

/* ---------------- Bell UI ---------------- */

function closeNotifDropdown(){
    document.getElementById("notifDropdown")?.remove();
    document.removeEventListener("click", closeNotifDropdownOnOutsideClick);
}

function closeNotifDropdownOnOutsideClick(e){
    const dd = document.getElementById("notifDropdown");
    const bell = document.getElementById("notifBell");
    if(dd && !dd.contains(e.target) && e.target !== bell) closeNotifDropdown();
}

function toggleNotifDropdown(username){
    const existing = document.getElementById("notifDropdown");
    if(existing){ closeNotifDropdown(); return; }

    const items = getNotifications(username);
    const dd = document.createElement("div");
    dd.id = "notifDropdown";
    dd.className = "notif-dropdown";
    dd.innerHTML = items.length
        ? items.slice(0, 15).map(n => `
            <a class="notif-item ${n.read ? "" : "unread"}" href="${n.link || "#"}">
                <span class="notif-msg">${escapeHtml(n.message)}</span>
                <span class="notif-time">${relativeTime(n.createdAt)}</span>
            </a>`).join("")
        : `<p class="notif-empty">No notifications yet.</p>`;

    document.getElementById("notifBell")?.appendChild(dd);
    markAllRead(username);
    renderNotifBell();

    setTimeout(() => document.addEventListener("click", closeNotifDropdownOnOutsideClick), 0);
}

function renderNotifBell(){
    const nav = document.querySelector("nav");
    const area = document.getElementById("authArea");
    if(!nav || !area) return;

    const user = typeof currentUser === "function" ? currentUser() : null;
    document.getElementById("notifBell")?.remove();
    if(!user) return;

    const count = unreadCount(user.username);
    const bell = document.createElement("div");
    bell.id = "notifBell";
    bell.className = "notif-bell";
    bell.innerHTML = `🔔${count ? `<span class="notif-badge">${count > 9 ? "9+" : count}</span>` : ""}`;
    bell.addEventListener("click", function(e){
        e.stopPropagation();
        toggleNotifDropdown(user.username);
    });

    area.parentNode.insertBefore(bell, area);
}

// Re-render the bell whenever the session UI updates (login/logout in
// another tab, or on initial page load).
const _origRenderSessionUI = typeof renderSessionUI === "function" ? renderSessionUI : null;
if(_origRenderSessionUI){
    renderSessionUI = function(){
        _origRenderSessionUI();
        renderNotifBell();
    };
}
