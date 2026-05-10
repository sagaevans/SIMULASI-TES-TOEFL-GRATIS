let currentUtterance = null;
let currentAudioState = "ready";
let isManualStop = false;

let timerInterval = null;
let remainingSeconds = 0;
let currentSectionName = null;
let isSubmitted = false;
let isTestRunning = false;

let currentOriginalData = null;
let currentLoadedData = null;
let currentPlayingAudioId = null;

let isFullTestMode = false;
let fullTestData = {};
let fullTestResults = {};
let fullTestSectionIndex = 0;
let fullTestSections = ["listening", "structure", "reading"];

let appManifest = null;
let currentSelectedSetId = null;
let currentSelectedSet = null;

async function loadManifest() {
  if (appManifest) {
    return appManifest;
  }

  const response = await fetch("data/manifest.json");
  appManifest = await response.json();

  return appManifest;
}

function getActiveSets() {
  if (!appManifest || !Array.isArray(appManifest.sets)) {
    return [];
  }

  return appManifest.sets.filter((set) => {
    return set.status === "active";
  });
}

function getPracticeSets() {
  return getActiveSets().filter((set) => {
    return set.type !== "mixed" && set.files;
  });
}

function getFullTestSets() {
  return getActiveSets();
}

function getSourceSetsForMixed(mixedSet) {
  const activeSets = getActiveSets();

  if (mixedSet.sourceSets === "all-active") {
    return activeSets.filter((set) => {
      return set.type !== "mixed" && set.files;
    });
  }

  if (Array.isArray(mixedSet.sourceSets)) {
    return activeSets.filter((set) => {
      return mixedSet.sourceSets.includes(set.id) && set.type !== "mixed" && set.files;
    });
  }

  return activeSets.filter((set) => {
    return set.type !== "mixed" && set.files;
  });
}

function getSetById(setId) {
  const sets = getActiveSets();

  return sets.find((set) => {
    return set.id === setId;
  });
}
function setActiveMainButton(mode) {
  const buttons = [
    "btn-nav-listening",
    "btn-nav-structure",
    "btn-nav-reading",
    "btn-nav-fulltest"
  ];

  buttons.forEach((buttonId) => {
    const button = document.getElementById(buttonId);

    if (button) {
      button.classList.remove("main-button-active");
    }
  });

  const activeButton = document.getElementById(`btn-nav-${mode}`);

  if (activeButton) {
    activeButton.classList.add("main-button-active");
  }
}

async function loadSection(sectionName) {
  if (isTestRunning && !isSubmitted) {
    alert("You cannot change sections while the test is running. Please submit or stop the current section first.");
    return;
  }
  setActiveMainButton(sectionName);
  resetFullTestState();

  const practiceArea = document.getElementById("practice-area");

  stopSpeech();
  stopTimer();
  setSectionButtonsDisabled(false);

  currentSectionName = sectionName;
  isSubmitted = false;
  isTestRunning = false;
  currentPlayingAudioId = null;
  currentLoadedData = null;
  currentSelectedSetId = null;
  currentSelectedSet = null;

  practiceArea.innerHTML = `
    <h2>Loading ${formatSectionTitle(sectionName)} Sets...</h2>
    <p>Please wait.</p>
  `;

  try {
    await loadManifest();
    renderPracticeSetSelection(sectionName);
  } catch (error) {
    practiceArea.innerHTML = `
      <h2>Error</h2>
      <p>Could not load practice set list from manifest.json.</p>
      <p>Please make sure <code>data/manifest.json</code> exists and is valid.</p>
    `;
    console.error(error);
  }
}

function renderPracticeSetSelection(sectionName) {
  const practiceArea = document.getElementById("practice-area");
  const sets = getPracticeSets();

  if (sets.length === 0) {
    practiceArea.innerHTML = `
      <h2>${formatSectionTitle(sectionName)}</h2>
      <p>No active practice sets found in manifest.json.</p>
    `;
    return;
  }

  let html = `
    <h2>${formatSectionTitle(sectionName)}</h2>

    <div class="question-card">
      <h3>Choose Practice Set</h3>
      <p>Select a question set before starting this section.</p>
      <p><strong>Note:</strong> Set 0 is available only in Full Test mode.</p>
    </div>
  `;

  sets.forEach((set) => {
    html += `
      <div class="question-card">
        <h3>${set.title}</h3>
        <p>${set.description || "No description."}</p>
        <p><strong>Set ID:</strong> ${set.id}</p>

        <button type="button" onclick="startPracticeSectionWithSet('${sectionName}', '${set.id}')">
          Use ${set.title}
        </button>
      </div>
    `;
  });

  practiceArea.innerHTML = html;
}

async function startPracticeSectionWithSet(sectionName, setId) {
  const practiceArea = document.getElementById("practice-area");
  const selectedSet = getSetById(setId);

  if (!selectedSet) {
    alert("Selected set was not found.");
    return;
  }

  if (selectedSet.type === "mixed") {
    alert("Set 0 is available only in Full Test mode.");
    return;
  }

  practiceArea.innerHTML = `
    <h2>Loading ${formatSectionTitle(sectionName)}...</h2>
    <p>Selected set: ${selectedSet.title}</p>
  `;

  try {
    const data = await fetchSectionData(sectionName, selectedSet);

    currentSectionName = sectionName;
    currentSelectedSetId = setId;
    currentSelectedSet = selectedSet;
    currentOriginalData = cloneData(data);
    currentLoadedData = cloneData(data);
    currentPlayingAudioId = null;
    isSubmitted = false;
    isTestRunning = false;

    renderSectionStartScreen(sectionName, data);
  } catch (error) {
    practiceArea.innerHTML = `
      <h2>Error</h2>
      <p>Could not load ${formatSectionTitle(sectionName)} question bank for ${selectedSet.title}.</p>
      <p>Please check the file path in <code>data/manifest.json</code>.</p>
    `;
    console.error(error);
  }
}

async function fetchSectionData(sectionName, selectedSet = null) {
  let filePath = "";

  if (selectedSet && selectedSet.files && selectedSet.files[sectionName]) {
    filePath = selectedSet.files[sectionName];
  } else {
    if (sectionName === "listening") {
      filePath = "data/listening-set-1.json";
    }

    if (sectionName === "structure") {
      filePath = "data/structure-set-1.json";
    }

    if (sectionName === "reading") {
      filePath = "data/reading-set-1.json";
    }
  }

  const response = await fetch(filePath);
  return await response.json();
}

