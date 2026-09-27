const TEXT_MODEL = "gemini-3.8-flash";
const TEXT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent`;
const HISTORY_KEY = "comiccraft_history_v2";
const SETTINGS_KEY = "comiccraft_settings_v2";

const $ = (id) => document.getElementById(id);

const els = {
  apiKeyInput: $("apiKeyInput"), apiStatus: $("apiStatus"), apiBadge: $("apiBadge"),
  storyPrompt: $("storyPrompt"), promptCount: $("promptCount"), protagonist: $("protagonist"),
  companion: $("companion"), genre: $("genre"), tone: $("tone"), artStyle: $("artStyle"),
  language: $("language"), sceneCount: $("sceneCount"), sceneCountValue: $("sceneCountValue"),
  generateBtn: $("generateBtn"), demoBtn: $("demoBtn"), randomIdeaBtn: $("randomIdeaBtn"),
  output: $("output"), emptyState: $("emptyState"), loadingCard: $("loadingCard"),
  loadingTitle: $("loadingTitle"), loadingText: $("loadingText"), progressBar: $("progressBar"),
  stepStory: $("stepStory"), stepArt: $("stepArt"), stepFinish: $("stepFinish"),
  storyTitle: $("storyTitle"), storyTagline: $("storyTagline"), characterStrip: $("characterStrip"),
  comicPanels: $("comicPanels"), toast: $("toast"), historyDrawer: $("historyDrawer"),
  historyList: $("historyList")
};

let currentStory = null;
let currentSettings = null;
let toastTimer = null;

const presets = {
  adventure: {
    prompt: "A student finds a mysterious map hidden inside an old library book. The map leads to a secret place beneath the college.",
    genre: "Adventure", tone: "Fun & energetic",
    protagonist: "Mira, a curious college student", companion: "Pixel, a tiny helpful robot"
  },
  mystery: {
    prompt: "Every night at exactly midnight, one classroom in a college building turns on by itself. Two friends decide to investigate.",
    genre: "Mystery", tone: "Mysterious",
    protagonist: "Anu, an observant student", companion: "Kavi, her funny best friend"
  },
  fantasy: {
    prompt: "A normal student discovers that the doodles in her notebook become real whenever she draws them with a glowing pen.",
    genre: "Fantasy", tone: "Heartwarming",
    protagonist: "Nila, an imaginative student", companion: "Mochi, a magical cat"
  },
  scifi: {
    prompt: "A student receives a message from her future self warning her about a strange event happening on campus tomorrow.",
    genre: "Science Fiction", tone: "Epic & dramatic",
    protagonist: "Tara, a young inventor", companion: "AX-7, an experimental robot"
  }
};

const randomIdeas = [
  "A quiet student discovers a tiny door behind a classroom notice board, and something inside knows her name.",
  "Two best friends accidentally activate an old college computer that can send messages to the future.",
  "A street-food seller discovers that every dish he makes gives the customer one magical memory.",
  "A shy photographer notices that one person in every photo is from a different timeline.",
  "A small robot gets lost on a college campus and secretly helps students solve their biggest problems."
];

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  bindEvents();
  updatePromptCount();
  updateSceneCount();
  renderHistory();
});

function bindEvents() {
  $("saveApiKeyBtn").addEventListener("click", saveApiKey);
  $("clearApiKeyBtn").addEventListener("click", clearApiKey);
  $("toggleKeyBtn").addEventListener("click", toggleKeyVisibility);
  $("themeBtn").addEventListener("click", toggleTheme);
  $("historyBtn").addEventListener("click", () => $("historyDrawer").classList.remove("hidden"));
  $("closeHistoryBtn").addEventListener("click", closeHistory);
  $("clearHistoryBtn").addEventListener("click", clearHistory);
  els.storyPrompt.addEventListener("input", updatePromptCount);
  els.sceneCount.addEventListener("input", updateSceneCount);
  els.randomIdeaBtn.addEventListener("click", fillRandomIdea);
  els.generateBtn.addEventListener("click", () => generateComic(false));
  els.demoBtn.addEventListener("click", () => generateComic(true));
  $("copyStoryBtn").addEventListener("click", copyStory);
  $("exportBtn").addEventListener("click", exportComicHTML);
  $("printBtn").addEventListener("click", () => window.print());
  $("favoriteStoryBtn").addEventListener("click", toggleFavoriteCurrent);

  document.querySelectorAll(".preset").forEach(btn => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset, btn));
  });

  els.storyPrompt.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      generateComic(false);
    }
  });
}

function loadSettings() {
  const settings = safeJSON(localStorage.getItem(SETTINGS_KEY), {});
  if (settings.theme === "light") document.body.classList.add("light");

  const key = localStorage.getItem("gemini_api_key");
  if (key) {
    els.apiKeyInput.value = key;
    setApiConnected(true);
  }
}

function saveApiKey() {
  const key = els.apiKeyInput.value.trim();
  if (!key) return setApiStatus("Please paste your Gemini API key.", false);
  localStorage.setItem("gemini_api_key", key);
  setApiConnected(true);
  setApiStatus("API key saved in this browser.", true);
  showToast("🔐 API key saved");
}

function clearApiKey() {
  localStorage.removeItem("gemini_api_key");
  els.apiKeyInput.value = "";
  setApiConnected(false);
  setApiStatus("API key cleared.", true);
  showToast("API key removed");
}

function setApiConnected(connected) {
  els.apiBadge.textContent = connected ? "Connected" : "Not connected";
  els.apiBadge.classList.toggle("ok", connected);
}

function setApiStatus(message, ok) {
  els.apiStatus.textContent = message;
  els.apiStatus.style.color = ok ? "var(--green)" : "var(--red)";
}

function toggleKeyVisibility() {
  els.apiKeyInput.type = els.apiKeyInput.type === "password" ? "text" : "password";
}

function toggleTheme() {
  document.body.classList.toggle("light");
  const theme = document.body.classList.contains("light") ? "light" : "dark";
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme }));
  $("themeBtn").textContent = theme === "light" ? "🌙" : "☀️";
}

function updatePromptCount() {
  els.promptCount.textContent = `${els.storyPrompt.value.length} / 1200`;
}

function updateSceneCount() {
  const n = Number(els.sceneCount.value);
  els.sceneCountValue.textContent = `${n} panels`;
}

function applyPreset(name, button) {
  const p = presets[name];
  if (!p) return;
  els.storyPrompt.value = p.prompt;
  els.protagonist.value = p.protagonist;
  els.companion.value = p.companion;
  els.genre.value = p.genre;
  els.tone.value = p.tone;
  document.querySelectorAll(".preset").forEach(x => x.classList.remove("active"));
  button.classList.add("active");
  updatePromptCount();
  showToast(`✨ ${capitalize(name)} preset loaded`);
}

function fillRandomIdea() {
  els.storyPrompt.value = randomIdeas[Math.floor(Math.random() * randomIdeas.length)];
  updatePromptCount();
  showToast("🎲 New story idea added");
}

function getSettings() {
  return {
    prompt: els.storyPrompt.value.trim(),
    protagonist: els.protagonist.value.trim() || "A curious young protagonist",
    companion: els.companion.value.trim() || "A loyal friend",
    genre: els.genre.value,
    tone: els.tone.value,
    artStyle: els.artStyle.value,
    language: els.language.value,
    sceneCount: Number(els.sceneCount.value)
  };
}

async function generateComic(isDemo) {
  const settings = getSettings();
  if (!settings.prompt) {
    showToast("📝 Please enter a story idea first.");
    els.storyPrompt.focus();
    return;
  }

  if (!isDemo && !localStorage.getItem("gemini_api_key")) {
    showToast("🔐 Save your Gemini API key first.");
    els.apiKeyInput.focus();
    return;
  }

  currentSettings = settings;
  setLoading(true, "Writing your comic story…", "AI is creating characters, scenes and dialogue.", 8);
  els.emptyState.classList.add("hidden");
  els.output.classList.add("hidden");
  els.comicPanels.innerHTML = "";
  els.characterStrip.innerHTML = "";

  try {
    const story = isDemo ? buildDemoStory(settings) : await generateStory(settings);
    currentStory = normalizeStory(story, settings);

    renderStoryHeader();
    renderCharacters();
    els.output.classList.remove("hidden");

    setLoading(true, "Planning comic artwork…", "Creating a visual prompt for each scene.", 32);
    await renderPanels();

    saveToHistory(currentStory, settings);
    setLoading(false);
    showToast("🎉 Your comic is ready!");
  } catch (error) {
    console.error(error);
    setLoading(false);
    els.emptyState.classList.remove("hidden");
    showToast(`❌ ${error.message || "Something went wrong."}`);
  }
}

async function generateStory(settings) {
  const apiKey = localStorage.getItem("gemini_api_key");
  const instruction = `
