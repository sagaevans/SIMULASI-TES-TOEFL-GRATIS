let lastValidationData = null;

function getElementValue(id) {
  const element = document.getElementById(id);

  if (!element) {
    return "";
  }

  return element.value.trim();
}

function setElementValue(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value;
  }
}

function getSetId() {
  const setNumber = getElementValue("setNumber");

  if (!setNumber) {
    return "";
  }

  return `set-${setNumber}`;
}

function getTargetFilePaths() {
  const setNumber = getElementValue("setNumber") || "X";

  return {
    listening: `data/listening-set-${setNumber}.json`,
    structure: `data/structure-set-${setNumber}.json`,
    reading: `data/reading-set-${setNumber}.json`
  };
}

function updateFilePreview() {
  const paths = getTargetFilePaths();
  const setNumber = getElementValue("setNumber");
  const filePreview = document.getElementById("filePreview");

  const listeningFileName = document.getElementById("listeningFileName");
  const structureFileName = document.getElementById("structureFileName");
  const readingFileName = document.getElementById("readingFileName");

  if (listeningFileName) {
    listeningFileName.textContent = paths.listening;
  }

  if (structureFileName) {
    structureFileName.textContent = paths.structure;
  }

  if (readingFileName) {
    readingFileName.textContent = paths.reading;
  }

  if (!filePreview) {
    return;
  }

  if (!setNumber) {
    filePreview.innerHTML = "Fill the set number to preview target file names.";
    return;
  }

  filePreview.innerHTML = `
    <strong>Set ID:</strong> set-${setNumber}<br>
    <strong>Listening:</strong> <code>${paths.listening}</code><br>
    <strong>Structure:</strong> <code>${paths.structure}</code><br>
    <strong>Reading:</strong> <code>${paths.reading}</code>
  `;

  const setTitle = document.getElementById("setTitle");

  if (setTitle && !setTitle.value.trim()) {
    setTitle.value = `Practice Set ${setNumber}`;
  }
}

function showResult(elementId, message, type) {
  const resultBox = document.getElementById(elementId);

  if (!resultBox) {
    return;
  }

  resultBox.classList.remove("hidden", "result-success", "result-error", "result-warning");

  if (type === "success") {
    resultBox.classList.add("result-success");
  } else if (type === "warning") {
    resultBox.classList.add("result-warning");
  } else {
    resultBox.classList.add("result-error");
  }

  resultBox.innerHTML = message;
}

function hideResult(elementId) {
  const resultBox = document.getElementById(elementId);

  if (resultBox) {
    resultBox.classList.add("hidden");
  }
}

