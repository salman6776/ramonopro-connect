## Diagnostic (vérifié)

1. **"Clé Supabase serveur manquante"** — le handler `generateOfficialPdf` lit `process.env.SUPABASE_SERVICE_ROLE_KEY`, or cette variable n'existe pas dans les secrets du projet (`fetch_secrets` renvoie uniquement `GROQ_API_KEY`, `LOVABLE_API_KEY`, `PDF_API_KEY`, `RESEND_API_KEY`). Le handler jette avant même d'appeler DocRaptor.
2. **Clé DocRaptor mal nommée** — le code lit `process.env.DOCRAPTOR_API_KEY` mais le secret configuré s'appelle `PDF_API_KEY`. Même si le point 1 était corrigé, l'appel DocRaptor échouerait ensuite avec "DOCRAPTOR_API_KEY non configurée".
3. **Le formulaire appelle toujours `generateOfficialPdf`** (`test: false`), qui exige en plus une ligne `subscriptions.status = 'active'`. Aucun utilisateur ne peut donc générer un PDF aujourd'hui.
4. **DocRaptor "hack" essai gratuit** — c'est en fait le mode officiel `test: true` : illimité, gratuit, avec filigrane "TEST" sur le PDF. C'est exactement ce que tu veux exploiter avant de basculer sur le mode payant `test: false`.

## Objectif

- Tout ramoneur peut générer **3 certificats de démonstration gratuits** (filigrane "ESSAI GRATUIT", mode `test: true` DocRaptor, illimité côté DocRaptor).
- Au-delà, le serveur renvoie un code `SUBSCRIPTION_REQUIRED` et le formulaire redirige vers `/checkout`.
- Un abonné actif génère des PDF officiels (`test: false`, sans filigrane).

## Changements

### 1. `src/lib/docraptor.service.ts` — refonte du client Supabase serveur

- Retirer `SUPABASE_SERVICE_ROLE_KEY` et le fetch manuel PostgREST.
- Ajouter `.middleware([requireSupabaseAuth])` aux deux server functions → `context.supabase` (RLS as user) + `context.userId`.
- Remplacer chaque appel `sbGet` / `sbPost` / upload storage par le client Supabase authentifié (les policies RLS existantes sur `clients`, `interventions`, `certificates`, `reminders`, `invoices` s'appliquent — c'est ce qu'on veut).
- Retirer le paramètre `data.user_id` de l'input : dériver de `context.userId` (sécurité — empêche un utilisateur d'écrire pour un autre).
- Remplacer `process.env.DOCRAPTOR_API_KEY` par `process.env.PDF_API_KEY` (nom réel du secret).
- Lire l'env variable **à l'intérieur du `.handler()`** (pattern TanStack), pas au top-level.

### 2. Quota "essai gratuit" (3 previews)

Unifier en une seule server function `generateCertificatePdf` qui décide `test: true` vs `test: false` :

```
if subscription active:
   mode = official (test:false)
else:
   count = certificates where intervention.user_id = me AND pdf_url like '%-preview.pdf'
   if count >= 3:
      throw { code: "SUBSCRIPTION_REQUIRED", message: "..." }
   mode = preview (test:true)
```

Retour serveur : `{ pdfBase64, pdfUrl, certNumber, mode: "preview"|"official", previewsRemaining }`.

### 3. `src/routes/_authenticated/interventions/new.tsx`

- Appeler la nouvelle `generateCertificatePdf` (au lieu de `generateOfficialPdf`).
- Retirer `user_id: uid` de la charge (dérivé côté serveur).
- Toast informatif : "Certificat gratuit N/3 — passez Pro pour retirer le filigrane".
- Sur erreur `SUBSCRIPTION_REQUIRED` → `toast` + `navigate({ to: "/checkout" })`.

### 4. `src/routes/demo.tsx`

- Continuer à appeler la fonction unifiée, sans changer le comportement visible (démo publique reste `test: true`).

### 5. Secrets

- `PDF_API_KEY` déjà présent — aucune action.
- **Ne pas ajouter** `SUPABASE_SERVICE_ROLE_KEY` : le nouveau code n'en a plus besoin (RLS via `requireSupabaseAuth`), donc le bug ne peut pas revenir.

## Notes techniques

- `requireSupabaseAuth` re-valide le bearer à chaque appel → sécurité utilisateur garantie sans clé service role.
- Le mode `test:true` DocRaptor **n'est pas facturé** et **n'a pas de limite** : c'est le "hack" officiel pour toute la phase preview.
- Les RLS existantes sur les tables Cloud autorisent déjà `authenticated` à insérer/lire ses propres lignes ; sinon on ajoutera une migration ciblée, mais on ne touche pas au schéma dans un premier temps.
- Aucun changement de design ni de flux UI hormis le toast quota + redirection checkout.