You are a professional comic writer and storyboard artist.

Create a short, visually consistent ${settings.genre} comic in ${settings.language}.
User idea: ${settings.prompt}
Main character: ${settings.protagonist}
Side character: ${settings.companion}
Mood: ${settings.tone}
Art style: ${settings.artStyle}
Number of panels: ${settings.sceneCount}

Return ONLY valid JSON matching this structure:
{
  "title": "short memorable title",
  "tagline": "one sentence hook",
  "characters": [
    {"name":"name","role":"role","description":"short visual description"}
  ],
  "scenes": [
    {
      "title":"scene title",
      "description":"detailed visual description for an image model",
      "caption":"short narration",
      "dialogue":"short natural dialogue",
      "sfx":"optional sound effect"
    }
  ]
}

Rules:
- Exactly ${settings.sceneCount} scenes.
- The scenes must form one continuous story with a clear beginning, middle and ending.
- Keep dialogue short enough to fit inside a comic speech bubble.
- Mention consistent character appearance in scene descriptions.
- Make every scene visually distinct and colorful.
- Do not put dialogue or text inside the image prompt unless it is part of the scene.
`;

  const response = await fetch(TEXT_API_URL, {
    method: "POST",
    headers: {"Content-Type":"application/json", "x-goog-api-key":apiKey},
    body: JSON.stringify({
      contents: [{parts: [{text: instruction}]}],
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 7000,
        responseMimeType: "application/json"
      }
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Gemini API request failed.");

  const text = extractGeminiText(data);
  if (!text) throw new Error("Gemini returned an empty response.");

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("The AI returned invalid story JSON. Please try again.");
  }
}

function extractGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.filter(part => typeof part.text === "string")
    .map(part => part.text)
    .join("") || "";
}

function buildDemoStory(settings) {
  const hero = settings.protagonist.split(",")[0] || "Mira";
  const friend = settings.companion.split(",")[0] || "Pixel";
  return {
    title: "The Secret Behind Room 404",
    tagline: "One ordinary evening turns into an unforgettable adventure.",
    characters: [
      {name: hero, role:"Protagonist", description:"curious student, expressive face, casual college outfit, small backpack"},
      {name: friend, role:"Companion", description:"playful best friend, colorful hoodie, clever smile"}
    ],
    scenes: [
      {title:"The Strange Signal",description:`${hero} sits in a quiet college corridor at sunset when a mysterious glowing signal appears on an old classroom door. ${friend} arrives with a shocked expression.`,caption:"It was supposed to be an ordinary evening…",dialogue:"Did that door just blink?",sfx:"BZZT!"},
      {title:"The Hidden Room",description:`${hero} and ${friend} open the glowing door and discover a secret room filled with floating books, colorful holograms and a tiny glowing machine.`,caption:"Behind the door was a world nobody knew existed.",dialogue:"Okay… this is definitely not in our syllabus.",sfx:"WHOOSH!"},
      {title:"The Choice",description:`The tiny machine projects a map showing that the hidden room is protecting the college from a storm of strange energy. ${hero} reaches toward the control panel while ${friend} watches nervously.`,caption:"They had only seconds to decide.",dialogue:"If we don't help, everyone is in danger.",sfx:"BEEP BEEP!"},
      {title:"A New Secret",description:`The storm fades into sparkling lights above the campus. ${hero} and ${friend} stand on the rooftop at sunrise, keeping the secret while the glowing machine rests safely in their backpack.`,caption:"Some adventures become the best stories you never tell.",dialogue:"Same time tomorrow?",sfx:"✨"}
    ].slice(0, settings.sceneCount)
  };
}

function normalizeStory(story, settings) {
  if (!story || !Array.isArray(story.scenes) || story.scenes.length === 0) {
    throw new Error("No scenes were generated.");
  }
  const scenes = story.scenes.slice(0, settings.sceneCount).map((s, i) => ({
    title: s.title || `Scene ${i + 1}`,
    description: s.description || "A colorful comic scene.",
    caption: s.caption || "",
    dialogue: s.dialogue || "",
    sfx: s.sfx || ""
  }));
  while (scenes.length < settings.sceneCount) {
    scenes.push({
      title:`Scene ${scenes.length + 1}`,
      description:"A colorful continuation of the story.",
      caption:"The adventure continues.",
      dialogue:"",
      sfx:""
    });
  }
  return {
    title: story.title || "My AI Comic",
    tagline: story.tagline || "A story created with ComicCraft Studio.",
    characters: Array.isArray(story.characters) ? story.characters.slice(0,6) : [],
    scenes
  };
}

async function renderPanels() {
  const scenes = currentStory.scenes;
  for (let i = 0; i < scenes.length; i++) {
    const panel = createPanel(scenes[i], i);
    els.comicPanels.appendChild(panel);

    const progress = 38 + Math.round((i / scenes.length) * 52);
    setLoading(true, `Illustrating panel ${i + 1} of ${scenes.length}…`, "Generating colorful comic artwork.", progress);
    await loadPanelImage(panel, scenes[i], i);
  }
  setLoading(true, "Finishing your comic…", "Saving your creation to local history.", 96);
  await wait(350);
  setLoading(true, "Done!", "Your comic is ready to read.", 100);
}

function createPanel(scene, index) {
  const panel = document.createElement("article");
  panel.className = "comic-panel";
  panel.style.animationDelay = `${index * 70}ms`;

  panel.innerHTML = `
    <div class="panel-image">
      <div class="image-placeholder"><span class="spinner-dot"></span><span>Creating artwork…</span></div>
      <span class="panel-badge">PANEL ${index + 1}</span>
      <div class="panel-actions">
        <button class="panel-action regenerate" title="Regenerate image">↻</button>
        <button class="panel-action download-image" title="Open image">↗</button>
      </div>
    </div>
    <div class="panel-text">
      <h3>${escapeHtml(scene.title)}</h3>
      ${scene.caption ? `<p>${escapeHtml(scene.caption)}</p>` : ""}
      ${scene.dialogue ? `<p class="dialogue">💬 ${escapeHtml(scene.dialogue)}</p>` : ""}
      ${scene.sfx ? `<p class="sfx">${escapeHtml(scene.sfx)}</p>` : ""}
    </div>
  `;

  panel.querySelector(".regenerate").addEventListener("click", async () => {
    const btn = panel.querySelector(".regenerate");
    btn.disabled = true;
    await loadPanelImage(panel, scene, index, Date.now());
    btn.disabled = false;
  });

  panel.querySelector(".download-image").addEventListener("click", () => {
    const img = panel.querySelector("img");
    if (img?.src) window.open(img.src, "_blank", "noopener");
    else showToast("Image is still generating.");
  });

  return panel;
}

async function loadPanelImage(panel, scene, index, seedOverride = null) {
  const imageBox = panel.querySelector(".panel-image");
  imageBox.querySelectorAll("img").forEach(x => x.remove());
  const placeholder = imageBox.querySelector(".image-placeholder");
  placeholder?.classList.remove("hidden");

  const prompt = `
