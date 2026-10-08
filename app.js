const noteList = document.querySelector('#notes');
const template = document.querySelector('#note-template');
const status = document.querySelector('#status');
const organizeButton = document.querySelector('#organize');
const reportSection = document.querySelector('#report');
const reportEmpty = document.querySelector('#report-empty');
let requestVersion = 0;

function rows() { return [...noteList.querySelectorAll('.note-row')]; }
function renumber() { rows().forEach((row, i) => row.querySelector('.note-id').textContent = `N${i + 1}`); }
function clearReport(message = '') {
  requestVersion++;
  organizeButton.disabled = false; organizeButton.querySelector('span').textContent = 'Organize my notes';
  reportSection.classList.add('hidden'); reportEmpty.classList.remove('hidden');
  status.className = 'status'; status.textContent = message;
}
function addRow(value = '') {
  if (rows().length >= 12) { status.textContent = 'Keep it to 12 notes or fewer.'; return; }
  const row = template.content.firstElementChild.cloneNode(true);
  row.querySelector('.note-text').value = value;
  row.querySelector('.note-text').addEventListener('input', () => { clearReport('Notes changed — organize again to refresh the draft.'); renumber(); });
  row.querySelector('.remove-note').addEventListener('click', () => { if (rows().length === 1) row.querySelector('textarea').value = ''; else row.remove(); renumber(); clearReport('Notes changed — organize again to refresh the draft.'); });
  noteList.append(row); renumber();
}
addRow();
document.querySelector('#add-note').addEventListener('click', () => addRow());
document.querySelector('#place').addEventListener('input', () => clearReport('Place label changed — organize again to refresh the draft.'));

function reportText(data, place) {
  const lines = [data.title, place ? `Area label (unverified): ${place}` : '', '', data.summary, '', 'OBSERVATIONS', ...data.items.flatMap(item => [`- ${item.observation}`, `  Source ${item.noteId}: “${item.quote}”`]), '', 'UNKNOWN / NEEDS CHECKING', ...data.unknowns.map(item => `- ${item}`), '', 'Draft from personal notes; not independently verified.'];
  return lines.filter((line, i, all) => line || (i > 0 && all[i - 1] !== '')).join('\n');
}

function showReport(data, place, provider) {
  document.querySelector('#report-title').textContent = data.title;
  document.querySelector('#report-summary').textContent = data.summary;
  const items = document.querySelector('#report-items');
  items.replaceChildren(...data.items.map(item => {
    const article = document.createElement('article'); article.className = 'finding';
    const observation = document.createElement('p'); observation.textContent = item.observation;
    const quote = document.createElement('blockquote'); quote.textContent = `“${item.quote}”`;
    const cite = document.createElement('cite'); cite.textContent = `SOURCE ${item.noteId}`;
    article.append(observation, quote, cite); return article;
  }));
  const unknowns = document.querySelector('#report-unknowns');
  unknowns.replaceChildren(...data.unknowns.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  if (!data.unknowns.length) { const li = document.createElement('li'); li.textContent = 'No unknowns were added by the model; review whether anything still needs checking.'; unknowns.append(li); }
  document.querySelector('#editable-report').value = reportText(data, place);
  document.querySelector('#report-provenance').textContent = `Organized with ${provider}. Source quotes are checked against your input, but that does not verify the observation or its interpretation.`;
  reportEmpty.classList.add('hidden'); reportSection.classList.remove('hidden'); status.textContent = 'Draft ready. Review every line before copying or sharing.';
}

organizeButton.addEventListener('click', async () => {
  const notes = rows().map((row, i) => ({ id: `N${i + 1}`, text: row.querySelector('textarea').value.trim() }));
  if (!notes.length || notes.some(n => !n.text)) { status.className = 'status error'; status.textContent = 'Fill in each note or remove its blank row first.'; return; }
  const version = ++requestVersion;
  reportSection.classList.add('hidden'); reportEmpty.classList.remove('hidden');
  status.className = 'status'; status.textContent = 'Asking Gemma to organize your notes…';
  organizeButton.disabled = true; organizeButton.querySelector('span').textContent = 'Organizing…';
  const place = document.querySelector('#place').value.trim();
  try {
    const response = await fetch('/api/receipt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ notes, place }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not organize notes.');
    if (version !== requestVersion) return;
    showReport(result.report, place, `${result.model} via ${result.provider}`);
  } catch (error) {
    if (version !== requestVersion) return;
    status.className = 'status error'; status.textContent = error.message || 'Could not reach the local app server.';
  } finally {
    if (version === requestVersion) { organizeButton.disabled = false; organizeButton.querySelector('span').textContent = 'Organize my notes'; }
  }
});

async function copyDraft() {
  try { await navigator.clipboard.writeText(document.querySelector('#editable-report').value); status.className = 'status'; status.textContent = 'Edited draft copied.'; }
  catch { status.className = 'status error'; status.textContent = 'Clipboard access unavailable. Select and copy the draft text manually.'; }
}
document.querySelector('#copy-report').addEventListener('click', copyDraft);
document.querySelector('#download-report').addEventListener('click', () => {
  const blob = new Blob([document.querySelector('#editable-report').value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'footpath-field-receipt.txt'; link.click(); URL.revokeObjectURL(url);
});

const about = document.querySelector('#about-dialog');
document.querySelector('#about-button').addEventListener('click', () => about.showModal());
document.querySelector('#close-about').addEventListener('click', () => about.close());
document.querySelector('#close-about-2').addEventListener('click', () => about.close());