async function loadFullTestIntro() {
  if (isTestRunning && !isSubmitted) {
    alert("You cannot start a full test while another test is running.");
    return;
  }
  setActiveMainButton("fulltest");
  const practiceArea = document.getElementById("practice-area");

  stopSpeech();
  stopTimer();

  resetFullTestState();

  isFullTestMode = true;
  currentSectionName = null;
  isSubmitted = false;
  isTestRunning = false;
  currentSelectedSetId = null;
  currentSelectedSet = null;

  practiceArea.innerHTML = `
    <h2>Loading Full Test Sets...</h2>
    <p>Please wait.</p>
  `;

  try {
    await loadManifest();
    renderFullTestSetSelection();
  } catch (error) {
    practiceArea.innerHTML = `
      <h2>Error</h2>
      <p>Could not load full test set list from manifest.json.</p>
    `;
    console.error(error);
  }
}

function renderFullTestSetSelection() {
  const practiceArea = document.getElementById("practice-area");
  const sets = getFullTestSets();

  if (sets.length === 0) {
    practiceArea.innerHTML = `
      <h2>Full TOEFL ITP-like Test</h2>
      <p>No active test sets found in manifest.json.</p>
    `;
    return;
  }

  let html = `
    <h2>Full TOEFL ITP-like Test</h2>

    <div class="question-card">
      <h3>Choose Full Test Set</h3>
      <p>
        Select one set. Regular sets use their own Listening, Structure, and Reading files.
        Set 0 creates a random mixed test from all active sets.
      </p>
    </div>
  `;

  sets.forEach((set) => {
    const buttonLabel = set.type === "mixed"
      ? `Start ${set.title}`
      : `Start ${set.title}`;

    html += `
      <div class="question-card">
        <h3>${set.title}</h3>
        <p>${set.description || "No description."}</p>
        <p><strong>Set ID:</strong> ${set.id}</p>
        <p><strong>Type:</strong> ${set.type === "mixed" ? "Mixed Random Full Test" : "Regular Set"}</p>

        <button type="button" class="btn-full-test" onclick="loadFullTestWithSet('${set.id}')">
          ${buttonLabel}
        </button>
      </div>
    `;
  });

  practiceArea.innerHTML = html;
}

async function loadFullTestWithSet(setId) {
  const practiceArea = document.getElementById("practice-area");
  const selectedSet = getSetById(setId);

  if (!selectedSet) {
    alert("Selected set was not found.");
    return;
  }

  currentSelectedSetId = setId;
  currentSelectedSet = selectedSet;

  practiceArea.innerHTML = `
    <h2>Loading Full Test...</h2>
    <p>Selected set: ${selectedSet.title}</p>
  `;

  try {
    if (selectedSet.type === "mixed") {
      fullTestData = await generateMixedFullTestData(selectedSet);
    } else {
      const listeningData = await fetchSectionData("listening", selectedSet);
      const structureData = await fetchSectionData("structure", selectedSet);
      const readingData = await fetchSectionData("reading", selectedSet);

      fullTestData = {
        listening: cloneData(listeningData),
        structure: cloneData(structureData),
        reading: cloneData(readingData)
      };
    }

    fullTestResults = {};
    fullTestSectionIndex = 0;
    isFullTestMode = true;

    renderFullTestIntro();
  } catch (error) {
    practiceArea.innerHTML = `
      <h2>Error</h2>
      <p>Could not load full test data for ${selectedSet.title}.</p>
      <p>Please check the file paths in <code>data/manifest.json</code>.</p>
    `;
    console.error(error);
  }
}

async function generateMixedFullTestData(mixedSet) {
  const sourceSets = getSourceSetsForMixed(mixedSet);

  if (sourceSets.length === 0) {
    throw new Error("No source sets available for mixed test.");
  }

  const loadedSets = [];

  for (const set of sourceSets) {
    const listening = await fetchSectionData("listening", set);
    const structure = await fetchSectionData("structure", set);
    const reading = await fetchSectionData("reading", set);

    loadedSets.push({
      set,
      listening,
      structure,
      reading
    });
  }

  const listeningTarget = mixedSet.targetQuestions?.listening || 50;
  const structureTarget = mixedSet.targetQuestions?.structure || 40;
  const readingTarget = mixedSet.targetQuestions?.reading || 50;

  const listeningDuration = mixedSet.durationMinutes?.listening || 35;
  const structureDuration = mixedSet.durationMinutes?.structure || 25;
  const readingDuration = mixedSet.durationMinutes?.reading || 55;

  return {
    listening: createMixedListeningData(loadedSets, listeningTarget, listeningDuration),
    structure: createMixedStructureData(loadedSets, structureTarget, structureDuration),
    reading: createMixedReadingData(loadedSets, readingTarget, readingDuration)
  };
}

function createMixedListeningData(loadedSets, targetQuestions, durationMinutes) {
  let allItems = [];

  loadedSets.forEach((loadedSet) => {
    if (loadedSet.listening && Array.isArray(loadedSet.listening.items)) {
      loadedSet.listening.items.forEach((item) => {
        const clonedItem = cloneData(item);

        clonedItem.sourceSet = loadedSet.set.id;
        clonedItem.questions = clonedItem.questions.map((question) => {
          return shuffleQuestionChoices(question);
        });

        allItems.push(clonedItem);
      });
    }
  });

  allItems = shuffleArray(allItems);

  const selectedItems = selectGroupedItemsByQuestionTarget(
    allItems,
    (item) => item.questions.length,
    targetQuestions
  );

  const totalQuestions = selectedItems.reduce((total, item) => {
    return total + item.questions.length;
  }, 0);

  return {
    meta: {
      testName: "TOEFL ITP-like Practice",
      section: "listening",
      set: "set-0",
      version: "1.0.0",
      durationMinutes: durationMinutes,
      totalQuestions: totalQuestions,
      mixed: true
    },
    items: selectedItems
  };
}

function createMixedStructureData(loadedSets, targetQuestions, durationMinutes) {
  let allQuestions = [];

  loadedSets.forEach((loadedSet) => {
    if (loadedSet.structure && Array.isArray(loadedSet.structure.items)) {
      loadedSet.structure.items.forEach((question) => {
        const clonedQuestion = cloneData(question);
        clonedQuestion.sourceSet = loadedSet.set.id;
        allQuestions.push(shuffleQuestionChoices(clonedQuestion));
      });
    }
  });

  allQuestions = shuffleArray(allQuestions);

  const selectedQuestions = allQuestions.slice(0, Math.min(targetQuestions, allQuestions.length));

  return {
    meta: {
      testName: "TOEFL ITP-like Practice",
      section: "structure",
      set: "set-0",
      version: "1.0.0",
      durationMinutes: durationMinutes,
      totalQuestions: selectedQuestions.length,
      mixed: true
    },
    items: selectedQuestions
  };
}

