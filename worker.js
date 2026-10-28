// Analyse audio de Patch : tonalité et tempo, calculés hors du fil principal
// pour que la page reste fluide pendant l'analyse.

// La version navigateur d'Essentia s'attend à tourner dans une page : on lui
// indique ici où elle se trouve, pour qu'elle retrouve son fichier .wasm.
self.document = { currentScript: { src: new URL('essentia/essentia-wasm.web.js', self.location.href).href }, title: '' };
importScripts('essentia/essentia-wasm.web.js', 'essentia/essentia.js-core.js');

let essentia = null;
const ready = EssentiaWASM().then((module) => {
  essentia = new Essentia(module);
});

const SAMPLE_RATE = 44100;
// Le tempo est calculé sur 2 minutes au maximum, prises au milieu du morceau :
// assez pour un résultat fiable, sans faire attendre l'utilisateur.
const TEMPO_WINDOW_SECONDS = 120;

self.onmessage = async (event) => {
  const samples = event.data.samples;
  try {
    await ready;
    self.postMessage({ type: 'progress', step: 'key' });

    const full = essentia.arrayToVector(samples);
    // Profil « edma » : pensé pour les musiques produites (électro, rap, trap).
    const key = essentia.KeyExtractor(full, true, 4096, 4096, 12, 3500, 60, 25, 0.2, 'edma', SAMPLE_RATE);
    full.delete();

    self.postMessage({ type: 'progress', step: 'tempo' });
    let segment = samples;
    const maxLength = TEMPO_WINDOW_SECONDS * SAMPLE_RATE;
    if (samples.length > maxLength) {
      const start = Math.floor((samples.length - maxLength) / 2);
      segment = samples.subarray(start, start + maxLength);
    }
    const part = essentia.arrayToVector(segment);
    const rhythm = essentia.RhythmExtractor2013(part, 208, 'multifeature', 40);
    part.delete();

    self.postMessage({
      type: 'result',
      key: key.key,
      scale: key.scale,
      strength: key.strength,
      bpm: rhythm.bpm,
      confidence: rhythm.confidence,
    });
  } catch (error) {
    self.postMessage({ type: 'error', message: String(error && error.message ? error.message : error) });
  }
};
