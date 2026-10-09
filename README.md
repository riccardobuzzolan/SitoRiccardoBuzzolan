# Ripetizioni | Riccardo Buzzolan

Pagina statica dedicata alle ripetizioni a Schio, Vicenza e online, con formazione, progetti e contatti. Stack: HTML, CSS e JavaScript nativi; nessun framework, package manager, backend, autenticazione o variabile ambiente applicativa.

## Pubblicazione e SEO

- Produzione primaria e canonical: https://riccardobuzzolan.github.io/SitoRiccardoBuzzolan/
- Copia Vercel: https://riccardo-portfolio-ripetizioni.vercel.app/
- Portfolio generale: https://riccardobuzzolan.github.io/

Entrambe le copie restano pubbliche. Canonical, Open Graph, sitemap e robots puntano alla primaria GitHub Pages; la copia Vercel conserva la stessa pagina e lo stesso contenuto. Il canonical indica la preferenza a Google ma non garantisce che Google ignori ogni copia: controllare eventuali duplicazioni in Search Console. Non introdurre redirect fra le copie in entrambe le direzioni.

Gli header HTTP di sicurezza sono configurati in `vercel.json` sulla copia Vercel. GitHub Pages non offre una configurazione equivalente di header personalizzati nel repository; non dichiarare che tali header siano applicati anche lì. La CSP permette gli embed Figma, Notion e Substack effettivamente presenti e il CSS dinamico delle interazioni.

## Struttura

- `index.html`: contenuto, metadati e JSON-LD Person/Service.
- `assets/css/site.css`: stili e responsive.
- `assets/js/site.js`: menu, drawer contatto, archivi, carousel ed effetti canvas.
- `assets/images/portrait.webp`: ritratto estratto dal precedente Base64, con pixel originali invariati.
- `404.html`: fallback `noindex` con meta refresh e link manuale alla pagina primaria; non usa JavaScript inline.
- `robots.txt`, `sitemap.xml`, favicon e immagine social: distribuzione e indicizzazione.
- `site.webmanifest`: scorciatoia standalone relativa alla base di pubblicazione. Non registra un service worker e non offre un'esperienza offline.
- `scripts/check-site.mjs`: verifiche statiche senza dipendenze.
- `tests/site.test.mjs`: regressioni del drawer, dei fallback e dei gate.

## Sviluppo e controlli

Usare Node.js 22 o successivo. Non è necessaria alcuna installazione npm.

```bash
node --test tests/*.test.mjs
node scripts/check-site.mjs
```

La CI `Quality / quality` esegue entrambi i comandi. Il gate verifica homepage/404, title/description/canonical/OG/Twitter, JSON-LD, link e frammenti locali, asset HTML/CSS, le due basi di pubblicazione, sitemap/robots, manifest, sintassi di tutti i file JavaScript e formattazione minima (newline finale e assenza di spazi a fine riga). Controlla tutti i file tracciati o nuovi non ignorati per alcuni formati di credenziali, senza stamparne i valori. Non visita link esterni e non sostituisce una revisione completa della cronologia Git o un audit browser.

Per una preview locale, servire la cartella con un server HTTP, per esempio:

```bash
python -m http.server 8000
```

Aprire http://localhost:8000/. I riferimenti agli asset sono relativi e funzionano anche sotto `/SitoRiccardoBuzzolan/`. Il ritratto viene risolto rispetto all'URL del file JavaScript.

## Contatti, dati ed effetti

Le richieste preparano un messaggio WhatsApp o una email quando il visitatore preme il relativo pulsante. I campi restano in memoria nella pagina fino alla navigazione; non vengono salvati in `localStorage`, inviati a un backend o stampati nei log. Gli embed e i link esterni hanno una via manuale alternativa.

Il drawer tiene il focus al proprio interno, si chiude con Escape e restituisce il focus al pulsante iniziale. Il ritratto rispetta `prefers-reduced-motion`, sospende l'animazione fuori viewport o con pagina nascosta e gestisce un'immagine non disponibile senza bloccare i contatti. Gli stili storici contengono ancora override: consolidarli solo dopo confronto visuale, senza cambiare identità grafica.

## Deploy e rollback

GitHub Pages pubblica i file statici dalla radice del branch configurato nelle impostazioni Pages; Vercel usa il repository collegato. Prima di aggiornare `main`, usare un branch e verificare `Quality / quality`, una preview, mobile, tastiera, drawer e link esterni. Impostare tale check come obbligatorio nel ruleset di `main`; il solo workflow non applica la protezione del branch. Dependabot controlla settimanalmente le GitHub Actions.

Non aggiungere una rewrite globale verso la homepage: gli URL inesistenti devono restituire HTTP 404 anche su Vercel. Il meta refresh di `404.html` resta un fallback browser verso il sito primario e non sostituisce lo status HTTP.

Conservare SHA e deployment verificato. Per Vercel usare il rollback alla produzione precedente dal dashboard, poi preparare un revert in branch. Per GitHub Pages preparare il revert del commit problematico, far passare `Quality / quality` e aggiornare il branch di pubblicazione. Verificare entrambe le copie dopo il rollback; non effettuare reset forzati di `main`.
