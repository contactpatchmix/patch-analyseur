# Analyseur Patch

Analyseur gratuit de tonalité et de tempo (BPM) pour les prods. Tout se passe dans le navigateur de l'utilisateur : aucun serveur, aucun fichier envoyé.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | La page : zone de dépôt, écran d'attente, résultats |
| `app.js` | Lit le fichier audio, le convertit en mono 44,1 kHz, l'envoie au worker, affiche le résultat (tonalité, Camelot, relative, demi-temps…) |
| `worker.js` | Fait l'analyse avec Essentia.js en arrière-plan, pour que la page ne gèle pas |
| `essentia/` | Le moteur d'analyse (Essentia.js 0.1.3, licence AGPL-3.0). Ne pas modifier |
| `mentions-legales.html` | Mentions légales obligatoires, à compléter |

## Comment l'analyse marche

1. Le navigateur décode le fichier (MP3, WAV, AIFF, M4A, FLAC…).
2. Le son est converti en mono 44,1 kHz.
3. **Tonalité** : `KeyExtractor` d'Essentia, profil `edma` (fait pour les musiques produites : rap, trap, électro). Analyse sur tout le morceau.
4. **Tempo** : `RhythmExtractor2013`, méthode `multifeature` (la plus précise), sur 2 minutes max prises au milieu du morceau.
5. La page affiche aussi le code Camelot, la tonalité relative et le tempo en demi-temps / double-temps, parce que ce sont les deux erreurs les plus fréquentes de tous les analyseurs.

## Tester sur ton ordi

Le worker ne marche pas si tu ouvres `index.html` en double-cliquant dessus (le navigateur bloque). Il faut un petit serveur local :

- **Option simple** : dans VS Code, installe l'extension **Live Server**, clic droit sur `index.html` → *Open with Live Server*.
- **Option terminal** : dans le dossier, lance `npx serve` puis ouvre l'adresse affichée.

## Mettre en ligne (gratuit)

1. Crée un compte sur **github.com**, puis un nouveau dépôt **public** (ex. `patch-analyseur`).
2. Clique *Add file → Upload files* et glisse tout le contenu du dossier (y compris `essentia/`). Valide.
3. Crée un compte sur **vercel.com** en te connectant avec GitHub.
4. *Add New → Project*, choisis le dépôt, Framework Preset : **Other**, puis *Deploy*. Pas de commande de build.
5. En 1 minute tu as une adresse du type `patch-analyseur.vercel.app`.
6. (Plus tard) Nom de domaine : achète `patch-xxx.fr` (~8 €/an chez OVH, Gandi…), puis dans Vercel → *Settings → Domains* ajoute-le et suis les instructions DNS.

À chaque fois que tu modifies un fichier sur GitHub, Vercel remet le site à jour tout seul.

## À remplacer avant de mettre en ligne

- `https://forms.gle/LjYfLjpcN46d5yfk7` dans `index.html` → ton lien Google Forms.
- `https://github.com/contactpatchmix/patch-analyseur` dans `index.html` et `mentions-legales.html` → l'adresse de ton dépôt GitHub.
- Les crochets de `mentions-legales.html` (nom, SIRET, adresse, e-mail).

## Licence (important)

Essentia.js est sous **AGPL-3.0**. Si tu l'utilises sur un site public, tu dois rendre le code source de ce site disponible sous la même licence — d'où le dépôt GitHub public et le lien « Code source » en bas de page. Ça ne pose aucun problème ici : la page n'a rien de secret.

Si un jour tu veux intégrer l'analyseur dans le vrai site Patch (code privé), deux options : demander une licence commerciale à l'UPF (Universitat Pompeu Fabra), ou garder l'analyseur comme une page séparée et publique, comme maintenant.

## Vérifier la précision

Avant de communiquer dessus, teste une vingtaine de vraies prods dont tu connais la tonalité et le BPM (ou compare avec Tunebat). Note les écarts : relative majeur/mineur et demi-temps sont normaux, une tonalité complètement fausse ne l'est pas.
