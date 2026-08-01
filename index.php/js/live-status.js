// ============================================================
// Live Minecraft server status — queries the free, public
// mcsrvstat.us API (no key needed, CORS-enabled) instead of the
// static/hardcoded "Online" text this project used to show.
// NOTE: this only works for servers that are actually reachable on
// the internet. If serverIP01/servers.html still points at a
// placeholder domain, this will correctly report it as offline —
// that's the API telling the truth, not a bug in this code.
// ============================================================

async function fetchServerStatus(address, bedrock){
    const base = bedrock ? "https://api.mcsrvstat.us/bedrock/3/" : "https://api.mcsrvstat.us/3/";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try{
        const res = await fetch(base + encodeURIComponent(address), { signal: controller.signal });
        clearTimeout(timeout);
        if(!res.ok) throw new Error("Status API returned " + res.status);
        const data = await res.json();
        return {
            ok: true,
            online: !!data.online,
            players: data.players ? { online: data.players.online, max: data.players.max } : null,
            version: data.version || null,
            motd: data.motd && data.motd.clean ? data.motd.clean.join(" ") : null
        };
    } catch(err){
        clearTimeout(timeout);
        return { ok:false, error: err.name === "AbortError" ? "Request timed out." : "Could not reach the status API." };
    }
}

// Renders live status into a target element for a given server address.
async function renderLiveStatus(targetId, address, bedrock){
    const el = document.getElementById(targetId);
    if(!el || !address) return;

    el.innerHTML = `<p class="thread-meta">⏳ Checking live status for <strong>${address}</strong>...</p>`;

    const status = await fetchServerStatus(address, bedrock);

    if(!status.ok){
        el.innerHTML = `<p class="thread-meta">⚠️ ${status.error} (Address: <strong>${address}</strong>)</p>`;
        return;
    }

    if(!status.online){
        el.innerHTML = `<div class="status-row"><span class="dot offline"></span><span>Offline (no response from <strong>${address}</strong>)</span></div>`;
        return;
    }

    el.innerHTML = `
        <div class="status-row"><span class="dot online"></span><span>Online</span></div>
        ${status.players ? `<p>Players: <strong>${status.players.online}/${status.players.max}</strong></p>` : ""}
        ${status.version ? `<p>Version: <strong>${status.version}</strong></p>` : ""}
        ${status.motd ? `<p>MOTD: <em>${status.motd}</em></p>` : ""}
    `;
}
