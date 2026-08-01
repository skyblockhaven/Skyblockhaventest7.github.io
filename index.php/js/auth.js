// ============================================================
// SkyBlockHaven Account System — roles, ranks, invites, moderation, history
// NOTE: This is still a client-only demo (localStorage). "Hashing" below
// only avoids storing raw plaintext — it is NOT real security, since
// anyone can read the JS source and localStorage in devtools. A real
// launch needs a backend that hashes/salts passwords server-side and
// checks permissions there too, not just in the browser.
// ============================================================

function simpleHash(str){
    let hash = 0;
    for(let i = 0; i < str.length; i++){
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return "h_" + hash.toString(36);
}

function today(){
    return new Date().toISOString().slice(0, 10);
}

function nowISO(){
    return new Date().toISOString();
}

// A user counts as "online" if they had activity on this site within the
// last 3 minutes. heartbeat() (below) refreshes lastActiveAt on every page
// load and every 60s while a signed-in user has a tab open, which is what
// keeps this current across the site.
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

function isOnline(entity){
    if(!entity || !entity.lastActiveAt) return false;
    return (Date.now() - new Date(entity.lastActiveAt).getTime()) < ONLINE_WINDOW_MS;
}

function relativeTime(iso){
    if(!iso) return "Never";
    const diffMs = Date.now() - new Date(iso).getTime();
    if(diffMs < 0) return "Just now";
    const min = Math.floor(diffMs / 60000);
    if(min < 1) return "Just now";
    if(min < 60) return min + "m ago";
    const hr = Math.floor(min / 60);
    if(hr < 24) return hr + "h ago";
    const day = Math.floor(hr / 24);
    if(day < 30) return day + "d ago";
    return new Date(iso).toISOString().slice(0, 10);
}

/* ---------------- Roles & Ranks ---------------- */

// Lower tier = more access. Permissions gate what a role can do.
const ROLES = {
    "Owner":               { tier: 1, perms: ["manage_site","manage_users","manage_roles","manage_ranks","view_logs","generate_invites","ban","timeout","manage_staff"] },
    "Co-Owner":            { tier: 2, perms: ["manage_staff","generate_invites","manage_users","view_logs","ban","timeout"] },
    "Administrator":       { tier: 3, perms: ["manage_users","manage_reports","ban","timeout","view_logs"] },
    "Developer":           { tier: 4, perms: ["dev_tools"] },
    "Development Team":    { tier: 4, perms: ["dev_tools"] },
    "Discord Admin":       { tier: 4, perms: ["discord_manage","manage_staff"] },
    "Builder":             { tier: 5, perms: ["build_tools"] },
    "Minecraft Moderator": { tier: 5, perms: ["reports","ban","timeout"] },
    "Discord Moderator":   { tier: 5, perms: ["discord_mod","timeout"] },
    "Discord Helper":      { tier: 6, perms: ["support"] },
    "Helper":              { tier: 6, perms: ["support"] },
    "Member":               { tier: 9, perms: [] }
};

const RANKS = ["Member", "VIP"];

const ROLE_COLORS = {
    "Owner":"#4cc9ff", "Co-Owner":"#4cc9ff", "Administrator":"#ef4444",
    "Developer":"#7c3aed", "Development Team":"#7c3aed", "Discord Admin":"#5865F2",
    "Builder":"#2ecc71", "Minecraft Moderator":"#2ecc71", "Discord Moderator":"#5865F2",
    "Discord Helper":"#5865F2", "Helper":"#38bdf8", "Member":"#94a3b8"
};
const RANK_COLORS = { "Member":"#94a3b8", "VIP":"#facc15" };

function roleBadge(role){
    const c = ROLE_COLORS[role] || "#94a3b8";
    return `<span class="badge" style="background:${c}22;color:${c};border-color:${c}66;">${role}</span>`;
}
// Renders either the uploaded avatar image or the emoji fallback,
// meant to sit inside a .avatar-circle element.
function avatarHtml(u){
    if(u.avatarImage) return `<img src="${u.avatarImage}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    return escapeHtml(u.avatar || "🧑‍🌾");
}

function rankBadge(rank){
    const c = RANK_COLORS[rank] || "#94a3b8";
    return `<span class="badge" style="background:${c}22;color:${c};border-color:${c}66;">${rank}</span>`;
}

function hasPermission(user, perm){
    if(!user || !ROLES[user.role]) return false;
    return ROLES[user.role].perms.includes(perm);
}

/* ---------------- Users ---------------- */

const defaultUsers = [
    {
        username: "Crushen", email: "", password: simpleHash("admin123"),
        rank: "VIP", role: "Owner", joined: "2025-01-01", invitedBy: "—",
        status: "Active", banned: false, timeout: false,
        history: [{ action:"Account created", date:"2025-01-01" }]
    },
    {
        username: "Tanbak", email: "", password: simpleHash("admin123"),
        rank: "VIP", role: "Co-Owner", joined: "2025-01-01", invitedBy: "—",
        status: "Active", banned: false, timeout: false,
        history: [{ action:"Account created", date:"2025-01-01" }]
    }
];

// Old role names from before this system existed — auto-upgraded so
// existing local accounts don't break.
const ROLE_MIGRATION = { "Admin": "Administrator", "Staff": "Helper", "Player": "Member" };

function migrateUser(u){
    if(ROLE_MIGRATION[u.role]) u.role = ROLE_MIGRATION[u.role];
    if(!ROLES[u.role]) u.role = "Member";
    if(!u.rank || !RANKS.includes(u.rank)) u.rank = "Member";
    if(!u.joined) u.joined = today();
    if(!u.invitedBy) u.invitedBy = "—";
    if(u.banned === undefined) u.banned = false;
    if(u.timeout === undefined) u.timeout = false;
    if(!u.status) u.status = u.banned ? "Banned" : "Active";
    if(!u.history) u.history = [];
    // Public-profile fields
    if(!u.avatar) u.avatar = "🧑‍🌾";
    if(u.avatarImage === undefined) u.avatarImage = null;
    if(u.bio === undefined) u.bio = "";
    if(!u.badges) u.badges = [];
    if(u.discordUsername === undefined) u.discordUsername = "";
    if(u.minecraftUsername === undefined) u.minecraftUsername = null;
    if(u.minecraftUUID === undefined) u.minecraftUUID = null;
    if(!u.lastOnline) u.lastOnline = u.joined + "T00:00:00.000Z";
    if(!u.lastActiveAt) u.lastActiveAt = u.lastOnline;
    return u;
}

function getUsers(){
    let stored = localStorage.getItem("skyblockhaven_users");
    if(!stored){
        localStorage.setItem("skyblockhaven_users", JSON.stringify(defaultUsers));
        return JSON.parse(JSON.stringify(defaultUsers));
    }
    let users = JSON.parse(stored).map(migrateUser);
    saveUsers(users);
    return users;
}

function saveUsers(users){
    localStorage.setItem("skyblockhaven_users", JSON.stringify(users));
}

function findUser(username){
    return getUsers().find(u => u.username === username);
}

// Always re-reads from storage so rank/role/ban changes made elsewhere
// (e.g. by an admin in another tab) show up immediately. Also ends the
// session automatically if the account was deleted or got banned since
// the user logged in — a banned/removed account should never stay
// "signed in" just because a stale session object is sitting in
// localStorage.
function currentUser(){
    let stored = JSON.parse(localStorage.getItem("skyblockhaven_currentUser") || "null");
    if(!stored) return null;
    let fresh = findUser(stored.username);
    if(!fresh || fresh.banned){
        localStorage.removeItem("skyblockhaven_currentUser");
        return null;
    }
    localStorage.setItem("skyblockhaven_currentUser", JSON.stringify(fresh));
    return fresh;
}

function requireRole(allowedRoles){
    let user = currentUser();
    if(!user){
        window.location.href = "login.html";
        return null;
    }
    if(!allowedRoles.includes(user.role)){
        alert("Your role (" + user.role + ") doesn't have access to this page.");
        window.location.href = "users.html";
        return null;
    }
    return user;
}

function requirePermission(perm){
    let user = currentUser();
    if(!user){
        window.location.href = "login.html";
        return null;
    }
    if(!hasPermission(user, perm)){
        alert("Your role (" + user.role + ") doesn't have permission to view this page.");
        window.location.href = "users.html";
        return null;
    }
    return user;
}

// Gate a page to any role at or above a given tier (lower tier number =
// more access, see ROLES above). Used by staff-only pages that aren't
// tied to one specific permission.
function requireTier(maxTier){
    let user = currentUser();
    if(!user){
        window.location.href = "login.html";
        return null;
    }
    let tier = (ROLES[user.role] || {}).tier ?? 9;
    if(tier > maxTier){
        alert("Your role (" + user.role + ") doesn't have access to this page.");
        window.location.href = "users.html";
        return null;
    }
    return user;
}

function logout(){
    if(currentUser()){
        let users = getUsers();
        let u = users.find(x => x.username === currentUser().username);
        if(u){ pushHistoryRaw(u, users, { action:"Logout" }); }
    }
    localStorage.removeItem("skyblockhaven_currentUser");
    window.location.href = "login.html";
}

/* ---------------- Site-wide session indicator ----------------
   Runs on every page that loads auth.js. Finds (or creates) a nav
   container with id="authArea" and keeps it in sync with the
   logged-in state:
     - logged out -> a single "Sign In" link
     - logged in  -> a profile chip (username + role badge) that
       links to the profiles page, plus a "Sign Out" button
   This is the ONLY place a session gets cleared besides the logout()
   function above — nothing here ever redirects on its own, so simply
   browsing between pages never logs anyone out. */

function escapeHtml(str){
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderSessionUI(){
    const nav = document.querySelector("nav");
    if(!nav) return;

    // Older cached pages / any leftover markup from before this used a
    // container div — normalize to a single #authArea element so we
    // never end up with two session widgets on the same page.
    document.querySelectorAll("#authLink").forEach(el => el.remove());

    let area = document.getElementById("authArea");
    if(!area){
        area = document.createElement("div");
        area.id = "authArea";
        nav.appendChild(area);
    }
    area.className = "auth-area";

    const user = currentUser();

    if(user){
        area.innerHTML =
            `<a href="profile.html?user=${encodeURIComponent(user.username)}" class="profile-chip" title="View your profile">` +
                `👤 <span class="profile-name">${escapeHtml(user.username)}</span> ` +
                roleBadge(user.role) +
            `</a>` +
            `<a href="#" id="signOutBtn" class="btn-auth signout">🚪 Sign Out</a>`;

        document.getElementById("signOutBtn").addEventListener("click", function(e){
            e.preventDefault();
            logout();
        });
    } else {
        area.innerHTML = `<a href="login.html" class="btn-auth">🔐 Sign In</a>`;
    }
}

// Marks the signed-in user as "online" by refreshing their lastActiveAt
// timestamp. isOnline() (above) treats anyone active in the last 3 minutes
// as online, so calling this on every page load plus every 60s while a tab
// stays open is enough to keep Users/Players "online now" status accurate
// without a real backend/websocket.
function heartbeat(){
    const stored = JSON.parse(localStorage.getItem("skyblockhaven_currentUser") || "null");
    if(!stored) return;
    let users = getUsers();
    let u = users.find(x => x.username === stored.username);
    if(!u || u.banned) return;
    u.lastActiveAt = nowISO();
    u.lastOnline = u.lastActiveAt;
    saveUsers(users);
}

function initSession(){
    heartbeat();
    renderSessionUI();
    setInterval(heartbeat, 60000);

    // Keep every open tab/page in sync: if the session is created or
    // cleared in one tab (sign in, sign out, or an admin banning the
    // current user elsewhere), every other open page picks it up
    // immediately instead of showing stale login state.
    window.addEventListener("storage", function(e){
        if(e.key === "skyblockhaven_currentUser" || e.key === "skyblockhaven_users" || e.key === "skyblockhaven_notifications"){
            renderSessionUI();
        }
    });
}

if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initSession);
} else {
    initSession();
}

/* ---------------- History logging ---------------- */

function getGlobalLog(){
    return JSON.parse(localStorage.getItem("skyblockhaven_globalLog") || "[]");
}

function saveGlobalLog(log){
    localStorage.setItem("skyblockhaven_globalLog", JSON.stringify(log));
}

// Adds an entry to both the user's own history and the global log,
// then persists the given users array.
function pushHistoryRaw(user, users, entry){
    entry.date = today();
    user.history.unshift(entry);
    let log = getGlobalLog();
    log.unshift(Object.assign({ user: user.username }, entry));
    saveGlobalLog(log);
    saveUsers(users);
}

function pushHistory(username, entry){
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u) return;
    pushHistoryRaw(u, users, entry);
}

/* ---------------- Invite codes ---------------- */

function getInvites(){
    let stored = localStorage.getItem("skyblockhaven_invites");
    if(!stored){
        let seed = [{ code:"SHB-7K92X", createdBy:"Crushen", rank:"VIP", role:"Member", maxUses:10, uses:0, expires:"2026-12-31" }];
        localStorage.setItem("skyblockhaven_invites", JSON.stringify(seed));
        return seed;
    }
    return JSON.parse(stored);
}

function saveInvites(invites){
    localStorage.setItem("skyblockhaven_invites", JSON.stringify(invites));
}

function inviteStatus(inv){
    if(inv.uses >= inv.maxUses) return "Exhausted";
    if(inv.expires && inv.expires < today()) return "Expired";
    return "Active";
}

function generateInviteCode(){
    return "SHB-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

function createInvite(rank, role, maxUses, expires, createdBy){
    let invites = getInvites();
    let invite = { code: generateInviteCode(), createdBy, rank, role, maxUses: Number(maxUses) || 1, uses: 0, expires };
    invites.unshift(invite);
    saveInvites(invites);
    return invite;
}

/* ---------------- Moderation ---------------- */

function banUser(username, reason, duration, staffName){
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u) return;
    u.banned = true;
    u.status = "Banned";
    pushHistoryRaw(u, users, { action:"Ban", reason: reason || "No reason given", duration: duration || "Not specified", staff: staffName });
    if(typeof addNotification === "function") addNotification(username, "You were banned by " + staffName + (reason ? ": " + reason : "."));
}

function unbanUser(username, staffName){
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u) return;
    u.banned = false;
    u.status = "Active";
    pushHistoryRaw(u, users, { action:"Unban", staff: staffName });
    if(typeof addNotification === "function") addNotification(username, "Your ban was lifted by " + staffName + ".");
}

function timeoutUser(username, reason, duration, staffName){
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u) return;
    u.timeout = true;
    pushHistoryRaw(u, users, { action:"Timeout", reason: reason || "No reason given", duration: duration || "Not specified", staff: staffName });
    if(typeof addNotification === "function") addNotification(username, "You were timed out by " + staffName + (reason ? ": " + reason : "."));
}

function removeTimeout(username, staffName){
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u) return;
    u.timeout = false;
    pushHistoryRaw(u, users, { action:"Timeout removed", staff: staffName });
    if(typeof addNotification === "function") addNotification(username, "Your timeout was removed by " + staffName + ".");
}

function setUserRank(username, rank, staffName){
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u) return;
    let old = u.rank;
    u.rank = rank;
    if(old !== rank){
        pushHistoryRaw(u, users, { action:"Rank changed", detail: old + " → " + rank, staff: staffName });
        if(typeof addNotification === "function") addNotification(username, "Your rank was changed to " + rank + " by " + staffName + ".");
    }
}

function setUserRole(username, role, staffName){
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u) return;
    let old = u.role;
    u.role = role;
    if(old !== role){
        pushHistoryRaw(u, users, { action:"Role changed", detail: old + " → " + role, staff: staffName });
        if(typeof addNotification === "function") addNotification(username, "Your role was changed to " + role + " by " + staffName + ".");
    }
}

/* ---------------- Minecraft players ----------------
   MOCK DATA: this project has no live connection to an actual Minecraft
   server, so getPlayers()/savePlayers() work exactly like getUsers() above
   — seeded into localStorage on first load. A real launch would replace
   the body of getPlayers() with a fetch() to a small server-side API (e.g.
   a plugin that exposes join/seen/playtime data, or a shared database
   table the MC server writes to) and everything downstream — players.html,
   account linking, public MC stats on profiles — keeps working unchanged. */

function fakeUUID(seed){
    let x = 0;
    for(let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
    if(!x) x = 1;
    let hex = "";
    for(let i = 0; i < 32; i++){
        x = (x * 1103515245 + 12345) >>> 0;
        hex += (x % 16).toString(16);
    }
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

function minutesAgoISO(min){
    return new Date(Date.now() - min * 60000).toISOString();
}

const defaultPlayers = [
    { username:"Crushen",       firstJoined:"2025-01-02", lastSeen: minutesAgoISO(1),    playtimeHours: 812, currentServer:"SMP",      online:true  },
    { username:"Tanbak",        firstJoined:"2025-01-03", lastSeen: minutesAgoISO(4),     playtimeHours: 640, currentServer:"SMP",      online:true  },
    { username:"Bl0cksmith",    firstJoined:"2025-02-14", lastSeen: minutesAgoISO(1800),  playtimeHours: 210, currentServer:"—",        online:false },
    { username:"EnderQueen99",  firstJoined:"2025-03-01", lastSeen: minutesAgoISO(15),    playtimeHours: 388, currentServer:"SMP",      online:true  },
    { username:"Pix3lPanda",    firstJoined:"2025-03-20", lastSeen: minutesAgoISO(4300),  playtimeHours: 76,  currentServer:"—",        online:false },
    { username:"RedstoneRick",  firstJoined:"2025-04-11", lastSeen: minutesAgoISO(60000), playtimeHours: 512, currentServer:"—",        online:false },
    { username:"MossyGolem",    firstJoined:"2025-05-05", lastSeen: minutesAgoISO(9),     playtimeHours: 129, currentServer:"Anarchy",  online:true  },
    { username:"SkyWanderer",   firstJoined:"2025-06-18", lastSeen: minutesAgoISO(2600),  playtimeHours: 45,  currentServer:"—",        online:false }
];

function migratePlayer(p){
    if(!p.uuid) p.uuid = fakeUUID(p.username);
    return p;
}

function getPlayers(){
    let stored = localStorage.getItem("skyblockhaven_players");
    if(!stored){
        let seeded = defaultPlayers.map(migratePlayer);
        localStorage.setItem("skyblockhaven_players", JSON.stringify(seeded));
        return seeded;
    }
    let players = JSON.parse(stored).map(migratePlayer);
    return players;
}

function savePlayers(players){
    localStorage.setItem("skyblockhaven_players", JSON.stringify(players));
}

function findPlayerByUsername(mcUsername){
    if(!mcUsername) return null;
    return getPlayers().find(p => p.username.toLowerCase() === mcUsername.toLowerCase());
}

// Lightweight "liveness" simulation so players.html feels real when it
// auto-refreshes: nudges a couple of already-online players' lastSeen
// forward and occasionally flips one offline player online. Throttled so
// repeated calls (e.g. from a refresh timer) don't do this every tick.
function simulatePlayerActivity(){
    const key = "skyblockhaven_players_lastSim";
    const last = Number(localStorage.getItem(key) || 0);
    if(Date.now() - last < 15000) return;
    localStorage.setItem(key, String(Date.now()));

    let players = getPlayers();
    players.forEach(p => {
        if(p.online) p.lastSeen = nowISO();
    });
    if(Math.random() < 0.3){
        let offline = players.filter(p => !p.online);
        if(offline.length){
            let p = offline[Math.floor(Math.random() * offline.length)];
            p.online = true;
            p.lastSeen = nowISO();
            p.currentServer = Math.random() < 0.5 ? "SMP" : "Anarchy";
        }
    }
    savePlayers(players);
}

/* ---------------- Website ↔ Minecraft account linking ---------------- */

function linkMinecraftAccount(username, mcUsername, actorName){
    let player = findPlayerByUsername(mcUsername);
    if(!player) return { ok:false, error:"No Minecraft player with that username has joined the server." };

    let users = getUsers();
    let taken = users.find(x => x.minecraftUsername && x.minecraftUsername.toLowerCase() === player.username.toLowerCase() && x.username !== username);
    if(taken) return { ok:false, error:"That Minecraft account is already linked to another website account." };

    let u = users.find(x => x.username === username);
    if(!u) return { ok:false, error:"User not found." };

    u.minecraftUsername = player.username;
    u.minecraftUUID = player.uuid;
    pushHistoryRaw(u, users, { action:"Linked Minecraft account", detail: player.username, staff: actorName });
    return { ok:true };
}

function unlinkMinecraftAccount(username, actorName){
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u) return;
    let old = u.minecraftUsername;
    u.minecraftUsername = null;
    u.minecraftUUID = null;
    if(old) pushHistoryRaw(u, users, { action:"Unlinked Minecraft account", detail: old, staff: actorName });
}

/* ---------------- Public profile self-editing ---------------- */

function updateOwnProfile(username, fields){
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u) return;
    if(fields.bio !== undefined) u.bio = String(fields.bio).slice(0, 280);
    if(fields.avatar !== undefined && String(fields.avatar).trim()) u.avatar = String(fields.avatar).trim().slice(0, 4);
    // avatarImage is a data: URL from the file-upload flow in profile.html.
    // Passing an explicit null clears it and falls back to the emoji avatar.
    if(fields.avatarImage !== undefined) u.avatarImage = fields.avatarImage;
    if(fields.discordUsername !== undefined) u.discordUsername = String(fields.discordUsername).slice(0, 40);
    pushHistoryRaw(u, users, { action:"Profile updated" });
}

/* ---------------- Badges (staff-assigned) ---------------- */

function addBadge(username, badge, actorName){
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u || !badge) return;
    badge = badge.trim().slice(0, 24);
    if(!badge || u.badges.includes(badge)) return;
    u.badges.push(badge);
    pushHistoryRaw(u, users, { action:"Badge added", detail: badge, staff: actorName });
    if(typeof addNotification === "function") addNotification(username, "You earned the \"" + badge + "\" badge!", "profile.html?user=" + encodeURIComponent(username));
}

function removeBadge(username, badge, actorName){
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u) return;
    u.badges = u.badges.filter(b => b !== badge);
    pushHistoryRaw(u, users, { action:"Badge removed", detail: badge, staff: actorName });
}

/* ---------------- Export ---------------- */

function toCSVValue(v){
    return `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
}

function exportUsersCSV(){
    const users = getUsers();
    const headers = ["username","rank","role","status","joined","lastOnline","minecraftUsername"];
    const rows = users.map(u => [u.username, u.rank, u.role, u.status, u.joined, u.lastOnline, u.minecraftUsername || ""]);
    const csv = headers.map(toCSVValue).join(",") + "\n" + rows.map(r => r.map(toCSVValue).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skyblockhaven-users.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

/* ---------------- Password reset (client-only demo) ----------------
   There is no email server here, so "sending" a code just means
   generating one and showing it on screen instead of emailing it — a
   real launch needs a backend to actually deliver this by email and
   should never render the code back to whoever is sitting at the
   browser, since that defeats the point of a reset code entirely. */

const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getResetTokens(){
    return JSON.parse(localStorage.getItem("skyblockhaven_resetTokens") || "{}");
}

function saveResetTokens(tokens){
    localStorage.setItem("skyblockhaven_resetTokens", JSON.stringify(tokens));
}

function requestPasswordReset(username){
    let user = findUser(username);
    if(!user) return { ok:false, error:"No account with that username." };
    let code = Math.floor(100000 + Math.random() * 900000).toString();
    let tokens = getResetTokens();
    tokens[username] = { code, expires: Date.now() + RESET_CODE_TTL_MS };
    saveResetTokens(tokens);
    return { ok:true, code, email: user.email || null };
}

function verifyResetCode(username, code){
    let tokens = getResetTokens();
    let t = tokens[username];
    if(!t) return { ok:false, error:"No reset request found for that username. Request a new code." };
    if(Date.now() > t.expires) return { ok:false, error:"This code has expired. Request a new one." };
    if(t.code !== String(code).trim()) return { ok:false, error:"Incorrect code." };
    return { ok:true };
}

function resetPassword(username, code, newPassword){
    let check = verifyResetCode(username, code);
    if(!check.ok) return check;
    if(!newPassword || newPassword.length < 4) return { ok:false, error:"Password must be at least 4 characters." };
    let users = getUsers();
    let u = users.find(x => x.username === username);
    if(!u) return { ok:false, error:"Account not found." };
    u.password = simpleHash(newPassword);
    pushHistoryRaw(u, users, { action:"Password reset" });
    let tokens = getResetTokens();
    delete tokens[username];
    saveResetTokens(tokens);
    return { ok:true };
}

/* ---------------- Login / Register form handlers ---------------- */

document
.getElementById("loginForm")
?.addEventListener("submit", function(e){

    e.preventDefault();

    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value;

    let users = getUsers();
    let user = users.find(u => u.username === username && u.password === simpleHash(password));

    if(!user){
        alert("Wrong username or password!");
        return;
    }

    if(user.banned){
        alert("This account is banned and cannot log in.");
        return;
    }

    user.lastActiveAt = nowISO();
    user.lastOnline = user.lastActiveAt;
    pushHistoryRaw(user, users, { action:"Login" });
    localStorage.setItem("skyblockhaven_currentUser", JSON.stringify(user));

    alert("Welcome " + user.username);

    let tier = (ROLES[user.role] || {}).tier ?? 9;
    if(tier <= 3) window.location.href = "admin-dashboard.html";
    else if(tier <= 6) window.location.href = "staff-dashboard.html";
    else window.location.href = "users.html";

});


document
.getElementById("registerForm")
?.addEventListener("submit", function(e){

    e.preventDefault();

    let username = document.getElementById("username").value.trim();
    let email = document.getElementById("email").value.trim();
    let password = document.getElementById("password").value;
    let confirmPassword = document.getElementById("confirmPassword").value;
    let inviteCode = document.getElementById("inviteCode")?.value.trim();

    if(!username || !email || !password || !inviteCode){
        alert("Please fill out all fields, including your invite code!");
        return;
    }

    if(password !== confirmPassword){
        alert("Passwords do not match!");
        return;
    }

    let users = getUsers();

    if(users.find(u => u.username === username)){
        alert("Username already exists!");
        return;
    }

    let invites = getInvites();
    let invite = invites.find(i => i.code.toLowerCase() === inviteCode.toLowerCase());

    if(!invite){
        alert("Invalid invite code.");
        return;
    }

    let status = inviteStatus(invite);
    if(status === "Expired"){ alert("This invite code has expired."); return; }
    if(status === "Exhausted"){ alert("This invite code has reached its maximum uses."); return; }

    let newUser = migrateUser({
        username, email, password: simpleHash(password),
        rank: invite.rank, role: invite.role,
        joined: today(), invitedBy: invite.code,
        status: "Active", banned: false, timeout: false, history: []
    });

    users.push(newUser);
    saveUsers(users);
    pushHistoryRaw(newUser, users, { action:"Invite used", detail: invite.code });
    pushHistoryRaw(newUser, users, { action:"Account created" });

    invite.uses += 1;
    saveInvites(invites);

    alert("Account created! Rank: " + newUser.rank + " · Role: " + newUser.role);
    window.location.href = "login.html";

});
