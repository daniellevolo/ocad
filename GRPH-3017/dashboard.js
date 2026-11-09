const FILES = {
  averages: "resources/survey_scores_average.csv",
  scoreCounts: "resources/survey_scores_count.csv",
  ratings: "resources/overall_safety_rating_count.csv",
  events: "resources/reported_events_sum.csv",
  participation: "resources/unit_participation.csv",
  dictionary: "resources/data_dictionary.csv",
  metrics: "resources/metrics_examples.csv",
  guide: "resources/student_guide.csv",
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
  program: document.querySelector("#program-filter"),
  unit: document.querySelector("#unit-filter"),
  status: document.querySelector("#load-status"),
  error: document.querySelector("#load-error"),
  errorMessage: document.querySelector("#load-error-message"),
  grid: document.querySelector("#dashboard-grid"),
  guide: document.querySelector("#guide-notes"),
  scoreChart: document.querySelector("#score-chart"),
  scorePrograms: document.querySelector("#score-programs"),
  strongestName: document.querySelector("#strongest-name"),
  strongestValue: document.querySelector("#strongest-value"),
  lowestName: document.querySelector("#lowest-name"),
  lowestValue: document.querySelector("#lowest-value"),
  ratingDonut: document.querySelector("#rating-donut"),
  ratingAverage: document.querySelector("#rating-average-value"),
  ratingCount: document.querySelector("#rating-count"),
  ratingLegend: document.querySelector("#rating-legend"),
  distributionChart: document.querySelector("#distribution-chart"),
  responseLegend: document.querySelector("#response-legend"),
  activityUnit: document.querySelector("#activity-unit"),
  eventsValue: document.querySelector("#events-value"),
  participationValue: document.querySelector("#participation-value"),
  participationCount: document.querySelector("#participation-count"),
  unitList: document.querySelector("#unit-list"),
  limitations: document.querySelector("#data-limitations"),
  interpretation: document.querySelector("#data-interpretation"),
  metricDefinitions: document.querySelector("#metric-definitions-list"),
  updatedScope: document.querySelector("#updated-scope"),
};

let data;
let selectedUnit = OVERALL_SCOPE;

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
      SCORE_FIELDS.map((field) => [field, asNumber(record[field]) ?? 0]),
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
  const guide = Object.fromEntries(records.guide.filter((record) => record.Topic).map((record) => [record.Topic, record.Guidance]));

  return { programs, averages, scoreCounts, ratings, eventRows, participationRows, dictionary, guide, metrics: records.metrics };
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
  elements.program.replaceChildren();
  for (const program of data.programs) {
    const option = document.createElement("option");
    option.value = program;
    option.textContent = program;
    elements.program.append(option);

    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "score-program";
    radio.value = program;
    const text = document.createElement("span");
    text.textContent = program;
    label.append(radio, text);
    elements.scorePrograms.append(label);
  }
  elements.program.value = data.programs.includes("Surgery") ? "Surgery" : data.programs[0];
  elements.program.disabled = false;
}

function fillUnitFilter(program) {
  const actualUnits = data.participationRows
    .filter((record) => record.Clinical_Program === program)
    .map((record) => record.Unit);
  const previousUnit = selectedUnit;
  elements.unit.replaceChildren();

  const overallOption = document.createElement("option");
  overallOption.value = OVERALL_SCOPE;
  overallOption.textContent = "Program total";
  elements.unit.append(overallOption);
  for (const unit of actualUnits) {
    const option = document.createElement("option");
    option.value = unit;
    option.textContent = unit;
    elements.unit.append(option);
  }

  selectedUnit = actualUnits.includes(previousUnit) ? previousUnit : OVERALL_SCOPE;
  elements.unit.value = selectedUnit;
  elements.unit.disabled = actualUnits.length === 0;
}

function renderRating(program) {
  const ratings = getProgramRatings(program);
  const total = sum(ratings.map((rating) => rating.count));
  const weighted = sum(ratings.map((rating) => rating.count * rating.value));
  const average = total ? weighted / total : 0;
  let offset = 0;
  const segments = ratings.map((rating) => {
    const start = offset;
    offset += total ? (rating.count / total) * 100 : 0;
    return `${rating.color} ${start.toFixed(2)}% ${offset.toFixed(2)}%`;
  });

  elements.ratingDonut.style.background = `conic-gradient(${segments.join(", ")})`;
  elements.ratingDonut.setAttribute("aria-label", `${formatNumber(average)} out of 5 average safety rating from ${total} responses.`);
  setText(elements.ratingAverage, formatNumber(average));
  setText(elements.ratingCount, `${total} responses`);
  elements.ratingLegend.replaceChildren();

  for (const rating of ratings) {
    const item = document.createElement("li");
    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.backgroundColor = rating.color;
    swatch.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = rating.label;
    const count = document.createElement("strong");
    count.textContent = `${rating.count} · ${total ? Math.round((rating.count / total) * 100) : 0}%`;
    item.append(swatch, label, count);
    elements.ratingLegend.append(item);
  }
}

