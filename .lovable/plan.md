Tu as coché beaucoup d'éléments. Je propose un découpage en **4 lots** livrés séquentiellement pour que tu puisses tester à chaque étape, plutôt qu'un seul mega-commit risqué.

## Lot 1 — UX & Storage (sans dépendance externe)
- **Migration SQL** : ajouter colonnes `vacuity_test` (bool), `siret`, `default_price`, `legal_mentions` (profiles), `photo_urls` (text[] sur interventions) + créer buckets `photos` et `certificates` (public) avec policies `auth.uid()`.
- **Upload Storage** : `/interventions/new` passe en upload vers bucket `photos` (au lieu de base64), preview + suppression. Le PDF certificat est uploadé dans `certificates`, l'URL stockée dans `certificates.pdf_url`.
- **Page Historique** : filtres (date, client, type), boutons **Voir PDF**, **Renvoyer au client**, **Voir facture**.
- **Page Clients** : barre de recherche live (nom/tél/adresse), clic → drawer avec historique complet du client.
- **Page Paramètres** : ajout SIRET, prix par défaut, mentions légales, signature (upload image).
- **Sidebar** : badge plan actuel (lu depuis `subscriptions`).

## Lot 2 — Email Resend
- Connexion connecteur Resend (je te demande de cliquer "Connect").
- Server function `sendCertificateEmail` (TanStack) qui envoie le PDF via le gateway Resend.
- Bouton "Renvoyer" dans Historique + envoi automatique après génération certificat.
- Domaine d'envoi : `onboarding@resend.dev` au début, à remplacer par ton domaine vérifié.

## Lot 3 — Twilio SMS + Notes vocales Whisper
- **Twilio** : connecteur + server function `sendReminderSMS`, bouton "Envoyer maintenant" sur `/reminders`. Cron différé : à activer plus tard via pg_cron Supabase.
- **Whisper** : enregistrement audio dans `/interventions/new` (MediaRecorder API), upload → server function qui appelle Lovable AI Gateway (`LOVABLE_API_KEY` déjà provisionné) → transcription auto-remplit "Notes".

## Lot 4 — Quotas abonnement + Stripe Portal
- Lecture `subscriptions.plan` (starter/pro/premium).
- Quota mensuel : Starter 30 / Pro illimité / Premium illimité. Blocage modal "Quota dépassé → upgrader" sur `/interventions/new`.
- Bouton "Gérer abonnement" → server function créant une session Stripe Customer Portal (nécessite que tu m'indiques si tu utilises **Stripe BYOK** déjà en place ou si je dois activer **Lovable Payments**).

## Adaptation Netlify (à la fin)
- Ajout du preset `nitro-netlify` dans `vite.config.ts` (TanStack Start supporte Netlify Functions nativement).
- Création `netlify.toml` (build command + functions dir).
- Variables d'env à reporter dans Netlify : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `RESEND_API_KEY`, `TWILIO_API_KEY` + tes secrets Stripe.
- Génération d'un **zip téléchargeable** du repo prêt à drag-and-drop sur Netlify, OU connexion Git recommandée (Netlify build le projet lui-même, pas de zip nécessaire — plus simple, plus fiable).

⚠️ **Avertissement Netlify** : un zip d'app TanStack Start nécessite que Netlify lance le build (`npm install && npm run build`), pas un upload de `dist/` statique. Si tu veux strictement un zip drag-and-drop sans build côté Netlify, il faut accepter le refactor SPA (option B initiale). À toi de me confirmer.

## Questions bloquantes avant que je commence
1. **Stripe** : tu as déjà configuré quoi côté Stripe ? (clés ? produits/prix créés ? webhook ?)
2. **Domaine email** : tu veux que je laisse `onboarding@resend.dev` pour les tests, ou tu as déjà un domaine vérifié dans Resend ?
3. **Schéma BDD** : je peux faire les migrations SQL ou tu veux les revoir avant ?
4. **Je commence par le Lot 1 directement** ou tu veux ajuster le plan ?

Réponds-moi sur ces 4 points et j'enchaîne sur le Lot 1 immédiatement.