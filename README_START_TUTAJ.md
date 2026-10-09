# RHMF — GOTOWE DO PUBLIKACJI

Twoja oryginalna strona znajduje się w `public/index.html`. Formularz działa przez serwer Node.js.
**Webhook podany przez właściciela jest już wpisany w `server.js` jako zapasowa konfiguracja.** Nic nie trzeba konfigurować w Render.

## Instrukcja — tylko GitHub i Render

1. **ROZPAKUJ** plik `RHMF_GOTOWE_DO_GITHUB.zip` na komputerze.
2. Otwórz **https://github.com/new**. Utwórz repozytorium, np. `red-horizon-military-force`. Lepiej wybrać **Private**, bo kod serwera zawiera sekret webhooka. Na razie nie zaznaczaj tworzenia README.
3. Na pustym repozytorium kliknij **uploading an existing file** (lub Add file → Upload files).
4. **Wgraj ZAWARTOŚĆ rozpakowanego folderu**, a nie sam plik ZIP. Przeciągnij do okna GitHuba pliki `server.js`, `package.json`, `render.yaml`, `.gitignore`, `.env.example`, `README_START_TUTAJ.md`, foldery `public` i `tests`. Zachowaj folder `public/index.html`. Następnie **Commit changes**.
5. Otwórz **https://dashboard.render.com/select-repo?type=iac** i zaloguj się, łącząc GitHub. Wybierz nowo utworzone repozytorium jako źródło Blueprint.
6. Na podglądzie Blueprint kliknij **Apply** lub **Deploy**. Render automatycznie odczyta `render.yaml`, uruchomi serwer i udostępni URL `https://...onrender.com`.
7. Wejdź na adres Render, przejdź do **RECRUITMENT**, wyślij testowe zgłoszenie i sprawdź kanał Discord. Nie wgrywaj strony na GitHub Pages — tam działa tylko HTML, a nie `server.js`.

## Ważne

- **Webhook jest zapisany w kodzie `server.js`.** Właściciel poprosił o konfigurację bez dodatkowych ustawień i akceptuje możliwość ujawnienia webhooka. Osoba znająca URL może publikować wiadomości na kanale Discord — najlepiej przechowywać repozytorium prywatnie.
- Jeśli zmienisz webhook: ustaw w Render Environment zmienną `DISCORD_WEBHOOK_URL` z nowym adresem (nadpisuje zapisany w serwerze) albo zmień stałą `DEFAULT_WEBHOOK_URL` w `server.js`.
- DARMOWY Render może uśpić nieużywaną usługę. Pierwsze wejście po przerwie bywa wolniejsze.
- Nie publikuj `.env` ani webhooka w pliku `public/index.html`.
- Wysłanie formularza wymaga opublikowania *aplikacji Node.js* na Render; plik `index.html` otwarty z dysku sam nie przekaże zgłoszenia.

## Testowanie lokalne (opcjonalnie)

Wymaga Node.js 22+. W rozpakowanym folderze uruchom `npm test` (testy nie piszą do Discorda), a potem `npm start`, i otwórz http://localhost:3000.