Create one polished single comic panel illustration.
Style: ${currentSettings.artStyle}.
Genre: ${currentSettings.genre}.
Mood: ${currentSettings.tone}.
Character continuity: ${currentStory.characters.map(c => `${c.name}: ${c.description}`).join("; ")}.
Scene: ${scene.description}.
Visual requirements: expressive characters, clear foreground/background separation, cinematic composition, rich colors, detailed environment, strong lighting, professional college-project quality, no collage, no multiple panels, no watermark, no random readable text.
`;

  const seed = seedOverride ?? (5000 + index * 97);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=768&height=768&seed=${seed}&safe=true`;

  try {
    const img = new Image();
    img.alt = `Comic panel ${index + 1}`;
    img.className = "generated-image";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    placeholder?.classList.add("hidden");
    imageBox.appendChild(img);
  } catch {
    if (placeholder) placeholder.innerHTML = `<span style="font-size:28px">🖼️</span><span>Artwork service is busy.<br>Click ↻ to retry.</span>`;
    showToast(`Panel ${index + 1} image could not load.`);
  }
}

function renderStoryHeader() {
  els.storyTitle.textContent = currentStory.title;
  els.storyTagline.textContent = currentStory.tagline;
  $("favoriteStoryBtn").textContent = isCurrentFavorite() ? "♥ Favorite" : "♡ Favorite";
}

