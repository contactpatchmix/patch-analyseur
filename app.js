// Page de l'analyseur Patch : lecture du fichier, préparation de l'audio,
// envoi au worker, affichage du résultat.

const SAMPLE_RATE = 44100;
const MAX_FILE_MB = 150;

const NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const ALIASES = { Db: 'C#', 'D#': 'Eb', Gb: 'F#', 'G#': 'Ab', 'A#': 'Bb' };
// Roue de Camelot, utilisée par les DJ et les beatmakers pour les tonalités compatibles.
const CAMELOT_MINOR = { Ab: '1A', Eb: '2A', Bb: '3A', F: '4A', C: '5A', G: '6A', D: '7A', A: '8A', E: '9A', B: '10A', 'F#': '11A', 'C#': '12A' };
const CAMELOT_MAJOR = { B: '1B', 'F#': '2B', 'C#': '3B', Ab: '4B', Eb: '5B', Bb: '6B', F: '7B', C: '8B', G: '9B', D: '10B', A: '11B', E: '12B' };

const $ = (id) => document.getElementById(id);
const views = { idle: $('idle'), busy: $('busy'), done: $('done'), failed: $('failed') };
let worker = null;
let lastSummary = '';

function show(name) {
  for (const [key, el] of Object.entries(views)) el.hidden = key !== name;
}

function normalise(note) {
  return ALIASES[note] || note;
}

function describeKey(note, scale) {
  const n = normalise(note);
  const index = NOTES.indexOf(n);
  const minor = scale === 'minor';
  const relativeNote = NOTES[(index + (minor ? 3 : 9)) % 12];
  return {
    name: `${n} ${minor ? 'minor' : 'major'}`,
    camelot: (minor ? CAMELOT_MINOR : CAMELOT_MAJOR)[n] || '–',
    relative: `${relativeNote} ${minor ? 'major' : 'minor'}`,
  };
}

function describeTempo(bpm) {
  const rounded = Math.round(bpm);
  let alt = '';
  if (rounded >= 120) alt = `Soit ${Math.round(bpm / 2)} BPM en demi-temps.`;
  else if (rounded <= 90) alt = `Soit ${Math.round(bpm * 2)} BPM en double-temps.`;
  return { value: `${rounded} BPM`, alt };
}

function reliability(strength) {
  if (strength >= 0.7) return 'Fiabilité élevée';
  if (strength >= 0.5) return 'Fiabilité moyenne';
  return 'Fiabilité faible : écoute pour confirmer';
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function decodeToMono(file) {
  const data = await file.arrayBuffer();
  const context = new AudioContext();
  let audio;
  try {
    audio = await context.decodeAudioData(data);
  } finally {
    context.close();
  }
  // Mise au format attendu par l'analyse : un seul canal, 44,1 kHz.
  const length = Math.ceil(audio.duration * SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = audio;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return { samples: rendered.getChannelData(0), duration: audio.duration, sampleRate: audio.sampleRate, channels: audio.numberOfChannels };
}

function getWorker() {
  if (!worker) worker = new Worker('worker.js');
  return worker;
}

function analyse(samples) {
  return new Promise((resolve, reject) => {
    const w = getWorker();
    w.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'progress') {
        $('busy-step').textContent = msg.step === 'key' ? 'Recherche de la tonalité…' : 'Calcul du tempo…';
      } else if (msg.type === 'result') {
        resolve(msg);
      } else if (msg.type === 'error') {
        reject(new Error(msg.message));
      }
    };
    w.onerror = (event) => reject(new Error(event.message || 'Erreur du moteur d’analyse'));
    w.postMessage({ samples }, [samples.buffer]);
  });
}

async function handleFile(file) {
  if (!file) return;
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    $('failed-text').textContent = `Ce fichier dépasse ${MAX_FILE_MB} Mo. Essaie avec un MP3 ou un extrait plus court.`;
    show('failed');
    return;
  }
  $('busy-name').textContent = file.name;
  $('busy-step').textContent = 'Lecture du fichier…';
  show('busy');
  const started = performance.now();
  try {
    const audio = await decodeToMono(file);
    const result = await analyse(new Float32Array(audio.samples));
    const key = describeKey(result.key, result.scale);
    const tempo = describeTempo(result.bpm);

    $('done-name').textContent = file.name;
    $('key').textContent = key.name;
    $('key-note').textContent = `${reliability(result.strength)}. Peut aussi sonner en ${key.relative}, sa relative.`;
    $('bpm').textContent = tempo.value;
    $('bpm-note').textContent = tempo.alt || 'Tempo estimé sur le cœur du morceau.';
    $('camelot').textContent = key.camelot;
    $('duration').textContent = formatDuration(audio.duration);
    $('format').textContent = `${Math.round(audio.sampleRate / 100) / 10} kHz · ${audio.channels === 1 ? 'mono' : 'stéréo'}`;
    $('elapsed').textContent = `Analysé en ${((performance.now() - started) / 1000).toFixed(1).replace('.', ',')} s, sur ton appareil.`;
    lastSummary = `${key.name} · ${tempo.value}`;
    show('done');
  } catch (error) {
    console.error(error);
    $('failed-text').textContent = 'Impossible de lire ce fichier. Essaie avec un MP3 ou un WAV.';
    show('failed');
  }
}

$('file').addEventListener('change', (event) => handleFile(event.target.files[0]));
$('again').addEventListener('click', () => { $('file').value = ''; show('idle'); });
$('retry').addEventListener('click', () => { $('file').value = ''; show('idle'); });
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(lastSummary);
    $('copy').textContent = 'Copié ✓';
  } catch {
    $('copy').textContent = lastSummary;
  }
  setTimeout(() => { $('copy').textContent = 'Copier le résultat'; }, 2000);
});

const zone = $('zone');
['dragenter', 'dragover'].forEach((type) => zone.addEventListener(type, (e) => { e.preventDefault(); zone.classList.add('over'); }));
['dragleave', 'drop'].forEach((type) => zone.addEventListener(type, (e) => { e.preventDefault(); zone.classList.remove('over'); }));
zone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
// Empêche le navigateur d'ouvrir le fichier si on le lâche à côté de la zone.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// Démarre le moteur dès l'ouverture de la page, pour gagner du temps à la première analyse.
getWorker();