function generatePromptHelper() {
  const setNumber = getElementValue("setNumber") || "[SET_NUMBER]";
  const setId = setNumber === "[SET_NUMBER]" ? "[SET_ID]" : `set-${setNumber}`;
  const setTitle = getElementValue("setTitle") || `Practice Set ${setNumber}`;
  const setDescription = getElementValue("setDescription") || "Custom TOEFL ITP-like practice set with original questions.";

  const prompt = `Create a complete original TOEFL ITP-like practice set in JSON format for my static website.

Important rules:
- Do not copy ETS questions.
- Do not copy copyrighted TOEFL book questions.
- Create original academic English practice questions only.
- Use clear TOEFL ITP-like style and difficulty.
- Use answer indexes from 0 to 3.
- Every question must have exactly 4 choices.
- Every question must include an explanation.
- Return three separate JSON code blocks only:
  1. listening-set-${setNumber}.json
  2. structure-set-${setNumber}.json
  3. reading-set-${setNumber}.json

Set information:
- set id: ${setId}
- title: ${setTitle}
- description: ${setDescription}

Recommended question count:
- Listening: 20 questions divided into several audio blocks.
- Structure: 20 questions.
- Reading: 20 questions divided into several academic passages.
If I request a different number of questions, follow my requested number.

Use this exact JSON schema.

LISTENING JSON SCHEMA:
{
  "meta": {
    "testName": "TOEFL ITP-like Practice",
    "section": "listening",
    "set": "${setId}",
    "version": "1.0.0",
    "durationMinutes": 18,
    "totalQuestions": 20
  },
  "items": [
    {
      "id": "L${setNumber}-AUDIO-001",
      "type": "conversation",
      "title": "Audio title",
      "ttsText": "Narrator. Listening script here. Narrator. Now answer the questions.",
      "questions": [
        {
          "id": "L${setNumber}-001",
          "question": "Question text",
          "choices": [
            "Choice A",
            "Choice B",
            "Choice C",
            "Choice D"
          ],
          "answer": 0,
          "explanation": "Explanation here."
        }
      ]
    }
  ]
}

Listening requirements:
- items must be an array.
- Each item must have id, type, title, ttsText, and questions.
- type can be "conversation", "talk", or "lecture".
- Each audio block should contain 3 to 5 related questions.
- The questions must match the listening script.

STRUCTURE JSON SCHEMA:
{
  "meta": {
    "testName": "TOEFL ITP-like Practice",
    "section": "structure",
    "set": "${setId}",
    "version": "1.0.0",
    "durationMinutes": 15,
    "totalQuestions": 20
  },
  "items": [
    {
      "id": "S${setNumber}-001",
      "type": "sentence-completion",
      "topic": "Grammar topic",
      "question": "Question text",
      "choices": [
        "Choice A",
        "Choice B",
        "Choice C",
        "Choice D"
      ],
      "answer": 0,
      "explanation": "Explanation here."
    }
  ]
}

Structure requirements:
- items must be an array.
- Use a mix of "sentence-completion" and "error-identification".
- Include topics such as subject-verb agreement, passive voice, word form, prepositions, conjunctions, adjective clauses, noun clauses, reduced clauses, parallel structure, comparison, inversion, gerunds, infinitives, and verb tense.

READING JSON SCHEMA:
{
  "meta": {
    "testName": "TOEFL ITP-like Practice",
    "section": "reading",
    "set": "${setId}",
    "version": "1.0.0",
    "durationMinutes": 25,
    "totalQuestions": 20
  },
  "passages": [
    {
      "id": "R${setNumber}-PASSAGE-001",
      "title": "Passage title",
      "passage": "Academic passage text here.",
      "questions": [
        {
          "id": "R${setNumber}-001",
          "type": "main-idea",
          "question": "Question text",
          "choices": [
            "Choice A",
            "Choice B",
            "Choice C",
            "Choice D"
          ],
          "answer": 0,
          "explanation": "Explanation here."
        }
      ]
    }
  ]
}

Reading requirements:
- passages must be an array.
- Each passage must have id, title, passage, and questions.
- Use academic topics such as science, history, education, environment, technology, society, or culture.
- Use question types such as main-idea, detail, inference, vocabulary, reference, and purpose.
- Each passage should have 4 to 6 questions.

Output rules:
- Return valid JSON only.
- Do not include markdown explanation outside the JSON code blocks.
- Make sure there are no trailing commas.
- Make sure meta.section and meta.set are correct in each file.`;

  setElementValue("promptHelper", prompt);
}

async function copyPromptHelper() {
  const prompt = getElementValue("promptHelper");

  if (!prompt) {
    alert("Generate the prompt first.");
    return;
  }

  try {
    await navigator.clipboard.writeText(prompt);
    alert("Prompt copied.");
  } catch (error) {
    alert("Could not copy automatically. Please select and copy the prompt manually.");
  }
}

