# JulieApp — Technisch Plan

## 1. Visie & Doelgroep

**Primaire gebruiker:** Julie (kind, ADHD + lager IQ)
**Secundaire gebruikers:** Björn & Anja (ouders), hulpverleners (logo, kine, CLB, leerkracht)

**Kernprincipe (Barkley):** De app is een *externe executieve functie-prothese* — geen leertool die kennis test, maar een systeem dat het juiste gedrag op het juiste moment uitlokt via externalisatie, visualisatie en directe bekrachtiging.

---

## 2. Architectuurkeuze

### Frontend: React (Vite) als PWA
- **Waarom PWA:** Installeerbaar op smartphone/tablet als "echte app", werkt offline via service worker, geen App Store gedoe, push notifications via Web Push API
- **Waarom React:** Componentmodel past perfect bij herbruikbare UI-blokken (taakkaarten, timers, beloningen), enorm ecosysteem, Claude Code is er sterk in
- **UI framework:** Tailwind CSS als utility-laag, eigen design tokens (geen standaard shadcn/ui look). Kind: Baloo 2 + Quicksand, warm/organisch. Volwassene: DM Sans, warm/professioneel. Grote touch targets (min 48px), OpenDyslexic toggle.
- **State management:** Zustand (lichtgewicht, simpel) + React Query voor server sync
- **Animaties:** Framer Motion — visuele feedback is cruciaal voor engagement

