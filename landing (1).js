// ---- same Drive config as sketch.js — keep these two in sync manually,
// since index.html doesn't load sketch.js (this page has no sliders) ----
const DRIVE_SCRIPT_URL = "PASTE_YOUR_APPS_SCRIPT_URL_HERE";
const DRIVE_SECRET = "changeme123";

const SAVED_EXPERIMENTS_KEY = "physicsPlaygroundExperiments";

function driveConfigured(){
    return DRIVE_SCRIPT_URL && DRIVE_SCRIPT_URL !== "PASTE_YOUR_APPS_SCRIPT_URL_HERE";
}

function getSavedExperiments(){
    try{
        return JSON.parse(localStorage.getItem(SAVED_EXPERIMENTS_KEY)) || [];
    }catch(e){
        return [];
    }
}

function setSavedExperiments(list){
    localStorage.setItem(SAVED_EXPERIMENTS_KEY, JSON.stringify(list));
}

function escapeHtml(str){
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function fetchExperimentsFromDrive(){
    const response = await fetch(DRIVE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "listExperiments", secret: DRIVE_SECRET })
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.error || "List failed");
    return result.experiments;
}

async function deleteExperimentFromDrive(id){
    const response = await fetch(DRIVE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "deleteExperiment", secret: DRIVE_SECRET, id })
    });
    const result = await response.json();
    if(!result.success) throw new Error(result.error || "Delete failed");
    return result.experiments;
}

function renderSavedExperiments(list){
    const grid = document.querySelector(".template-grid");
    const blankCard = document.querySelector(".template-card-blank");
    if(!grid) return;

    grid.querySelectorAll(".template-card-saved").forEach(el => el.remove());

    list.forEach(exp => {
        const card = document.createElement("div");
        card.className = "template-card template-card-saved";
        card.innerHTML = `
            <button type="button" class="delete-experiment-btn" title="Delete this saved experiment">&times;</button>
            <h2>${escapeHtml(exp.name)}</h2>
            <p class="template-desc">Your saved experiment</p>
            <div class="template-art template-art-placeholder">
                <span class="placeholder-icon">&#9881;&#65039;</span>
            </div>
            <a href="playground.html?experiment=${encodeURIComponent(exp.id)}" class="template-play-btn">Play experiment</a>
        `;

        card.querySelector(".delete-experiment-btn").addEventListener("click", async () => {
            if(!confirm(`Delete "${exp.name}"? This can't be undone.`)) return;

            if(driveConfigured()){
                try{
                    const updated = await deleteExperimentFromDrive(exp.id);
                    setSavedExperiments(updated);
                }catch(err){
                    alert("Couldn't delete from Drive: " + err.message);
                    return;
                }
            }else{
                setSavedExperiments(getSavedExperiments().filter(s => s.id !== exp.id));
            }
            card.remove();
        });

        if(blankCard){
            grid.insertBefore(card, blankCard);
        }else{
            grid.appendChild(card);
        }
    });
}

// ---- show the local (cached) list immediately, then refresh from Drive
// if configured, so the page never sits blank waiting on network ----
renderSavedExperiments(getSavedExperiments());

if(driveConfigured()){
    fetchExperimentsFromDrive()
        .then(list => {
            setSavedExperiments(list);
            renderSavedExperiments(list);
        })
        .catch(err => {
            console.warn("Couldn't refresh experiments from Drive:", err.message);
        });
}
