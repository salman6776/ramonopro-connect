## Diagnostic vérifié

- Secret `PDF_API_KEY` bien présent côté projet (confirmé via `fetch_secrets`).
- L'erreur `401 Please provide a valid API key` vient donc de DocRaptor lui‑même : la valeur stockée dans `PDF_API_KEY` n'est pas une clé DocRaptor valide (mauvaise clé collée, clé révoquée, ou valeur d'un autre service).
- Le code `callDocRaptor` est correct (Basic auth `key:` en base64, endpoint OK, `test: true` transmis).

## Le "hack" DocRaptor que tu voulais exploiter

DocRaptor accepte la **clé publique de démo `YOUR_API_KEY_HERE**` pour tout appel avec `test: true`. Illimité, gratuit, aucun compte requis, filigrane "TEST" ajouté par DocRaptor. C'est le vrai hack — pas besoin de secret valide tant qu'on reste en mode preview.

## Correctif (une seule bonne fois)

Dans `src/lib/docraptor.service.ts → callDocRaptor` :

1. **Mode `test: true**` → toujours utiliser la clé démo publique `YOUR_API_KEY_HERE`, **on ignore complètement `PDF_API_KEY**`. Résultat : la génération de preview ne peut plus jamais échouer sur un 401, quoi qu'il y ait dans les secrets.
2. **Mode `test: false**` (uniquement quand un abonnement actif existe) → utiliser `PDF_API_KEY`. Si absente ou invalide → message d'erreur clair invitant à mettre à jour le secret (au lieu du 401 brut actuel).
3. Log serveur explicite du mode + statut HTTP + premières lignes de réponse DocRaptor pour diagnostiquer à froid.

Aucune autre modification : le pipeline (`runPipeline`), la limite 3 previews, la redirection `/checkout`, le template HTML, l'upload storage — tout reste identique.

## Après le fix

Tu pourras générer des certificats de test à l'infini immédiatement, sans toucher aux secrets. Le jour où tu veux les PDF officiels sans filigrane, on met à jour `PDF_API_KEY` avec ta vraie clé DocRaptor et on bascule l'abonnement en `active`.

Pas qie infini mais une fois le doc test geberer le compteur sur la page tombe a zero et redirigé vers la page de paiement évidemment visuellement attirant du genre passer en pro pour... Ect

## Fichier touché

- `src/lib/docraptor.service.ts` (fonction `callDocRaptor` uniquement — ~15 lignes)
  &nbsp;