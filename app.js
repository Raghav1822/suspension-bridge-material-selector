'use strict';

const materials = [
  { id: '1570', grade: '1570', name: 'Galvanized steel wire', uts: 1570, density: 7850, modulus: 200, proofRatio: 0.85, fatigue: 3.2, corrosion: 3.2, cost: 1.75, carbon: 2.05 },
  { id: '1770', grade: '1770', name: 'Galvanized steel wire', uts: 1770, density: 7850, modulus: 200, proofRatio: 0.85, fatigue: 3.2, corrosion: 3.2, cost: 1.88, carbon: 2.05 },
  { id: '1860', grade: '1860', name: 'Galvanized steel wire', uts: 1860, density: 7850, modulus: 200, proofRatio: 0.85, fatigue: 3.2, corrosion: 3.2, cost: 1.98, carbon: 2.05 },
  { id: '1960', grade: '1960', name: 'Galvanized steel wire', uts: 1960, density: 7850, modulus: 200, proofRatio: 0.85, fatigue: 3.2, corrosion: 3.2, cost: 2.10, carbon: 2.05 }
];

const criteria = [
  { key: 'uts', label: 'Tensile strength', weight: 20, direction: 'high' },
  { key: 'proof', label: 'Proof strength', weight: 12, direction: 'high' },
  { key: 'specific', label: 'Strength / weight', weight: 12, direction: 'high' },
  { key: 'modulus', label: 'Elastic modulus', weight: 10, direction: 'high' },
  { key: 'fatigue', label: 'Fatigue resistance', weight: 12, direction: 'high' },
  { key: 'corrosion', label: 'Corrosion resistance', weight: 12, direction: 'high' },
  { key: 'cost', label: 'Material cost', weight: 10, direction: 'low' },
  { key: 'carbon', label: 'Environmental impact', weight: 12, direction: 'low' }
];
const $ = (selector) => document.querySelector(selector);
const weightsRoot = $('#weights');
let selectedId = '1960';

function renderWeights() {
  weightsRoot.innerHTML = criteria.map((criterion) => `<div class="weight-row"><label for="weight-${criterion.key}">${criterion.label}</label><input id="weight-${criterion.key}" type="range" min="0" max="40" step="1" value="${criterion.weight}" aria-label="${criterion.label} weight"><output for="weight-${criterion.key}">${criterion.weight}%</output></div>`).join('');
  weightsRoot.addEventListener('input', (event) => {
    if (!event.target.matches('input[type="range"]')) return;
    const criterion = criteria.find((item) => item.key === event.target.id.replace('weight-', ''));
    criterion.weight = Number(event.target.value);
    event.target.nextElementSibling.value = `${criterion.weight}%`;
    render();
  });
}

