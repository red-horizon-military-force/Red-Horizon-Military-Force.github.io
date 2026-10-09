# Red Horizon Military Force — rekrutacja wysyłana do Discorda

W folderze `public/index.html` znajduje się kompletna strona, razem ze wszystkimi sekcjami,
stylem, linkiem do Discorda, formularzem oraz etykietą **SUPERVISOR** zamiast
**NON-COMMISSIONED**. Plik `server.js` to niewielki serwer odbierający formularz
pod `/api/apply` i wysyłający go do webhooka Discord. Żadne zależności NPM nie są potrzebne.

## Jak uruchomić

1. W Discordzie wejdź w **Ustawienia serwera → Integracje → Webhooki** i
   **wygeneruj nowy adres webhooka** (stary został udostępniony w rozmowie;
   traktuj go jako ujawniony).
2. Skopiuj `.env.example` do nowego pliku `.env` w głównym folderze projektu.
3. W `.env` uzupełnij wartość `DISCORD_WEBHOOK_URL=` nowym pełnym URL-em.
   **Nie wysyłaj tego pliku nikomu i nie umieszczaj go na publicznym hostingu plików.**
4. Zainstaluj **Node.js 22 lub nowszy**.
5. W terminalu otwartym w głównym folderze projektu uruchom `npm start`.
6. Otwórz **http://localhost:3000**. Wypełnij formularz rekrutacyjny i kliknij
   **SEND APPLICATION TO DISCORD**.

## Publikacja w internecie

- Ta wersja wymaga **hostingu z obsługą Node.js**, nie wystarczy samo wrzucenie HTML
  na GitHub Pages czy do zwykłego hostingu statycznego.
- Ustaw zmienną środowiskową `DISCORD_WEBHOOK_URL` w konfiguracji hostingu.
- Udostępniaj stronę przez HTTPS. Nie publikuj `.env` i nie dodawaj webhooka do JavaScriptu w HTML.
- Endpoint ma podstawową walidację danych, ochronę przed wysyłką z obcej domeny,
  pole antybotowe i limit 8 prób na adres IP w ciągu 10 minut. Przy dużym ruchu
  warto dodać CAPTCHA/Turnstile i limity na poziomie hostingu.

## Jak działa

- Formularz przesyła imię Roblox, Discord handle, regiment, doświadczenie,
  dostępność i motywację do serwera przez `/api/apply`.
- Serwer przekazuje zgłoszenie jako czytelną wiadomość **Discord Embed**.
- Formularz potwierdza sukces wyłącznie po pozytywnej odpowiedzi Discorda.
- W przypadku błędu pokazuje brak potwierdzenia i umożliwia skopiowanie/zapisanie treści.
- Link zaproszenia do serwera Discord jest publiczny: `https://discord.gg/nuJADnwtdk`.

## Testy

Uruchom `npm test`. Testy używają lokalnej atrapy wysyłki i **nie wysyłają wiadomości do Twojego Discorda**.
