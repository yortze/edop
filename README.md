# 📦 E-DOP — Site web + Back-office

Plateforme complète pour **E-DOP — « Achetez, nous vous livrons »**, expédition
**France ⇄ Gabon et partout ailleurs** : site vitrine, estimateur de tarifs, suivi de colis
public, groupages, fret aérien et maritime, et back-office avec rôles administrateur / modérateur.
Thème clair ou sombre selon l’appareil du visiteur.

![stack](https://img.shields.io/badge/React-18-61dafb) ![stack](https://img.shields.io/badge/Express-4-black) ![stack](https://img.shields.io/badge/SQLite-node%3Asqlite-blue) ![stack](https://img.shields.io/badge/Cloudinary-images-3448c5) ![stack](https://img.shields.io/badge/Brevo-emails-0b996e)

---

## 🧱 Stack

| Côté | Techno |
|------|--------|
| **Frontend** | React 18 + Vite, React Router, Framer Motion, Recharts, lucide-react |
| **Backend** | Node + Express, JWT, bcrypt |
| **Base de données** | SQLite natif (`node:sqlite`) — fichier `server/data/edop.db`, zéro compilation |
| **Images** | Cloudinary (upload signé, direct navigateur → Cloudinary) |
| **Emails** | Brevo (API transactionnelle v3), avec journal en base |

---

## 🚀 Démarrage

```bash
npm run install:all   # racine + server + client
npm run dev           # API + site ensemble
```

- **Site public** : http://localhost:5273
- **Back-office** : http://localhost:5273/admin
- **API** : http://localhost:4100

Au premier lancement, le serveur crée la base, le compte administrateur, la
**fiche tarifaire complète** et un jeu de données de démonstration.

### 🔑 Compte administrateur par défaut

```
Email        : admin@edop.com
Mot de passe : edop2026
```

Modifiable dans `server/.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) **avant** le premier lancement.
Après, changez-le depuis **Back-office → Mon compte**.

### 📦 Colis de démonstration

`EDOP-DEMO2026` · `EDOP-DEMO7788` · `EDOP-DEMO4412` → à tester sur la page `/suivi`.
Un code de groupage (`GRP-…`) fonctionne aussi dans le même champ.

---

## 🧭 Lignes desservies (multi-pays, dans les deux sens)

Chaque **sens** de trajet est une ligne : Paris → Libreville et Libreville → Paris sont
deux entrées distinctes, créées par défaut. E-DOP ajoute les autres pays depuis
**Back-office → Lignes** : ville et pays de départ, ville et pays d’arrivée, mode
(aérien ou maritime), fréquence, délai de transit.

Le bouton ⇄ crée la **ligne retour** d’un clic, en reprenant fréquence et délai.
Une ligne peut être masquée du site sans être supprimée, et une ligne utilisée par
des colis ne peut pas être supprimée par erreur.

Choisir une ligne sur un colis renseigne automatiquement son trajet et son mode
de transport. Les statuts sont formulés pour marcher dans les deux sens :
« Réceptionné au départ », « Arrivé à destination » — et le transit se dit
**« En vol »** ou **« En mer »** selon le mode.

---

## 📚 Groupage

Quand plusieurs colis partent ensemble, ils sont réunis dans un **groupage**
(`GRP-XXXXXX`) et **partagent le même niveau de suivi**.

Depuis **Back-office → Groupages** :

- créer un groupage (intitulé, ligne, mode, date de départ, arrivée estimée) ;
- y rattacher des colis — la liste ne propose que les colis non groupés et non livrés ;
- poser **une étape qui s’applique d’un coup à tous les colis** : chacun change de
  statut, reçoit l’étape dans son historique, et son client est prévenu par email.

Un colis rattaché à un groupage déjà en route **rattrape automatiquement** son
niveau de suivi. Un colis peut être retiré du groupage à tout moment ; supprimer
un groupage **détache** ses colis, il ne les supprime jamais.

Côté client : la page `/suivi` accepte le code du groupage et affiche son
avancement partagé (sans révéler les autres colis ni leurs clients). Sur la fiche
d’un colis groupé, les étapes venues du groupage portent le badge « groupage ».

---

## 🚢 Fret maritime

Le maritime est **entièrement piloté par E-DOP** : la structure est là, les
contenus sont à eux.

1. **Back-office → Lignes** : créer les lignes en mode « Maritime ».
2. **Back-office → Fiche tarifaire** : onglet « Maritime », créer les tarifs au kilo.
   Une même nature d’article peut avoir un tarif aérien **et** un tarif maritime.
3. **Back-office → Réglages → Fret maritime** : présentation, fréquence des départs,
   délai de transit, conditions particulières.
4. Cocher **« Afficher le fret maritime sur le site »** pour publier.

Tant que la case n’est pas cochée, l’onglet Maritime de la page Tarifs affiche
« bientôt disponible » avec un bouton vers le devis — jamais une page vide ni un
tarif inventé.

---

## 🌗 Thème clair et sombre

Le site suit par défaut le réglage de l’appareil du visiteur
(`prefers-color-scheme`), et bascule en direct si celui-ci change de thème pendant
sa visite, sans rechargement.

Le **bouton dans la barre de navigation** (et dans le back-office) fait défiler
**automatique → clair → sombre**, et mémorise le choix dans le navigateur.
Le thème est appliqué par un petit script avant le premier rendu : pas de flash
blanc à l’ouverture sur un téléphone en mode sombre.

Techniquement : `data-theme` sur `<html>`, un seul bloc de variables sombres dans
`global.css`. Les graphiques du tableau de bord suivent aussi le thème.

---

## 👥 Rôles : administrateur & modérateur

C'est **l'administrateur seul** qui crée les comptes de l'équipe
(**Back-office → Équipe**) : il choisit le rôle, définit un mot de passe provisoire
et peut l'envoyer par email au nouveau membre.

| | Modérateur | Administrateur |
|---|:---:|:---:|
| Colis, étapes de suivi, devis, clients | ✅ | ✅ |
| Groupages : créer, rattacher des colis, poser une étape partagée | ✅ | ✅ |
| Lignes et fiche tarifaire (créer / modifier / masquer) | ✅ | ✅ |
| Images Cloudinary (ajouter) | ✅ | ✅ |
| **Gestion de l'équipe** (ajouter / modifier / désactiver / supprimer) | ❌ | ✅ |
| **Réglages du site** (tarifs, contacts, taux FCFA, fret maritime) | ❌ | ✅ |
| **Suppressions définitives** (colis, groupages, lignes, devis, catégories, images, clients) | ❌ | ✅ |

Garde-fous côté serveur (pas seulement masqués dans l'interface) :

- un compte **désactivé** perd l'accès immédiatement, sans attendre l'expiration de son token ;
- on ne peut ni **modifier son propre rôle**, ni **se désactiver**, ni **se supprimer** ;
- il doit toujours rester **au moins un administrateur actif**.

---

## 💶 Moteur tarifaire

La fiche tarifaire E-DOP est en base (table `categories`) et pilotée depuis le back-office.

| Catégorie | Tarif | Conditions |
|---|---|---|
| Médicaments | 26 €/kg | Ordonnance obligatoire |
| Denrées alimentaires | 19 €/kg | Fromage, saucisson sec et autres |
| Livres | 18 €/kg | — |
| Vêtements et chaussures | 18 €/kg (11 700 FCFA) | — |
| Électrique, électroménagers | 19 €/kg | — |
| Vin et spiritueux | 20 €/kg (13 000 FCFA) | — |
| Cosmétiques | 19 €/kg | — |
| Objets de valeur | 19 €/kg + 10 % de la valeur | Pièces auto-moto, informatique, téléphonie, luxe |
| Colis hors format | Sur devis | Plus de 80 cm |
| Expédition express | 26 €/kg | — |

Règles appliquées automatiquement (`server/src/pricing.js`, miroir client dans `client/src/pricing.js`) :

1. **Poids arrondi au 100 g supérieur** — 1,45 kg est facturé 1,5 kg.
2. **Déclaration obligatoire à partir de 300 €**.
3. **Au-delà de 300 €** : + 10 % de la valeur totale déclarée, en plus du kilo.
4. **Objets de valeur** : + 10 % dès le premier euro.
5. **Conversion FCFA** : 1 € = 650 FCFA (modifiable dans les réglages).
6. **20 €** pour tout colis livré chez E-DOP et récupéré par un autre transporteur.

> Tous ces seuils sont éditables dans **Back-office → Réglages** — aucune valeur n'est
> codée en dur dans les pages.

---

## ☁️ Cloudinary

Renseignez dans `server/.env` :

```env
CLOUDINARY_CLOUD_NAME=votre-cloud
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=edop
```

Clés à récupérer sur https://console.cloudinary.com/settings/api-keys, puis **relancer le serveur**.

**Comment ça marche** : le back signe la requête (`POST /api/media/sign`), le navigateur
envoie le fichier **directement à Cloudinary** — il ne transite jamais par le serveur — et
seule l'URL est enregistrée en base. L'API secret ne quitte jamais le back.
Sans clés, la page **Images** affiche un mode d'emploi au lieu de planter.

---

## ✉️ Brevo

```env
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=contact@votre-domaine.com
BREVO_SENDER_NAME=E-DOP
BREVO_NOTIFY_EMAIL=          # copie interne des devis (facultatif)
PUBLIC_URL=https://edop.com  # liens dans les emails
```

> ⚠️ L'expéditeur doit être un domaine **vérifié chez Brevo**, sinon les emails partent en spam.

Emails envoyés automatiquement :

| Déclencheur | Email |
|---|---|
| Demande de devis déposée | Accusé de réception + estimation au client |
| Demande de devis déposée | Alerte interne (si `BREVO_NOTIFY_EMAIL`) |
| Colis créé | Numéro de suivi + récapitulatif au client |
| Changement de statut | Notification de l'étape au client |
| Compte créé / mot de passe réinitialisé | Identifiants au membre de l'équipe |

Chaque envoi est tracé dans la table `email_log`, consultable dans **Réglages → Journal des emails**
(`sent` / `skipped` / `error`). Sans clé API, rien ne casse : les emails sont journalisés en
`skipped`. Les cases « prévenir le client » sont décochables au cas par cas.

---

## 🗂️ Fonctionnalités

### Site public
- **Accueil** — hero animé, bandeau des tarifs, atouts, règles de facturation, encart 20 €
- **Tarifs** — onglets aérien / maritime, cartes + tableau €/kg et FCFA, lignes desservies, les 5 règles
- **Devis** — estimation recalculée à chaque frappe (poids arrondi, majoration de valeur), envoi de la demande
- **Suivi** — par numéro de colis **ou** par code de groupage : barre de progression + timeline
- **Contact** — WhatsApp France & Gabon, agences, réseaux sociaux
- **Thème** clair / sombre suivant l'appareil, avec bouton de bascule

### Back-office (`/admin`)
- **Tableau de bord** — KPI, volume mensuel, CA, répartition par statut, top catégories
- **Colis** — liste filtrable, création avec calcul automatique du prix, ligne et groupage, détail + timeline
- **Groupages** — départs groupés, rattachement des colis, étape partagée en un clic
- **Devis** — demandes reçues, changement de statut, relance WhatsApp en un clic
- **Clients** — répertoire, fiche avec historique des colis
- **Lignes** — trajets desservis dans les deux sens, aérien ou maritime, création du retour en un clic
- **Fiche tarifaire** — catégories par mode, choix d'icône, activation/désactivation
- **Images** — upload Cloudinary par section (accueil, galerie, catégories, équipe)
- **Équipe** 🔒 — gestion des modérateurs et administrateurs
- **Réglages** 🔒 — contacts, taux FCFA, seuils, fret maritime, intégrations, journal des emails
- **Mon compte** — changement de mot de passe

🔒 = administrateur uniquement.

---

## 📁 Structure

```
edop/
├── server/                      # API Express + SQLite
│   ├── src/
│   │   ├── index.js             # point d'entrée
│   │   ├── db.js                # schéma + réglages
│   │   ├── seed.js              # admin + fiche tarifaire + démo
│   │   ├── auth.js              # JWT, requireAuth, requireAdmin
│   │   ├── pricing.js           # moteur tarifaire (source de vérité)
│   │   ├── mailer.js            # Brevo + gabarits d'emails
│   │   ├── cloudinary.js        # signature d'upload, suppression
│   │   └── routes/              # auth, users, categories, corridors, groupages,
│   │                            # shipments, quotes, clients, settings, media, stats
│   └── data/edop.db             # base (générée)
└── client/                      # React + Vite
    └── src/
        ├── pages/               # site public
        │   └── admin/           # back-office
        ├── components/          # layouts, logo, uploader, modale…
        ├── context/             # AuthContext, SettingsContext
        ├── pricing.js           # miroir du moteur tarifaire
        └── styles/global.css    # design system complet
```

---

## 🔌 API (aperçu)

| Méthode | Route | Accès |
|---|---|---|
| `GET` | `/api/categories`, `/api/corridors`, `/api/settings`, `/api/media` | public |
| `GET` | `/api/shipments/track/:tn`, `/api/groupages/track/:code` | public |
| `POST` | `/api/quotes`, `/api/quotes/estimate` | public |
| `POST` | `/api/auth/login` | public |
| `GET/POST/PUT` | `/api/shipments`, `/api/quotes`, `/api/clients`, `/api/categories`, `/api/corridors`, `/api/groupages` | 🔒 équipe |
| `POST` | `/api/shipments/:id/events`, `/api/groupages/:id/events` | 🔒 équipe |
| `POST` | `/api/groupages/:id/shipments`, `/api/corridors/:id/reverse` | 🔒 équipe |
| `POST` | `/api/media/sign`, `/api/media` | 🔒 équipe |
| `GET` | `/api/stats`, `/api/settings/integrations`, `/api/settings/emails` | 🔒 équipe |
| `DELETE` | toutes les suppressions | 🔒 admin |
| `GET/POST/PUT/DELETE` | `/api/users` | 🔒 admin |
| `PUT` | `/api/settings` | 🔒 admin |

---

## 🎨 Design

Thème repris de la fiche tarifaire E-DOP : **magenta** (`#e5308f`, le logo) et
**cramoisi** (`#d81159`, les prix et les CTA), bandeaux noirs, encre `#1b1524` sur fond
clair — ou l'inverse en mode sombre.
Typographies **Outfit** (titres) + **Inter** (texte). Tout passe par les variables CSS en
tête de `client/src/styles/global.css` : un bloc clair, un bloc sombre — changer la palette,
c'est éditer une vingtaine de lignes. Entièrement responsive (mobile → desktop).

---

## ⚙️ Notes production

- Changer `JWT_SECRET` et le mot de passe admin dans `server/.env`.
- Renseigner `PUBLIC_URL` pour que les liens des emails pointent vers le vrai domaine.
- Build front : `npm run build` → `client/dist/`, à servir derrière l'API ou un CDN.
- Sauvegarder régulièrement `server/data/edop.db`.
- Les ports (5273 / 4100) sont configurables dans `client/vite.config.js` et `server/.env`.