function renderCharacters() {
  els.characterStrip.innerHTML = currentStory.characters.map(c => `
    <div class="character-chip">
      <b>🎭 ${escapeHtml(c.name)}</b>
      <span>${escapeHtml(c.role || c.description || "")}</span>
    </div>
  `).join("");
}

function setLoading(show, title="", message="", percent=0) {
  els.loadingCard.classList.toggle("hidden", !show);
  els.generateBtn.disabled = show;
  if (!show) return;
  els.loadingTitle.textContent = title;
  els.loadingText.textContent = message;
  els.progressBar.style.width = `${percent}%`;
  els.stepStory.classList.toggle("active", percent < 35);
  els.stepArt.classList.toggle("active", percent >= 35 && percent < 96);
  els.stepFinish.classList.toggle("active", percent >= 96);
}

function copyStory() {
  if (!currentStory) return;
  navigator.clipboard?.writeText(storyToText(currentStory))
    .then(() => showToast("📋 Story copied"))
    .catch(() => showToast("Copy is not available in this browser."));
}

function storyToText(story) {
  let text = `${story.title}\n${story.tagline}\n\n`;
  if (story.characters.length) {
    text += "CHARACTERS\n";
    story.characters.forEach(c => text += `- ${c.name}: ${c.role || c.description}\n`);
    text += "\n";
  }
  story.scenes.forEach((s, i) => {
    text += `PANEL ${i + 1} — ${s.title}\n`;
    if (s.caption) text += `${s.caption}\n`;
    if (s.dialogue) text += `💬 ${s.dialogue}\n`;
    if (s.sfx) text += `${s.sfx}\n`;
    text += "\n";
  });
  return text;
}