function createMixedReadingData(loadedSets, targetQuestions, durationMinutes) {
  let allPassages = [];

  loadedSets.forEach((loadedSet) => {
    if (loadedSet.reading && Array.isArray(loadedSet.reading.passages)) {
      loadedSet.reading.passages.forEach((passage) => {
        const clonedPassage = cloneData(passage);

        clonedPassage.sourceSet = loadedSet.set.id;
        clonedPassage.questions = clonedPassage.questions.map((question) => {
          return shuffleQuestionChoices(question);
        });

        allPassages.push(clonedPassage);
      });
    }
  });

  allPassages = shuffleArray(allPassages);

  const selectedPassages = selectGroupedItemsByQuestionTarget(
    allPassages,
    (passage) => passage.questions.length,
    targetQuestions
  );

  const totalQuestions = selectedPassages.reduce((total, passage) => {
    return total + passage.questions.length;
  }, 0);

  return {
    meta: {
      testName: "TOEFL ITP-like Practice",
      section: "reading",
      set: "set-0",
      version: "1.0.0",
      durationMinutes: durationMinutes,
      totalQuestions: totalQuestions,
      mixed: true
    },
    passages: selectedPassages
  };
}

function selectGroupedItemsByQuestionTarget(items, getQuestionCount, targetQuestions) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const totalAvailable = items.reduce((total, item) => {
    return total + getQuestionCount(item);
  }, 0);

  if (totalAvailable <= targetQuestions) {
    return items;
  }

  const shuffledItems = shuffleArray(items);
  const dp = new Map();

  dp.set(0, []);

  shuffledItems.forEach((item, index) => {
    const count = getQuestionCount(item);
    const currentEntries = Array.from(dp.entries());

    currentEntries.forEach(([sum, indexes]) => {
      const newSum = sum + count;

      if (newSum <= targetQuestions && !dp.has(newSum)) {
        dp.set(newSum, [...indexes, index]);
      }
    });
  });

  let bestSum = 0;

  dp.forEach((indexes, sum) => {
    if (sum > bestSum && sum <= targetQuestions) {
      bestSum = sum;
    }
  });

  const selectedIndexes = dp.get(bestSum) || [];

  if (selectedIndexes.length === 0) {
    return shuffledItems.slice(0, 1);
  }

  return selectedIndexes.map((index) => {
    return shuffledItems[index];
  });
}

function renderFullTestIntro() {
  const practiceArea = document.getElementById("practice-area");

  const listeningTotal = getTotalQuestions(fullTestData.listening, "listening");
  const structureTotal = getTotalQuestions(fullTestData.structure, "structure");
  const readingTotal = getTotalQuestions(fullTestData.reading, "reading");

  practiceArea.innerHTML = `
    <h2>Full TOEFL ITP-like Test</h2>

    <div class="question-card">
      <h3>Full Test Instructions</h3>

      <p><strong>Selected set:</strong> ${currentSelectedSet ? currentSelectedSet.title : "Practice Set"}</p>

      <p>This mode simulates a TOEFL ITP-like test flow using the selected practice question bank.</p>

      <p><strong>Current test size:</strong></p>
      <ul>
        <li>Listening: ${listeningTotal} questions · ${fullTestData.listening.meta.durationMinutes} minutes</li>
        <li>Structure: ${structureTotal} questions · ${fullTestData.structure.meta.durationMinutes} minutes</li>
        <li>Reading: ${readingTotal} questions · ${fullTestData.reading.meta.durationMinutes} minutes</li>
      </ul>

      <p>
        You will complete the sections in order:
        <strong>Listening → Structure → Reading</strong>.
      </p>

      <p>
        During the test, the practice section buttons will be locked.
      </p>

      <button type="button" class="btn-full-test" onclick="startFullTest()">
        Start Full Test
      </button>
    </div>
  `;
}

function startFullTest() {
  isFullTestMode = true;
  isSubmitted = false;
  isTestRunning = false;
  fullTestSectionIndex = 0;
  fullTestResults = {};

  setSectionButtonsDisabled(true);

  const firstSection = fullTestSections[fullTestSectionIndex];
  renderFullTestSectionStart(firstSection);
}

function renderFullTestSectionStart(sectionName) {
  const practiceArea = document.getElementById("practice-area");
  const data = fullTestData[sectionName];
  const totalQuestions = getTotalQuestions(data, sectionName);

  currentSectionName = sectionName;
  currentLoadedData = cloneData(data);
  currentOriginalData = cloneData(data);
  currentPlayingAudioId = null;
  isSubmitted = false;
  isTestRunning = false;

  practiceArea.innerHTML = `
    <h2>Full Test - ${formatSectionTitle(sectionName)}</h2>

    <div class="question-card">
      <h3>Section ${fullTestSectionIndex + 1} of ${fullTestSections.length}</h3>
      <p><strong>Selected set:</strong> ${currentSelectedSet ? currentSelectedSet.title : "-"}</p>
      <p><strong>Section:</strong> ${formatSectionTitle(sectionName)}</p>
      <p><strong>Duration:</strong> ${data.meta.durationMinutes} minutes</p>
      <p><strong>Total questions:</strong> ${totalQuestions}</p>

      <p>
        Click start when you are ready. The timer for this section will begin after you press the button.
      </p>

      <button type="button" onclick="startSelectedSection()">
        Start ${formatSectionTitle(sectionName)}
      </button>
    </div>
  `;
}

function resetFullTestState() {
  isFullTestMode = false;
  fullTestData = {};
  fullTestResults = {};
  fullTestSectionIndex = 0;
}

function renderSectionStartScreen(sectionName, data) {
  const practiceArea = document.getElementById("practice-area");
  const totalQuestions = getTotalQuestions(data, sectionName);

  practiceArea.innerHTML = `
    <h2>${formatSectionTitle(sectionName)}</h2>

    <div class="question-card">
      <h3>Section Instructions</h3>
      <p><strong>Selected set:</strong> ${currentSelectedSet ? currentSelectedSet.title : data.meta.set}</p>
      <p><strong>Set:</strong> ${data.meta.set}</p>
      <p><strong>Duration:</strong> ${data.meta.durationMinutes} minutes</p>
      <p><strong>Total practice items:</strong> ${totalQuestions}</p>

      <p>
        Click the button below when you are ready. The timer will start only after
        you press the start button.
      </p>

      <button type="button" onclick="startSelectedSection()">
        Start ${formatSectionTitle(sectionName)}
      </button>
    </div>
  `;
}

function startSelectedSection() {
  if (!currentSectionName || !currentLoadedData) {
    alert("No section is loaded.");
    return;
  }

  stopSpeech();
  stopTimer();

  isSubmitted = false;
  isTestRunning = true;
  currentPlayingAudioId = null;

  setSectionButtonsDisabled(true);

  const data = cloneData(currentLoadedData);

  if (currentSectionName === "listening") {
    renderListening(data);
    startTimer(data.meta.durationMinutes, "listening");
  }

  if (currentSectionName === "structure") {
    renderStructure(data);
    startTimer(data.meta.durationMinutes, "structure");
  }

  if (currentSectionName === "reading") {
    renderReading(data);
    startTimer(data.meta.durationMinutes, "reading");
  }
}

