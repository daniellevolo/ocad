# Staff Safety Culture Dashboard

A dependency-free, screenshot-inspired dashboard built with HTML, CSS, and vanilla JavaScript. It reads the CSV files in `resources/` and lets you explore program and unit-level survey results.

Choose a clinical program using either the dashboard filter or the radio buttons beneath the average-score chart; both update the dashboard together. The unit filter applies within the selected program.

In Survey Results, hover over, focus, or tap the question-mark icon beside a theme to see its survey question.

The header logo is cropped from the provided `resources/screenshot.png` and saved separately as `resources/uhn-logo.png`.

## Run locally

The browser must load the CSV files over HTTP; opening `index.html` directly with a `file://` URL will prevent CSV loading. From this folder, run:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

Browse the data files and reference images at <http://localhost:8000/resources/>. Update `resources/index.html` when adding or removing resource files.

The dashboard uses only the supplied synthetic, cross-sectional data. Reported event totals are self-reported and should not be interpreted as event incidence or as a direct measure of safety culture.

The safety-rating mean and distribution are recalculated from category counts because the summary row in the source CSV includes values outside the 1–5 rating scale.

The strongest and lowest program indicators are ranked using unrounded weighted averages from `resources/survey_scores_count.csv`; displayed scores come from `resources/survey_scores_average.csv`.