function calculate() {
  const forceKN = Number($('#load').value);
  const length = Number($('#length').value);
  const safety = Number($('#safety').value);
  if (![forceKN, length, safety].every(Number.isFinite) || forceKN <= 0 || length <= 0 || safety < 1 || safety > 10) {
    return { error: 'Enter a positive tension and length, and a safety factor from 1 to 10.' };
  }
  const force = forceKN * 1000;
  const candidates = materials.map((material) => {
    const allowable = material.uts / safety;
    const areaMM2 = force / allowable;
    const areaM2 = areaMM2 / 1e6;
    const mass = material.density * areaM2 * length;
    const elongation = force * length / (areaMM2 * 1e6 * material.modulus * 1e9);
    return { ...material, proof: material.uts * material.proofRatio, specific: material.uts / material.density, allowable, areaMM2, mass, elongation: elongation * 1000, costTotal: mass * material.cost, emissions: mass * material.carbon };
  });
  const weightsTotal = criteria.reduce((sum, item) => sum + item.weight, 0);
  candidates.forEach((candidate) => {
    let weighted = 0;
    criteria.forEach((criterion) => {
      const values = candidates.map((item) => item[criterion.key]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const normalized = max === min ? 100 : (candidate[criterion.key] - min) / (max - min) * 100;
      weighted += (criterion.direction === 'low' ? 100 - normalized : normalized) * criterion.weight;
    });
    candidate.score = weightsTotal ? weighted / weightsTotal : 0;
  });
  candidates.sort((a, b) => b.score - a.score || b.uts - a.uts);
  return { candidates, forceKN, length, safety, weightsTotal };
}

function format(value, digits = 0) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}
function compact(value, suffix = '') {
  if (value >= 1e9) return `${format(value / 1e9, 2)}B${suffix}`;
  if (value >= 1e6) return `${format(value / 1e6, 2)}M${suffix}`;
  if (value >= 1e3) return `${format(value / 1e3, 1)}k${suffix}`;
  return `${format(value, value < 10 ? 2 : 0)}${suffix}`;
}
function updateSummary(result) {
  const best = result.candidates[0];
  const leanest = [...result.candidates].sort((a, b) => a.mass - b.mass)[0];
  const cards = [
    ['TOP-RANKED GRADE', best.grade, `Score ${format(best.score, 0)} / 100`, '↗'],
    ['SCREENING AREA', `${format(best.areaMM2 / 1e6, 3)}`, 'm² · top-ranked grade', '▱'],
    ['ESTIMATED CABLE MASS', compact(best.mass, ' kg'), `Across ${format(result.length)} m length`, '⌁'],
    ['LIGHTEST OPTION', leanest.grade, `${compact(leanest.mass, ' kg')} estimated mass`, '◌']
  ];
  $('#summary').innerHTML = cards.map(([label, value, unit, icon]) => `<article class="summary-card"><span class="summary-icon">${icon}</span><div class="summary-label">${label}</div><div class="summary-value">${value}</div><div class="summary-unit">${unit}</div></article>`).join('');
}
function renderTable(candidates) {
  $('#results-body').innerHTML = candidates.map((material, index) => `<tr data-id="${material.id}" class="${material.id === selectedId ? 'selected' : ''}" tabindex="0" aria-label="Select ${material.grade} grade material"><td><div class="material-cell"><span class="rank-badge">${String(index + 1).padStart(2, '0')}</span><div><div class="material-name">Galvanized steel</div><div class="grade-sub">${material.grade} grade wire</div></div></div></td><td>${format(material.uts)} MPa</td><td>${format(material.areaMM2 / 1e6, 3)} m²</td><td>${compact(material.mass)} kg</td><td>${format(material.elongation, 1)} mm</td><td>$${compact(material.costTotal)}</td><td class="score-cell"><span class="score-track"><span class="score-fill" style="width:${material.score}%"></span></span><span class="score-number">${format(material.score, 0)}</span></td></tr>`).join('');
  $('#results-body').querySelectorAll('tr').forEach((row) => {
    const select = () => { selectedId = row.dataset.id; renderTable(candidates); renderDetail(candidates); };
    row.addEventListener('click', select);
    row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
  });
}
function renderDetail(candidates) {
  const material = candidates.find((item) => item.id === selectedId) || candidates[0];
  const rank = candidates.indexOf(material) + 1;
  const details = [
    ['ULTIMATE TENSILE STRENGTH', format(material.uts), 'MPa'],
    ['ESTIMATED PROOF STRENGTH', format(material.proof), 'MPa'],
    ['ALLOWABLE SCREENING STRESS', format(material.allowable), 'MPa'],
    ['SPECIFIC STRENGTH', format(material.specific, 3), 'MPa·m³/kg'],
    ['ELASTIC MODULUS', format(material.modulus), 'GPa'],
    ['FATIGUE RESISTANCE¹', `${format(material.fatigue, 1)} / 5`, 'screening estimate'],
    ['CORROSION RESISTANCE¹', `${format(material.corrosion, 1)} / 5`, 'galvanized coating'],
    ['EMBODIED CARBON¹', `${compact(material.emissions)} kg`, 'CO₂e estimate']
  ];
  $('#detail-panel').innerHTML = `<p class="eyebrow">MATERIAL PROFILE</p><div class="selected-title"><div><h3>Galvanized steel</h3><div class="grade-sub">${material.grade} grade bridge wire</div></div><span class="rank-pill">RANK ${String(rank).padStart(2, '0')} · ${format(material.score, 0)} PTS</span></div><div class="profile-grid">${details.map(([label, value, unit]) => `<div class="profile-item"><span>${label}</span><strong>${value}<small>${unit}</small></strong></div>`).join('')}</div><p class="detail-disclaimer">¹ Fatigue, corrosion, cost and carbon values are illustrative screening assumptions—not certified grade-specific data.</p>`;
}
function renderChart(candidates) {
  $('#chart').innerHTML = candidates.map((material) => `<div class="chart-row"><label>${material.grade} grade</label><div class="chart-track"><div class="chart-bar" style="width:${material.score}%"></div></div><output>${format(material.score, 0)}</output></div>`).join('');
}
function render() {
  const total = criteria.reduce((sum, item) => sum + item.weight, 0);
  $('#weight-total').textContent = `${total}%`;
  $('#weight-total').style.color = total === 100 ? '' : '#b56a42';
  const result = calculate();
  if (result.error) {
    $('#summary').innerHTML = `<div class="validation-error" role="alert">${result.error}</div>`;
    $('#results-body').innerHTML = '';
    $('#detail-panel').innerHTML = '<p class="eyebrow">MATERIAL PROFILE</p><p class="section-note">Correct the design case inputs to calculate a material profile.</p>';
    $('#chart').innerHTML = '';
    return;
  }
  updateSummary(result);
  renderTable(result.candidates);
  renderDetail(result.candidates);
  renderChart(result.candidates);
}

renderWeights();
document.querySelectorAll('#load, #length, #safety').forEach((input) => input.addEventListener('input', render));
$('#reset-weights').addEventListener('click', () => {
  const balanced = [20, 12, 12, 10, 12, 12, 10, 12];
  criteria.forEach((item, index) => { item.weight = balanced[index]; });
  weightsRoot.querySelectorAll('input').forEach((input, index) => { input.value = balanced[index]; input.nextElementSibling.value = `${balanced[index]}%`; });
  render();
});
render();