function exportComicHTML() {
  if (!currentStory) return;
  const panels = [...els.comicPanels.querySelectorAll(".comic-panel")].map(p => p.outerHTML).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(currentStory.title)}</title>
<style>body{font-family:Arial,sans-serif;background:#10132b;color:#fff;max-width:1000px;margin:auto;padding:30px}h1{text-align:center}p{line-height:1.6;color:#cbd0e5}.comic-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.comic-panel{background:#171b3b;border-radius:16px;overflow:hidden;border:1px solid #333}.panel-image{position:relative;aspect-ratio:1}.panel-image img{width:100%;height:100%;object-fit:cover}.panel-image .image-placeholder{display:none}.panel-badge,.panel-actions{display:none}.panel-text{padding:15px}.dialogue{padding:9px;background:#252a55;border-left:3px solid #a78bfa}.sfx{color:#ffd166!important;font-weight:bold}@media(max-width:700px){.comic-grid{grid-template-columns:1fr}}</style></head><body>
<h1>${escapeHtml(currentStory.title)}</h1><p style="text-align:center">${escapeHtml(currentStory.tagline)}</p><div class="comic-grid">${panels}</div></body></html>`;
  const blob = new Blob([html], {type:"text/html"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${slugify(currentStory.title)}.html`; a.click();
  URL.revokeObjectURL(url);
  showToast("📄 Comic HTML exported");
}