function forceStopTest() {
  if (!isTestRunning || isSubmitted) {
    alert("No active test is running.");
    return;
  }

  const confirmStop = confirm("Are you sure you want to stop this test? Your current answers will not be submitted.");

  if (!confirmStop) {
    return;
  }

  isManualStop = true;
  stopSpeech();
  stopTimer();

  setTimeout(() => {
    isManualStop = false;
  }, 500);

  if (isFullTestMode) {
    resetFullTestState();
    isSubmitted = false;
    isTestRunning = false;
    currentSectionName = null;
    currentLoadedData = null;
    setSectionButtonsDisabled(false);

    document.getElementById("practice-area").innerHTML = `
      <h2>Practice Area</h2>
      <p>Full test was stopped. Please choose a section or start the full test again.</p>
    `;

    return;
  }

  const showAnswerKey = confirm("Do you want to view the answer key and explanations?");

  if (showAnswerKey) {
    revealAnswerKeyOnly();
    markStoppedWithAnswerKey();
  } else {
    resetCurrentSectionToStartScreen();
  }
}

function resetCurrentSectionToStartScreen() {
  if (!currentSectionName || !currentLoadedData) {
    return;
  }

  stopSpeech();
  stopTimer();

  isSubmitted = false;
  isTestRunning = false;
  currentPlayingAudioId = null;

  setSectionButtonsDisabled(false);

  renderSectionStartScreen(currentSectionName, currentLoadedData);
}

function markStoppedWithAnswerKey() {
  isSubmitted = true;
  isTestRunning = false;

  stopTimer();
  stopSpeech();
  setSectionButtonsDisabled(false);

  if (currentSectionName === "listening") {
    disableCurrentForm("listening-form");
  }

  if (currentSectionName === "structure") {
    disableCurrentForm("structure-form");
  }

  if (currentSectionName === "reading") {
    disableCurrentForm("reading-form");
  }

  const scoreBox = document.getElementById("score-box");

  if (scoreBox) {
    scoreBox.innerHTML = `
      <h3>Test Stopped</h3>
      <p>This section was stopped manually. No score was recorded.</p>
      <p>The answer key and explanations are shown below each question.</p>
      ${renderRestartControls()}
    `;
  }
}

function revealAnswerKeyOnly() {
  if (currentSectionName === "listening") {
    revealListeningAnswerKey();
  }

  if (currentSectionName === "structure") {
    revealStructureAnswerKey();
  }

  if (currentSectionName === "reading") {
    revealReadingAnswerKey();
  }
}

function revealListeningAnswerKey() {
  const data = window.currentListeningData;

  data.items.forEach((item) => {
    item.questions.forEach((q) => {
      markCorrectChoice(q);
      const explanation = document.getElementById(`explanation-${q.id}`);

      if (explanation) {
        explanation.innerHTML = `
          <span class="correct">Answer Key:</span>
          ${String.fromCharCode(65 + q.answer)}. ${q.choices[q.answer]}
          <br>
          ${q.explanation}
        `;
      }
    });
  });
}

function revealStructureAnswerKey() {
  const data = window.currentStructureData;

  data.items.forEach((q) => {
    markCorrectChoice(q);
    const explanation = document.getElementById(`explanation-${q.id}`);

    if (explanation) {
      explanation.innerHTML = `
        <span class="correct">Answer Key:</span>
        ${String.fromCharCode(65 + q.answer)}. ${q.choices[q.answer]}
        <br>
        ${q.explanation}
      `;
    }
  });
}

function revealReadingAnswerKey() {
  const data = window.currentReadingData;

  data.passages.forEach((passage) => {
    passage.questions.forEach((q) => {
      markCorrectChoice(q);
      const explanation = document.getElementById(`explanation-${q.id}`);

      if (explanation) {
        explanation.innerHTML = `
          <span class="correct">Answer Key:</span>
          ${String.fromCharCode(65 + q.answer)}. ${q.choices[q.answer]}
          <br>
          ${q.explanation}
        `;
      }
    });
  });
}

function markCorrectChoice(question) {
  const inputs = document.querySelectorAll(`input[name="${question.id}"]`);

  inputs.forEach((input) => {
    const label = input.closest("label");

    if (!label) {
      return;
    }

    label.style.background = "";
    label.style.border = "";
    label.style.borderRadius = "";
    label.style.padding = "";

    if (Number(input.value) === question.answer) {
      input.checked = true;
      label.style.background = "#ecfdf5";
      label.style.border = "1px solid #10b981";
      label.style.borderRadius = "8px";
      label.style.padding = "8px";
    }
  });
}