function parseJsonFromTextarea(id, label) {
  const value = getElementValue(id);

  if (!value) {
    throw new Error(`${label} JSON is empty.`);
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} JSON is invalid: ${error.message}`);
  }
}

function formatJsonTextarea(id, label) {
  const value = getElementValue(id);

  if (!value) {
    return;
  }

  try {
    const parsed = JSON.parse(value);
    setElementValue(id, JSON.stringify(parsed, null, 2));
  } catch (error) {
    throw new Error(`${label} JSON cannot be formatted because it is invalid: ${error.message}`);
  }
}

function formatAllJson() {
  try {
    formatJsonTextarea("listeningJson", "Listening");
    formatJsonTextarea("structureJson", "Structure");
    formatJsonTextarea("readingJson", "Reading");

    showResult("validationResult", "All JSON fields were formatted successfully.", "success");
  } catch (error) {
    showResult("validationResult", error.message, "error");
  }
}

function clearAllJson() {
  const confirmClear = confirm("Are you sure you want to clear all JSON fields?");

  if (!confirmClear) {
    return;
  }

  setElementValue("listeningJson", "");
  setElementValue("structureJson", "");
  setElementValue("readingJson", "");

  lastValidationData = null;

  hideResult("validationResult");
  hideResult("uploadResult");
}

function validateCompleteSet() {
  hideResult("uploadResult");

  try {
    const setNumber = getElementValue("setNumber");
    const setId = getSetId();

    if (!setNumber || Number(setNumber) <= 0) {
      throw new Error("Set Number is required and must be greater than 0.");
    }

    if (Number(setNumber) === 0) {
      throw new Error("Set 0 is reserved for Mixed Full Test. Please use Set 1 or higher.");
    }

    const listening = parseJsonFromTextarea("listeningJson", "Listening");
    const structure = parseJsonFromTextarea("structureJson", "Structure");
    const reading = parseJsonFromTextarea("readingJson", "Reading");

    const warnings = [];

    const listeningResult = validateListeningBank(listening, setId);
    const structureResult = validateStructureBank(structure, setId);
    const readingResult = validateReadingBank(reading, setId);

    warnings.push(...listeningResult.warnings);
    warnings.push(...structureResult.warnings);
    warnings.push(...readingResult.warnings);

    lastValidationData = {
      setNumber,
      setId,
      listening,
      structure,
      reading,
      listeningTotal: listeningResult.totalQuestions,
      structureTotal: structureResult.totalQuestions,
      readingTotal: readingResult.totalQuestions
    };

    let message = `
      <strong>Complete set validation passed.</strong><br>
      <ul>
        <li>Set ID: <code>${setId}</code></li>
        <li>Listening questions: ${listeningResult.totalQuestions}</li>
        <li>Structure questions: ${structureResult.totalQuestions}</li>
        <li>Reading questions: ${readingResult.totalQuestions}</li>
      </ul>
    `;

    if (warnings.length > 0) {
      message += `
        <br>
        <strong>Warnings:</strong>
        <ul>
          ${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}
        </ul>
      `;

      showResult("validationResult", message, "warning");
      return true;
    }

    showResult("validationResult", message, "success");
    return true;
  } catch (error) {
    lastValidationData = null;
    showResult("validationResult", `<strong>Validation failed:</strong><br>${escapeHtml(error.message)}`, "error");
    return false;
  }
}

function validateMeta(data, expectedSection, expectedSetId) {
  if (!data || typeof data !== "object") {
    throw new Error(`${expectedSection}: JSON root must be an object.`);
  }

  if (!data.meta || typeof data.meta !== "object") {
    throw new Error(`${expectedSection}: Missing meta object.`);
  }

  if (data.meta.section !== expectedSection) {
    throw new Error(`${expectedSection}: meta.section must be "${expectedSection}".`);
  }

  if (data.meta.set !== expectedSetId) {
    throw new Error(`${expectedSection}: meta.set must be "${expectedSetId}".`);
  }

  if (typeof data.meta.durationMinutes !== "number" || data.meta.durationMinutes <= 0) {
    throw new Error(`${expectedSection}: meta.durationMinutes must be a positive number.`);
  }

  if (typeof data.meta.totalQuestions !== "number" || data.meta.totalQuestions <= 0) {
    throw new Error(`${expectedSection}: meta.totalQuestions must be a positive number.`);
  }
}

function validateListeningBank(data, expectedSetId) {
  validateMeta(data, "listening", expectedSetId);

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Listening: items must be a non-empty array.");
  }

  const warnings = [];
  const idSet = new Set();
  let totalQuestions = 0;

  data.items.forEach((item, itemIndex) => {
    const itemLabel = `Listening item ${itemIndex + 1}`;

    requireString(item.id, `${itemLabel}: id is required.`);
    requireString(item.type, `${itemLabel}: type is required.`);
    requireString(item.title, `${itemLabel}: title is required.`);
    requireString(item.ttsText, `${itemLabel}: ttsText is required.`);

    if (!Array.isArray(item.questions) || item.questions.length === 0) {
      throw new Error(`${itemLabel}: questions must be a non-empty array.`);
    }

    item.questions.forEach((question, questionIndex) => {
      validateQuestionObject(question, `${itemLabel}, question ${questionIndex + 1}`, idSet);
      totalQuestions++;
    });
  });

  if (data.meta.totalQuestions !== totalQuestions) {
    warnings.push(`Listening meta.totalQuestions is ${data.meta.totalQuestions}, but actual question count is ${totalQuestions}.`);
  }

  return {
    totalQuestions,
    warnings
  };
}

function validateStructureBank(data, expectedSetId) {
  validateMeta(data, "structure", expectedSetId);

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Structure: items must be a non-empty array.");
  }

  const warnings = [];
  const idSet = new Set();

  data.items.forEach((question, index) => {
    const label = `Structure question ${index + 1}`;

    requireString(question.topic, `${label}: topic is required.`);
    validateQuestionObject(question, label, idSet);

    if (!question.type) {
      throw new Error(`${label}: type is required.`);
    }
  });

  if (data.meta.totalQuestions !== data.items.length) {
    warnings.push(`Structure meta.totalQuestions is ${data.meta.totalQuestions}, but actual question count is ${data.items.length}.`);
  }

  return {
    totalQuestions: data.items.length,
    warnings
  };
}

function validateReadingBank(data, expectedSetId) {
  validateMeta(data, "reading", expectedSetId);

  if (!Array.isArray(data.passages) || data.passages.length === 0) {
    throw new Error("Reading: passages must be a non-empty array.");
  }

  const warnings = [];
  const idSet = new Set();
  let totalQuestions = 0;

  data.passages.forEach((passage, passageIndex) => {
    const passageLabel = `Reading passage ${passageIndex + 1}`;

    requireString(passage.id, `${passageLabel}: id is required.`);
    requireString(passage.title, `${passageLabel}: title is required.`);
    requireString(passage.passage, `${passageLabel}: passage text is required.`);

    if (!Array.isArray(passage.questions) || passage.questions.length === 0) {
      throw new Error(`${passageLabel}: questions must be a non-empty array.`);
    }

    passage.questions.forEach((question, questionIndex) => {
      validateQuestionObject(question, `${passageLabel}, question ${questionIndex + 1}`, idSet);

      if (!question.type) {
        throw new Error(`${passageLabel}, question ${questionIndex + 1}: type is required.`);
      }

      totalQuestions++;
    });
  });

  if (data.meta.totalQuestions !== totalQuestions) {
    warnings.push(`Reading meta.totalQuestions is ${data.meta.totalQuestions}, but actual question count is ${totalQuestions}.`);
  }

  return {
    totalQuestions,
    warnings
  };
}

function validateQuestionObject(question, label, idSet) {
  requireString(question.id, `${label}: id is required.`);
  requireString(question.question, `${label}: question text is required.`);
  requireString(question.explanation, `${label}: explanation is required.`);

  if (idSet.has(question.id)) {
    throw new Error(`${label}: duplicate question id "${question.id}".`);
  }

  idSet.add(question.id);

  if (!Array.isArray(question.choices) || question.choices.length !== 4) {
    throw new Error(`${label}: choices must be an array with exactly 4 items.`);
  }

  question.choices.forEach((choice, index) => {
    requireString(choice, `${label}: choice ${index + 1} is empty.`);
  });

  if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) {
    throw new Error(`${label}: answer must be an integer from 0 to 3.`);
  }
}

function requireString(value, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }
}

async function uploadCompleteSetToGitHub() {
  hideResult("uploadResult");

  const isValid = validateCompleteSet();

  if (!isValid || !lastValidationData) {
    showResult("uploadResult", "Please fix validation errors before uploading.", "error");
    return;
  }

  const token = getElementValue("githubToken");
  const owner = getElementValue("githubOwner");
  const repo = getElementValue("githubRepo");
  const branch = getElementValue("githubBranch") || "main";

  if (!token) {
    showResult("uploadResult", "GitHub token is required.", "error");
    return;
  }

  if (!owner || !repo || !branch) {
    showResult("uploadResult", "Repository owner, repository name, and branch are required.", "error");
    return;
  }

  const setNumber = lastValidationData.setNumber;
  const setId = lastValidationData.setId;
  const paths = getTargetFilePaths();

  const confirmUpload = confirm(
    `Upload ${setId} to ${owner}/${repo} on branch ${branch}?\n\n` +
    `${paths.listening}\n${paths.structure}\n${paths.reading}\n\n` +
    `This will also update data/manifest.json.`
  );

  if (!confirmUpload) {
    return;
  }

  showResult("uploadResult", "Uploading files to GitHub. Please wait...", "warning");

  try {
    saveRepoSettings(owner, repo, branch);

    const listeningContent = JSON.stringify(lastValidationData.listening, null, 2);
    const structureContent = JSON.stringify(lastValidationData.structure, null, 2);
    const readingContent = JSON.stringify(lastValidationData.reading, null, 2);

    await putGitHubFile({
      token,
      owner,
      repo,
      branch,
      path: paths.listening,
      content: listeningContent,
      message: `Add ${paths.listening}`
    });

    await putGitHubFile({
      token,
      owner,
      repo,
      branch,
      path: paths.structure,
      content: structureContent,
      message: `Add ${paths.structure}`
    });

    await putGitHubFile({
      token,
      owner,
      repo,
      branch,
      path: paths.reading,
      content: readingContent,
      message: `Add ${paths.reading}`
    });

    await updateManifestOnGitHub({
      token,
      owner,
      repo,
      branch,
      setNumber,
      setId,
      paths
    });

    showResult(
      "uploadResult",
      `
        <strong>Upload completed successfully.</strong><br>
        <ul>
          <li>Uploaded: <code>${paths.listening}</code></li>
          <li>Uploaded: <code>${paths.structure}</code></li>
          <li>Uploaded: <code>${paths.reading}</code></li>
          <li>Updated: <code>data/manifest.json</code></li>
        </ul>
        <br>
        Open your homepage after GitHub Pages updates, then refresh with <strong>Ctrl + F5</strong>.
      `,
      "success"
    );
  } catch (error) {
    showResult(
      "uploadResult",
      `<strong>Upload failed:</strong><br>${escapeHtml(error.message)}`,
      "error"
    );
  }
}

async function updateManifestOnGitHub({ token, owner, repo, branch, setNumber, setId, paths }) {
  const manifestPath = "data/manifest.json";
  const setTitle = getElementValue("setTitle") || `Practice Set ${setNumber}`;
  const setDescription = getElementValue("setDescription") || `Custom TOEFL ITP-like practice set ${setNumber}.`;

  const existingManifestFile = await getGitHubFile({
    token,
    owner,
    repo,
    branch,
    path: manifestPath
  });

  let manifest = null;
  let manifestSha = null;

  if (existingManifestFile) {
    manifestSha = existingManifestFile.sha;
    manifest = JSON.parse(decodeBase64Unicode(existingManifestFile.content));
  } else {
    manifest = createBaseManifest(setId);
  }

  if (!manifest.appName) {
    manifest.appName = "SIMULASI TES TOEFL-GRATIS";
  }

  if (!manifest.version) {
    manifest.version = "1.0.0";
  }

  if (!manifest.defaultSetId) {
    manifest.defaultSetId = setId;
  }

  if (!Array.isArray(manifest.sets)) {
    manifest.sets = [];
  }

  ensureMixedSetExists(manifest);

  const newEntry = {
    id: setId,
    title: setTitle,
    description: setDescription,
    status: "active",
    files: {
      listening: paths.listening,
      structure: paths.structure,
      reading: paths.reading
    }
  };

  const existingIndex = manifest.sets.findIndex((set) => {
    return set.id === setId;
  });

  if (existingIndex >= 0) {
    const replaceExisting = confirm(`${setId} already exists in manifest.json. Replace its manifest entry?`);

    if (!replaceExisting) {
      throw new Error("Upload canceled because the set already exists in manifest.json.");
    }

    manifest.sets[existingIndex] = newEntry;
  } else {
    manifest.sets.push(newEntry);
  }

  manifest.sets = sortManifestSets(manifest.sets);

  const manifestContent = JSON.stringify(manifest, null, 2);

  await putGitHubFile({
    token,
    owner,
    repo,
    branch,
    path: manifestPath,
    content: manifestContent,
    message: `Update manifest for ${setId}`,
    knownSha: manifestSha
  });
}

function createBaseManifest(defaultSetId) {
  return {
    appName: "SIMULASI TES TOEFL-GRATIS",
    version: "1.0.0",
    defaultSetId: defaultSetId,
    sets: [
      {
        id: "set-0",
        title: "Set 0 - Mixed Full Test",
        description: "Random full TOEFL ITP-like simulation generated from all active practice sets.",
        status: "active",
        type: "mixed",
        fullTestOnly: true,
        sourceSets: "all-active",
        targetQuestions: {
          listening: 50,
          structure: 40,
          reading: 50
        },
        durationMinutes: {
          listening: 35,
          structure: 25,
          reading: 55
        }
      }
    ]
  };
}

function ensureMixedSetExists(manifest) {
  const hasMixedSet = manifest.sets.some((set) => {
    return set.id === "set-0";
  });

  if (hasMixedSet) {
    return;
  }

  manifest.sets.unshift({
    id: "set-0",
    title: "Set 0 - Mixed Full Test",
    description: "Random full TOEFL ITP-like simulation generated from all active practice sets.",
    status: "active",
    type: "mixed",
    fullTestOnly: true,
    sourceSets: "all-active",
    targetQuestions: {
      listening: 50,
      structure: 40,
      reading: 50
    },
    durationMinutes: {
      listening: 35,
      structure: 25,
      reading: 55
    }
  });
}

function sortManifestSets(sets) {
  return [...sets].sort((a, b) => {
    if (a.id === "set-0") {
      return -1;
    }

    if (b.id === "set-0") {
      return 1;
    }

    return getSetNumberFromId(a.id) - getSetNumberFromId(b.id);
  });
}

function getSetNumberFromId(setId) {
  const match = String(setId).match(/set-(\d+)/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(match[1]);
}

async function putGitHubFile({ token, owner, repo, branch, path, content, message, knownSha = null }) {
  let sha = knownSha;

  if (!sha) {
    const existingFile = await getGitHubFile({
      token,
      owner,
      repo,
      branch,
      path
    });

    if (existingFile) {
      sha = existingFile.sha;
    }
  }

  const body = {
    message,
    content: encodeBase64Unicode(content),
    branch
  };

  if (sha) {
    body.sha = sha;
  }

  const url = buildGitHubContentsUrl(owner, repo, path);

  await githubRequest({
    token,
    method: "PUT",
    url,
    body
  });
}

async function getGitHubFile({ token, owner, repo, branch, path }) {
  const url = `${buildGitHubContentsUrl(owner, repo, path)}?ref=${encodeURIComponent(branch)}`;

  try {
    return await githubRequest({
      token,
      method: "GET",
      url
    });
  } catch (error) {
    if (error.message.includes("404")) {
      return null;
    }

    throw error;
  }
}

function buildGitHubContentsUrl(owner, repo, path) {
  const encodedPath = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
}

async function githubRequest({ token, method, url, body = null }) {
  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data && data.message ? data.message : response.statusText;
    throw new Error(`GitHub API error ${response.status}: ${message}`);
  }

  return data;
}

function encodeBase64Unicode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function decodeBase64Unicode(base64Text) {
  const cleanBase64 = base64Text.replace(/\s/g, "");
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new TextDecoder().decode(bytes);
}

function saveRepoSettings(owner, repo, branch) {
  localStorage.setItem("toefl_admin_owner", owner);
  localStorage.setItem("toefl_admin_repo", repo);
  localStorage.setItem("toefl_admin_branch", branch);
}

function loadRepoSettings() {
  const owner = localStorage.getItem("toefl_admin_owner");
  const repo = localStorage.getItem("toefl_admin_repo");
  const branch = localStorage.getItem("toefl_admin_branch");

  if (owner) {
    setElementValue("githubOwner", owner);
  }

  if (repo) {
    setElementValue("githubRepo", repo);
  }

  if (branch) {
    setElementValue("githubBranch", branch);
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", function () {
  loadRepoSettings();
  updateFilePreview();

  const setNumberInput = document.getElementById("setNumber");

  if (setNumberInput) {
    setNumberInput.addEventListener("input", function () {
      updateFilePreview();
    });
  }
});