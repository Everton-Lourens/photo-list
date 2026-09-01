# Sessão 2026-08-27 — identidade do dispositivo

## O que foi alterado
- Adicionada dependência `expo-application` 7.0.8 compatível com Expo SDK 54.
- Criado vínculo determinístico entre identificador nativo e 1 de 30 frutas fictícias.
- O Android usa `Application.getAndroidId()` como fonte principal.
- A identidade é injetada no WebView antes do carregamento do conteúdo.
- Mensagens `sendMessage` do Telegram passam a incluir `Dispositivo: <fruta> • <sufixo do ID>`.
- O caption do ZIP também inclui a identidade do dispositivo.
- `site-bundle.js` foi regenerado.

## Conhecimento consolidado
O site estático não precisa conhecer o identificador nativo diretamente; recebe apenas a identidade preparada pelo `App.js`. O sufixo curto do ID é mantido para eliminar ambiguidade quando duas instalações receberem a mesma fruta.

## Validação
- `assets/site/app.js` passou em `node --check`.
- `npm run bundle:site` concluiu e regenerou `site-bundle.js`.
- Build/instalação real do APK ainda não foi executado nesta sessão.