function setSectionButtonsDisabled(disabled) {
  const sectionButtons = document.querySelectorAll(".section-buttons button");

  sectionButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

function getTotalQuestions(data, sectionName) {
  if (sectionName === "listening") {
    let total = 0;

    data.items.forEach((item) => {
      total += item.questions.length;
    });

    return total;
  }

  if (sectionName === "structure") {
    return data.items.length;
  }

  if (sectionName === "reading") {
    let total = 0;

    data.passages.forEach((passage) => {
      total += passage.questions.length;
    });

    return total;
  }

  return 0;
}

function restartSameQuestions() {
  if (!currentSectionName || !currentOriginalData) {
    alert("No section is loaded.");
    return;
  }

  stopSpeech();
  stopTimer();

  isSubmitted = false;
  isTestRunning = true;
  currentPlayingAudioId = null;

  setSectionButtonsDisabled(true);

  const data = cloneData(currentOriginalData);
  currentLoadedData = cloneData(data);

  if (currentSectionName === "listening") {
    renderListening(data);
    startTimer(data.meta.durationMinutes, "listening");
  }

  if (currentSectionName === "structure") {
    renderStructure(data);
    startTimer(data.meta.durationMinutes, "structure");
  }

  if (currentSectionName === "reading") {
    renderReading(data);
    startTimer(data.meta.durationMinutes, "reading");
  }
}

function retryWithShuffledQuestions() {
  if (!currentSectionName || !currentOriginalData) {
    alert("No section is loaded.");
    return;
  }

  stopSpeech();
  stopTimer();

  isSubmitted = false;
  isTestRunning = true;
  currentPlayingAudioId = null;

  setSectionButtonsDisabled(true);

  const shuffledData = createShuffledData(currentOriginalData, currentSectionName);
  currentLoadedData = cloneData(shuffledData);

  if (currentSectionName === "listening") {
    renderListening(shuffledData);
    startTimer(shuffledData.meta.durationMinutes, "listening");
  }

  if (currentSectionName === "structure") {
    renderStructure(shuffledData);
    startTimer(shuffledData.meta.durationMinutes, "structure");
  }

  if (currentSectionName === "reading") {
    renderReading(shuffledData);
    startTimer(shuffledData.meta.durationMinutes, "reading");
  }
}

function createShuffledData(data, sectionName) {
  const clonedData = cloneData(data);

  if (sectionName === "listening") {
    clonedData.items = shuffleArray(clonedData.items);

    clonedData.items.forEach((item) => {
      item.questions = shuffleArray(item.questions).map((question) => {
        return shuffleQuestionChoices(question);
      });
    });
  }

  if (sectionName === "structure") {
    clonedData.items = shuffleArray(clonedData.items).map((question) => {
      return shuffleQuestionChoices(question);
    });
  }

  if (sectionName === "reading") {
    clonedData.passages = shuffleArray(clonedData.passages);

    clonedData.passages.forEach((passage) => {
      passage.questions = shuffleArray(passage.questions).map((question) => {
        return shuffleQuestionChoices(question);
      });
    });
  }

  return clonedData;
}

function shuffleQuestionChoices(question) {
  const clonedQuestion = cloneData(question);

  const choicePairs = clonedQuestion.choices.map((choice, index) => {
    return {
      choice: choice,
      originalIndex: index
    };
  });

  const shuffledPairs = shuffleArray(choicePairs);

  clonedQuestion.choices = shuffledPairs.map((pair) => pair.choice);

  clonedQuestion.answer = shuffledPairs.findIndex((pair) => {
    return pair.originalIndex === question.answer;
  });

  return clonedQuestion;
}

function shuffleArray(array) {
  const newArray = [...array];

  for (let i = newArray.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    const temporaryValue = newArray[i];

    newArray[i] = newArray[randomIndex];
    newArray[randomIndex] = temporaryValue;
  }

  return newArray;
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function renderTimerBox(sectionName, durationMinutes) {
  return `
    <div class="timer-box" id="timer-box">
      <div>
        <strong>Timer</strong>
        <p id="timer-label">Section: ${formatSectionTitle(sectionName)} · ${durationMinutes} minutes</p>
      </div>
      <div id="timer-display" class="timer-display">--:--</div>
    </div>
  `;
}

function renderRestartControls() {
  if (isFullTestMode) {
    return "";
  }

  return `
    <div class="restart-box">
      <h3>Practice Again</h3>
      <p>Choose how you want to repeat this section.</p>

      <div class="restart-buttons">
        <button type="button" class="btn-restart" onclick="restartSameQuestions()">
          Restart Same Questions
        </button>

        <button type="button" class="btn-shuffle" onclick="retryWithShuffledQuestions()">
          Retry with Shuffled Questions
        </button>
      </div>
    </div>
  `;
}

function renderFullTestContinueControls() {
  if (!isFullTestMode) {
    return "";
  }

  const isLastSection = fullTestSectionIndex >= fullTestSections.length - 1;

  if (isLastSection) {
    return `
      <div class="restart-box">
        <h3>Full Test Progress</h3>
        <p>You have completed the last section.</p>
        <button type="button" onclick="showFullTestFinalResult()">
          View Final Result
        </button>
      </div>
    `;
  }

  const nextSection = fullTestSections[fullTestSectionIndex + 1];

  return `
    <div class="restart-box">
      <h3>Full Test Progress</h3>
      <p>This section is complete.</p>
      <button type="button" onclick="continueFullTest()">
        Continue to ${formatSectionTitle(nextSection)}
      </button>
    </div>
  `;
}

function continueFullTest() {
  fullTestSectionIndex++;

  if (fullTestSectionIndex >= fullTestSections.length) {
    showFullTestFinalResult();
    return;
  }

  const nextSection = fullTestSections[fullTestSectionIndex];
  renderFullTestSectionStart(nextSection);
}

function showFullTestFinalResult() {
  stopSpeech();
  stopTimer();

  isSubmitted = true;
  isTestRunning = false;

  setSectionButtonsDisabled(false);

  const listening = fullTestResults.listening || { score: 0, total: 0 };
  const structure = fullTestResults.structure || { score: 0, total: 0 };
  const reading = fullTestResults.reading || { score: 0, total: 0 };

  const totalScore = listening.score + structure.score + reading.score;
  const totalQuestions = listening.total + structure.total + reading.total;
  const accuracy = totalQuestions === 0 ? 0 : Math.round((totalScore / totalQuestions) * 100);

  const estimated = calculateEstimatedITPScore(listening, structure, reading);

  document.getElementById("practice-area").innerHTML = `
    <h2>Full Test Final Result</h2>

    <div class="score-box">
      <h3>Overall Result</h3>
      <p><strong>Selected set:</strong> ${currentSelectedSet ? currentSelectedSet.title : "-"}</p>
      <p><strong>Total Correct:</strong> ${totalScore} / ${totalQuestions}</p>
      <p><strong>Accuracy:</strong> ${accuracy}%</p>

      <h3>Section Scores</h3>
      <p><strong>Listening:</strong> ${listening.score} / ${listening.total}</p>
      <p><strong>Structure:</strong> ${structure.score} / ${structure.total}</p>
      <p><strong>Reading:</strong> ${reading.score} / ${reading.total}</p>

      <h3>Estimated TOEFL ITP-like Score</h3>
      <p><strong>Listening Estimated Scale:</strong> ${estimated.listeningScale}</p>
      <p><strong>Structure Estimated Scale:</strong> ${estimated.structureScale}</p>
      <p><strong>Reading Estimated Scale:</strong> ${estimated.readingScale}</p>
      <p><strong>Estimated Total Score:</strong> ${estimated.totalScore}</p>
      <p><strong>Estimated Level:</strong> ${estimated.level}</p>

      <p>
        <strong>Disclaimer:</strong> This is an unofficial practice estimate only.
        It is not an official TOEFL ITP score and does not use the official ETS conversion table.
      </p>

      <button type="button" onclick="loadFullTestIntro()">Restart Full Test</button>
    </div>
  `;

  resetFullTestState();
}

function calculateEstimatedITPScore(listening, structure, reading) {
  const listeningScale = estimateSectionScale(listening.score, listening.total, 31, 68);
  const structureScale = estimateSectionScale(structure.score, structure.total, 31, 68);
  const readingScale = estimateSectionScale(reading.score, reading.total, 31, 67);

  const totalScore = Math.round(((listeningScale + structureScale + readingScale) * 10) / 3);
  const level = getEstimatedITPLevel(totalScore);

  return {
    listeningScale,
    structureScale,
    readingScale,
    totalScore,
    level
  };
}

function estimateSectionScale(score, total, minScale, maxScale) {
  if (!total || total <= 0) {
    return minScale;
  }

  const percentage = score / total;
  const scale = Math.round(minScale + percentage * (maxScale - minScale));

  return Math.max(minScale, Math.min(maxScale, scale));
}

function getEstimatedITPLevel(score) {
  if (score < 343) {
    return "Below A2 / Basic";
  }

  if (score < 433) {
    return "A2 / Elementary";
  }

  if (score < 543) {
    return "B1 / Intermediate";
  }

  if (score < 620) {
    return "B2 / Upper Intermediate";
  }

  return "C1 / Advanced";
}

function renderActionButtons(sectionName) {
  return `
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px;">
      <button id="submit-${sectionName}" type="button" onclick="check${capitalizeFirstLetter(sectionName)}Answers(false)">
        Submit Answers
      </button>

      <button type="button" class="btn-stop" onclick="forceStopTest()">
        Stop Test
      </button>
    </div>
  `;
}

function capitalizeFirstLetter(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function startTimer(durationMinutes, sectionName) {
  stopTimer();

  remainingSeconds = durationMinutes * 60;
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();

    if (remainingSeconds <= 0) {
      stopTimer();
      handleTimeUp(sectionName);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById("timer-display");
  const timerBox = document.getElementById("timer-box");

  if (!timerDisplay || !timerBox) {
    return;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  timerDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  timerBox.classList.remove("timer-warning", "timer-danger");

  if (remainingSeconds <= 60) {
    timerBox.classList.add("timer-danger");
  } else if (remainingSeconds <= 300) {
    timerBox.classList.add("timer-warning");
  }
}

function handleTimeUp(sectionName) {
  if (isSubmitted) {
    return;
  }

  alert("Time is up. Your answers will be submitted automatically.");

  if (sectionName === "listening") {
    checkListeningAnswers(true);
  }

  if (sectionName === "structure") {
    checkStructureAnswers(true);
  }

  if (sectionName === "reading") {
    checkReadingAnswers(true);
  }
}

function disableCurrentForm(formId) {
  const form = document.getElementById(formId);

  if (!form) {
    return;
  }

  const inputs = form.querySelectorAll("input");
  const buttons = form.querySelectorAll("button");

  inputs.forEach((input) => {
    input.disabled = true;
  });

  buttons.forEach((button) => {
    button.disabled = true;
  });
}

function markSubmitted(formId) {
  isSubmitted = true;
  isTestRunning = false;

  stopTimer();
  disableCurrentForm(formId);
  stopSpeech();

  if (isFullTestMode) {
    setSectionButtonsDisabled(true);
  } else {
    setSectionButtonsDisabled(false);
  }
}

function validateAllAnswered(questionIds) {
  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];
    const selected = document.querySelector(`input[name="${questionId}"]:checked`);

    if (!selected) {
      const firstUnansweredInput = document.querySelector(`input[name="${questionId}"]`);

      if (firstUnansweredInput) {
        const questionCard = firstUnansweredInput.closest(".question-card");

        if (questionCard) {
          questionCard.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });

          questionCard.style.borderColor = "#dc2626";
          questionCard.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.15)";

          setTimeout(() => {
            questionCard.style.borderColor = "";
            questionCard.style.boxShadow = "";
          }, 2000);
        }
      }

      alert("Please answer all questions before submitting. If time runs out, the section will be submitted automatically.");
      return false;
    }
  }

  return true;
}

