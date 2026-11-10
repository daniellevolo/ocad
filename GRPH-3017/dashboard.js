const FILES = {
  averages: "resources/survey_scores_average.csv",
  scoreCounts: "resources/survey_scores_count.csv",
  ratings: "resources/overall_safety_rating_count.csv",
  events: "resources/reported_events_sum.csv",
  participation: "resources/unit_participation.csv",
  dictionary: "resources/data_dictionary.csv",
};

const SCORE_FIELDS = [
  "Teamwork_Score",
  "Staffing_Score",
  "Communication_Openness_Score",
  "Leadership_Support_Score",
  "Communication_About_Errors_Score",
  "Reporting_Culture_Score",
];
const RATING_LEVELS = [
  { value: 5, label: "Excellent", color: "var(--blue-strong)" },
  { value: 4, label: "Very Good", color: "var(--blue-soft)" },
  { value: 3, label: "Good", color: "var(--neutral)" },
  { value: 2, label: "Fair", color: "var(--red-soft)" },
  { value: 1, label: "Poor", color: "var(--red-strong)" },
];
const RESPONSE_LEVELS = [
  { value: 5, label: "Strongly agree", color: "var(--blue-strong)" },
  { value: 4, label: "Agree", color: "var(--blue-soft)" },
  { value: 3, label: "Neutral", color: "var(--neutral)" },
  { value: 2, label: "Disagree", color: "var(--red-soft)" },
  { value: 1, label: "Strongly disagree", color: "var(--red-strong)" },
];
const OVERALL_SCOPE = "__program_overall__";

const elements = {
  programTabs: document.querySelector("#program-tabs"),
  status: document.querySelector("#load-status"),
  error: document.querySelector("#load-error"),
  errorMessage: document.querySelector("#load-error-message"),
  grid: document.querySelector("#dashboard-grid"),
  scoreChart: document.querySelector("#score-chart"),
  scoresProgram: document.querySelector("#scores-program"),
  strongestName: document.querySelector("#strongest-name"),
  strongestValue: document.querySelector("#strongest-value"),
  lowestName: document.querySelector("#lowest-name"),
  lowestValue: document.querySelector("#lowest-value"),
  ratingList: document.querySelector("#rating-list"),
  distributionChart: document.querySelector("#distribution-chart"),
  distributionProgram: document.querySelector("#distribution-program"),
  responseLegend: document.querySelector("#response-legend"),
  activityProgram: document.querySelector("#activity-program"),
  eventsValue: document.querySelector("#events-value"),
  unitList: document.querySelector("#unit-list"),
};

