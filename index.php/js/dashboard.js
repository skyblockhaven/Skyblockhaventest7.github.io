function loadProfile(){
    const user = currentUser();
    if(!user){
        window.location.href = "login.html";
        return;
    }
    document.getElementById("profileName").innerHTML = user.username;
    document.getElementById("profileRole").innerHTML = user.role;
    document.getElementById("profileEmail").innerHTML = user.email || "Not added";
}

// Read-only account overview for the admin dashboard. Actual moderation
// (ban/timeout/rank/role changes) happens on each user's profile page
// (profile.html?user=...), where the permission checks and history
// logging already live — this just links there so we're not maintaining
// two copies of the same logic.
function loadAdminUsers(){
    const users = getUsers();
    const list = document.getElementById("userList");
    if(!list) return;

    list.innerHTML = "";

    users.forEach(u => {
        const statusClass = u.banned ? "banned" : (u.timeout ? "timeout" : "active");
        const statusLabel = u.banned ? "Banned" : (u.timeout ? "Timed out" : "Active");
        const online = isOnline(u);

        list.innerHTML += `
        <div class="card">
            <h3>${u.username}</h3>
            <p style="margin:8px 0;">${roleBadge(u.role)} ${rankBadge(u.rank)}</p>
            <p style="font-size:12.5px;color:#aaa;">
                <span class="status-dot ${statusClass}"></span>${statusLabel}
                ${online ? ' · <span style="color:#00ff01;">Online</span>' : ''}
            </p>
            <button onclick="window.location.href='profile.html?user=${encodeURIComponent(u.username)}'">Manage</button>
        </div>`;
    });
}

function loadAdminStats(){
    const grid = document.getElementById("statGrid");
    if(!grid) return;
    const users = getUsers();
    const invites = getInvites();
    const players = getPlayers();

    const stats = [
        { num: users.length, lbl: "Users" },
        { num: users.filter(u => u.role !== "Member").length, lbl: "Staff" },
        { num: users.filter(u => u.banned).length, lbl: "Banned" },
        { num: invites.filter(i => inviteStatus(i) === "Active").length, lbl: "Active invites" },
        { num: players.length, lbl: "MC Players" },
        { num: players.filter(p => p.online).length, lbl: "MC Online now" }
    ];

    grid.innerHTML = stats.map(s => `
        <div class="card stat-card">
            <div class="num">${s.num}</div>
            <div class="lbl">${s.lbl}</div>
        </div>`).join('');
}
