
## Objectif

1. Rendre l'IA (transcription vocale + génération recommandations + amélioration notes) fiable côté UX : états de chargement clairs, messages d'erreur explicites, bouton "réessayer", timeouts, et l'app ne casse jamais si Groq échoue.
2. Refaire le HTML du certificat PDF (DocRaptor) pour qu'il ressemble à un vrai **certificat de ramonage réglementaire français** (arrêté du 27/06/2023 + DTU 24.1), en gardant le mode test gratuit DocRaptor.

---

## 1. Gestion d'erreurs IA robuste

### 1.1 Serveur — `src/lib/ai.functions.ts`
- Ajouter un **timeout** de 20 s sur chaque `fetch` Groq via `AbortSignal.timeout(20000)`.
- Classifier les erreurs et renvoyer un code stable :
  - `MISSING_KEY` (pas de `GROQ_API_KEY`)
  - `RATE_LIMIT` (HTTP 429)
  - `QUOTA` (HTTP 402 / insufficient_quota)
  - `TIMEOUT` (AbortError)
  - `UPSTREAM` (autres 5xx/4xx)
  - `EMPTY` (réponse vide)
- Lancer une `Error` avec un message court en français prêt à afficher (`toast.error(err.message)`).
- Ne pas logger la clé, garder les logs serveur détaillés (`console.error`).

### 1.2 Client — `src/routes/_authenticated/interventions/new.tsx`
Créer un petit helper local `runAI(fn, opts)` qui gère :
- `loading` visible (spinner + texte "IA en cours…")
- `error` affiché **inline** sous le champ concerné (pas seulement un toast)
- Bouton **"Réessayer"** à côté du message d'erreur
- 1 retry auto sur `TIMEOUT` / `RATE_LIMIT` avec backoff 1,5 s
- L'utilisateur peut **toujours continuer sans IA** (les champs restent éditables)

Appliquer à :
- `VoiceRecorder` (transcription) → afficher état d'erreur dans le composant, garder la note manuelle possible.
- Bouton **"Améliorer"** (notes) → état inline + retry.
- Bouton **"Générer avec IA"** (recommandations) → idem.

### 1.3 `src/components/voice-recorder.tsx`
- Gérer les erreurs micro (permission refusée, pas de micro) avec message clair.
- Gérer `MediaRecorder` non supporté (Safari iOS) → fallback : bouton désactivé + message "Dictée non supportée sur ce navigateur".
- Timeout d'enregistrement max 2 min.

### 1.4 Résilience du flux principal
La génération du **certificat PDF ne dépend jamais de l'IA** : si l'IA échoue, l'utilisateur peut quand même remplir les champs à la main et cliquer "Continuer → Signature → Générer".

---

## 2. Refonte du PDF certificat de ramonage

### 2.1 Recherche du format légal
Un certificat de ramonage réglementaire français (arrêté du 27 juin 2023, applicable depuis oct. 2023) doit contenir **obligatoirement** :

1. **Identification du professionnel** : nom, adresse, SIRET, qualification/assurance RC pro
2. **Identification du client** : nom, adresse du logement ramoné
3. **Date de l'intervention**
4. **Identification précise du conduit** ramoné (type de combustible, appareil raccordé, nombre de conduits)
5. **Opérations réalisées** : ramonage mécanique sur toute la longueur, vérification vacuité, contrôle des accessoires
6. **Résultat du contrôle de vacuité** (obligatoire depuis 2023)
7. **Anomalies constatées** et recommandations
8. **Rappel de la périodicité légale** (1×/an gaz-fioul, 2×/an bois/granulés dont 1 en période de chauffe)
9. **Cachet + signature** du professionnel

Le PDF actuel couvre ~70% ; il manque : mention explicite ramonage mécanique + longueur, identification précise du conduit (nombre, matériau), rappel de la garantie assurance habitation, mention arrêté 27/06/2023.

### 2.2 Refonte `buildHtml()` dans `src/lib/docraptor.service.ts`
Restructurer en 6 blocs numérotés conformes au canevas type des certificats du marché (Ramoneur de France, Poujoulat, etc.) :

```
1. PROFESSIONNEL (encadré haut gauche + logo)   |  N° certificat + date (haut droite)
2. CLIENT / LOGEMENT
3. IDENTIFICATION DU CONDUIT (nouveau bloc)
   - Combustible, appareil raccordé, nb conduits, matériau, accessibilité
4. OPÉRATIONS RÉALISÉES (checklist étendue)
   - Ramonage mécanique sur toute la hauteur
   - Vérification vacuité (obligatoire)
   - Contrôle visuel foyer + accessoires
   - Retrait des dépôts de suie/bistre
5. RÉSULTAT & RECOMMANDATIONS
   - État du conduit + anomalies + recommandations IA
6. MENTIONS LÉGALES (bas de page)
   - "Certificat établi conformément à l'arrêté du 27 juin 2023 et au DTU 24.1"
   - Rappel périodicité selon combustible
   - "À conserver 2 ans — à remettre à l'assureur en cas de sinistre"
7. SIGNATURE + CACHET + N° SIRET
```

Ajouts concrets au formulaire (`new.tsx`) pour alimenter le nouveau bloc 3 :
- Champ `conduit_count` (nombre, défaut 1)
- Champ `conduit_material` (select : maçonné / métallique / tubage inox / autre)
- Ces champs sont optionnels, valeurs par défaut sensées si non remplis.

### 2.3 Mode test DocRaptor
Conserver `test: true` par défaut (générations illimitées gratuites) + bandeau "DOCUMENT DE PRÉVISUALISATION" déjà présent. Pas de changement API.

### 2.4 Vérification visuelle
Après implémentation, générer un PDF de test avec données factices, convertir en image (`pdftoppm`) et inspecter que la mise en page tient sur 1 page A4 sans débordement.

---

## Fichiers modifiés

- `src/lib/ai.functions.ts` — timeouts, codes d'erreur FR
- `src/components/voice-recorder.tsx` — gestion erreurs micro + fallback
- `src/routes/_authenticated/interventions/new.tsx` — helper `runAI` + affichage erreurs inline + retry + 2 nouveaux champs conduit
- `src/lib/docraptor.service.ts` — refonte `buildHtml()` conforme arrêté 27/06/2023, ajout bloc conduit, mentions légales étoffées, type `FormData` étendu (`conduit_count?`, `conduit_material?`)

Aucune migration DB requise (les nouveaux champs conduit ne sont utilisés que pour le rendu PDF, pas persistés — sauf si tu veux les stocker, dis-le).
