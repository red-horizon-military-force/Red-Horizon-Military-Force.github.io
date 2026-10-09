# Red Horizon Military Force — serwis rekrutacyjny

Gotowy projekt Node.js bez dodatkowych zależności NPM. Użyj `README_START_TUTAJ.md`.

- Strona: `public/index.html`
- Serwer: `server.js`
- Formularz: `POST /api/apply`
- Deploy Render Blueprint: `render.yaml`
- Testy: `npm test`
- Link Discord: https://discord.gg/nuJADnwtdk

Serwer formatuje zgłoszenia jako embed Discorda, waliduje dane i potwierdza sukces tylko po prawidłowej odpowiedzi webhooka. Proste zabezpieczenia: pole honeypot, limit prób na IP, sprawdzenie pochodzenia żądania, brak publicznego endpointu ujawniającego webhook. Przy dużym ruchu warto wdrożyć Turnstile i limity na warstwie hostingu.

**Uwaga:** Na wyraźne życzenie właściciela projekt zawiera adres webhooka w serwerowym pliku `server.js`. Z tego powodu zalecane jest prywatne repozytorium; nie ma gwarancji bezpieczeństwa sekretu po jego ujawnieniu. Alternatywnie możesz usunąć stałą i używać tylko zmiennej środowiskowej `DISCORD_WEBHOOK_URL`.