function formatSectionTitle(sectionName) {
  if (sectionName === "listening") {
    return "Listening Comprehension";
  }

  if (sectionName === "structure") {
    return "Structure & Written Expression";
  }

  if (sectionName === "reading") {
    return "Reading Comprehension";
  }

  return sectionName;
}

function renderListening(data) {
  const practiceArea = document.getElementById("practice-area");

  let totalQuestions = 0;
  data.items.forEach((item) => {
    totalQuestions += item.questions.length;
  });

  let html = `
    <h2>Listening Comprehension</h2>
    ${renderTimerBox("listening", data.meta.durationMinutes)}
    <p><strong>Selected set:</strong> ${currentSelectedSet ? currentSelectedSet.title : data.meta.set}</p>
    <p><strong>Set:</strong> ${data.meta.set}</p>
    <p><strong>Duration:</strong> ${data.meta.durationMinutes} minutes</p>
    <p><strong>Practice items:</strong> ${totalQuestions}</p>

    <form id="listening-form">
  `;

  data.items.forEach((item, itemIndex) => {
    html += `
      <div class="audio-box">
        <h3>Audio ${itemIndex + 1}: ${item.title}</h3>
        <p><strong>Type:</strong> ${formatListeningType(item.type)}</p>
        <p>Click play to listen to this audio, then answer the questions below.</p>

        <div class="audio-controls">
          <button id="btn-play-${item.id}" class="btn-play" type="button" onclick="speakListeningAudio('${item.id}')">
            ▶ Play Audio ${itemIndex + 1}
          </button>

          <button id="btn-pause-${item.id}" class="btn-pause" type="button" onclick="pauseSpeech()" disabled>
            ⏸ Pause
          </button>

          <button id="btn-resume-${item.id}" class="btn-resume" type="button" onclick="resumeSpeech()" disabled>
            ▶ Resume
          </button>

          <button id="btn-stop-${item.id}" class="btn-stop" type="button" onclick="stopSpeech()" disabled>
            ⏹ Stop
          </button>
        </div>

        <div id="audio-status-${item.id}" class="audio-status">Status: Ready</div>
      </div>
    `;

    item.questions.forEach((q, questionIndex) => {
      html += `
        <div class="question-card">
          <p class="question-meta">
            <strong>Audio ${itemIndex + 1} · Question ${questionIndex + 1}</strong>
          </p>

          <p><strong>${q.question}</strong></p>
      `;

      q.choices.forEach((choice, cIndex) => {
        html += `
          <label class="choice">
            <input type="radio" name="${q.id}" value="${cIndex}">
            ${String.fromCharCode(65 + cIndex)}. ${choice}
          </label>
        `;
      });

      html += `
          <p id="explanation-${q.id}" class="explanation"></p>
        </div>
      `;
    });
  });

  html += `
      ${renderActionButtons("listening")}
    </form>

    <div id="score-box" class="score-box"></div>
  `;

  practiceArea.innerHTML = html;

  window.currentListeningData = data;
  currentAudioState = "ready";
  currentPlayingAudioId = null;
  isManualStop = false;
  updateAudioButtons();
}

