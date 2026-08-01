// ============================================================
// SkyBlockHaven Polls — one vote per account, staff-created
// Client-only demo (localStorage), same pattern as js/auth.js.
// ============================================================

const POLL_CREATE_MIN_TIER = 6; // Helper and above can create polls

function pollId(){
    return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
}

const defaultPolls = [
    {
        id: "p_seed1",
        question: "What should the next SkyBlockHaven event be?",
        options: [
            { id:"o1", text:"Build competition", votes: 0 },
            { id:"o2", text:"PvP tournament", votes: 0 },
            { id:"o3", text:"Community treasure hunt", votes: 0 }
        ],
        createdBy: "Crushen", createdAt: "2025-06-01T12:00:00.000Z",
        closesAt: null, votedBy: []
    }
];

function getPolls(){
    let stored = localStorage.getItem("skyblockhaven_polls");
    if(!stored){
        localStorage.setItem("skyblockhaven_polls", JSON.stringify(defaultPolls));
        return JSON.parse(JSON.stringify(defaultPolls));
    }
    return JSON.parse(stored);
}

function savePolls(polls){
    localStorage.setItem("skyblockhaven_polls", JSON.stringify(polls));
}

function findPoll(id){
    return getPolls().find(p => p.id === id);
}

function isPollClosed(poll){
    return !!(poll.closesAt && new Date(poll.closesAt).getTime() < Date.now());
}

function hasVoted(poll, username){
    return !!username && poll.votedBy.includes(username);
}

function createPoll(question, optionTexts, createdBy, closesAt){
    question = String(question || "").trim().slice(0, 200);
    let cleanOptions = (optionTexts || [])
        .map(t => String(t || "").trim().slice(0, 80))
        .filter(Boolean);

    if(!question) return { ok:false, error:"Question is required." };
    if(cleanOptions.length < 2) return { ok:false, error:"Provide at least 2 options." };

    let user = currentUser();
    let tier = (ROLES[user?.role] || {}).tier ?? 9;
    if(tier > POLL_CREATE_MIN_TIER) return { ok:false, error:"Only staff can create polls." };

    let polls = getPolls();
    let poll = {
        id: pollId(), question,
        options: cleanOptions.map((text, i) => ({ id: "o" + i, text, votes: 0 })),
        createdBy, createdAt: nowISO(),
        closesAt: closesAt || null, votedBy: []
    };
    polls.unshift(poll);
    savePolls(polls);
    return { ok:true, poll };
}

function votePoll(pollId, optionId, username){
    if(!username) return { ok:false, error:"Sign in to vote." };
    let polls = getPolls();
    let poll = polls.find(p => p.id === pollId);
    if(!poll) return { ok:false, error:"Poll not found." };
    if(isPollClosed(poll)) return { ok:false, error:"This poll is closed." };
    if(hasVoted(poll, username)) return { ok:false, error:"You already voted on this poll." };

    let option = poll.options.find(o => o.id === optionId);
    if(!option) return { ok:false, error:"Option not found." };

    option.votes += 1;
    poll.votedBy.push(username);
    savePolls(polls);
    return { ok:true };
}

function deletePoll(id){
    let polls = getPolls().filter(p => p.id !== id);
    savePolls(polls);
}
