// ============================================================
// SkyBlockHaven Forums — threads, replies, pinning, locking
// Client-only demo (localStorage), same pattern as js/auth.js. A real
// launch should move this to a backend so threads/replies are shared
// across everyone's browser instead of living only on each device.
// ============================================================

const FORUM_CATEGORIES = ["Announcements", "General", "Support", "Suggestions", "Off-Topic"];

// Only staff (tier <= 6, i.e. Helper and above) can post in Announcements.
const ANNOUNCEMENTS_MIN_TIER = 6;

function forumId(){
    return "t_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}

const defaultThreads = [
    {
        id: "t_seed1", category: "Announcements", title: "Welcome to the SkyBlockHaven Forums!",
        body: "Use this space to talk strategy, report bugs, suggest features, or just hang out. Be respectful — full rules are on the Rules page.",
        author: "Crushen", createdAt: "2025-01-05T12:00:00.000Z", pinned: true, locked: false, replies: []
    },
    {
        id: "t_seed2", category: "General", title: "What's everyone building right now?",
        body: "Drop a screenshot or just tell us what you're working on this week!",
        author: "Tanbak", createdAt: "2025-02-10T18:30:00.000Z", pinned: false, locked: false, replies: []
    }
];

function getThreads(){
    let stored = localStorage.getItem("skyblockhaven_forumThreads");
    if(!stored){
        localStorage.setItem("skyblockhaven_forumThreads", JSON.stringify(defaultThreads));
        return JSON.parse(JSON.stringify(defaultThreads));
    }
    return JSON.parse(stored);
}

function saveThreads(threads){
    localStorage.setItem("skyblockhaven_forumThreads", JSON.stringify(threads));
}

function findThread(id){
    return getThreads().find(t => t.id === id);
}

function createThread(category, title, body, author){
    title = String(title || "").trim().slice(0, 120);
    body = String(body || "").trim().slice(0, 4000);
    if(!title || !body) return { ok:false, error:"Title and body are required." };
    if(!FORUM_CATEGORIES.includes(category)) return { ok:false, error:"Invalid category." };

    if(category === "Announcements"){
        let user = currentUser();
        let tier = (ROLES[user?.role] || {}).tier ?? 9;
        if(tier > ANNOUNCEMENTS_MIN_TIER) return { ok:false, error:"Only staff can post in Announcements." };
    }

    let threads = getThreads();
    let thread = {
        id: forumId(), category, title, body, author,
        createdAt: nowISO(), pinned: false, locked: false, replies: []
    };
    threads.unshift(thread);
    saveThreads(threads);
    return { ok:true, thread };
}

function addReply(threadId, author, body){
    body = String(body || "").trim().slice(0, 4000);
    if(!body) return { ok:false, error:"Reply cannot be empty." };

    let threads = getThreads();
    let thread = threads.find(t => t.id === threadId);
    if(!thread) return { ok:false, error:"Thread not found." };
    if(thread.locked) return { ok:false, error:"This thread is locked." };

    thread.replies.push({ id: forumId(), author, body, createdAt: nowISO() });
    saveThreads(threads);
    if(typeof addNotification === "function" && thread.author !== author){
        addNotification(thread.author, author + " replied to your thread \"" + thread.title + "\"", "forums.html#thread=" + thread.id);
    }
    return { ok:true };
}

function togglePin(threadId){
    let threads = getThreads();
    let thread = threads.find(t => t.id === threadId);
    if(!thread) return;
    thread.pinned = !thread.pinned;
    saveThreads(threads);
}

function toggleLock(threadId){
    let threads = getThreads();
    let thread = threads.find(t => t.id === threadId);
    if(!thread) return;
    thread.locked = !thread.locked;
    saveThreads(threads);
}

function deleteThread(threadId){
    let threads = getThreads().filter(t => t.id !== threadId);
    saveThreads(threads);
}