function renderStructure(data) {
  const practiceArea = document.getElementById("practice-area");

  let html = `
    <h2>Structure & Written Expression</h2>
    ${renderTimerBox("structure", data.meta.durationMinutes)}
    <p><strong>Selected set:</strong> ${currentSelectedSet ? currentSelectedSet.title : data.meta.set}</p>
    <p><strong>Set:</strong> ${data.meta.set}</p>
    <p><strong>Duration:</strong> ${data.meta.durationMinutes} minutes</p>
    <p><strong>Practice items:</strong> ${data.items.length}</p>

    <form id="structure-form">
  `;

  data.items.forEach((q, index) => {
    html += `
      <div class="question-card">
        <p class="question-meta">
          <strong>Question ${index + 1}</strong> · ${formatQuestionType(q.type)} · ${q.topic}
        </p>
        <p><strong>${q.question}</strong></p>
    `;

    q.choices.forEach((choice, cIndex) => {
      html += `
        <label class="choice">
          <input type="radio" name="${q.id}" value="${cIndex}">
          ${String.fromCharCode(65 + cIndex)}. ${choice}
        </label>
      `;
    });

    html += `
        <p id="explanation-${q.id}" class="explanation"></p>
      </div>
    `;
  });

  html += `
      ${renderActionButtons("structure")}
    </form>

    <div id="score-box" class="score-box"></div>
  `;

  practiceArea.innerHTML = html;
  window.currentStructureData = data;
}

function renderReading(data) {
  const practiceArea = document.getElementById("practice-area");

  let totalQuestions = 0;
  data.passages.forEach((passage) => {
    totalQuestions += passage.questions.length;
  });

  let html = `
    <h2>Reading Comprehension</h2>
    ${renderTimerBox("reading", data.meta.durationMinutes)}
    <p><strong>Selected set:</strong> ${currentSelectedSet ? currentSelectedSet.title : data.meta.set}</p>
    <p><strong>Set:</strong> ${data.meta.set}</p>
    <p><strong>Duration:</strong> ${data.meta.durationMinutes} minutes</p>
    <p><strong>Practice items:</strong> ${totalQuestions}</p>

    <form id="reading-form">
  `;

  data.passages.forEach((passage, passageIndex) => {
    html += `
      <div class="passage-card">
        <h3>Passage ${passageIndex + 1}: ${passage.title}</h3>
        <p class="passage-text">${passage.passage}</p>
      </div>
    `;

    passage.questions.forEach((q, questionIndex) => {
      html += `
        <div class="question-card">
          <p class="question-meta">
            <strong>Question ${questionIndex + 1}</strong> · ${formatReadingType(q.type)}
          </p>
          <p><strong>${q.question}</strong></p>
      `;

      q.choices.forEach((choice, cIndex) => {
        html += `
          <label class="choice">
            <input type="radio" name="${q.id}" value="${cIndex}">
            ${String.fromCharCode(65 + cIndex)}. ${choice}
          </label>
        `;
      });

      html += `
          <p id="explanation-${q.id}" class="explanation"></p>
        </div>
      `;
    });
  });

  html += `
      ${renderActionButtons("reading")}
    </form>

    <div id="score-box" class="score-box"></div>
  `;

  practiceArea.innerHTML = html;
  window.currentReadingData = data;
}

function formatQuestionType(type) {
  if (type === "sentence-completion") {
    return "Sentence Completion";
  }

  if (type === "error-identification") {
    return "Error Identification";
  }

  return type;
}

function formatReadingType(type) {
  if (type === "main-idea") {
    return "Main Idea";
  }

  if (type === "detail") {
    return "Detail";
  }

  if (type === "inference") {
    return "Inference";
  }

  if (type === "vocabulary") {
    return "Vocabulary";
  }

  if (type === "purpose") {
    return "Author's Purpose";
  }

  if (type === "reference") {
    return "Reference";
  }

  return type;
}

function formatListeningType(type) {
  if (type === "conversation") {
    return "Conversation";
  }

  if (type === "talk") {
    return "Short Talk";
  }

  if (type === "lecture") {
    return "Academic Lecture";
  }

  return type;
}

function speakListeningAudio(audioId) {
  const data = window.currentListeningData;

  if (!data) {
    alert("Listening data is not loaded.");
    return;
  }

  const item = data.items.find((audioItem) => {
    return audioItem.id === audioId;
  });

  if (!item) {
    alert("Audio item was not found.");
    return;
  }

  if (!("speechSynthesis" in window)) {
    alert("Your browser does not support Text-to-Speech.");
    return;
  }

  isManualStop = true;
  speechSynthesis.cancel();

  setTimeout(() => {
    isManualStop = false;

    currentPlayingAudioId = audioId;

    currentUtterance = new SpeechSynthesisUtterance(item.ttsText);
    currentUtterance.lang = "en-US";
    currentUtterance.rate = 0.82;
    currentUtterance.pitch = 0.95;
    currentUtterance.volume = 1;

    currentUtterance.onstart = function () {
      currentAudioState = "playing";
      updateAudioButtons();
    };

    currentUtterance.onend = function () {
      if (isManualStop) {
        return;
      }

      currentAudioState = "finished";
      updateAudioButtons();
    };

    currentUtterance.onerror = function (event) {
      if (isManualStop || event.error === "interrupted" || event.error === "canceled") {
        return;
      }

      console.error("Text-to-Speech error:", event);
      currentAudioState = "stopped";
      updateAudioButtons();
      alert("Text-to-Speech error. Please try again.");
    };

    currentAudioState = "playing";
    updateAudioButtons();

    speechSynthesis.speak(currentUtterance);
  }, 150);
}

function pauseSpeech() {
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause();
    currentAudioState = "paused";
    updateAudioButtons();
  }
}

function resumeSpeech() {
  if (speechSynthesis.paused) {
    speechSynthesis.resume();
    currentAudioState = "playing";
    updateAudioButtons();
  }
}

function stopSpeech() {
  if ("speechSynthesis" in window) {
    isManualStop = true;
    speechSynthesis.cancel();
  }

  currentUtterance = null;
  currentAudioState = "stopped";
  updateAudioButtons();

  setTimeout(() => {
    isManualStop = false;
  }, 300);
}