function toggleFavoriteCurrent() {
  if (!currentStory) return;
  const histories = getHistory();
  const key = storyKey(currentStory);
  const idx = histories.findIndex(x => storyKey(x.story) === key);
  if (idx >= 0) histories[idx].favorite = !histories[idx].favorite;
  else histories.unshift({story:currentStory, settings:currentSettings, date:new Date().toISOString(), favorite:true});
  localStorage.setItem(HISTORY_KEY, JSON.stringify(histories.slice(0,20)));
  renderStoryHeader(); renderHistory();
  showToast(isCurrentFavorite() ? "♥ Added to favorites" : "♡ Removed from favorites");
}

function isCurrentFavorite() {
  if (!currentStory) return false;
  return getHistory().some(x => storyKey(x.story) === storyKey(currentStory) && x.favorite);
}

function saveToHistory(story, settings) {
  const histories = getHistory().filter(x => storyKey(x.story) !== storyKey(story));
  histories.unshift({story, settings, date:new Date().toISOString(), favorite:false});
  localStorage.setItem(HISTORY_KEY, JSON.stringify(histories.slice(0,20)));
  renderHistory();
}

function getHistory() {
  return safeJSON(localStorage.getItem(HISTORY_KEY), []);
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    els.historyList.innerHTML = `<div class="history-item"><h3>No saved stories yet</h3><p>Generate a comic and it will appear here.</p></div>`;
    return;
  }
  els.historyList.innerHTML = history.map((item, index) => `
    <div class="history-item">
      <h3>${item.favorite ? "♥ " : ""}${escapeHtml(item.story.title)}</h3>
      <p>${escapeHtml(item.story.tagline || "")}<br>${formatDate(item.date)}</p>
      <div class="history-actions">
        <button data-load="${index}">Open</button>
        <button data-delete="${index}">Delete</button>
      </div>
    </div>
  `).join("");

  els.historyList.querySelectorAll("[data-load]").forEach(btn => {
    btn.addEventListener("click", () => loadHistory(Number(btn.dataset.load)));
  });
  els.historyList.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteHistory(Number(btn.dataset.delete)));
  });
}

function loadHistory(index) {
  const item = getHistory()[index];
  if (!item) return;
  currentStory = item.story;
  currentSettings = item.settings || getSettings();
  renderStoryHeader(); renderCharacters();
  els.comicPanels.innerHTML = "";
  els.output.classList.remove("hidden");
  els.emptyState.classList.add("hidden");
  closeHistory();

  currentStory.scenes.forEach((scene, i) => {
    const panel = createPanel(scene, i);
    els.comicPanels.appendChild(panel);
    const imageBox = panel.querySelector(".panel-image");
    const placeholder = imageBox.querySelector(".image-placeholder");
    const img = new Image();
    img.alt = `Comic panel ${i + 1}`;
    img.className = "generated-image";
    img.onload = () => placeholder?.classList.add("hidden");
    img.onerror = () => { if (placeholder) placeholder.innerHTML = "🖼️ Image unavailable — click ↻"; };
    img.src = buildImageUrl(scene, i);
    imageBox.appendChild(img);
  });
  showToast("🕘 Story loaded");
}

function buildImageUrl(scene, index) {
  const prompt = `single comic panel, ${currentSettings.artStyle}, ${currentSettings.genre}, ${currentSettings.tone}, ${scene.description}, detailed colorful illustration, consistent characters, no collage, no watermark`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=768&height=768&seed=${5000 + index * 97}&safe=true`;
}

function deleteHistory(index) {
  const history = getHistory();
  history.splice(index, 1);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
  showToast("Story deleted");
}

function clearHistory() {
  if (!getHistory().length) return;
  if (!confirm("Delete all saved comic history?")) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast("History cleared");
}

function closeHistory() {
  els.historyDrawer.classList.add("hidden");
}

function formatDate(value) {
  try { return new Date(value).toLocaleString(); } catch { return ""; }
}

function storyKey(story) {
  return `${story.title}|${story.tagline}|${story.scenes.length}`;
}

function safeJSON(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || "comiccraft-story";
}

function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2600);
}
