# GRIP — Groei, Routine, Inzicht, Planning

**Een complete applicatie voor kinderen met ADHD, gebouwd als externe executieve functie-prothese.**

GRIP is ontwikkeld voor gezinnen met kinderen die ADHD hebben (eventueel in combinatie met een lager IQ). De app verbindt ouders, kinderen en hulpverleners in een gedeeld platform dat dagstructuur, schooloefeningen, beloningen, emotieregulatie en communicatie samenbrengt — volledig self-hosted, privacybewust en op maat gemaakt.

---

## Inhoudsopgave

- [De Barkley-methode](#de-barkley-methode)
- [Schermafbeeldingen](#schermafbeeldingen)
- [Functionaliteiten](#functionaliteiten)
  - [Dagstructuur en Planning](#dagstructuur-en-planning)
  - [Taken en "Nu Doen"-modus](#taken-en-nu-doen-modus)
  - [Beloningssysteem (Token Economy)](#beloningssysteem-token-economy)
  - [Schooloefeningen en AI](#schooloefeningen-en-ai)
  - [Emotieregulatie](#emotieregulatie)
  - [Levensvaardigheden](#levensvaardigheden)
  - [Communicatieportaal](#communicatieportaal)
  - [Dossier](#dossier)
  - [Afspraken en Kalender](#afspraken-en-kalender)
  - [TRMNL E-Paper Display](#trmnl-e-paper-display)
  - [PWA en Offline](#pwa-en-offline)
- [Architectuur](#architectuur)
- [Installatie](#installatie)
- [Configuratie](#configuratie)
- [Rollen en Rechten](#rollen-en-rechten)
- [AI-integratie](#ai-integratie)
- [TRMNL Plugin Configuratie](#trmnl-plugin-configuratie)
- [Beveiliging](#beveiliging)
- [Ontwikkeling](#ontwikkeling)
- [Versie](#versie)
- [Licentie](#licentie)

---

## De Barkley-methode

GRIP is gebouwd op het wetenschappelijk model van **Dr. Russell Barkley**, de leidende ADHD-onderzoeker. Volgens Barkley is ADHD fundamenteel een stoornis in de executieve functies: het vermogen om gedrag te plannen, te reguleren en te richten op de toekomst. Het probleem is niet dat het kind het niet *weet*, maar dat het het niet *doet* op het juiste moment.

De oplossing is **externalisatie**: breng de informatie, motivatie en tijdsbeleving naar buiten, naar het punt waar het gedrag moet plaatsvinden. GRIP is precies dat — een digitale prothese die de executieve functies overneemt waar het kind ze zelf nog niet heeft.

### Kernprincipes in de app

| Barkley-principe | Hoe GRIP dit implementeert |
|---|---|
| **Externaliseer informatie** | Alles visueel weergegeven — iconen, kleuren, tijdlijnen. Niets uit het hoofd. |
| **Externaliseer motivatie** | Token-systeem met directe, zichtbare beloning bij elke handeling. |
| **Externaliseer tijd** | Visuele tijdbalken (groen naar rood) in plaats van abstracte klokken. |
| **Punt van uitvoering = punt van beloning** | Tokens worden onmiddellijk toegekend, op het scherm waar de taak wordt afgerond. |
| **Geen straffen** | Tokens kunnen nooit worden afgenomen. Alleen positieve bekrachtiging. |
| **Korte intervallen** | Sessielimieten, verplichte pauzes, een ding tegelijk op het scherm. |
| **Vermijd werkgeheugenbelasting** | "Nu Doen"-modus toont een enkele stap fullscreen, geen lijsten. |

---

## Schermafbeeldingen

### Kind-interface

| Scherm | Beschrijving |
|---|---|
| ![Dagplanning](docs/screenshots/child-day-overview.png) | **Dagplanning** — Verticale tijdlijn met grote iconen per activiteit. Afgeronde taken tonen een vinkje, de huidige activiteit is gemarkeerd. Onderaan het tokensaldo en het volgende spaardoel. |
| ![Nu Doen-modus](docs/screenshots/child-now-mode.png) | **"Nu Doen"-modus** — Fullscreen weergave van een enkele stap. Grote tekst, visuele tijdbalk bovenaan (groen naar rood), swipe-navigatie tussen stappen. Confetti-animatie bij afronding. |
| ![Oefeningen](docs/screenshots/child-exercises.png) | **Schooloefeningen** — Interactieve oefeningen per vak (wiskunde, taal, spelling, wereldorientatie). Adaptieve moeilijkheid, hints bij fouten in plaats van rode foutmeldingen. |
| ![Tokens](docs/screenshots/child-tokens.png) | **Tokenspaarbalk** — Visuele voortgangsbalk met meerdere spaardoelen als mijlpalen. Het eerstvolgende doel is groot en duidelijk, verdere doelen zijn kleiner maar zichtbaar. |
| ![Emotie check-in](docs/screenshots/child-emotion.png) | **Emotie check-in** — Vijf niveaus (geweldig, goed, oké, verdrietig, boos) met grote keuze-elementen. Ademhalingsoefening met animatie, pauzeknop altijd bereikbaar. |
| ![Vaardigheden](docs/screenshots/child-skills.png) | **Zelfstandigheidschecklist** — Leeftijdsgebonden taken gegroepeerd per categorie (thuis, school, sociaal, zelfredzaamheid). |

### Ouder-interface

| Scherm | Beschrijving |
|---|---|
| ![Dashboard](docs/screenshots/parent-dashboard.png) | **Dashboard** — Overzicht van alle kinderen met vandaag-samenvatting: taken afgerond, tokens verdiend, emotie check-in, oefenresultaten. Weekgrafieken voor trends. |
| ![Schema-editor](docs/screenshots/parent-schedule.png) | **Schema-editor** — Drag-and-drop editor voor dagschema's per kind per weekdag. Ondersteunt vakantieperiodes met alternatieve schema's. |
| ![Beloningen](docs/screenshots/parent-rewards.png) | **Beloningen beheer** — Configuratie van token-verdienmodel per activiteit (sliders 0-10), beloningencatalogus met kosten, categorie en goedkeuringsinstelling. |
| ![Oefeningen genereren](docs/screenshots/parent-exercises.png) | **Oefeningen genereren** — Kies vak, thema en niveau. Claude Haiku genereert een batch oefeningen in een enkele API-call. Ouder kan reviewen voor activering. |
| ![Communicatie](docs/screenshots/parent-communication.png) | **Communicatieportaal** — Berichtenkanalen per thema (logopedie, school, kine, algemeen). Gestructureerde updates van hulpverleners, leesbevestigingen, bestandsdeling. |
| ![Dossier](docs/screenshots/parent-dossier.png) | **Dossier** — Centraal dossier met profiel, verslagen, IHP/handelingsplan, medicatie-log, voortgangsdata en notities. Tijdlijnweergave, filterbaar per hulpverlener. |
| ![Afspraken](docs/screenshots/parent-appointments.png) | **Afspraken** — Kalender met terugkerende en eenmalige afspraken, 32 iconen, Google Calendar sync en ICS-feed export. |

### Hulpverlener-interface

| Scherm | Beschrijving |
|---|---|
| ![Hulpverlener voortgang](docs/screenshots/caregiver-progress.png) | **Voortgang** — Alleen-lezen inzicht in oefenresultaten, emotiepatronen en taakafronding van het kind. |
| ![Hulpverlener communicatie](docs/screenshots/caregiver-messages.png) | **Communicatie** — Berichten uitwisselen met ouders via thematische kanalen. Gestructureerde update-templates beschikbaar. |

---

## Functionaliteiten

### Dagstructuur en Planning

Het dagschema is het hart van de app. Het kind ziet een verticale tijdlijn met grote iconen per activiteit, afgestemd op de dag van de week.

- **Visueel dagschema** — Tijdlijn met iconen, kleuren en tijdstippen per activiteit
- **Weekschema's** — Per weekdag een apart schema, configureerbaar door de ouder
- **Vakantieperiodes** — Definieer vrije dagen en vakanties met optioneel alternatief schema
- **Ochtendroutine-wizard** — Stap-voor-stap fullscreen flow met grote vinkjes
- **Transitiewaarschuwingen** — Push-notificaties 5 en 1 minuut voor elke activiteitwisseling
- **Afspraken geintegreerd** — Eenmalige en terugkerende afspraken verschijnen tussen de reguliere activiteiten
- **Home Assistant koppeling** — Optionele webhooks voor fysieke cues (licht knippert, kleuren veranderen)

### Taken en "Nu Doen"-modus

Het taaksysteem is gebouwd rond het Barkley-principe "een ding tegelijk". Geen lijsten, geen overzichten — alleen de huidige stap.

- **Taak-ontleder** — Ouders maken taken met substappen, of laten AI suggesties genereren
- **"Nu Doen"-scherm** — Fullscreen weergave van een enkele stap, grote tekst + icoon
- **Visuele tijdbalk** — Kleurenbalk van groen naar geel naar rood, instelbare duur
- **Swipe-navigatie** — Veeg naar de volgende stap na afronding
- **Afvink-animatie** — Confetti- en sterren-burst bij elke afgeronde stap
- **Pauze-reminder** — Na instelbaar aantal minuten verschijnt een verplichte pauzeanimatie
- **Token-toekenning** — Direct bij elke stap en bij volledige taakafronding

### Beloningssysteem (Token Economy)

Het beloningssysteem volgt Barkley's regels: alleen verdienen, nooit verliezen. Direct, zichtbaar, op het punt van uitvoering.

#### Token-bronnen (configureerbaar per kind)

| Bron | Standaard | Bereik |
|---|---|---|
| Dagschema-activiteit afvinken | uit | 0-5 tokens |
| "Nu Doen"-substap afronden | 1 token | 0-3 tokens |
| "Nu Doen"-hele taak af | 2 tokens bonus | 0-10 tokens |
| Oefensessie: oefening goed | 1 token | 0-3 tokens |
| Oefensessie: sessie afgemaakt | 3 tokens bonus | 0-5 tokens |
| Emotie check-in ingevuld | 1 token | 0-3 tokens |
| Ochtendroutine volledig af | 3 tokens | 0-10 tokens |
| Bedtijdroutine volledig af | 3 tokens | 0-10 tokens |
| Streak-bonus (X dagen op rij) | 2/dag | 0-5 tokens |
| Manuele toekenning door ouder | - | Vrij instelbaar |

#### Spaardoelen

Ouders stellen concrete beloningen in op getrapte niveaus. Het kind ziet een visuele spaarbalk met meerdere mijlpalen:

```
[====*======*==========*==================*]
      5       10          20                   50
      ^
  "Nog 2 tokens voor: 15 min schermtijd!"
```

- **Inwisselen** — Kind tikt op een bereikt doel, ouder krijgt push-notificatie ter bevestiging
- **Automatische beloningen** — Ouder kan instellen dat bepaalde beloningen zonder goedkeuring worden toegekend
- **Seizoensbeloningen** — Tijdgebonden spaardoelen (bijv. "Sinterklaas-spaaractie")
- **Categorie-tokens** — Optioneel aparte token-types per domein (school, thuis)
- **Streaks** — Extra tokens voor opeenvolgende dagen, reset stil bij onderbreking
- **Volledige historie** — Ouder ziet wanneer verdiend, waarmee, wanneer ingewisseld

### Schooloefeningen en AI

Geen volledig LMS, wel een krachtig framework voor korte oefensessies met AI-gegenereerde content.

#### Vakken en oefeningtypes

| Vak | Beschikbare types |
|---|---|
| **Wiskunde** | Getallenslang, weegschaal, winkel, pizzabreuken, klokmatch, getallenmemory, schatrace, stappenbouwer |
| **Taal** | Woordslang, lettergrepen slepen, zinnen ordenen |
| **Spelling** | Invuloefeningen, multiple choice |
| **Lezen** | Korte tekst + begripsvragen |
| **Wereldorientatie** | Foto-quiz, "wist je dat?"-feiten, kaart-oefeningen |

#### Niveausysteem (5 niveaus)

| Niveau | Leeftijd circa | Inhoud |
|---|---|---|
| 1 | 6-8 jaar | Tellen, getallen herkennen, eenvoudig optellen tot 10 |
| 2 | 8-10 jaar | Optellen/aftrekken tot 100, tafels, kloklezen, geld |
| 3 | 10-12 jaar | Vermenigvuldigen/delen, breuken, meten, grafieken |
| 4 | 12-14 jaar | Procenten, kommagetallen, oppervlakte, schatten |
| 5 | 14+ jaar | Budget, kortingen, recepten schalen, afstanden |

#### Drie manieren om oefeningen toe te voegen

1. **Auto-generatie (primair)** — Claude Haiku genereert een batch van 10 oefeningen op basis van vak, thema en niveau in een enkele API-call (~2 seconden)
2. **AI op aanvraag** — Hulpverlener beschrijft gewenste oefeningen in vrije tekst, Haiku genereert ze
3. **Handmatig** — Ouder of hulpverlener vult een formulier in voor specifieke oefeningen

#### Adaptief systeem

- **Sliding window** van de laatste 5 antwoorden bepaalt het niveau (3 fouten = niveau omlaag, 5 goed = niveau omhoog)
- **Sessielimiet** van 10-15 minuten met zichtbare timer en verplichte pauze
- **Geen rode foutmeldingen** — bij een fout verschijnt een visuele hint. Bij een tweede fout het juiste antwoord met uitleg
- **Spaced repetition** — Correct beantwoorde oefeningen komen na X dagen terug. Foute oefeningen sneller in een makkelijkere variant
- **TTS-voorlezen** — Voorleesknop bij elke oefening via Web Speech API
- **Leeftijdsgebaseerde aanpassing** — AI past moeilijkheid en taalgebruik aan op basis van de geboortedatum van het kind

### Emotieregulatie

Een laagdrempelig systeem om emoties te herkennen en te reguleren, gebaseerd op Barkley's model: herken, stop, adem, kies actie.

- **Gevoelscheck-in** — Bij het openen van de app of op vaste tijden: keuze uit 5 niveaus (geweldig, goed, oke, verdrietig, boos)
- **Ademhalingsoefening** — Geanimeerde cirkel die groeit en krimpt, instelbare duur, geluidsbegeleiding
- **Pauzeknop** — Altijd bereikbaar als zwevende knop, opent een kalmeerscherm
- **Grounding-oefening** — "Noem 5 dingen die je ziet" met visuele stappengids
- **Woede-protocol** — Stap-voor-stap begeleiding: herken de emotie, stop, adem, kies een actie
- **Emotie-logging** — Alle check-ins worden opgeslagen en zijn zichtbaar voor ouders en hulpverleners in het dashboard

### Levensvaardigheden

Een modulair systeem dat meegroeit met het kind, gericht op zelfredzaamheid in het dagelijks leven.

- **Zelfstandigheidschecklist** — Per leeftijdscategorie: taken die het kind moet leren. Gegroepeerd per categorie (thuis, school, sociaal, zelfredzaamheid)
- **Spaarpotje** — Virtuele portemonnee met stortingen, uitgaven en spaardoelen. Leert omgaan met geld via concrete oefeningen
- **Sociale scripts** — AI-gegenereerde scenario's met keuzemogelijkheden ("Hoe vraag je iets aan de juf?"). Visuele feedback bij elke keuze
- **Kookrecept-modus** — Stap-voor-stap recepten met foto's en ingebouwde timers. Moeilijkheidsgraad per recept

### Communicatieportaal

Bij ADHD in combinatie met een lager IQ zijn er typisch 3-6 hulpverleners betrokken. Het communicatieportaal vervangt losse e-mails, papieren briefjes en mondelinge overdracht.

- **Berichtenkanalen** — Per thema (logopedie, school, kinesitherapie, algemeen), vergelijkbaar met Slack-channels
- **Gestructureerde updates** — Template-formulier per hulpverlener: "Vandaag gewerkt aan / Gaat goed / Aandachtspunt / Oefening voor thuis"
- **Bestanden delen** — Upload verslagen, rapporten, IHP-documenten en testresultaten (opslag in MinIO, versleuteld)
- **Leesbevestigingen** — Ouders zien wie wat gelezen heeft
- **Push-notificaties** — Bij nieuw bericht of gedeeld bestand
- **Tijdlijn** — Chronologisch overzicht van alle communicatie, filterbaar per hulpverlener

### Dossier

Het centrale dossier dat meereist met het kind door de jaren heen.

| Sectie | Inhoud | Wie schrijft | Wie leest |
|---|---|---|---|
| **Profiel** | Diagnoses, medicatie, allergieen, school, klasinfo | Ouder | Ouder + vrijgegeven hulpverleners |
| **Verslagen** | Logopedieverslagen, kine-evaluaties, CLB-rapporten | Hulpverlener (eigen) + ouder | Ouder + vrijgegeven hulpverleners |
| **IHP/Handelingsplan** | Doelen, evaluatiemomenten | Ouder + hulpverlener (samen) | Ouder + hulpverlener |
| **Voortgangsdata** | Automatisch: oefenresultaten, emotielogs, taakafronding | Systeem | Ouder + vrijgegeven hulpverleners |
| **Medicatie-log** | Wijzigingen, dosisaanpassingen, bijwerkingen | Ouder | Ouder + arts (indien toegang) |
| **Notities** | Vrije notities per hulpverlener | Hulpverlener (eigen) | Ouder + schrijver |

### Afspraken en Kalender

Volledig afspraaksysteem geintegreerd in het dagschema.

- **Eenmalige afspraken** — Specifieke datum en tijd, met icoon en kleur
- **Terugkerende afspraken** — Per weekdag, verschijnen automatisch in het dagschema
- **32 iconen** — Herkenbare pictogrammen voor elk type afspraak
- **Google Calendar link** — Open afspraak direct in Google Calendar
- **ICS-export** — Download individuele afspraken als .ics-bestand
- **Subscribable ICS-feed** — Abonneerbare URL voor Google Calendar, Apple Calendar of andere agenda-apps
- **Kind-zichtbaarheid** — Per afspraak instelbaar of het kind deze ziet in de dagplanning
- **Vakantieperiodes** — Definieer vrije periodes waarin een alternatief schema actief wordt

### TRMNL E-Paper Display

Een always-on e-paper scherm (TRMNL) in de keuken of gang dat de dag van het kind toont zonder de afleiding van een telefoon of tablet.

**Drie schermweergaven in rotatie:**

```
Scherm 1 — Dagoverzicht                 Scherm 2 — Token-voortgang
+----------------------------------+    +----------------------------------+
|  Julie's Dag     Donderdag 9 apr |    |  Julie's Tokens                  |
|                                  |    |                                  |
|  [v] Ontbijt              07:30  |    |  Saldo: 12                       |
|  [v] Schooltas inpakken   07:45  |    |                                  |
|  [>] Naar school          08:15  |    |  ============....  12/20         |
|  [ ] Huiswerk wiskunde    15:30  |    |  Volgend doel: Samen spelletje   |
|  [ ] Vrije tijd           16:30  |    |                                  |
|  [ ] Avondeten            18:00  |    |  Vandaag verdiend: +5            |
|                                  |    |  - Ochtendroutine      +3        |
|  12 tokens  Nog 8 > Spelletje    |    |  - Wiskunde sessie     +1        |
+----------------------------------+    +----------------------------------+

Scherm 3 — Huidige taak (focus)
+----------------------------------+
|                                  |
|            NU                    |
|     Huiswerk wiskunde            |
|                                  |
|     Nog 45 minuten               |
|     ============......           |
|                                  |
|     Daarna: Vrije tijd           |
|                        +2 tokens |
+----------------------------------+
```

- **Nachtmodus** — Tussen instelbare uren toont het scherm alleen "Slaap lekker" met het tokensaldo van vandaag
- **Downloadbare plugin** — ZIP met Liquid-templates en settings.yml, beveiligd met API-key

### PWA en Offline

GRIP is gebouwd als Progressive Web App (PWA) en werkt als een volwaardige app op elk apparaat.

- **Installeerbaar** — Voeg toe aan het beginscherm op iOS, Android en desktop. Opent zonder browserbalk
- **Service Worker** — Cacht statische bestanden voor offline gebruik. Bij geen verbinding verschijnt een offline-pagina
- **Web Push-notificaties** — VAPID-gebaseerde push-notificaties voor transitiewaarschuwingen, berichten en emotie check-ins
- **Responsive** — Geoptimaliseerd voor 375px (iPhone SE) tot 1024px+ (tablet en desktop)
- **Manifest** — Correct geconfigureerd met iconen (72px tot 512px), thema-kleuren en display-modus

---

## Architectuur

### Tech Stack

| Component | Technologie | Versie |
|---|---|---|
| Frontend | React (Vite), TypeScript | React 18, Vite 5 |
| Styling | Tailwind CSS, Framer Motion | Tailwind 3.4 |
| State | Zustand, TanStack Query | Zustand 5, TanStack 5 |
| Backend | Fastify, TypeScript | Fastify 4 |
| Database | PostgreSQL (Prisma ORM) | PostgreSQL 16 |
| Cache/Sessies | Redis | Redis 7 |
| Bestandsopslag | MinIO (S3-compatible) | Laatste stable |
| Virusscanner | ClamAV | Laatste stable |
| AI | Claude Haiku 3.5, Claude Sonnet | Anthropic SDK |
| Push | Web Push (VAPID) | web-push 3.6 |
| Auth | Argon2id, JWT, TOTP | argon2 0.31 |

### Systeemoverzicht

```
  Kind-tablet           Ouder-telefoon         Hulpverlener         TRMNL
  React PWA             React PWA              React PWA            E-Paper
  (kind-modus)          (ouder-modus)          (invite-only)        (keuken)
       |                     |                      |                  |
       +---------------------+----------------------+------------------+
                             |
                     HTTPS (Cloudflare Tunnel)
                             |
       +---------------------+---------------------+
       |         Proxmox LXC — Docker Compose       |
       |                                            |
       |  +--------+  +--------+  +-----------+    |
       |  | Nginx  |->|Fastify |->|PostgreSQL |    |
       |  |(static)|  | (API)  |  |+ pgcrypto |    |
       |  +--------+  +--------+  +-----------+    |
       |                  |                         |
       |                  +-->  MinIO (bestanden)   |
       |                  +-->  Redis (sessies)     |
       |                  +-->  ClamAV (viruscan)   |
       |                  +-->  Claude API (AI)     |
       |                  +-->  HA / MQTT (domotica) |
       |                  +-->  Web Push (notif.)   |
       |                                            |
       +--------------------------------------------+
```

### Datamodel

Het volledige datamodel bevat 30+ tabellen in PostgreSQL. De belangrijkste entiteiten:

- **User** — Gebruikers met rol (child/parent/caregiver/admin), PIN of wachtwoord, avatar, geboortedatum
- **ParentChild** — Koppeling ouder-kind (meerdere kinderen per ouder)
- **Schedule/Activity/ActivityStep** — Dagschema's per weekdag met activiteiten en substappen
- **Task/TaskStep** — Losse taken met substappen voor de "Nu Doen"-modus
- **TokenConfig/Reward/TokenTransaction** — Beloningssysteem configuratie en transacties
- **Exercise/ExerciseSession/ExerciseSessionItem** — Oefeningen-engine met sessies en resultaten
- **EmotionLog** — Emotie check-ins
- **Channel/Message/Attachment** — Communicatieportaal
- **DossierEntry** — Dossier met categorisatie en zichtbaarheid
- **Appointment** — Afspraken (eenmalig en terugkerend)
- **VacationPeriod** — Vakantieperiodes met optioneel alternatief schema
- **CaregiverAccess/CaregiverInvite** — Hulpverlener-toegang per module
- **TrmnlDevice** — TRMNL e-paper configuratie
- **IndependenceTask/SocialScript/Recipe/MoneyTransaction** — Levensvaardigheden
- **AuditLog** — Volledige audit trail van alle acties

---

## Installatie

### Vereisten

- **Docker** 24.0+ met Docker Compose plugin
- **Linux** server (Ubuntu 22.04/24.04 aanbevolen, ook Proxmox LXC)
- Minimaal **2 GB RAM** en **5 GB schijfruimte**
- Een domeinnaam met HTTPS (via Cloudflare Tunnel, Nginx Proxy Manager of Caddy)

### Stap 1 — Repository klonen

```bash
git clone https://github.com/DinXke/adhd.git /opt/adhd
cd /opt/adhd
```

### Stap 2 — Configuratie aanmaken

```bash
cp .env.example .env
```

Bewerk `.env` met je eigen waarden (zie [Configuratie](#configuratie) voor alle variabelen).

Genereer VAPID-sleutels voor push-notificaties:

```bash
npx web-push generate-vapid-keys
```

### Stap 3 — Bouwen en starten

```bash
docker compose build
docker compose up -d
```

### Stap 4 — Database migreren

Bij de eerste start voert de backend automatisch de migraties uit. Handmatig:

```bash
docker compose exec backend npx prisma migrate deploy
```

### Stap 5 — Seed-accounts

Bij de eerste start worden automatisch accounts aangemaakt op basis van de `SEED_*` variabelen in `.env`:

- Een **admin**-account (e-mail + wachtwoord)
- Een **ouder**-account (e-mail + wachtwoord)
- Een **kind**-account (e-mail + PIN)

### Stap 6 — Reverse proxy

Configureer een reverse proxy met HTTPS naar poort `3080`. Voorbeeld met Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:3080
```

De app is nu bereikbaar op je domeinnaam.

### Docker Compose overzicht

De `docker-compose.yml` bevat zes services:

| Service | Image | Functie |
|---|---|---|
| `frontend` | Eigen build (Nginx) | Serveert de statische PWA-bestanden |
| `backend` | Eigen build (Node.js) | Fastify API-server |
| `db` | `postgres:16-alpine` | PostgreSQL database |
| `redis` | `redis:7-alpine` | Sessies, caching, queues |
| `minio` | `minio/minio` | S3-compatible bestandsopslag (verslagen, bijlagen) |
| `clamav` | `clamav/clamav:stable` | Virusscanner voor uploads |

Alle services draaien op een gedeeld Docker bridge-netwerk (`grip-net`). Alleen de frontend is extern bereikbaar via de geconfigureerde poort.

---

## Configuratie

### Alle omgevingsvariabelen

| Variabele | Verplicht | Beschrijving |
|---|---|---|
| `DB_PASS` | Ja | Wachtwoord voor de PostgreSQL-database |
| `JWT_SECRET` | Ja | Secret voor JWT-tokens, minimaal 32 karakters |
| `VAPID_PUBLIC_KEY` | Ja | Web Push VAPID publieke sleutel |
| `VAPID_PRIVATE_KEY` | Ja | Web Push VAPID private sleutel |
| `VAPID_CONTACT` | Ja | Contactadres voor VAPID (mailto:...) |
| `MINIO_USER` | Ja | MinIO admin gebruikersnaam |
| `MINIO_PASS` | Ja | MinIO admin wachtwoord |
| `APP_URL` | Ja | Publieke URL van de app (bijv. `https://grip.jouwdomein.be`) |
| `APP_PORT` | Nee | Poort voor de frontend (standaard: `3080`) |
| `NODE_ENV` | Nee | `production` of `development` (standaard: `production`) |
| `CORS_ORIGINS` | Nee | Komma-gescheiden lijst van toegestane CORS-origins |
| `CLAUDE_API_KEY` | Nee | Anthropic API-sleutel voor AI-functies (oefeningen, tips, hints) |
| `HA_URL` | Nee | Home Assistant URL voor domotica-integratie |
| `HA_TOKEN` | Nee | Home Assistant long-lived access token |
| `GITHUB_REPO` | Nee | GitHub repository voor in-app update-check |
| `APP_DIR` | Nee | Installatiepad op de host (standaard: `/opt/adhd`) |
| `SEED_ADMIN_EMAIL` | Nee | E-mailadres voor het initieel admin-account |
| `SEED_ADMIN_PASS` | Nee | Wachtwoord voor het initieel admin-account |
| `SEED_PARENT_EMAIL` | Nee | E-mailadres voor het initieel ouder-account |
| `SEED_PARENT_PASS` | Nee | Wachtwoord voor het initieel ouder-account |
| `SEED_CHILD_NAME` | Nee | Naam voor het initieel kind-account |
| `SEED_CHILD_EMAIL` | Nee | E-mailadres voor het initieel kind-account |
| `SEED_CHILD_PIN` | Nee | PIN-code voor het initieel kind-account (4 cijfers) |

---

## Rollen en Rechten

GRIP gebruikt een rolgebaseerd toegangssysteem met vier niveaus.

| Rol | Wie | Login-methode | Toegang |
|---|---|---|---|
| **kind** | Het kind | PIN-code (4 cijfers) + profielfoto | Eigen dagschema, taken, oefeningen, tokens, emotie check-in, vaardigheden. Ziet geen data van andere gebruikers. |
| **ouder** | Vader, moeder | E-mail + wachtwoord (+ optioneel TOTP 2FA) | Alles van het kind + schema-editor, beloningen beheren, oefeningen-editor, dashboard, communicatieportaal, dossier, hulpverleners beheren, afspraken, TRMNL-configuratie. |
| **hulpverlener** | Logopedist, kinesist, CLB, leerkracht | E-mail + wachtwoord (uitgenodigd door ouder) | Communicatieportaal, eigen notities/verslagen in dossier, voortgangsdata (alleen lezen), oefeningen voorstellen. Enkel de modules die de ouder vrijgeeft. |
| **admin** | Systeembeheerder | E-mail + wachtwoord | Gebruikersbeheer (accounts aanmaken, wachtwoorden/PINs resetten, (de)activeren), systeeminstellingen, versie-info, token/voortgang reset per kind, backup, upgrade. |

### Hulpverlener-uitnodiging

1. Ouder maakt een invite-link aan met gekozen modules en vervaldatum
2. Link bevat een JWT-token (SHA-256 gehashed opgeslagen, vervalt na 72 uur)
3. Hulpverlener maakt een account aan via de link
4. Ouder kan per hulpverlener de module-toegang beheren:
   - `communication` — Berichtenkanalen
   - `dossier` — Verslagen en notities
   - `exercises` — Oefeningen voorstellen
   - `progress` — Voortgangsdata bekijken
5. Toegang is op elk moment intrekbaar door de ouder

### Multi-kind ondersteuning

Een ouder-account kan meerdere kinderen beheren. Elk kind heeft een eigen dagschema, beloningsconfiguratie, oefeningen en dossier. Het dashboard toont een overzicht van alle kinderen.

---

## AI-integratie

GRIP gebruikt de Claude API van Anthropic voor oefening-generatie, hints en inzichten. De AI is optioneel — de app werkt volledig zonder, maar met AI zijn oefeningen en tips geautomatiseerd.

### Modelgebruik en kosten

| Toepassing | Model | Kosten per call | Toelichting |
|---|---|---|---|
| Oefeningen genereren (batch van 10) | Claude Haiku 3.5 | ~EUR 0,0003 | Gestructureerde JSON-output, 1 API-call per batch |
| Hint bij fout antwoord | Claude Haiku 3.5 | ~EUR 0,0001 | Real-time, latency <500ms, korte uitleg |
| Dagelijkse tip voor ouders | Claude Haiku 3.5 | ~EUR 0,0002 | Barkley-geinspireerde tip op basis van de vorige dag |
| Wekelijks voortgangsrapport | Claude Sonnet | ~EUR 0,005 | 1x/week, complexere data-analyse |
| Sociale scripts genereren | Claude Sonnet | ~EUR 0,003 | Nuance in sociale situaties |
| Leeftijdsaanpassing | Claude Haiku 3.5 | inbegrepen | AI past taalgebruik en moeilijkheid aan op geboortedatum |

**Geschatte maandkosten:**

| Gebruik | Berekening | Kosten/maand |
|---|---|---|
| 10 oefeningen/dag | 30 x EUR 0,0003 | ~EUR 0,009 |
| 20 hints/dag | 30 x EUR 0,002 | ~EUR 0,06 |
| 30 dagelijkse tips | 30 x EUR 0,0002 | ~EUR 0,006 |
| 4 wekelijkse rapporten | 4 x EUR 0,005 | ~EUR 0,02 |
| **Totaal** | | **< EUR 0,50/maand** |

### Privacy

Claude API-calls bevatten nooit persoonlijke informatie van het kind. Enkel vakinhoud, huidig niveau, foutpatronen en de instructie om in Vlaams Nederlands op B1-niveau te schrijven.

### Prompt-flow bij oefening-generatie

```
Ouder/hulpverlener kiest:       Backend bouwt prompt:        Kind ziet:

  Vak: Wiskunde             ->  - Vak + thema               -> 10 nieuwe
  Thema: Tafels van 3-5        - Huidig niveau                 oefeningen
  Niveau: 2                     - Foutpatronen laatste week     klaar om
  Aantal: 10                    - Voorkeurs-oefeningtypes       te spelen
                                - Vlaams Nederlands
                            ->  Haiku genereert 10 stuks
                                in 1 API-call (~2 sec)
                            ->  Validatie tegen JSON-schema
                            ->  Opslaan in database
                            ->  Ouder krijgt notificatie
                                om te reviewen (optioneel)
```

### Adaptieve hint-loop

1. Kind maakt oefening — fout antwoord
2. Backend stuurt context naar Haiku (geen persoonsgegevens, wel niveau en fouttype)
3. Haiku genereert een visuele hint in max 2 zinnen, Vlaams Nederlands, B1-niveau
4. Kind ziet hint met illustratie-beschrijving
5. Bij tweede fout: toon correct antwoord met uitleg
6. Backend logt foutpatroon — volgende batch oefeningen past zich aan

---

## TRMNL Plugin Configuratie

GRIP bevat een ingebouwde TRMNL private plugin voor e-paper displays. Het display toont het dagschema, tokensaldo en de huidige taak zonder dat het kind een scherm moet oppakken.

### Installatie

1. Ga in de app naar **Instellingen > TRMNL E-Paper**
2. Voer de TRMNL `user_uuid` in van het apparaat
3. Koppel het apparaat aan het juiste kind-profiel
4. Download de plugin-ZIP via het admin-paneel

De ZIP bevat:

```
grip-trmnl-plugin/
  settings.yml          — Plugin-configuratie (API-URL, access token)
  full.liquid           — Dagoverzicht (volledig scherm)
  half_vertical.liquid  — Token-voortgang (half scherm)
  quadrant.liquid       — Huidige taak (kwart scherm)
```

### Configuratie in de admin-UI

| Instelling | Beschrijving |
|---|---|
| TRMNL koppelen | Voer de TRMNL user_uuid in en koppel aan een kind |
| Schermrotatie | Kies welke schermen in de playlist: dagoverzicht, tokens, huidige taak |
| Refresh-interval | Hoe vaak TRMNL pollt (standaard: 15 minuten) |
| Nachtmodus | Start- en eindtijd (standaard: 21:00-07:00), toont "Slaap lekker" |

### API-endpoint

```
POST /api/trmnl/markup
Headers: Authorization: Bearer <access_token>
Body: { "user_uuid": "...", "merge_variables": {} }

Response: {
  "markup": "<div>...</div>",
  "markup_half_vertical": "<div>...</div>",
  "markup_quadrant": "<div>...</div>"
}
```

### E-paper design

Het TRMNL-scherm gebruikt uitsluitend zwart/wit met 2-bit grijstinten. Alle templates zijn ontworpen voor maximale leesbaarheid: grote tekst (min 16px), hoog contrast, dikke lijnen, geen animaties. Voortgangsbalken worden weergegeven als blok-karakters.

---

## Beveiliging

GRIP is ontworpen voor het opslaan van gevoelige gegevens (medische informatie, kindgegevens) en heeft een uitgebreid beveiligingsmodel.

### Authenticatie

| Maatregel | Implementatie |
|---|---|
| Wachtwoord-hashing | Argon2id (geheugen-hard, beter dan bcrypt tegen GPU-aanvallen) |
| PIN-hashing (kind) | Argon2id met brute-force bescherming via rate limiting |
| JWT-tokens | Access token (15 min, in geheugen) + refresh token (7 dagen, httpOnly secure cookie) |
| TOTP 2FA | Optioneel voor ouders en hulpverleners via `otplib` |
| Brute-force bescherming | Rate limiting per IP: 5 mislukte logins, 15 minuten lockout |
| Sessie-invalidatie | Ouder kan alle sessies van een hulpverlener in een klik beeindigen |

### Data-encryptie

| Laag | Maatregel |
|---|---|
| Database at rest | pgcrypto voor gevoelige velden (diagnoses, medicatie). AES-256, sleutel in omgevingsvariabele |
| Database in transit | PostgreSQL met sslmode (ook intern in Docker-netwerk) |
| Bestanden at rest | MinIO server-side encryption (SSE-S3) |
| Bestanden downloaden | Pre-signed URL's met 5 minuten TTL, gebonden aan gebruikerssessie |
| Backup-encryptie | pg_dump output door GPG symmetric encryption |
| EXIF-stripping | Afbeeldingen ontdaan van locatiedata via `sharp` |

### API-beveiliging

| Maatregel | Detail |
|---|---|
| Rate limiting | Globaal: 100 req/min per IP. Auth: 5/min. AI: 10/min per gebruiker |
| CORS | Strict origin whitelist, configureerbaar via `CORS_ORIGINS` |
| CSRF | SameSite=Strict cookies + CSRF-token |
| Helmet | Standaard security headers via `@fastify/helmet` |
| CSP | Content Security Policy met script-src 'self', geen inline scripts |
| Input-validatie | Zod-schema's op alle endpoints, Prisma parameterized queries |
| Bestandsvalidatie | Whitelist mimetypes + magic bytes check via `file-type`, max 25MB |
| Virusscanning | ClamAV scant elke upload voor opslag |
| Audit-logging | Elke schrijfactie gelogd: wie, wat, wanneer, IP. Append-only tabel |

### Docker-hardening

- Containers draaien met `no-new-privileges` en `cap_drop: ALL`
- Read-only filesystem waar mogelijk, `/tmp` als tmpfs
- Netwerk-isolatie: alleen de backend communiceert met database, Redis en MinIO
- Docker socket read-only gemount (enkel voor upgrade-functionaliteit)
- Geen container draait als root behalve database-initialisatie

---

## Ontwikkeling

### Vereisten voor lokale ontwikkeling

- Node.js 20+
- Docker + Docker Compose (voor PostgreSQL, Redis, MinIO, ClamAV)
- npm

### Infrastructuur opstarten

```bash
docker compose up db redis minio clamav -d
```

### Backend starten

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

De backend draait op `http://localhost:3001` (of de geconfigureerde poort).

### Frontend starten

```bash
cd frontend
npm install
npm run dev
```

De frontend draait op `http://localhost:5173` met hot module replacement.

### Handige commando's

| Commando | Beschrijving |
|---|---|
| `npm run dev` | Start development server (frontend of backend) |
| `npm run build` | Bouw voor productie |
| `npm run lint` | Lint de codebase |
| `npx prisma studio` | Open Prisma Studio (visuele database-editor) |
| `npx prisma migrate dev` | Maak een nieuwe migratie aan |
| `npx prisma migrate deploy` | Voer migraties uit |
| `npx prisma db seed` | Seed de database met testdata |
| `docker compose logs -f` | Volg alle container-logs |
| `docker compose logs -f backend` | Volg alleen backend-logs |

### Projectstructuur

```
adhd/
  CLAUDE.md                 Technisch plan en AI-instructies
  CHANGELOG.md              Versiebeheer
  docker-compose.yml        Alle services
  .env.example              Template voor omgevingsvariabelen
  nginx/                    Nginx-configuratie voor frontend
  scripts/                  Backup- en upgrade-scripts
  docs/                     Documentatie en schema's
  frontend/
    public/
      avatars/              38 SVG-avatars (dieren, fantasie, grappig)
      fonts/                Baloo 2, Quicksand, DM Sans, OpenDyslexic
      icons/                App-iconen (72px-512px) + favicon
      sounds/               Feedback-geluiden
      textures/             Papier-textuur overlay
      manifest.webmanifest  PWA-manifest
      sw.js                 Service Worker
      offline.html          Offline-fallback pagina
    src/
      components/           Herbruikbare UI-componenten
      hooks/                Custom React hooks
      lib/                  Utilities, API-client, constanten
      pages/                Route-pagina's per module
      stores/               Zustand state stores
      styles/               Thema-CSS (kind + volwassene)
      types/                TypeScript type-definities
      App.tsx               Root component met routing
      main.tsx              Entry point
  backend/
    prisma/
      schema.prisma         Volledig datamodel (30+ tabellen)
      migrations/           Database-migraties
      seed.ts               Seed-script voor initieel data
    src/
      index.ts              Fastify server entry point
      lib/                  Gedeelde utilities
      middleware/            Auth, rate limiting, validatie
      plugins/              Fastify plugins (auth, push, webhook)
      routes/               REST API routes per module
      services/             Business logic per domein
      trmnl-plugin/         TRMNL Liquid-templates en configuratie
```

### Thema-systeem

GRIP heeft twee visueel verschillende thema's die automatisch activeren op basis van de ingelogde rol:

**Kind-thema ("Warme Speeltuin")** — Scandinavisch kinderkamer-design. Baloo 2 en Quicksand fonts, warme havermout-achtergrond, organische vormen met ongelijke border-radius, pill-shaped knoppen, subtiele papier-textuur. Geen rood, geen foutmeldingen, geen spinners.

**Volwassen-thema ("Warm Professioneel")** — Strak maar warm, geinspireerd door Linear.app en Notion. DM Sans font, warm off-white achtergrond, cognac/amber accenten, asymmetrisch dashboard-layout. Professioneel maar niet koud of corporate.

Beide thema's delen dezelfde teal (#7BAFA3) en groen (#5B8C5A) als visuele verbinding. Het token-goud (#F2C94C) is overal identiek. OpenDyslexic is beschikbaar als toggle in de instellingen.

---

## Versie

Huidige versie: **v1.3.0** — Zie [CHANGELOG.md](CHANGELOG.md) voor de volledige versiegeschiedenis.

### Versieoverzicht

| Versie | Datum | Belangrijkste toevoegingen |
|---|---|---|
| v1.0.0 | 2026-04-07 | Eerste release: dagschema, taken, tokens, oefeningen, emotie, auth, Docker |
| v1.1.0 | 2026-04-08 | Communicatieportaal, dossier, hulpverleners, vaardigheden, sociale scripts |
| v1.2.0 | 2026-04-09 | Push-notificaties, PWA, spaarpotje, recepten, accessibility, PDF-export |
| v1.3.0 | 2026-04-10 | Afspraken/kalender, TRMNL plugin, gebruikersbeheer, 38 avatars, TTS, vakantieperiodes |

### Upgrade

Upgrades kunnen uitgevoerd worden via de admin-UI (Instellingen > Systeembeheer) of handmatig:

```bash
cd /opt/adhd
git pull origin main
docker compose build
docker compose exec backend npx prisma migrate deploy
docker compose up -d
```

Het upgrade-systeem maakt automatisch een backup voor elke update en doet een automatische rollback als de health check na 60 seconden faalt.

---

## Licentie

Copyright (c) 2026 Bjorn Scheepers. Alle rechten voorbehouden.

Deze broncode is beschikbaar voor inzage. Gebruik, kopieren, wijzigen, samenvoegen, publiceren, distribueren, sublicensieren of verkopen van deze software, geheel of gedeeltelijk, is niet toegestaan zonder expliciete schriftelijke toestemming van de auteursrechthebbende.

Contact: bjorn@scheepers.one