let data;
let selectedProgram;

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (character === "\r" && input[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("A CSV file contains an unterminated quoted field.");
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  if (!headers?.length) throw new Error("A CSV file is missing its header row.");
  return records
    .filter((record) => record.some((value) => value.trim() !== ""))
    .map((record) => Object.fromEntries(headers.map((header, index) => [header.trim(), (record[index] ?? "").trim()])));
}

async function loadCSV(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} returned ${response.status} ${response.statusText}.`);
  return parseCSV(await response.text());
}

function asNumber(value) {
  const number = Number(String(value ?? "").replaceAll(",", "").trim());
  return Number.isFinite(number) ? number : null;
}

function displayName(field) {
  return field
    .replace(/_Score$/, "")
    .replaceAll("_", " ")
    .replace(/\bEd\b/g, "ED");
}

function readData(records) {
  const programs = [...new Set(records.averages
    .filter((record) => record.Clinical_Program && record.Unit && record.Unit !== "OVERALL AVERAGE")
    .map((record) => record.Clinical_Program))];
  if (!programs.length) throw new Error("No clinical programs were found in survey_scores_average.csv.");

  const averages = records.averages.filter((record) => record.Clinical_Program && record.Unit && record.Unit !== "OVERALL AVERAGE");
  const scoreCounts = {};
  let currentProgram = "";
  for (const record of records.scoreCounts) {
    if (record.Clinical_Program) currentProgram = record.Clinical_Program;
    const score = asNumber(record.Scores);
    if (!currentProgram || score === null) continue;
    scoreCounts[currentProgram] ??= {};
    scoreCounts[currentProgram][score] = Object.fromEntries(
      SCORE_FIELDS.map((field) => {
        const count = record[field] ? asNumber(record[field]) : null;
        if (!Number.isInteger(count) || count < 0) {
          throw new Error(`Missing or invalid response count for ${currentProgram}, ${field}, score ${score}.`);
        }
        return [field, count];
      }),
    );
  }

  const ratings = records.ratings
    .filter((record) => record["Safety Rating"] && /\/\s*[1-5]$/.test(record["Safety Rating"]))
    .map((record) => {
      const value = Number(record["Safety Rating"].match(/\/\s*([1-5])$/)[1]);
      return {
        value,
        label: record["Safety Rating"].replace(/\s*\/\s*[1-5]$/, ""),
        color: RATING_LEVELS.find((level) => level.value === value)?.color ?? "var(--neutral)",
        counts: Object.fromEntries(programs.map((program) => [program, asNumber(record[program]) ?? 0])),
      };
    });

  const eventRows = records.events.filter((record) => record.Clinical_Program && record.Unit);
  const participationRows = records.participation.filter((record) => record.Clinical_Program && record.Unit);
  const dictionary = Object.fromEntries(records.dictionary
    .filter((record) => record.Column_Name)
    .map((record) => [record.Column_Name, record]));

  return { programs, averages, scoreCounts, ratings, eventRows, participationRows, dictionary };
}

function sum(values) {
  return values.reduce((total, value) => total + (asNumber(value) ?? 0), 0);
}

function getProgramAverages(program, unit) {
  if (unit !== OVERALL_SCOPE) {
    return data.averages.find((record) => record.Clinical_Program === program && record.Unit === unit);
  }
  return data.averages.find((record) => record.Clinical_Program === program && /-\s*OVERALL$/i.test(record.Unit));
}

function getProgramRatings(program) {
  return data.ratings.map((rating) => ({ ...rating, count: rating.counts[program] ?? 0 }));
}

function getProgramResponseCounts(program) {
  return data.scoreCounts[program] ?? {};
}

function getUnitParticipation(program, unit) {
  const rows = data.participationRows.filter((record) => record.Clinical_Program === program);
  if (unit !== OVERALL_SCOPE) return rows.find((record) => record.Unit === unit);
  if (!rows.length) return null;
  const invited = sum(rows.map((record) => record.Invited_Count));
  const responses = sum(rows.map((record) => record.Responses_Count));
  return {
    Unit: "Program total",
    Invited_Count: String(invited),
    Responses_Count: String(responses),
    Response_Rate: invited > 0 ? `${Math.round((responses / invited) * 100)}%` : "0%",
  };
}

function getEventCount(program, unit) {
  const row = data.eventRows.find((record) => record.Clinical_Program === program
    && (unit === OVERALL_SCOPE ? /-\s*OVERALL$/i.test(record.Unit) : record.Unit === unit));
  return row ? asNumber(row["Sum of Reported Events"]) ?? 0 : 0;
}

function setText(element, value) {
  element.textContent = value;
}

function formatNumber(value, digits = 1) {
  return Number(value).toFixed(digits);
}

function fillProgramFilter() {
  elements.programTabs.replaceChildren();
  data.programs.forEach((program, index) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.id = `program-tab-${index}`;
    tab.className = "program-tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", "false");
    tab.tabIndex = -1;
    tab.dataset.program = program;
    tab.textContent = program;
    elements.programTabs.append(tab);
  });
  selectedProgram = data.programs.includes("Surgery") ? "Surgery" : data.programs[0];
  updateProgramTabs();
}

function updateProgramTabs() {
  for (const tab of elements.programTabs.querySelectorAll('[role="tab"]')) {
    const selected = tab.dataset.program === selectedProgram;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) elements.grid.setAttribute("aria-labelledby", tab.id);
  }
}

function summarizeRating(program) {
  const ratings = getProgramRatings(program);
  const total = sum(ratings.map((rating) => rating.count));
  const weighted = sum(ratings.map((rating) => rating.count * rating.value));
  return { ratings, total, average: total ? (weighted / total) * 2 : 0 };
}

function renderRating() {
  elements.ratingList.replaceChildren();

  for (const program of data.programs) {
    const { ratings, total, average } = summarizeRating(program);
    const selected = program === selectedProgram;
    const item = document.createElement("div");
    item.className = `rating-item ${selected ? "is-selected" : "is-collapsed"}`;
    item.dataset.program = program;

    const name = document.createElement("span");
    name.className = "rating-program";
    name.textContent = program;

    const ring = document.createElement("div");
    ring.className = selected ? "rating-donut" : "rating-mini";
    const value = document.createElement("strong");

    if (selected) {
      let offset = 0;
      const segments = ratings.map((rating) => {
        const start = offset;
        offset += total ? (rating.count / total) * 100 : 0;
        return `${rating.color} ${start.toFixed(2)}% ${offset.toFixed(2)}%`;
      });
      ring.style.background = `conic-gradient(${segments.join(", ")})`;
      ring.setAttribute("role", "img");
      ring.setAttribute("aria-label", `${formatNumber(average)} out of 10 average safety rating from ${total} responses.`);
      const caption = document.createElement("span");
      caption.textContent = "Avg. Safety Rating";
      const center = document.createElement("div");
      center.className = "rating-average";
      value.textContent = formatNumber(average);
      center.append(value, caption);
      ring.append(center);

      const legend = document.createElement("ul");
      legend.className = "rating-legend";
      for (const rating of ratings) {
        const row = document.createElement("li");
        const swatch = document.createElement("span");
        swatch.className = "legend-swatch";
        swatch.style.backgroundColor = rating.color;
        swatch.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.textContent = rating.label;
        const count = document.createElement("strong");
        count.textContent = String(rating.count);
        count.title = `${total ? Math.round((rating.count / total) * 100) : 0}% of ${total} responses`;
        row.append(swatch, label, count);
        legend.append(row);
      }
      const details = document.createElement("div");
      details.className = "rating-details";
      details.append(name, legend);
      item.append(details, ring);
    } else {
      ring.style.setProperty("--fill", `${(average / 10) * 100}%`);
      value.textContent = formatNumber(average);
      ring.append(value);
      item.append(name, ring);
    }
    elements.ratingList.append(item);
  }
}

function renderScores(program, unit) {
  const row = getProgramAverages(program, unit);
  const countsByScore = unit === OVERALL_SCOPE ? getProgramResponseCounts(program) : null;
  const scores = SCORE_FIELDS.map((field) => ({
    field,
    value: row ? asNumber(row[field]) ?? 0 : 0,
  }));
  const titleMap = new Map(
    Object.entries(data.dictionary).map(([field, record]) => [field, record["Corresponding Survey Question"]]),
  );
  elements.scoreChart.replaceChildren();
  elements.scoreChart.setAttribute("aria-label", `Average safety culture scores for ${row?.Unit ?? program}.`);

  for (const score of scores) {
    const column = document.createElement("div");
    column.className = "score-column";
    const value = document.createElement("span");
    value.className = "score-value";
    value.textContent = formatNumber(score.value);
    const track = document.createElement("div");
    track.className = "score-track";
    const bar = document.createElement("div");
    bar.className = "score-bar";
    bar.style.height = `${Math.max((score.value / 5) * 100, 2)}%`;
    bar.title = `${displayName(score.field)}: ${formatNumber(score.value)} out of 5`;
    bar.append(value);
    track.append(bar);
    const label = document.createElement("span");
    label.className = "score-label";
    label.textContent = displayName(score.field);
    const question = titleMap.get(score.field);
    if (question && question !== "N/A") {
      column.title = question;
      column.setAttribute("aria-label", `${displayName(score.field)}, ${formatNumber(score.value)} out of 5. ${question}`);
      column.setAttribute("tabindex", "0");
    }
    column.append(track, label);
    elements.scoreChart.append(column);
  }

  const rankedScores = scores.map((score) => {
    if (!countsByScore) return { ...score, rankingValue: score.value };
    const counts = RESPONSE_LEVELS.map((level) => {
      const count = countsByScore[level.value]?.[score.field];
      if (!Number.isInteger(count) || count < 0) {
        throw new Error(`Missing or invalid response count for ${program}, ${score.field}, score ${level.value}.`);
      }
      return { value: level.value, count };
    });
    const total = sum(counts.map((entry) => entry.count));
    if (!total) throw new Error(`No responses for ${program}, ${score.field}.`);
    const weighted = sum(counts.map((entry) => entry.value * entry.count));
    return { ...score, rankingValue: weighted / total };
  });
  const mostPositive = rankedScores.reduce((best, current) => current.rankingValue > best.rankingValue ? current : best);
  const opportunity = rankedScores.reduce((lowest, current) => current.rankingValue < lowest.rankingValue ? current : lowest);
  setText(elements.strongestName, displayName(mostPositive.field));
  setText(elements.strongestValue, formatNumber(mostPositive.value));
  setText(elements.lowestName, displayName(opportunity.field));
  setText(elements.lowestValue, formatNumber(opportunity.value));
}

function renderDistribution(program) {
  const countsByScore = getProgramResponseCounts(program);
  setText(elements.distributionProgram, program);
  elements.distributionChart.replaceChildren();
  for (const field of SCORE_FIELDS) {
    const scoreCounts = RESPONSE_LEVELS.map((level) => ({
      ...level,
      count: countsByScore[level.value]?.[field] ?? 0,
    }));
    const total = sum(scoreCounts.map((entry) => entry.count));
    const row = document.createElement("div");
    row.className = "distribution-row";
    const label = document.createElement("span");
    label.className = "distribution-label";
    label.textContent = displayName(field);
    const bar = document.createElement("div");
    bar.className = "distribution-bar";
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", `${displayName(field)}: ${scoreCounts.map((entry) => `${entry.label} ${entry.count}`).join(", ")}.`);
    for (const entry of [...scoreCounts].reverse()) {
      const segment = document.createElement("span");
      segment.className = "distribution-segment";
      segment.style.width = `${total ? (entry.count / total) * 100 : 0}%`;
      segment.style.backgroundColor = entry.color;
      segment.title = `${entry.label}: ${entry.count} (${total ? Math.round((entry.count / total) * 100) : 0}%)`;
      bar.append(segment);
    }
    row.append(label, bar);
    elements.distributionChart.append(row);
  }

  elements.responseLegend.replaceChildren();
  for (const level of RESPONSE_LEVELS) {
    const item = document.createElement("li");
    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.backgroundColor = level.color;
    swatch.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = level.label;
    item.append(swatch, label);
    elements.responseLegend.append(item);
  }
}

function renderActivity(program, unit) {
  setText(elements.activityProgram, program);
  setText(elements.eventsValue, String(getEventCount(program, unit)));

  const tiles = data.eventRows
    .filter((record) => record.Clinical_Program === program && !/-\s*OVERALL$/i.test(record.Unit))
    .map((record) => ({
      name: record.Unit.replace(/^.*?\s-\s/, ""),
      count: asNumber(record["Sum of Reported Events"]) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
  elements.unitList.replaceChildren();
  elements.unitList.style.setProperty("--tile-rows", Math.max(tiles.length - 1, 1));
  tiles.forEach((tile, index) => {
    const item = document.createElement("div");
    item.className = index === 0 ? "event-tile is-primary" : "event-tile";
    const name = document.createElement("span");
    name.className = "event-tile-name";
    name.textContent = tile.name;
    const count = document.createElement("strong");
    count.className = "event-tile-count";
    count.textContent = String(tile.count);
    item.append(name, count);
    elements.unitList.append(item);
  });
}

function selectProgram(program) {
  selectedProgram = program;
  updateProgramTabs();
  renderDashboard();
}

function renderDashboard() {
  const program = selectedProgram;
  const unit = OVERALL_SCOPE;
  renderRating();
  renderScores(program, unit);
  setText(elements.scoresProgram, program);
  renderDistribution(program);
  renderActivity(program, unit);
}

async function init() {
  try {
    const paths = Object.values(FILES);
    const results = await Promise.all(paths.map(loadCSV));
    const keys = Object.keys(FILES);
    data = readData(Object.fromEntries(keys.map((key, index) => [key, results[index]])));
    fillProgramFilter();
    renderDashboard();
    elements.programTabs.addEventListener("click", (event) => {
      if (event.target instanceof HTMLButtonElement && event.target.dataset.program) {
        selectProgram(event.target.dataset.program);
      }
    });
    elements.programTabs.addEventListener("keydown", (event) => {
      const tabs = [...elements.programTabs.querySelectorAll('[role="tab"]')];
      const currentIndex = tabs.indexOf(document.activeElement);
      let nextIndex;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex !== undefined) {
        event.preventDefault();
        selectProgram(tabs[nextIndex].dataset.program);
        tabs[nextIndex].focus();
      }
    });
    elements.status.hidden = true;
    elements.grid.hidden = false;
  } catch (error) {
    elements.status.hidden = true;
    elements.error.hidden = false;
    setText(elements.errorMessage, error instanceof Error ? error.message : String(error));
    console.error("Could not initialize the safety culture dashboard.", error);
  }
}

init();
