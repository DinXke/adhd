# Changelog

Alle noemenswaardige wijzigingen aan GRIP worden hier gedocumenteerd.

## [v1.3.0] — 2026-04-10

### Nieuw
- **Afspraken & Kalender** — Terugkerende en eenmalige afspraken met 32 iconen, Google Calendar link, ICS-export en subscribable ICS-feed
- **Vakantieperiodes** — Stel vrije dagen en vakanties in met optioneel vakantieschema
- **TRMNL E-Paper Plugin** — Downloadbare ZIP met settings.yml + Liquid templates, beveiligd met API key
- **Gebruikersbeheer** — Admin kan accounts aanmaken, wachtwoorden/PINs resetten, gebruikers (de)activeren
- **Help & Handleidingen** — FAQ-pagina met 10 onderwerpen, changelog, versie-info
- **38 Avatars** — Dieren, fantasie, grappige avatars (kat, hond, alien, robot, piraat, ninja, etc.)
- **TTS Voorlezen** — Voorleesknop bij oefeningen (Web Speech API)
- **Wereldorientatie** — Nieuw vak met "Wist je dat?" feiten
- **Leeftijd-gebaseerde oefeningen** — AI past moeilijkheid aan op basis van leeftijd kind
- **Oefeningen beschikbaarheid** — Lege niveaus greyed out, badge met aantal
- **Token/voortgang reset** — Ouder kan tokens, oefeningen, emotie-logs per kind resetten
- **ICS Calendar Feed** — Abonneerbare URL voor Google Calendar / Apple Calendar
- **TRMNL voortgangsbalk** — Monochrome balk met doelmarkers

### Verbeterd
- **Instellingenpagina** — Herwerkt met per-kind overzicht + app-instellingen tabs
- **Schema-editor** — Auto-create schema, kind-selector, vakantie-panel
- **Afspraken in dagplanning** — Gesorteerd op tijd met speciale visuele stijl
- **Auth** — 401/403 race condition opgelost, token refresh robuuster

### Gefixt
- TRMNL ZIP download werkt nu correct in browsers (Buffer i.p.v. stream)
- Oefeningen review toont nu gegenereerde oefeningen correct
- GitHub verwijzingen naar dinxke/adhd

## [v1.2.0] — 2026-04-09

### Nieuw
- **Push notificaties** — VAPID Web Push voor berichten en emotie check-ins
- **PWA** — Installeerbaar als app, offline support, service worker
- **Dagelijkse ouder-tip** — Claude Haiku genereert tips op basis van gisteren
- **Geldmodule** — Virtueel spaarpotje met spaardoelen
- **Kookrecept-modus** — Stap-voor-stap recepten met timer
- **Accessibility** — Dyslexie-lettertype, grote tekst, hoog contrast toggles
- **PDF-export** — Print-optimized CSS voor rapporten

## [v1.1.0] — 2026-04-08

### Nieuw
- **Communicatieportaal** — Berichtenkanalen per thema met hulpverleners
- **Dossier** — Verslagen, IHP, medicatie-log, notities
- **Hulpverleners** — Uitnodigingssysteem met per-module toegangscontrole
- **Vaardigheden** — Zelfstandigheidschecklist per leeftijdscategorie
- **Sociale scripts** — AI-gegenereerde scenario-oefeningen
- **Oefeningen review** — Ouder keurt AI-oefeningen goed

## [v1.0.0] — 2026-04-07

### Eerste release
- Dagschema met visuele tijdlijn en "Nu Doen"-modus
- Takenbeheer met substappen
- Token-beloningssysteem (Barkley-methode)
- Schooloefeningen met adaptieve moeilijkheid
- Claude Haiku integratie voor oefening-generatie en hints
- Emotie check-in met ademhalingsoefening
- Kind-interface (PIN-login) en ouder-interface (email/wachtwoord)
- Multi-kind ondersteuning
- Home Assistant webhooks
- Docker Compose deployment

## [v1.5.0] — 2026-04-10

### Nieuw
- **12 Educatieve spelletjes** — 6 wiskunde + 6 taal, met drag & drop, animaties, geluiden
  - Wiskunde: Memory, Bubbels knallen, Sleep de som, Patronen, Pizza breuken, Rekenrace, Splitsboom
  - Taal: Woordpuzzel, Woordzoeker, Letter Memory, Zinnen bouwen, Spellingbij, Woorden sorteren, Woordcirkel
- **Geluidseffecten** — 16 Web Audio API sounds (correct, fout, win, flip, pop, streak, etc.) + mute knop
- **Thema-systeem** — 4 kind-thema's (Warme Speeltuin, Oceaan, Jungle, Ruimte) + 2 ouder-thema's (Licht, Donker)
- **Claude API kosten dashboard** — Realtime tracking per dag/maand/jaar in Systeembeheer
- **PWA landscape modus** — Draait mee met het apparaat
- **Dynamische viewport schaling** — Fonts en knoppen passen zich aan op elk schermformaat

### Verbeterd
- AZERTY (Belgisch) toetsenbord bij spellingbij
- Tekst contrast gefixt — geen witte tekst meer op lichte achtergronden
- Spelletjes passen op 1 scherm (fixed inset-0 viewport)
- Oefeningen sessie compacter (geen scroll nodig)
- "Nog een keer" genereert altijd volledig nieuwe opgaves
- Sidebar opgeruimd: 11 links, rest via Instellingen

### Gefixt
- TRMNL: correct JSON response op GET, parameters via URL query
- React Query cache: 30s staleTime, refetch on focus/mount
- Service worker: geen auto-reload meer bij updates