### Backend: Node.js (Fastify)
- **Waarom Fastify:** Sneller dan Express, schema-validatie ingebouwd, TypeScript-first
- **Database:** PostgreSQL via Prisma ORM
  - Relationeel model past bij gebruikers → taken → beloningen → voortgang
  - JSON-kolommen voor flexibele configuratie (oefeningen, dagschema's)
- **Auth:** Role-based (zie §2b)
  - Kind: PIN-login (4 cijfers + profielfoto)
  - Ouder: email/wachtwoord + TOTP optioneel
  - Hulpverlener: email/wachtwoord, uitgenodigd door ouder
- **API:** REST (geen GraphQL nodig voor deze scope)
- **Real-time:** Server-Sent Events voor live sync tussen Julie's tablet en ouder-dashboard

### Hosting (self-hosted op Proxmox)
- **LXC container** met Docker Compose:
  - `app-frontend` — Nginx serving static PWA build
  - `app-backend` — Fastify Node.js
  - `app-db` — PostgreSQL 16
  - `app-redis` — Redis voor sessies + push notification queue
- **Reverse proxy:** Via bestaande Cloudflare tunnel of Nginx Proxy Manager
- **Backup:** Dagelijkse pg_dump naar NAS

---

## 2b. Rollen & Rechtenmodel

| Rol | Wie | Toegang |
|---|---|---|
| **kind** | Julie | Eigen dagschema, taken, oefeningen, beloningenwinkel, emotie-check-in. Ziet geen data van anderen. |
| **ouder** | Björn, Anja | Alles van kind + schema-editor, beloningen beheren, oefeningen-editor, dashboard, communicatieportaal, dossier, alle hulpverleners beheren |
| **hulpverlener** | Logo, kine, CLB, leerkracht | Communicatieportaal, eigen notities/verslagen in dossier, voortgangsdata (alleen lezen), kan oefeningen voorstellen. Toegang enkel tot modules die ouder vrijgeeft |
| **admin** | Björn | Gebruikersbeheer, systeeminstellingen, backup |

**Uitnodigingssysteem:** Ouder stuurt een invite-link (JWT met rol + vervaldatum). Hulpverlener maakt account aan via die link. Ouder kan toegang per module aan/uitzetten en op elk moment intrekken.

**Datamodel:**
```
User {
  id, name, email?, pin?, role: enum(child, parent, caregiver, admin),
  avatarUrl, isActive
}
CaregiverAccess {
  id, userId (hulpverlener), childId,
  modules: string[]  // ["communication", "dossier", "exercises", "progress"]
  invitedBy, invitedAt, expiresAt?
}
```

---

## 2c. Claude API Integratie

### Model & Kostenstrategie

**Haiku is de primaire oefeningen-bron.** Ouders en hulpverleners hoeven geen oefeningen handmatig te maken — ze geven alleen vak, onderwerp en niveau aan, en Haiku genereert complete oefeningen inclusief hints en visuele beschrijvingen.

| Gebruik | Model | Kosten/call ~| Waarom |
|---|---|---|---|
| **Oefeningen genereren** | **Haiku 3.5** | ~$0.0003 | Bulk: 10 oefeningen per prompt in 1 call, gestructureerde JSON |
| **Hint bij fout antwoord** | **Haiku 3.5** | ~$0.0001 | Real-time, latency <500ms, simpele uitleg |
| **Dagelijkse tip voor ouders** | **Haiku 3.5** | ~$0.0002 | Korte Barkley-tip op basis van gisteren |
| **Wekelijks voortgangsrapport** | **Sonnet** | ~$0.005 | 1x/week, complexere analyse |
| **Sociale scripts** | **Sonnet** | ~$0.003 | Nuance in sociale situaties |

**Maandelijkse kosteninschatting:**
- 10 oefeningen/dag gegenereerd: ~$0.009/dag → **~$0.27/maand**
- 20 hints/dag: ~$0.002/dag → **~$0.06/maand**
- 30 dagelijkse tips: **~$0.006/maand**
- 4 wekelijkse rapporten: **~$0.02/maand**
- **Totaal: < $0.50/maand**

### Oefeningen-generatie Flow

```
Ouder/hulpverlener kiest:        Backend:                    Julie ziet:
                                                              
  Vak: Wiskunde            →  Bouwt prompt met:          →  10 nieuwe
  Thema: Tafels van 3-5       - vak + thema                  oefeningen
  Niveau: 2                    - huidig niveau               klaar om te
  Aantal: 10                   - foutpatronen laatste week    spelen
                               - voorkeurs-oefeningtypes
                               - Vlaams Nederlands           
                            →  Haiku genereert 10 stuks   
                               in 1 API call (~2 sec)     
                            →  Validatie tegen JSON schema
                            →  Opslaan in DB              
                            →  Ouder krijgt notificatie   
                               om te reviewen (optioneel) 
```

**Drie manieren om oefeningen te vullen:**

| Methode | Hoe | Wanneer |
|---|---|---|
| **Auto-generatie (primair)** | Haiku genereert batch op basis van vak/thema/niveau | Standaard — elke dag of op aanvraag |
| **AI op aanvraag** | Hulpverlener typt: "Maak oefeningen over kloklezen, analoog, kwart over/voor" → Haiku genereert | Logo/leerkracht wil specifieke oefeningen |
| **Handmatig** | Ouder/hulpverlener vult formulier in | Uitzonderingen, heel specifieke oefeningen |

**Slim hergebruik:** Gegenereerde oefeningen worden opgeslagen met tags. Als Julie een oefening goed maakt, wordt die na X dagen opnieuw aangeboden (spaced repetition). Foute oefeningen komen sneller terug in een makkelijkere variant — Haiku genereert die variant on-the-fly.

**Adaptieve prompt-loop:**
```
1. Julie maakt oefening → fout
2. Backend stuurt naar Haiku:
   "Julie (8j, ADHD, niveau 2) antwoordde 3×5=12.
    Genereer een hint die visueel uitlegt waarom 3×5=15.
    Gebruik concreet voorbeeld (bv. 3 zakjes van 5 snoepjes).
    Max 2 zinnen, Vlaams Nederlands, B1-niveau."
3. Haiku antwoordt in <500ms
4. Julie ziet hint met illustratie-beschrijving
5. Bij 2e fout: toon correct antwoord + Haiku-uitleg
6. Backend logt foutpatroon → volgende batch oefeningen past aan
```

### Andere AI-toepassingen

| Feature | Hoe |
|---|---|
| **Dagelijkse tip voor ouders** | Haiku genereert korte Barkley-geïnspireerde tip op basis van gisteren (veel fouten? → "Probeer morgen kortere sessies") |
| **Oefening-uitleg** | Bij 2e fout: Haiku genereert alternatieve uitleg, aangepast aan Julie's niveau |
| **Voortgangsrapport** | Wekelijks: Sonnet analyseert data en schrijft samenvatting voor ouders/hulpverleners |
| **Spraak-naar-tekst** | Whisper API of Web Speech API voor Julie's mondelinge antwoorden |

---

## 2d. Communicatieportaal & Dossier

### Waarom dit cruciaal is

Bij ADHD + lager IQ zijn er typisch 3-6 hulpverleners betrokken die nu communiceren via losse e-mails, papieren briefjes en mondelinge overdracht. Informatie gaat verloren, adviezen spreken elkaar tegen, ouders zijn de bottleneck.

### Module: Communicatie

**Alleen toegankelijk voor rollen: ouder + hulpverlener**

| Feature | Implementatie |
|---|---|
| **Berichtenkanalen** | Per thema (bv. "Logopedie", "School", "Kine", "Algemeen") — vergelijkbaar met Slack-channels |
| **Gestructureerde updates** | Template-formulier per hulpverlener: "Vandaag gewerkt aan: ... / Gaat goed: ... / Aandachtspunt: ... / Oefening voor thuis: ..." |
| **Bestanden delen** | Upload verslagen, rapporten, IHP-documenten, testresultaten (opslag in MinIO/S3-compatible op Proxmox) |
| **Leesbevestiging** | Ouders zien wie wat gelezen heeft |
| **Push notificatie** | Bij nieuw bericht of gedeeld bestand |
| **Tijdlijn** | Chronologisch overzicht van alle communicatie + dossier-items, filterable per hulpverlener |

### Module: Dossier

**Het centrale dossier dat meereist met Julie door de jaren heen.**

| Sectie | Inhoud | Wie mag schrijven | Wie mag lezen |
|---|---|---|---|
| **Profiel** | Diagnoses, medicatie, allergieën, school, klasinfo | Ouder | Ouder + vrijgegeven hulpverleners |
| **Verslagen** | Logopedieverslagen, kine-evaluaties, CLB-rapporten, schoolrapporten | Hulpverlener (eigen) + ouder | Ouder + vrijgegeven hulpverleners |
| **IHP/Handelingsplan** | Individueel hulpverleningsplan, doelen, evaluatiemomenten | Ouder + hulpverlener (samen) | Idem |
| **Voortgangsdata** | Automatisch uit app: oefenresultaten, emotielogs, taakafronding | Systeem | Ouder + vrijgegeven hulpverleners |
| **Medicatie-log** | Medicatie-wijzigingen, dosisaanpassingen, bijwerkingen | Ouder | Ouder + arts (indien toegang) |
| **Notities** | Vrije notities per hulpverlener, zichtbaar voor ouder | Hulpverlener (eigen) | Ouder + schrijver |

**Datamodel:**
```
Channel {
  id, name, childId, type: enum(general, therapy, school, medical),
  members: User[]
}
Message {
  id, channelId, authorId, content, attachments: Attachment[],
  isStructuredUpdate: boolean, template?: json,
  readBy: {userId, readAt}[],
  createdAt
}
DossierEntry {
  id, childId, category: enum(report, plan, medication, note, progress),
  title, content, attachments: Attachment[],
  authorId, visibility: UserId[],
  createdAt, updatedAt
}
Attachment {
  id, filename, mimeType, storageKey, uploadedBy, uploadedAt
}
```

### Bestandsopslag

MinIO container toevoegen aan Docker Compose — S3-compatible, self-hosted, versleuteld at rest. Verslagen en rapporten worden hier opgeslagen, niet in PostgreSQL.

```yaml
# toevoegen aan docker-compose.yml
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_PASS}
    volumes:
      - miniodata:/data
    restart: unless-stopped
```

---

## 3. Modules & Implementatiedetail

### 3.1 Dagstructuur & Planning

**Scherm:** Verticale tijdlijn met grote iconen per activiteit

| Feature | Implementatie |
|---|---|
| Visueel dagschema | Drag & drop editor (ouders), readonly timeline (Julie) |
| Iconen per activiteit | Ingebouwde iconset + mogelijkheid eigen foto's te uploaden |
| Transitiewaarschuwingen | Web Push 5 min + 1 min voor wisseling, optioneel HA-integratie (TTS op speaker, licht knippert) |
| Ochtendroutine-wizard | Stap-voor-stap fullscreen flow met grote checkboxes |
| Weekoverzicht | Kleurgecodeerde weekkaart, swipeable |

**Datamodel:**
```
Schedule {
  id, userId, dayOfWeek,
  activities: Activity[] // ordered
}
Activity {
  id, scheduleId, title, icon, startTime, durationMinutes,
  steps: Step[], // voor routines
  color, notifyBefore: number[]
}
```

### 3.2 Taakbeheer & "Nu Doen"-Modus

**Kernidee:** Eén taak tegelijk, fullscreen, geen afleiding.

| Feature | Implementatie |
|---|---|
| Taak-ontleder | Ouders maken taak met substappen; of AI-suggesties via Claude API |
| Nu Doen-scherm | Fullscreen enkele stap, grote tekst + icoon, swipe voor volgende |
| Visuele tijdbalk | CSS-animatie: kleurenbalk van groen→geel→rood, instelbare duur |
| Checkoff-animatie | Confetti/ster-burst bij elke afgeronde stap (Framer Motion) |
| Pauze-reminder | Na instelbaar aantal minuten: verplichte pauzeanimatie |

### 3.3 Beloningssysteem (Token Economy)

**Barkley-regels:** Alleen verdienen, nooit verliezen. Direct, zichtbaar, op het punt van uitvoering.

#### Token-verdienmodel — Volledig configureerbaar door ouders

**Principe:** Elke activiteit in de app heeft een token-toggle. Ouders beslissen wat tokens oplevert en wat niet.

| Bron | Token-toggle | Standaard | Instelbaar |
|---|---|---|---|
| Dagschema: activiteit afvinken | per activiteit | UIT | 0-5 tokens per activiteit |
| "Nu Doen": substap afronden | per taak | AAN (1) | 0-3 tokens per stap |
| "Nu Doen": hele taak af | per taak | AAN (2) | 0-10 tokens bonus |
| Oefensessie: oefening goed | per vak | AAN (1) | 0-3 tokens per oefening |
| Oefensessie: sessie afgemaakt | per vak | AAN (3) | 0-5 tokens bonus |
| Emotie check-in: ingevuld | globaal | AAN (1) | 0-3 tokens |
| Ochtendroutine: volledig af | globaal | AAN (3) | 0-10 tokens |
| Bedtijdroutine: volledig af | globaal | AAN (3) | 0-10 tokens |
| Streak-bonus: X dagen op rij | globaal | AAN (2/dag) | 0-5 tokens, instelbaar na hoeveel dagen |
| **Manuele toekenning** | altijd aan | — | Ouder geeft X tokens met optionele reden |

**Ouder-UI:** Eenvoudig scherm per activiteit/taak met slider (0 = geen tokens, 1-10 = aantal) en toggle aan/uit. Bulk-instelling mogelijk ("alle oefeningen: 1 token").

#### Doelen & Beloningen — Getrapte spaardoelen

**Ouders stellen concrete doelen in per X tokens:**

```
Voorbeeld configuratie:

  🌟 5 tokens  → 15 min extra schermtijd
  🌟 10 tokens → Samen een spelletje spelen
  🌟 20 tokens → Kiezen wat we eten vanavond
  🌟 50 tokens → Uitstapje naar het zwembad
  🌟 100 tokens → Groot cadeau (speelgoed, boek, ...)
```

**Julie's scherm:** Visuele spaarbalk met meerdere mijlpalen zichtbaar als iconen op de balk. Het eerstvolgende doel is groot en duidelijk. Verder weg = kleiner maar wel zichtbaar (geeft perspectief).

```
[====🌟======🌟==========🌟==================🌟]
      5       10          20                   50
      ↑
  "Nog 2 tokens voor: 15 min schermtijd!"
```

**Inwisselen:** Julie tikt op een bereikt doel → ouder krijgt push-notificatie ter bevestiging → tokens worden afgetrokken → feestanimatie. Ouder kan ook instellen dat bepaalde beloningen automatisch worden toegekend zonder bevestiging.

#### Extra features

| Feature | Implementatie |
|---|---|
| **Token-history** | Ouder ziet volledig overzicht: wanneer verdiend, waarmee, wanneer ingewisseld |
| **Manuele toekenning** | Ouder-knop: "+tokens" met vrij aantal + optionele reden ("goed geholpen met boodschappen") |
| **Categorie-tokens** | Optioneel: aparte token-types per domein (🧮 school-tokens, 🏠 thuis-tokens) met eigen beloningen. Of gewoon alles in één pot — ouder kiest |
| **Geen negatief saldo** | Tokens kunnen nooit onder 0 komen. Geen "kosten" voor slecht gedrag. |
| **Seizoens-beloningen** | Ouder kan tijdgebonden doelen toevoegen ("Sinterklaas-spaaractie: 75 tokens") |
| **Animatie bij verdienen** | Ster vliegt naar spaarbalk, geluidje, haptic feedback (navigator.vibrate) |
| **Streak-bonus** | Extra tokens voor X dagen op rij, maar bij onderbreking: geen straf, streak reset gewoon stil |
| **Hulpverlener-suggestie** | Hulpverlener kan beloningen voorstellen in communicatieportaal ("Logo raadt aan: beloon dagelijks 10 min hardop lezen") |

#### Datamodel

```
TokenConfig {
  id, childId,
  sourceType: enum(activity, task, task_step, exercise, exercise_session,
                   emotion_checkin, morning_routine, bedtime_routine,
                   streak, manual),
  sourceId?: string,       // specifieke activiteit/taak ID, of null voor globaal
  enabled: boolean,
  tokensPerCompletion: int,
  bonusTokens?: int,       // extra bij volledige afronding
  createdBy: userId
}

Reward {
  id, childId, title, description?, imageUrl?,
  costTokens: int,
  isAvailable: boolean,
  requiresApproval: boolean,  // ouder moet bevestigen
  category?: string,          // "schermtijd", "activiteit", "cadeau"
  expiresAt?: timestamp,      // voor seizoens-beloningen
  sortOrder: int              // volgorde op spaarbalk
}

TokenTransaction {
  id, childId,
  amount: int,               // altijd positief bij verdienen
  type: enum(earned, redeemed, manual),
  sourceType: string,
  sourceId?: string,
  rewardId?: string,          // bij inwisselen
  note?: string,              // bij manuele toekenning
  grantedBy?: userId,         // ouder bij manueel
  createdAt: timestamp
}

// Afgeleide waarde (geen aparte kolom):
// Saldo = SUM(earned + manual) - SUM(redeemed)
```

### 3.4 Schooloefeningen & Wiskunde

**Niet** een volledig LMS bouwen — wél een framework voor korte oefensessies met nadruk op wiskunde als eerste vakgebied.

| Feature | Implementatie |
|---|---|
| Oefeningen-engine | JSON-schema per oefening: type (multiple choice, drag&drop, invullen, memory, getallenraad, weegschaal), moeilijkheidsgraad, media |
| Adaptieve moeilijkheid | Sliding window van laatste 5 antwoorden → auto-adjust level (3 fouten → niveau omlaag, 5 goed → niveau omhoog) |
| Sessielimiet | Max 10-15 min, daarna verplichte pauze, timer zichtbaar |
| Multimodaal | Elke oefening kan tekst, afbeelding, audio (TTS via Web Speech API) en video bevatten |
| Ouder/leerkracht-editor | Simpele form om oefeningen toe te voegen per vak |
| AI-generatie | Claude API genereert oefeningen op basis van vak + niveau + thema |
| Fout-analyse | Bij herhaald dezelfde fout: andere uitlegvorm aanbieden (visueel → concreet voorbeeld → manipuleerbaar) |

#### Wiskunde — Concrete Oefeningtypes

**Niveau-opbouw (Barkley: geen frustratie, wél succeservaring):**

| Niveau | Leeftijd ~| Inhoud |
|---|---|---|
| 1 | 6-8 | Tellen, getallen herkennen, meer/minder, eenvoudig optellen tot 10 |
| 2 | 8-10 | Optellen/aftrekken tot 100, tafels, kloklezen, geld tellen |
| 3 | 10-12 | Vermenigvuldigen/delen, breuken visueel, meten, eenvoudige grafieken |
| 4 | 12-14 | Procenten, kommagetallen, oppervlakte, schattingsvragen |
| 5 | 14+ | Dagelijkse wiskunde: budget, kortingen, recepten schalen, afstanden |

**Oefeningtypes specifiek voor wiskunde:**

| Type | Beschrijving | Waarom het werkt bij ADHD |
|---|---|---|
| **Getallenslang** | Sleep getallen in de juiste volgorde op een kronkelpad | Visueel + motorisch, geen werkgeheugendruk |
| **Weegschaal** | Maak de weegschaal in evenwicht (3 + ? = 7) | Concretiseert abstracte gelijkheid |
| **Winkel** | "Je hebt €5, wat kun je kopen?" met afbeeldingen | Levensecht, directe relevantie |
| **Pizzabreuken** | Verdeel de pizza in gelijke stukken, kleur het juiste deel | Visueel-ruimtelijk i.p.v. abstract |
| **Klokmatch** | Verbind digitale klok met analoge klok | Drag & drop, herhaling vermomd |
| **Getallenmemory** | Koppel som aan uitkomst (memory-spelvariant) | Speels, traint automatisering |
| **Schatrace** | "Is 47 + 28 dichter bij 70 of 80?" — snelle keuze | Traint schattingsvaardigheid zonder exacte druk |
| **Stappenbouwer** | Breek een langere som op in stappen, elke stap apart | Externaliseert werkgeheugen (Barkley) |

**Belangrijk ontwerpprincipe:** Elke oefening toont bij een fout niet "FOUT" maar een visuele hint. Pas bij 2e poging het juiste antwoord met uitleg. Nooit rood scherm of negatief geluid.

#### Andere vakken (later uit te breiden)

| Vak | Mogelijke types |
|---|---|
| Taal/spelling | Woordslang, lettergrepen slepen, zinnen ordenen |
| Lezen | Korte tekst + begripsvragen met plaatjes |
| Wereldoriëntatie | Foto-quiz, kaart-oefeningen, tijdlijn-puzzels |

**Oefening-schema (JSON):**
```json
{
  "type": "balance_scale",
  "subject": "wiskunde",
  "question": "Maak de weegschaal gelijk",
  "questionAudio": null,
  "leftSide": {"value": 3, "display": "3 + ?"},
  "rightSide": {"value": 7, "display": "7"},
  "answer": 4,
  "hints": [
    {"type": "visual", "content": "Beeld van 3 blokjes links, 7 rechts"},
    {"type": "text", "content": "Tel: 3 + 1 = 4, 3 + 2 = 5, 3 + 3 = 6, 3 + 4 = ..."}
  ],
  "difficulty": 2,
  "stars": 1,
  "tags": ["optellen", "tot20"]
}
```

### 3.5 Emotieregulatie

| Feature | Implementatie |
|---|---|
| Gevoelscheck-in | Bij app-open of op vaste tijden: emoji-kiezer (5 niveaus), opgeslagen als log |
| Ademhalingsoefening | Animatie (cirkel groeit/krimpt), instelbare duur, geluidsbegeleiding |
| Pauze-knop | Altijd bereikbaar (floating button), opent kalmeerscherm |
| Grounding-oefening | "Noem 5 dingen die je ziet" — visuele stappengids |
| Woede-protocol | Stap-voor-stap: herken → stop → adem → kies actie (Barkley's model) |

### 3.6 Levensvaardigheden (groeit mee)

| Feature | Implementatie |
|---|---|
| Zelfstandigheidschecklist | Per leeftijdscategorie: taken die ze moet leren (schooltas, tanden poetsen → later: boodschappen, afspraak maken) |
| Geldmodule | Virtuele portemonnee, sparen naar doel, simpele rekensommen |
| Sociale scripts | Scenario's met keuzes, visuele feedback ("Hoe vraag je iets aan de juf?") |
| Kookrecept-modus | Stap-voor-stap met foto's, timers ingebouwd |

### 3.7 Ouder-Dashboard

| Feature | Implementatie |
|---|---|
| Overzicht vandaag | Welke taken af, hoeveel sterren, gevoelscheck-in |
| Weekanalyse | Grafieken: productieve tijden, moeilijke taken, emotiepatronen |
| Beloningen beheren | CRUD op beloningencatalogus |
| Schema-editor | Dagschema's aanmaken/kopiëren/aanpassen |
| Oefeningen beheren | Toevoegen, moeilijkheid instellen |
| Push-instellingen | Wanneer welke meldingen |
| Export | PDF-rapport voor school/therapeut |

---

## 4. Home Assistant Integratie

Omdat je HA al draait, kun je fysieke cues toevoegen:

| Trigger | HA Actie |
|---|---|
| 5 min voor activiteitwisseling | Licht in Julie's kamer knippert zacht |
| Ochtend routine start | Specifieke kleur op Hue (bv. warm oranje = "tijd om op te staan") |
| Alle taken van de dag af | Feestverlichting 🎉 |
| Emotie check-in: verdrietig/boos | Melding naar ouder-telefoon |
| Bedtijdroutine start | Lichten dimmen geleidelijk |

**Implementatie:** Backend stuurt webhook naar HA, of MQTT naar EMQX.

---

## 5. TRMNL E-Paper Display Plugin

Een always-on e-paper scherm in de keuken/gang dat Julie's dag toont zonder afleiding van een telefoon of tablet.

### Wat wordt getoond

**Scherm 1 — Dagoverzicht (primair)**
```
┌──────────────────────────────────────────┐
│  ☀️ Julie's Dag        Donderdag 9 april │
│                                          │
│  ✅ Ontbijt                      07:30   │
│  ✅ Schooltas inpakken           07:45   │
│  → ▶ Naar school                 08:15   │
│  ○ Huiswerk wiskunde             15:30   │
│  ○ Vrije tijd                    16:30   │
│  ○ Avondeten                     18:00   │
│  ○ Bedtijdroutine                20:00   │
│                                          │
│  ⭐ 12 tokens    Nog 8 → 🎮 Spelletje   │
└──────────────────────────────────────────┘
```

**Scherm 2 — Token-voortgang**
```
┌──────────────────────────────────────────┐
│  ⭐ Julie's Tokens                       │
│                                          │
│  Saldo: ⭐ 12                            │
│                                          │
│  ████████████░░░░░░░░  12/20             │
│  Volgend doel: 🎮 Samen spelletje spelen │
│                                          │
│  Vandaag verdiend: +5                    │
│  ├ Ochtendroutine      +3               │
│  ├ Wiskunde sessie     +1               │
│  └ Emotie check-in    +1               │
│                                          │
│  Deze week: ⭐⭐⭐⭐⭐⭐⭐ (streak: 7d!)   │
└──────────────────────────────────────────┘
```

**Scherm 3 — Volgende taak (focus)**
```
┌──────────────────────────────────────────┐
│                                          │
│              📚 NU                       │
│                                          │
│       Huiswerk wiskunde                  │
│                                          │
│       Nog 45 minuten                     │
│       ████████████░░░░░░                 │
│                                          │
│       Daarna: Vrije tijd 🎮              │
│                                          │
│                            ⭐ +2 tokens  │
└──────────────────────────────────────────┘
```

### Technische implementatie

TRMNL werkt met een **private plugin** die HTML-markup teruggeeft. Het TRMNL-apparaat pollt periodiek en rendert de HTML als e-ink image.

**Backend endpoint:**

```
GET /api/trmnl/markup
Headers: Authorization: Bearer <trmnl_access_token>
Body (from TRMNL): user_uuid, trmnl metadata (timezone, dimensions)

Response:
{
  "markup": "<div class='layout'>...</div>",
  "markup_half_vertical": "<div class='layout layout--half'>...</div>",
  "markup_quadrant": "<div class='layout layout--quadrant'>...</div>"
}
```

**Route in Fastify:**

```typescript
// routes/trmnl.ts
fastify.post('/api/trmnl/markup', async (request, reply) => {
  const { user_uuid } = request.body;
  
  // Haal kind-data op basis van gekoppeld TRMNL device
  const device = await db.trmnlDevice.findUnique({ where: { userUuid: user_uuid } });
  const child = await db.user.findUnique({ where: { id: device.childId } });
  
  // Data ophalen
  const today = new Date();
  const schedule = await getScheduleForDay(child.id, today);
  const tokenBalance = await getTokenBalance(child.id);
  const nextReward = await getNextReward(child.id);
  const todayEarned = await getTokensEarnedToday(child.id);
  const streak = await getStreak(child.id);
  const currentTask = await getCurrentTask(child.id);
  
  // Scherm 1 — Dagoverzicht (full layout)
  const markup = renderDayOverview({ schedule, tokenBalance, nextReward });
  
  // Scherm 2 — Halve layouts voor mashups
  const markup_half_vertical = renderTokenProgress({ 
    tokenBalance, nextReward, todayEarned, streak 
  });
  
  // Scherm 3 — Quadrant voor kleine weergave
  const markup_quadrant = renderCurrentTask({ currentTask, tokenBalance });
  
  return { markup, markup_half_vertical, markup_quadrant };
});
```

**HTML-template (TRMNL design system):**

```html
<!-- Dagoverzicht — full layout (800x480) -->
<div class="layout">
  <div class="columns">
    <div class="column">
      <span class="title title--small">Julie's Dag</span>
      <div class="content">
        <div class="data-list" data-list-limit="true" data-list-max-height="320">
          {{#each activities}}
          <div class="item">
            <span class="label">
              {{#if completed}}✅{{else if current}}▶{{else}}○{{/if}}
              {{title}}
            </span>
            <span class="value">{{time}}</span>
          </div>
          {{/each}}
        </div>
      </div>
      <div class="tag_columns">
        <span class="tag">⭐ {{tokenBalance}} tokens</span>
        <span class="tag">Nog {{tokensToNext}} → {{nextReward.title}}</span>
      </div>
    </div>
  </div>
  <div class="title_bar">
    <img class="image" src="https://julie.scheepers.one/trmnl-icon.svg" />
    <span class="title">JulieApp</span>
    <span class="instance">{{dayName}} {{date}}</span>
  </div>
</div>
```

**E-paper design-regels:**
- Alleen zwart/wit + 2-bit grijstinten (geen kleur)
- Hoog contrast, dikke lijnen
- Grote tekst (TRMNL Inter font, min 16px)
- Geen animaties (statisch beeld)
- Progress bars als ASCII/block characters: `████░░░░`
- Emoji's als visuele markers (TRMNL rendert ze als zwart-wit glyphs)

### Configuratie in admin-UI

| Instelling | Beschrijving |
|---|---|
| **TRMNL koppelen** | Admin voert TRMNL API key in, koppelt aan kind-profiel |
| **Schermrotatie** | Kies welke schermen in de playlist: dagoverzicht, tokens, huidige taak |
| **Refresh-interval** | Hoe vaak TRMNL pollt (standaard: 15 min, bij actieve taak: 5 min) |
| **Nacht-modus** | Tussen 21:00-07:00: toon alleen "Slaap lekker ⭐ X tokens vandaag!" |

### Datamodel (toevoeging)

```
TrmnlDevice {
  id, childId, userUuid: string,  // TRMNL user_uuid
  accessToken: string,             // voor auth
  screens: string[],               // ["day_overview", "tokens", "current_task"]
  refreshMinutes: int,
  nightModeStart: time,
  nightModeEnd: time,
  isActive: boolean
}
```

---

## 6. Technische Stack Samenvatting

```
┌──────────────────────────────────────────────────┐
│  Julie's Tablet          Ouder Telefoon           │
│  React PWA (kind-modus)  React PWA (ouder-modus)  │
├──────────────────────────────────────────────────┤
│  Hulpverlener            TRMNL E-Paper            │
│  React PWA (invite-only) (keuken/gang)            │
├──────────────────────────────────────────────────┤
          │ HTTPS (Cloudflare Tunnel)
          ▼
┌──────────────────────────────────────────────────┐
│  Proxmox LXC — Docker Compose                    │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐  │
│  │ Nginx  │→│Fastify │→│PostgreSQL│ │ Redis  │  │
│  │(static)│ │ (API)  │ │+ pgcrypto│ │(sessie)│  │
│  └────────┘ └────────┘ └──────────┘ └────────┘  │
│                  │         ┌──────────┐           │
│                  ├────────→│  MinIO   │ (bestanden)│
│                  ├────────→│Claude API│ (Haiku/Sonnet)
│                  ├────────→│ HA MQTT  │ (webhooks) │
│                  ├────────→│ Web Push │            │
│                  └────────→│ TRMNL   │ (markup EP) │
└──────────────────────────────────────────────────┘
```

---

## 7. Fasering

### Fase 1 — Fundament (week 1-2)
- [ ] Project setup: Vite + React + Tailwind + Fastify + Prisma + PostgreSQL + Docker Compose
- [ ] Rollenmodel: kind (PIN), ouder (email/ww), hulpverlener (invite)
- [ ] Datamodel: gebruikers, rollen, toegangsrechten, taken, sterren, schema's
- [ ] Basisnavigatie: kind-modus vs ouder-modus vs hulpverlener-modus
- [ ] PWA manifest + service worker
- [ ] MinIO container voor bestandsopslag

### Fase 2 — Dagstructuur & Taken (week 3-4)
- [ ] Dagschema-viewer (tijdlijn met iconen)
- [ ] Schema-editor (ouder)
- [ ] "Nu Doen"-modus met substappen
- [ ] Visuele tijdbalk
- [ ] Push notifications voor transities

### Fase 3 — Beloningssysteem (week 5)
- [ ] Sterren toekennen bij taakafronding
- [ ] Spaarbalk + beloningenwinkel
- [ ] Animaties (confetti, ster-vlucht)
- [ ] Ouder: beloningen beheren

### Fase 4 — Emotieregulatie (week 6)
- [ ] Gevoelscheck-in (emoji-kiezer)
- [ ] Ademhalingsoefening (animatie)
- [ ] Pauze-knop (altijd bereikbaar)
- [ ] Woede-protocol stappengids

### Fase 5 — Schooloefeningen + Claude AI (week 7-9)
- [ ] Oefeningen-engine (JSON-schema)
- [ ] Wiskundetypes: weegschaal, winkel, pizzabreuken, getallenmemory
- [ ] Adaptieve moeilijkheid
- [ ] Sessietimer + verplichte pauze
- [ ] Ouder-editor voor oefeningen
- [ ] Claude Haiku integratie: oefeningen genereren
- [ ] Claude Haiku: alternatieve uitleg bij herhaalde fouten
- [ ] Oefening-review door ouder/hulpverlener

### Fase 6 — Communicatieportaal & Dossier (week 10-12)
- [ ] Berichtenkanalen per thema (logo, kine, school, algemeen)
- [ ] Gestructureerde update-templates voor hulpverleners
- [ ] Bestanden uploaden/delen via MinIO
- [ ] Dossier: profiel, verslagen, IHP, medicatie-log
- [ ] Leesbevestigingen + push bij nieuw bericht
- [ ] Hulpverlener-uitnodigingssysteem (invite-link)
- [ ] Per-module toegangscontrole door ouder

### Fase 7 — Dashboard & HA (week 13-14)
- [ ] Ouder-dashboard met grafieken (Recharts)
- [ ] Hulpverlener-view: voortgangsdata (readonly)
- [ ] HA-integratie (webhooks/MQTT)
- [ ] Claude Sonnet: wekelijks voortgangsrapport
- [ ] PDF-export voor school/therapeut

### Fase 8 — Levensvaardigheden & Uitbreiding (ongoing)
- [ ] Zelfstandigheidschecklists per leeftijd
- [ ] Geldmodule
- [ ] Sociale scripts (Claude Sonnet-gegenereerd)
- [ ] Extra vakken: taal, spelling, WO
- [ ] Spraak-input (Web Speech API)

---

## 8. Theming — Kind vs. Volwassene

Het thema wordt automatisch geactiveerd op basis van de ingelogde rol. Technisch via CSS custom properties (design tokens) op `<html>` + Tailwind `theme.extend`.

### ⚠️ ANTI-PATRONEN — Dit willen we NIET

```
VERBODEN (de "Claude/AI-slop" look):
  ❌ Inter, Roboto, Arial, system-ui als font
  ❌ Paarse/blauwe gradiënt op witte achtergrond
  ❌ Generieke shadcn/ui cards met border-gray-200
  ❌ Identieke 8px border-radius op alles
  ❌ Tailwind default blauw (#3B82F6) als accent
  ❌ Witte achtergrond + lichtgrijze cards + drop-shadow-sm
  ❌ Hamburger-menu + "Dashboard" als heading
  ❌ Gradient text op headings
  ❌ Emoji als enige visuele differentiatie
  ❌ Cookie-cutter card grids met identieke spacing
  ❌ "Welcome back, User!" hero sections

Het moet voelen alsof een menselijke designer het voor Julie
heeft gemaakt, niet alsof een AI een Tailwind template heeft 
gegenereerd.
```

### Kind-thema (Julie) — "Warme Speeltuin"

**Esthetische richting:** Scandinavisch kinderkamer-design. Denk aan Ferm Living Kids, HAY Play — warm, tactiel, organisch, maar niet druk. Illustratie-stijl geïnspireerd door Miffy/Dick Bruna: simpele vormen, beperkt kleurenpalet, dikke lijnen.

```
Kleurenpalet (beperkt — max 5 kleuren tegelijk zichtbaar):
  --bg-primary:       #FDF6EC   (warm havermout — niet klinisch wit)
  --bg-card:          #FFF9F0   (iets warmer dan achtergrond)
  --bg-surface:       #F5E6D3   (zand — voor actieve secties)
  --accent-warm:      #E8734A   (gebrand oranje — primaire actieknop)
  --accent-calm:      #7BAFA3   (gedempte teal — secundaire elementen)
  --accent-sunshine:  #F2C94C   (warm goud — tokens/sterren)
  --accent-forest:    #5B8C5A   (bosgroen — "goed gedaan", NIET neon)
  --text-primary:     #3D3229   (warm donkerbruin, NIET zwart)
  --text-muted:       #8C7B6B   (warm grijs)
  --hint-color:       #A8C5D6   (zacht hemelsblauw — hints)

  GEEN ROOD. Nooit. Niet voor fouten, niet voor alerts.
  Fouten = hint-color (blauw) + zachtere formulering.

Typografie:
  --font-display:     'Baloo 2', cursive
    → Rond, vriendelijk, dik — voor headings en knoppen
    → Google Fonts, gratis, goede NL-tekenset
  --font-body:        'Quicksand', sans-serif
    → Zacht afgerond maar leesbaar voor lopende tekst
    → Gewicht 500 als standaard (niet te dun)
  --font-dyslexic:    'OpenDyslexic', sans-serif
    → Toggle in instellingen, overschrijft beide fonts
  --font-size-body:   20px (minimum, nooit kleiner)
  --font-size-heading: 28-32px
  --font-size-big:    48px (voor "Nu Doen" scherm, enkel getal/woord)
  --line-height:      1.65
  --letter-spacing:   0.01em (iets meer lucht)

Vormentaal:
  --radius-soft:      20px     (cards, containers)
  --radius-pill:      999px    (knoppen, badges)
  --radius-blob:      50% 40% 60% 45% / 45% 55% 40% 50%  (organische blob-shapes)
  Knoppen zijn PILL-shaped, niet rechthoekig
  Cards hebben ONGELIJKE border-radius (subtiel, 18px 22px 20px 24px)
  → Voelt handgemaakt, niet machine-generated

Textuur & Diepte:
  Achtergrond: subtiele papier-textuur via CSS (noise grain overlay, 3% opacity)
    background-image: url('/textures/paper-grain.png');
    background-blend-mode: multiply;
    opacity: 0.03;
  Cards: GEEN box-shadow. In plaats daarvan:
    → Zachte border (2px solid rgba(139,109,82,0.08))
    → Of inset achtergrondkleur-verschil
  Actieve kaart: zachte glow via box-shadow met accent-warm op 15% opacity
  Progress bars: afgeronde segmenten, niet één vlakke balk
    → Denk aan een rij gekleurde kralen op een draad

Touch & Interactie:
  --button-min-height: 56px
  --button-min-width:  56px
  --tap-area:          min 48px (WCAG)
  Knoppen: slight scale(1.05) + ease-out bounce op press
  Afgeronde taken: confetti-burst (canvas-confetti lib, niet CSS)
  Token verdienen: fysiek voelbaar — navigator.vibrate([50]) + 
    ster-animatie die langs een gebogen pad naar de spaarbalk vliegt
    (Framer Motion, path animation)
  Transities: zachte page-transitions (slide/fade, 300ms ease)
  GEEN knippering, GEEN shake, GEEN snelle flashes

Navigatie:
  Bottom tab bar, 4 tabs max:
    🏠 Mijn Dag  |  📚 Oefenen  |  ⭐ Tokens  |  😊 Hoe gaat het?
  Tabs: custom SVG-iconen (handgetekende lijnstijl, 3px stroke), 
    NIET Lucide/Heroicons/FontAwesome
  Actieve tab: icoon vult zich met accent-warm, label wordt bold
  Geen hamburger-menu. Geen drawer. Geen header met terug-knop.
  → Altijd direct zichtbaar waar je kunt tikken

Illustraties:
  Gebruik een consistent illustratie-systeem:
  → Simpele spot-illustraties bij lege staten ("Nog geen taken vandaag!" + tekening)
  → Handgetekende lijn-iconen voor activiteiten
  → Optioneel: kleine mascotte/karakter dat meeloopt door de app
     (bv. een vriendelijk diertje dat reageert op tokens/emoties)
  Bronnen: undraw.co of eigen SVG's in dezelfde stijl
```

### Volwassen-thema (Ouder & Hulpverlener) — "Warm Professioneel"

**Esthetische richting:** Linear.app meets Notion meets Scandinavisch kantoor. Strak maar warm, niet koud/corporate. Denk aan een goed ontworpen medisch dossier-systeem dat je vertrouwen geeft, niet stress.

```
Kleurenpalet:
  --bg-primary:       #FAF8F5   (warm off-white, papierachtig)
  --bg-card:          #FFFFFF
  --bg-sidebar:       #2C2620   (warm donkerbruin, NIET koud slate/navy)
  --bg-sidebar-hover: #3D352D
  --accent-primary:   #C17A3A   (warm amber/cognac — betrouwbaar, niet koud blauw)
  --accent-secondary: #7BAFA3   (dezelfde teal als kind-thema — visuele link)
  --accent-success:   #5B8C5A   (bosgroen)
  --accent-warning:   #D4973B   (donkerder amber)
  --accent-danger:    #C45D4C   (gedempte terra-rood, niet alarmerend)
  --text-primary:     #2C2620   (warm near-black)
  --text-secondary:   #7A6F63   (warm middengrijs)
  --border:           #E8E0D6   (warme border, niet koud grijs)

Typografie:
  --font-display:     'DM Sans', sans-serif
    → Modern, geometrisch maar warm — NIET Inter/Roboto
    → Gewicht 600 voor headings
  --font-body:        'DM Sans', sans-serif
    → Gewicht 400 body, 500 emphasis
  --font-mono:        'JetBrains Mono', monospace
    → Voor technische data, audit-logs
  --font-size-body:   15px (iets groter dan standaard, betere leesbaarheid)
  --font-size-heading: 22px
  --line-height:      1.55

Vormentaal:
  --radius-card:      12px     (zachter dan 8px, strakker dan 20px)
  --radius-button:    8px      (subtiel afgerond)
  --radius-input:     8px
  Cards: dunne border (1px solid var(--border)), GEEN shadow
  Tabellen: geen zebra-striping, wél hover-highlight (bg warmte)
  Actieve navigatie: linker accent-bar (3px breed, accent-primary)

Layout:
  Desktop: sidebar (240px) + main content
  Tablet: collapsible sidebar
  Mobiel: bottom tabs (dezelfde 4 tabs als kind, plus ⚙️ instellingen)
  
  Dashboard: GEEN kaart-grid met identieke blokken.
  In plaats daarvan:
  → Asymmetrisch layout met visuele hiërarchie
  → Belangrijkste info groot bovenaan (vandaag-overzicht)
  → Secundaire info compacter eronder
  → Grafieken: Recharts met custom kleuren (warm palette), 
    afgeronde lijn-grafieken, GEEN standaard blauwe balken

Communicatieportaal:
  → Chat-achtige layout (niet forum-stijl)
  → Berichten met subtiele tijdlijn-lijn links
  → Hulpverlener-avatar met rol-badge (kleur per type: logo=teal, kine=amber, school=groen)
  → Bestanden als inline-preview cards, niet als losse links

Dossier:
  → Tab-navigatie bovenaan (niet sidebar)
  → Timeline-view als standaard (verticale tijdlijn, nieuwste bovenaan)
  → Verslagen openklappen in-place (accordion), niet navigeren naar aparte pagina
  → Print-optimized CSS voor PDF-export (@media print)
```

### Gedeelde design-elementen (beide thema's)

```
Gedeeld kleur-DNA:
  Beide thema's delen dezelfde teal (#7BAFA3) en groen (#5B8C5A)
  → Visuele coherentie als ouder en kind naast elkaar de app gebruiken
  → Token-goud (#F2C94C) is overal hetzelfde

Loading states:
  Kind: bouncing dots animatie (3 cirkels, accent kleuren)
  Volwassene: subtiele pulse op content-placeholder (skeleton)
  NOOIT een spinner. NOOIT "Loading...".

Lege staten:
  Kind: illustratie + korte tekst ("Geen oefeningen meer! 🎉 Ga lekker spelen")
  Volwassene: informatieve tekst + CTA ("Nog geen verslagen. Nodig een hulpverlener uit →")

Notificaties/toasts:
  Kind: groot, midden-scherm, met icoon, auto-dismiss na 3s
  Volwassene: rechtsonder, compact, stapelbaar

Fonts laden:
  Google Fonts met display=swap, preconnect in <head>
  Fallback stack: 
    Kind:     'Baloo 2', 'Quicksand', 'Nunito', system-ui
    Volwassen: 'DM Sans', 'Outfit', system-ui
```

### Technische implementatie

```tsx
// theme-provider.tsx
import { createContext, useContext } from 'react';

type Theme = 'child' | 'adult';

// Automatisch op basis van rol
const theme: Theme = user.role === 'child' ? 'child' : 'adult';
document.documentElement.setAttribute('data-theme', theme);

// Tailwind config — extend met CSS variabelen
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        surface: 'var(--bg-primary)',
        card: 'var(--bg-card)',
        accent: {
          DEFAULT: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          success: 'var(--accent-success)',
          token: 'var(--accent-sunshine, var(--accent-warning))',
        },
        ink: {
          DEFAULT: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },
      borderRadius: {
        card: 'var(--radius-card, var(--radius-soft))',
        pill: '999px',
      },
    },
  },
};
```

```css
/* theme-child.css */
[data-theme="child"] {
  --bg-primary: #FDF6EC;
  --bg-card: #FFF9F0;
  --accent-primary: #E8734A;
  --accent-secondary: #7BAFA3;
  --accent-sunshine: #F2C94C;
  --accent-success: #5B8C5A;
  --text-primary: #3D3229;
  --text-secondary: #8C7B6B;
  --font-display: 'Baloo 2', cursive;
  --font-body: 'Quicksand', sans-serif;
  --font-size-body: 20px;
  --radius-soft: 20px;
  --radius-card: 18px 22px 20px 24px; /* organisch */
}

/* theme-adult.css */
[data-theme="adult"] {
  --bg-primary: #FAF8F5;
  --bg-card: #FFFFFF;
  --accent-primary: #C17A3A;
  --accent-secondary: #7BAFA3;
  --accent-success: #5B8C5A;
  --accent-warning: #D4973B;
  --text-primary: #2C2620;
  --text-secondary: #7A6F63;
  --font-display: 'DM Sans', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-size-body: 15px;
  --radius-card: 12px;
}

/* Papier-textuur overlay (beide thema's) */
[data-theme]::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url('/textures/paper-grain.svg');
  opacity: 0.025;
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: multiply;
}
```

### Claude Code Design-instructie

**Voeg dit toe aan CLAUDE.md zodat Claude Code het design respecteert:**

```markdown
## Design Regels — STRIKT

Dit project heeft een bewust ontworpen visuele identiteit. 
Volg deze regels bij ELKE component:

### NOOIT gebruiken:
- Inter, Roboto, Arial, system-ui als font
- Tailwind standaard blauw (#3B82F6) of paars
- Generieke shadcn/ui styling zonder aanpassing
- box-shadow-sm/md/lg op cards (gebruik borders of kleurverschil)
- Identieke border-radius op alles
- Gradient text
- Koude grijstinten (slate, gray) — altijd warme tinten
- Hamburger-menu in kind-modus
- "Loading..." tekst of spinners
- Rood voor fouten in kind-modus

### ALTIJD doen:
- CSS variabelen uit het thema-systeem gebruiken (nooit hardcoded kleuren)
- Kind-modus: Baloo 2 (headings) + Quicksand (body)
- Volwassen-modus: DM Sans
- Touch targets minimaal 48px
- Warme kleuren, organische vormen in kind-thema
- Pill-shaped knoppen in kind-thema
- Subtiele papier-textuur overlay
- Lege staten met illustratie, niet alleen tekst
- Testen op 375px breed (iPhone SE) én 1024px (tablet)

### Referentie-apps (voor sfeer, niet om te kopiëren):
- Kind: Ferm Living webshop, Headspace app, Duolingo (maar subtieler)
- Volwassene: Linear.app, Notion, Amie (calendar app)
```

---

## 9. Beveiliging

### 8.1 Authenticatie & Sessies

| Maatregel | Implementatie |
|---|---|
| **Wachtwoord-hashing** | Argon2id (geheugen-hard, beter dan bcrypt tegen GPU-aanvallen) via `argon2` npm package |
| **PIN-hashing (kind)** | Zelfde Argon2id — PIN is kort maar brute-force wordt geblokkeerd door rate limiting |
| **JWT tokens** | Access token (15 min, in geheugen) + Refresh token (7 dagen, httpOnly secure cookie) |
| **TOTP 2FA** | Optioneel voor ouders/hulpverleners via `otplib`, QR-code setup |
| **Brute-force bescherming** | Rate limiting per IP: 5 mislukte logins → 15 min lockout. Via `@fastify/rate-limit` |
| **Sessie-invalidatie** | Ouder kan alle hulpverlener-sessies in één klik beëindigen |
| **Invite-tokens** | Eenmalig gebruik, SHA-256 gehashed opgeslagen, vervallen na 72h |

### 8.2 Input Validatie & Injection Preventie

| Aanvalsvector | Maatregel |
|---|---|
| **SQL injection** | Prisma ORM — parameterized queries by default, geen raw SQL tenzij via `$queryRawUnsafe` (verboden in codebase) |
| **XSS (Cross-Site Scripting)** | React escapet standaard alle output. Geen `dangerouslySetInnerHTML` tenzij via DOMPurify. CSP headers (zie onder) |
| **CSRF** | SameSite=Strict op cookies + CSRF token via `@fastify/csrf-protection` |
| **NoSQL injection** | N.v.t. (PostgreSQL, niet MongoDB) |
| **Command injection** | Geen `exec()`/`spawn()` met user input. Bestandsnamen worden gesanitized via `sanitize-filename` |
| **Path traversal** | MinIO SDK handelt pad-validatie af. Upload-bestanden krijgen UUID-naam, nooit user-input als pad |
| **Prototype pollution** | Fastify's standaard JSON parser is veilig. Extra: `Object.freeze` op configuratie-objecten |

### 8.3 Bestandsbeveiliging

| Maatregel | Implementatie |
|---|---|
| **Upload-validatie** | Whitelist mimetypes (PDF, DOCX, PNG, JPG, HEIC). Magic bytes check via `file-type` package, niet alleen extensie |
| **Bestandsgrootte** | Max 25MB per bestand, configureerbaar |
| **Virus scan** | ClamAV container scant elke upload voor opslag in MinIO |
| **Opslag** | MinIO met server-side encryption (SSE-S3). Bestanden niet direct bereikbaar — altijd via API met auth-check |
| **Download** | Pre-signed URL's met korte TTL (5 min), gebonden aan user-sessie |
| **Metadata strip** | EXIF-data strippen uit afbeeldingen via `sharp` (voorkomt locatie-lekken) |

```yaml
# Toevoegen aan docker-compose.yml
  clamav:
    image: clamav/clamav:stable
    restart: unless-stopped
    volumes:
      - clamdata:/var/lib/clamav
```

### 8.4 HTTP Security Headers

```nginx
# nginx.conf
add_header Content-Security-Policy
  "default-src 'self';
   script-src 'self';
   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
   font-src 'self' https://fonts.gstatic.com;
   img-src 'self' blob: data:;
   connect-src 'self' https://api.anthropic.com;
   frame-ancestors 'none';
   base-uri 'self';
   form-action 'self';"
  always;

add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "0" always;  # Verouderd, CSP vervangt dit
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(self), geolocation=()" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

### 8.5 Database-beveiliging

| Maatregel | Implementatie |
|---|---|
| **Versleuteling at rest** | pgcrypto voor dossier-velden (diagnoses, medicatie). Symmetrische AES-256 met key in env-variabele, niet in DB |
| **Versleuteling in transit** | PostgreSQL `sslmode=require` (zelfs intern in Docker netwerk) |
| **Least privilege** | Aparte DB-users: `app_read` (kind-queries), `app_write` (backend), `app_admin` (migraties) |
| **Row Level Security** | PostgreSQL RLS policies: hulpverlener kan alleen rijen zien waar `CaregiverAccess` bestaat |
| **Backup-encryptie** | pg_dump output door `gpg --encrypt` voor opslag op NAS |

### 8.6 API-beveiliging

| Maatregel | Implementatie |
|---|---|
| **Rate limiting** | Globaal: 100 req/min per IP. Auth-endpoints: 5/min. AI-endpoints: 10/min per user |
| **Request size** | Max 10MB body (bestanden gaan via multipart naar MinIO) |
| **CORS** | Strict origin whitelist: alleen `https://julie.scheepers.one` |
| **API versioning** | `/api/v1/...` — breaking changes in nieuwe versie |
| **Audit logging** | Elke schrijf-actie gelogd: wie, wat, wanneer, IP. Aparte `audit_log` tabel, append-only |
| **Helmet** | `@fastify/helmet` voor standaard security headers op API-responses |

### 8.7 Docker & Infra-hardening

```yaml
# Per container in docker-compose.yml
    security_opt:
      - no-new-privileges:true
    read_only: true           # Waar mogelijk
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    # Alleen de capabilities die nodig zijn
    # Geen container draait als root behalve DB init
```

| Maatregel | Implementatie |
|---|---|
| **Netwerk-isolatie** | Interne Docker bridge: alleen backend praat met DB/Redis/MinIO. Frontend-container heeft geen DB-toegang |
| **Secrets** | Docker secrets of `.env` met `chmod 600`, nooit in git |
| **Image-updates** | Dependabot of Renovate voor base images + npm dependencies |
| **Logging** | Geen PII in logs. Structured logging via `pino` (Fastify default). Optioneel naar ELK |
| **Health checks** | Alle containers met health check, auto-restart bij falen |

### 8.8 Dependency Management

| Maatregel | Implementatie |
|---|---|
| **Lock files** | `package-lock.json` altijd in git, `npm ci` in Docker builds |
| **Audit** | `npm audit` in CI/build pipeline. Blokkeer build bij critical vulnerabilities |
| **Minimal dependencies** | Bewust klein houden. Elke dependency = aanvalsoppervlak |
| **Subresource Integrity** | SRI hashes op externe CDN-scripts (fonts) |

---

## 10. Aandachtspunten

**Toegankelijkheid:**
- Grote fonts (min 18px body), hoog contrast
- Pictogrammen naast alle tekst
- Optioneel: OpenDyslexic font toggle
- TTS voor alle instructies (Web Speech API of pre-recorded)
- Simpele taal, korte zinnen (B1-niveau of lager)

**Barkley-compliance checklist:**
- ✅ Externaliseer informatie (alles visueel, niets uit het hoofd)
- ✅ Externaliseer motivatie (directe beloning, zichtbaar)
- ✅ Externaliseer tijd (tijdbalken, geen klokken)
- ✅ Maak het punt van uitvoering het punt van beloning
- ✅ Geen straffen, alleen positieve bekrachtiging
- ✅ Korte intervallen, frequente feedback
- ✅ Vermijd werkgeheugenbelasting (één ding tegelijk)

**Privacy & Gegevensbescherming:**
- Alles self-hosted, geen data naar derden behalve Claude API (optioneel)
- Claude API calls bevatten nooit persoonlijke info — alleen vakinhoud + niveau
- Hulpverlenersdata: dossier bevat medische gegevens → versleuteling at rest (MinIO encryption + PostgreSQL pgcrypto)
- Ouder heeft volledige controle: kan hulpverlener-toegang per module intrekken
- Bestanden worden versleuteld opgeslagen in MinIO
- Data-export: ouder kan altijd volledige export aanvragen (GDPR-recht, ook al is het privégebruik)
- Audit-log: wie heeft wanneer wat bekeken/gewijzigd in het dossier

---

## 11. Deployment — Eén Commando

### Docker Compose (productie)

Alles draait in Docker zodat het op elke Linux-machine werkt — Proxmox LXC, VPS, whatever.

```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    restart: unless-stopped
    ports:
      - "3080:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://julie:${DB_PASS}@db:5432/julieapp
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - HA_URL=${HA_URL}
      - HA_TOKEN=${HA_TOKEN}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
      - VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
      - GITHUB_REPO=bjornscheepers/julieapp
      - APP_DIR=/opt/julieapp
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro  # Voor in-app upgrade
      - /opt/julieapp:/opt/julieapp:ro                # Git repo toegang
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_USER=julie
      - POSTGRES_PASSWORD=${DB_PASS}
      - POSTGRES_DB=julieapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U julie"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redisdata:/data

  clamav:
    image: clamav/clamav:stable
    restart: unless-stopped
    volumes:
      - clamdata:/var/lib/clamav

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_USER}
      - MINIO_ROOT_PASSWORD=${MINIO_PASS}
    volumes:
      - miniodata:/data
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
  clamdata:
  miniodata:
```

### install.sh — Volledig zelfstandig

Eén commando op een verse Ubuntu (22.04/24.04):
```
curl -fsSL https://raw.githubusercontent.com/bjornscheepers/julieapp/main/install.sh | sudo bash
```

Of handmatig:
```
wget https://raw.githubusercontent.com/bjornscheepers/julieapp/main/install.sh
chmod +x install.sh
sudo ./install.sh
```

```bash
#!/usr/bin/env bash
#
# JulieApp Installer
# Ondersteunt: Ubuntu 22.04, 24.04 (amd64/arm64)
# Installeert alle dependencies, configureert en start de applicatie.
#
set -euo pipefail

# ── Configuratie ──────────────────────────────────────────────
APP_NAME="julieapp"
APP_DIR="${INSTALL_DIR:-/opt/$APP_NAME}"
REPO_URL="https://github.com/bjornscheepers/julieapp.git"
BRANCH="${BRANCH:-main}"
ENV_FILE="$APP_DIR/.env"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/$APP_NAME}"
LOG_FILE="/var/log/${APP_NAME}-install.log"
MIN_DOCKER_VERSION="24.0"
REQUIRED_PORTS=(3080)

# ── Kleuren ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'

log()  { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${GREEN}  ✅ $*${NC}" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}  ⚠️  $*${NC}" | tee -a "$LOG_FILE"; }
err()  { echo -e "${RED}  ❌ $*${NC}" | tee -a "$LOG_FILE"; exit 1; }

# ── Pre-flight checks ────────────────────────────────────────
preflight() {
  log "Pre-flight checks..."

  # Root check
  [[ $EUID -eq 0 ]] || err "Voer dit script uit als root (sudo ./install.sh)"

  # OS check
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    [[ "$ID" == "ubuntu" ]] || warn "Niet-Ubuntu gedetecteerd ($ID). Kan werken maar niet getest."
    log "OS: $PRETTY_NAME ($(uname -m))"
  fi

  # Disk space (minimaal 5GB vrij)
  local free_gb
  free_gb=$(df -BG --output=avail "$( dirname "$APP_DIR" )" | tail -1 | tr -d ' G')
  [[ "$free_gb" -ge 5 ]] || err "Onvoldoende schijfruimte: ${free_gb}GB vrij, minimaal 5GB nodig."
  ok "Schijfruimte: ${free_gb}GB vrij"

  # RAM check (minimaal 2GB)
  local total_ram_mb
  total_ram_mb=$(awk '/MemTotal/ {printf "%d", $2/1024}' /proc/meminfo)
  [[ "$total_ram_mb" -ge 1800 ]] || warn "Weinig RAM: ${total_ram_mb}MB. Aanbevolen: 2GB+."
  ok "RAM: ${total_ram_mb}MB"

  # Poort-check
  for port in "${REQUIRED_PORTS[@]}"; do
    if ss -tlnp | grep -q ":${port} "; then
      warn "Poort $port is al in gebruik. Pas APP_PORT aan in .env na installatie."
    fi
  done
}

# ── Dependencies installeren ─────────────────────────────────
install_dependencies() {
  log "Systeem-dependencies installeren..."

  # Update pakketlijst
  apt-get update -qq

  # Basistools
  apt-get install -y -qq \
    ca-certificates curl gnupg lsb-release git openssl \
    jq unzip apt-transport-https software-properties-common \
    > /dev/null 2>&1
  ok "Basistools geïnstalleerd"

  # Docker installeren als niet aanwezig of te oud
  if command -v docker &>/dev/null; then
    local docker_ver
    docker_ver=$(docker version --format '{{.Server.Version}}' 2>/dev/null || echo "0.0")
    if [[ "$(printf '%s\n' "$MIN_DOCKER_VERSION" "$docker_ver" | sort -V | head -n1)" == "$MIN_DOCKER_VERSION" ]]; then
      ok "Docker $docker_ver al geïnstalleerd"
    else
      warn "Docker $docker_ver te oud (min $MIN_DOCKER_VERSION). Wordt geüpdatet..."
      install_docker
    fi
  else
    install_docker
  fi

  # Docker Compose plugin check
  if ! docker compose version &>/dev/null; then
    log "Docker Compose plugin installeren..."
    apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1
  fi
  ok "Docker Compose $(docker compose version --short)"

  # Docker starten en enablen
  systemctl enable --now docker > /dev/null 2>&1
  ok "Docker service actief"
}

install_docker() {
  log "Docker Engine installeren..."

  # Docker GPG key
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg

  # Docker repo toevoegen
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin > /dev/null 2>&1
  ok "Docker $(docker version --format '{{.Server.Version}}') geïnstalleerd"
}

# ── Applicatie installeren ───────────────────────────────────
install_app() {
  log "JulieApp installeren..."

  # Repo klonen of updaten
  if [[ -d "$APP_DIR/.git" ]]; then
    log "Bestaande installatie gevonden, updating..."
    cd "$APP_DIR"
    git fetch origin "$BRANCH" --quiet
    git reset --hard "origin/$BRANCH" --quiet
    ok "Repository geüpdatet"
  else
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR" --quiet
    cd "$APP_DIR"
    ok "Repository gekloond naar $APP_DIR"
  fi

  # Versie opslaan
  git rev-parse --short HEAD > "$APP_DIR/.version"
  log "Versie: $(cat "$APP_DIR/.version") ($(git log -1 --format='%ci' --date=short))"
}

# ── Omgeving configureren ────────────────────────────────────
configure_env() {
  if [[ -f "$ENV_FILE" ]]; then
    ok ".env bestaat al — wordt niet overschreven"
    return
  fi

  log "Configuratie genereren..."

  # VAPID keys genereren (zonder npx — pure openssl)
  local vapid_private vapid_public
  vapid_private=$(openssl ecparam -genkey -name prime256v1 -noout 2>/dev/null | openssl ec 2>/dev/null | base64 -w0)
  vapid_public=$(echo "$vapid_private" | base64 -d | openssl ec -pubout 2>/dev/null | base64 -w0)

  cat > "$ENV_FILE" <<ENVEOF
# ┌─────────────────────────────────────────┐
# │  JulieApp Configuratie                  │
# │  Gegenereerd: $(date -Iseconds)         │
# └─────────────────────────────────────────┘

# Database
DB_PASS=$(openssl rand -hex 24)

# Auth
JWT_SECRET=$(openssl rand -hex 32)

# Web Push (VAPID)
VAPID_PUBLIC_KEY=${vapid_public}
VAPID_PRIVATE_KEY=${vapid_private}
VAPID_CONTACT=mailto:bjorn@scheepers.one

# MinIO (bestandsopslag)
MINIO_USER=julieapp
MINIO_PASS=$(openssl rand -hex 24)

# Home Assistant (optioneel)
HA_URL=
HA_TOKEN=

# Claude API (optioneel — voor oefening-generatie)
CLAUDE_API_KEY=

# App
APP_URL=https://julie.scheepers.one
APP_PORT=3080
NODE_ENV=production

# Upgrade
GITHUB_REPO=bjornscheepers/julieapp
ENVEOF

  chmod 600 "$ENV_FILE"
  ok "Configuratie gegenereerd in $ENV_FILE"
  warn "Bewerk $ENV_FILE voor optionele instellingen (HA, Claude API)"
}

# ── Backup-systeem instellen ─────────────────────────────────
setup_backup() {
  log "Backup-systeem configureren..."

  mkdir -p "$BACKUP_DIR"

  cat > /etc/cron.d/${APP_NAME}-backup <<CRON
# JulieApp dagelijkse backup — 03:00
0 3 * * * root $APP_DIR/scripts/backup.sh >> /var/log/${APP_NAME}-backup.log 2>&1
# Cleanup: bewaar 30 dagen
0 4 * * * root find $BACKUP_DIR -name "*.sql.gz.gpg" -mtime +30 -delete
CRON

  # Backup-script aanmaken (wordt later overschreven door repo-versie)
  mkdir -p "$APP_DIR/scripts"
  cat > "$APP_DIR/scripts/backup.sh" <<'BACKUP'
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../.env"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/julieapp}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker compose -f /opt/julieapp/docker-compose.yml exec -T db \
  pg_dump -U julie julieapp | gzip | \
  gpg --batch --yes --symmetric --passphrase "$JWT_SECRET" \
  > "$BACKUP_DIR/db-${TIMESTAMP}.sql.gz.gpg"
echo "[$(date -Iseconds)] Backup voltooid: db-${TIMESTAMP}.sql.gz.gpg"
BACKUP
  chmod +x "$APP_DIR/scripts/backup.sh"

  ok "Dagelijkse backup om 03:00 → $BACKUP_DIR (30 dagen retentie, GPG-versleuteld)"
}

# ── Upgrade-script installeren ───────────────────────────────
install_upgrade_script() {
  log "Upgrade-script installeren..."

  cat > "$APP_DIR/scripts/upgrade.sh" <<'UPGRADE'
#!/usr/bin/env bash
#
# JulieApp Upgrade Script
# Wordt aangeroepen door de app (admin-UI) of handmatig.
# Usage: ./upgrade.sh [--check | --apply | --rollback]
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/julieapp}"
cd "$APP_DIR"

LOCKFILE="/tmp/julieapp-upgrade.lock"
LOGFILE="/var/log/julieapp-upgrade.log"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOGFILE"; }

case "${1:-}" in

  --check)
    # Vergelijk lokale versie met GitHub
    LOCAL_SHA=$(git rev-parse HEAD)
    REMOTE_SHA=$(git ls-remote origin HEAD | cut -f1)
    LOCAL_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "untagged")
    REMOTE_TAGS=$(git ls-remote --tags origin | tail -5 | awk '{print $2}' | sed 's|refs/tags/||')

    if [[ "$LOCAL_SHA" == "$REMOTE_SHA" ]]; then
      echo '{"update_available": false, "current": "'"$LOCAL_TAG"'", "current_sha": "'"${LOCAL_SHA:0:8}"'"}'
    else
      # Haal changelog op
      CHANGELOG=$(git log --oneline "${LOCAL_SHA}..${REMOTE_SHA}" 2>/dev/null | head -20 || echo "Kon changelog niet ophalen")
      LATEST_TAG=$(echo "$REMOTE_TAGS" | tail -1)
      echo '{"update_available": true, "current": "'"$LOCAL_TAG"'", "current_sha": "'"${LOCAL_SHA:0:8}"'", "latest": "'"$LATEST_TAG"'", "latest_sha": "'"${REMOTE_SHA:0:8}"'", "changes": '"$(echo "$CHANGELOG" | jq -R -s 'split("\n") | map(select(. != ""))')"'}'
    fi
    ;;

  --apply)
    # Lock om dubbele upgrades te voorkomen
    exec 200>"$LOCKFILE"
    flock -n 200 || { log "FOUT: Upgrade al bezig."; exit 1; }

    log "=== Upgrade gestart ==="

    # 1. Backup vóór upgrade
    log "Pre-upgrade backup..."
    "$APP_DIR/scripts/backup.sh"

    # 2. Huidige versie opslaan voor rollback
    git rev-parse HEAD > "$APP_DIR/.version-before-upgrade"
    log "Rollback-punt: $(cat "$APP_DIR/.version-before-upgrade")"

    # 3. Pull nieuwe code
    log "Code ophalen..."
    git fetch origin main --quiet
    git reset --hard origin/main --quiet
    NEW_SHA=$(git rev-parse --short HEAD)
    log "Nieuwe versie: $NEW_SHA"

    # 4. Rebuild containers
    log "Containers rebuilden..."
    docker compose build --quiet

    # 5. Database migratie
    log "Database migraties..."
    docker compose run --rm backend npx prisma migrate deploy 2>&1 | tee -a "$LOGFILE"

    # 6. Rolling restart (minimale downtime)
    log "Containers herstarten..."
    docker compose up -d --remove-orphans

    # 7. Health check
    log "Health check..."
    sleep 5
    for i in {1..12}; do
      if curl -sf http://localhost:3080/api/health > /dev/null 2>&1; then
        log "=== Upgrade succesvol naar $NEW_SHA ==="
        echo "$NEW_SHA" > "$APP_DIR/.version"

        # Schrijf resultaat voor de app
        echo '{"success": true, "version": "'"$NEW_SHA"'", "timestamp": "'"$(date -Iseconds)"'"}' \
          > "$APP_DIR/.upgrade-result"
        exit 0
      fi
      sleep 5
    done

    # Health check mislukt → rollback
    log "FOUT: Health check mislukt na 60s. Automatische rollback..."
    "$0" --rollback
    echo '{"success": false, "error": "Health check failed, rolled back", "timestamp": "'"$(date -Iseconds)"'"}' \
      > "$APP_DIR/.upgrade-result"
    exit 1
    ;;

  --rollback)
    log "=== Rollback gestart ==="
    ROLLBACK_SHA=$(cat "$APP_DIR/.version-before-upgrade" 2>/dev/null || echo "")
    if [[ -z "$ROLLBACK_SHA" ]]; then
      log "FOUT: Geen rollback-punt gevonden."
      exit 1
    fi

    log "Terugkeren naar $ROLLBACK_SHA..."
    git reset --hard "$ROLLBACK_SHA" --quiet
    docker compose build --quiet
    docker compose up -d --remove-orphans
    log "=== Rollback voltooid naar ${ROLLBACK_SHA:0:8} ==="
    ;;

  *)
    echo "Usage: $0 [--check | --apply | --rollback]"
    echo "  --check     Controleer of er een update beschikbaar is (JSON output)"
    echo "  --apply     Download en installeer update (met auto-rollback bij falen)"
    echo "  --rollback  Ga terug naar de vorige versie"
    exit 1
    ;;
esac
UPGRADE
  chmod +x "$APP_DIR/scripts/upgrade.sh"

  ok "Upgrade-script geïnstalleerd ($APP_DIR/scripts/upgrade.sh)"
}

# ── Bouwen & starten ─────────────────────────────────────────
build_and_start() {
  log "Applicatie bouwen..."
  cd "$APP_DIR"

  docker compose build --quiet
  ok "Containers gebouwd"

  log "Database migreren..."
  docker compose run --rm backend npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"
  ok "Database gemigreerd"

  log "Starten..."
  docker compose up -d --remove-orphans
  ok "Alle containers gestart"

  # Wacht op gezonde status
  log "Wachten op health check..."
  for i in {1..12}; do
    if curl -sf http://localhost:3080/api/health > /dev/null 2>&1; then
      ok "Applicatie is gezond"
      return
    fi
    sleep 5
  done
  warn "Health check niet bevestigd na 60s — controleer logs met: docker compose logs"
}

# ── Samenvatting ─────────────────────────────────────────────
print_summary() {
  local version
  version=$(cat "$APP_DIR/.version" 2>/dev/null || echo "unknown")

  echo ""
  echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✅ JulieApp is geïnstalleerd!                ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  Versie:        ${BLUE}${version}${NC}"
  echo -e "  Installatiemap: ${BLUE}${APP_DIR}${NC}"
  echo -e "  Frontend:      ${BLUE}http://localhost:3080${NC}"
  echo -e "  Configuratie:  ${BLUE}${ENV_FILE}${NC}"
  echo -e "  Logs:          ${BLUE}docker compose -f $APP_DIR/docker-compose.yml logs -f${NC}"
  echo -e "  Backup:        ${BLUE}Dagelijks 03:00 → $BACKUP_DIR${NC}"
  echo ""
  echo -e "  ${YELLOW}Volgende stappen:${NC}"
  echo -e "  1. Bewerk ${BLUE}$ENV_FILE${NC} (optioneel: HA_URL, CLAUDE_API_KEY)"
  echo -e "  2. Zet reverse proxy op (Nginx/Caddy/Cloudflare Tunnel) voor HTTPS"
  echo -e "  3. Open de app en maak een admin-account aan"
  echo -e "  4. Maak Julie's profiel aan met PIN"
  echo ""
  echo -e "  ${YELLOW}Handige commando's:${NC}"
  echo -e "  Upgrade check:  ${BLUE}$APP_DIR/scripts/upgrade.sh --check${NC}"
  echo -e "  Upgrade apply:  ${BLUE}$APP_DIR/scripts/upgrade.sh --apply${NC}"
  echo -e "  Rollback:       ${BLUE}$APP_DIR/scripts/upgrade.sh --rollback${NC}"
  echo -e "  Handmatige backup: ${BLUE}$APP_DIR/scripts/backup.sh${NC}"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║       JulieApp Installer v1.0                 ║${NC}"
  echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
  echo ""

  mkdir -p "$(dirname "$LOG_FILE")"
  log "Installatie gestart — log: $LOG_FILE"

  preflight
  install_dependencies
  install_app
  configure_env
  setup_backup
  install_upgrade_script
  build_and_start
  print_summary
}

main "$@"
```

### In-App Upgrade Systeem (Admin-UI)

De upgrade is volledig bedienbaar vanuit de app voor gebruikers met de `admin`-rol.

#### Backend API

```
GET  /api/admin/system/version       → Huidige versie + uptime
GET  /api/admin/system/update-check  → Roept upgrade.sh --check aan, returnt JSON
POST /api/admin/system/update-apply  → Start upgrade.sh --apply als background job
GET  /api/admin/system/update-status → Pollt .upgrade-result bestand voor resultaat
POST /api/admin/system/rollback      → Roept upgrade.sh --rollback aan
```

#### Flow vanuit de admin-UI

```
┌──────────────────────────────────────────────────────┐
│  ⚙️  Systeembeheer                                    │
│                                                       │
│  Huidige versie: v1.2.3 (abc1234)                    │
│  Status: ● Actief — uptime 14 dagen                  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  🔄 Update beschikbaar: v1.3.0                   │ │
│  │                                                   │ │
│  │  Wijzigingen:                                     │ │
│  │  • abc1234 Fix adaptieve moeilijkheid bug         │ │
│  │  • def5678 Nieuwe oefeningtype: klokmatch         │ │
│  │  • ghi9012 Performance verbetering dashboard      │ │
│  │                                                   │ │
│  │  [✅ Update installeren]  [❌ Later]               │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Bij klikken op "Update installeren":                │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  ⏳ Update bezig...                               │ │
│  │                                                   │ │
│  │  ✅ Pre-upgrade backup gemaakt                    │ │
│  │  ✅ Nieuwe code opgehaald                         │ │
│  │  ✅ Containers herbouwd                           │ │
│  │  ⏳ Database migratie...                           │ │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 60%        │ │
│  │                                                   │ │
│  │  ⚠️ Automatische rollback bij falen.              │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Na succesvolle update:                              │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  ✅ Update succesvol!                             │ │
│  │  Versie: v1.3.0 (ghi9012)                        │ │
│  │                                                   │ │
│  │  [🔄 Pagina herladen]  [⏪ Rollback naar v1.2.3] │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Laatste backup: vandaag 03:00                       │
│  [📦 Nu backup maken]  [📋 Backup-log bekijken]      │
└──────────────────────────────────────────────────────┘
```

#### Beveiligingsmaatregelen upgrade-systeem

| Maatregel | Implementatie |
|---|---|
| **Alleen admin-rol** | Middleware check: `user.role === 'admin'`, anders 403 |
| **Bevestigingsdialoog** | Frontend toont changelog + "Weet je het zeker?" voor apply |
| **Pre-upgrade backup** | Automatisch vóór elke upgrade |
| **Auto-rollback** | Health check faalt na 60s → automatisch terug naar vorige versie |
| **Lock-file** | Voorkomt dubbele gelijktijdige upgrades |
| **Audit-log** | Upgrade-acties worden gelogd: wie, wanneer, welke versie, resultaat |
| **Docker socket** | Read-only mount — backend kan containers herstarten maar niets anders |
| **Handmatige rollback** | Altijd mogelijk via UI of CLI |

#### Automatische update-check (optioneel)

```
// Backend cron job (via node-cron)
// Dagelijks om 06:00: check GitHub, stuur push naar admin als update beschikbaar
cron.schedule('0 6 * * *', async () => {
  const result = await execFile('./scripts/upgrade.sh', ['--check']);
  const { update_available, latest } = JSON.parse(result.stdout);
  if (update_available) {
    await sendPushToAdmins(`Update ${latest} beschikbaar voor JulieApp`);
  }
});
```

### Backup (cron)

```bash
# Geïnstalleerd door install.sh in /etc/cron.d/julieapp-backup
# Dagelijks 03:00, GPG-versleuteld, 30 dagen retentie
# Handmatig: /opt/julieapp/scripts/backup.sh
```

## 12. Claude Code Workflow

Aanbevolen aanpak met Claude Code:

1. Begin met Fase 1 — geef dit hele document als context
2. Per fase: maak een CLAUDE.md in de repo root met de huidige fase-instructies
3. Gebruik `claude --continue` om binnen een fase door te werken
4. Test elke fase op Julie's tablet voordat je verder gaat
5. Bewaar het oefeningen JSON-schema als contract — zo kun je later makkelijk content toevoegen

**Repo-structuur:**
```
julie-app/
├── CLAUDE.md              # Instructies voor Claude Code
├── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── components/    # Herbruikbare UI
│   │   ├── pages/         # Route-pagina's
│   │   ├── stores/        # Zustand stores
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utils, API client
│   ├── public/
│   │   ├── icons/         # Activiteit-iconen
│   │   └── sounds/        # Feedback-geluiden
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── routes/        # Fastify routes
│   │   ├── services/      # Business logic
│   │   └── plugins/       # Auth, HA-webhook, push
│   └── prisma/
│       └── schema.prisma
└── docs/
    └── exercise-schema.json
```