function renderScores(program, unit) {
  const row = getProgramAverages(program, unit);
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

  const mostPositive = scores.reduce((best, current) => current.value > best.value ? current : best, scores[0]);
  const opportunity = scores.reduce((lowest, current) => current.value < lowest.value ? current : lowest, scores[0]);
  setText(elements.strongestName, displayName(mostPositive.field));
  setText(elements.strongestValue, formatNumber(mostPositive.value));
  setText(elements.lowestName, displayName(opportunity.field));
  setText(elements.lowestValue, formatNumber(opportunity.value));
}

function renderDistribution(program) {
  const countsByScore = getProgramResponseCounts(program);
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
    for (const entry of scoreCounts) {
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
  const participation = getUnitParticipation(program, unit);
  setText(elements.activityUnit, unit === OVERALL_SCOPE ? "Program total" : unit);
  setText(elements.eventsValue, String(getEventCount(program, unit)));
  if (participation) {
    const invited = asNumber(participation.Invited_Count) ?? 0;
    const responses = asNumber(participation.Responses_Count) ?? 0;
    setText(elements.participationValue, `${invited ? Math.round((responses / invited) * 100) : 0}%`);
    setText(elements.participationCount, `${responses} responses of ${invited} invited`);
  } else {
    setText(elements.participationValue, "—");
    setText(elements.participationCount, "No participation data");
  }

  const unitRows = data.participationRows.filter((record) => record.Clinical_Program === program);
  elements.unitList.replaceChildren();
  for (const record of unitRows) {
    const button = document.createElement("button");
    button.className = "unit-row";
    button.type = "button";
    button.dataset.unit = record.Unit;
    button.setAttribute("aria-pressed", String(record.Unit === unit));
    const name = document.createElement("span");
    name.className = "unit-name";
    name.textContent = record.Unit;
    const metrics = document.createElement("span");
    metrics.className = "unit-metrics";
    metrics.textContent = `${getEventCount(program, record.Unit)} events · ${record.Response_Rate}`;
    button.append(name, metrics);
    button.addEventListener("click", () => {
      elements.unit.value = record.Unit;
      selectedUnit = record.Unit;
      renderDashboard();
    });
    elements.unitList.append(button);
  }
}

function renderGuide() {
  setText(elements.limitations, data.guide["Data limitations"] ?? "");
  setText(elements.interpretation, data.guide.Interpretation ?? "");
  elements.metricDefinitions.replaceChildren();
  for (const record of data.metrics) {
    if (!record["Metric Examples"]) continue;
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = record["Metric Examples"];
    const definition = document.createElement("dd");
    definition.textContent = record.Suggested_Definition;
    wrapper.append(term, definition);
    elements.metricDefinitions.append(wrapper);
  }
}

function renderDashboard() {
  const program = elements.program.value;
  const unit = elements.unit.value || OVERALL_SCOPE;
  for (const radio of elements.scorePrograms.querySelectorAll('input[name="score-program"]')) {
    radio.checked = radio.value === program;
  }
  selectedUnit = unit;
  renderRating(program);
  renderScores(program, unit);
  renderDistribution(program);
  renderActivity(program, unit);
  setText(elements.updatedScope, `${program} · ${unit === OVERALL_SCOPE ? "Program total" : unit}`);
}

async function init() {
  try {
    const paths = Object.values(FILES);
    const results = await Promise.all(paths.map(loadCSV));
    const keys = Object.keys(FILES);
    data = readData(Object.fromEntries(keys.map((key, index) => [key, results[index]])));
    fillProgramFilter();
    fillUnitFilter(elements.program.value);
    renderGuide();
    renderDashboard();
    function changeProgram() {
      fillUnitFilter(elements.program.value);
      renderDashboard();
    }
    elements.program.addEventListener("change", changeProgram);
    elements.scorePrograms.addEventListener("change", (event) => {
      if (event.target instanceof HTMLInputElement && event.target.name === "score-program") {
        elements.program.value = event.target.value;
        changeProgram();
      }
    });
    elements.unit.addEventListener("change", renderDashboard);
    elements.status.hidden = true;
    elements.grid.hidden = false;
    elements.guide.hidden = false;
  } catch (error) {
    elements.status.hidden = true;
    elements.error.hidden = false;
    setText(elements.errorMessage, error instanceof Error ? error.message : String(error));
    console.error("Could not initialize the safety culture dashboard.", error);
  }
}

init();