function updateAudioButtons() {
  const data = window.currentListeningData;

  if (!data || !data.items) {
    return;
  }

  data.items.forEach((item) => {
    const btnPlay = document.getElementById(`btn-play-${item.id}`);
    const btnPause = document.getElementById(`btn-pause-${item.id}`);
    const btnResume = document.getElementById(`btn-resume-${item.id}`);
    const btnStop = document.getElementById(`btn-stop-${item.id}`);
    const audioStatus = document.getElementById(`audio-status-${item.id}`);

    if (!btnPlay || !btnPause || !btnResume || !btnStop || !audioStatus) {
      return;
    }

    btnPlay.classList.remove("active");
    btnPause.classList.remove("active");
    btnResume.classList.remove("active");
    btnStop.classList.remove("active");

    btnPlay.disabled = false;
    btnPause.disabled = true;
    btnResume.disabled = true;
    btnStop.disabled = true;

    audioStatus.textContent = "Status: Ready";

    if (currentPlayingAudioId !== item.id) {
      if (currentAudioState === "playing" || currentAudioState === "paused") {
        btnPlay.disabled = true;
        audioStatus.textContent = "Status: Another audio is playing";
      }

      return;
    }

    if (currentAudioState === "ready") {
      btnPlay.disabled = false;
      btnPause.disabled = true;
      btnResume.disabled = true;
      btnStop.disabled = true;
      audioStatus.textContent = "Status: Ready";
    }

    if (currentAudioState === "playing") {
      btnPlay.disabled = true;
      btnPause.disabled = false;
      btnResume.disabled = true;
      btnStop.disabled = false;

      btnPlay.classList.add("active");
      audioStatus.textContent = "Status: Playing...";
    }

    if (currentAudioState === "paused") {
      btnPlay.disabled = true;
      btnPause.disabled = true;
      btnResume.disabled = false;
      btnStop.disabled = false;

      btnPause.classList.add("active");
      audioStatus.textContent = "Status: Paused";
    }

    if (currentAudioState === "stopped") {
      btnPlay.disabled = false;
      btnPause.disabled = true;
      btnResume.disabled = true;
      btnStop.disabled = true;

      btnStop.classList.add("active");
      audioStatus.textContent = "Status: Stopped";
    }

    if (currentAudioState === "finished") {
      btnPlay.disabled = false;
      btnPause.disabled = true;
      btnResume.disabled = true;
      btnStop.disabled = true;

      audioStatus.textContent = "Status: Finished";
    }
  });
}

function saveFullTestSectionResult(sectionName, score, total) {
  if (!isFullTestMode) {
    return;
  }

  fullTestResults[sectionName] = {
    score: score,
    total: total
  };
}

function checkListeningAnswers(isAutoSubmit = false) {
  if (isSubmitted) {
    return;
  }

  const data = window.currentListeningData;
  let score = 0;
  let totalQuestions = 0;
  const questionIds = [];

  data.items.forEach((item) => {
    item.questions.forEach((q) => {
      questionIds.push(q.id);
    });
  });

  if (!isAutoSubmit) {
    const allAnswered = validateAllAnswered(questionIds);

    if (!allAnswered) {
      return;
    }
  }

  data.items.forEach((item) => {
    item.questions.forEach((q) => {
      totalQuestions++;

      const selected = document.querySelector(`input[name="${q.id}"]:checked`);
      const explanation = document.getElementById(`explanation-${q.id}`);

      if (!selected) {
        explanation.innerHTML = `<span class="wrong">Not answered.</span> ${q.explanation}`;
        return;
      }

      const selectedValue = Number(selected.value);

      if (selectedValue === q.answer) {
        score++;
        explanation.innerHTML = `<span class="correct">Correct.</span> ${q.explanation}`;
      } else {
        explanation.innerHTML = `
          <span class="wrong">Wrong.</span>
          Correct answer: ${String.fromCharCode(65 + q.answer)}.
          ${q.explanation}
        `;
      }
    });
  });

  saveFullTestSectionResult("listening", score, totalQuestions);

  const scoreBox = document.getElementById("score-box");
  scoreBox.innerHTML = `
    <h3>Your Listening Score</h3>
    <p>${score} / ${totalQuestions}</p>
    <p>${isAutoSubmit ? "Submitted automatically because time was up." : "Submitted manually."}</p>
    ${renderRestartControls()}
    ${renderFullTestContinueControls()}
  `;

  markSubmitted("listening-form");
}

function checkStructureAnswers(isAutoSubmit = false) {
  if (isSubmitted) {
    return;
  }

  const data = window.currentStructureData;
  let score = 0;
  const questionIds = data.items.map((q) => q.id);

  if (!isAutoSubmit) {
    const allAnswered = validateAllAnswered(questionIds);

    if (!allAnswered) {
      return;
    }
  }

  data.items.forEach((q) => {
    const selected = document.querySelector(`input[name="${q.id}"]:checked`);
    const explanation = document.getElementById(`explanation-${q.id}`);

    if (!selected) {
      explanation.innerHTML = `<span class="wrong">Not answered.</span> ${q.explanation}`;
      return;
    }

    const selectedValue = Number(selected.value);

    if (selectedValue === q.answer) {
      score++;
      explanation.innerHTML = `<span class="correct">Correct.</span> ${q.explanation}`;
    } else {
      explanation.innerHTML = `
        <span class="wrong">Wrong.</span>
        Correct answer: ${String.fromCharCode(65 + q.answer)}.
        ${q.explanation}
      `;
    }
  });

  saveFullTestSectionResult("structure", score, data.items.length);

  const scoreBox = document.getElementById("score-box");
  scoreBox.innerHTML = `
    <h3>Your Structure Score</h3>
    <p>${score} / ${data.items.length}</p>
    <p>${isAutoSubmit ? "Submitted automatically because time was up." : "Submitted manually."}</p>
    ${renderRestartControls()}
    ${renderFullTestContinueControls()}
  `;

  markSubmitted("structure-form");
}

function checkReadingAnswers(isAutoSubmit = false) {
  if (isSubmitted) {
    return;
  }

  const data = window.currentReadingData;
  let score = 0;
  let totalQuestions = 0;
  const questionIds = [];

  data.passages.forEach((passage) => {
    passage.questions.forEach((q) => {
      questionIds.push(q.id);
    });
  });

  if (!isAutoSubmit) {
    const allAnswered = validateAllAnswered(questionIds);

    if (!allAnswered) {
      return;
    }
  }

  data.passages.forEach((passage) => {
    passage.questions.forEach((q) => {
      totalQuestions++;

      const selected = document.querySelector(`input[name="${q.id}"]:checked`);
      const explanation = document.getElementById(`explanation-${q.id}`);

      if (!selected) {
        explanation.innerHTML = `<span class="wrong">Not answered.</span> ${q.explanation}`;
        return;
      }

      const selectedValue = Number(selected.value);

      if (selectedValue === q.answer) {
        score++;
        explanation.innerHTML = `<span class="correct">Correct.</span> ${q.explanation}`;
      } else {
        explanation.innerHTML = `
          <span class="wrong">Wrong.</span>
          Correct answer: ${String.fromCharCode(65 + q.answer)}.
          ${q.explanation}
        `;
      }
    });
  });

  saveFullTestSectionResult("reading", score, totalQuestions);

  const scoreBox = document.getElementById("score-box");
  scoreBox.innerHTML = `
    <h3>Your Reading Score</h3>
    <p>${score} / ${totalQuestions}</p>
    <p>${isAutoSubmit ? "Submitted automatically because time was up." : "Submitted manually."}</p>
    ${renderRestartControls()}
    ${renderFullTestContinueControls()}
  `;

  markSubmitted("reading-form");
}