# Sessão 2026-08-26 — entrada direta com token do Telegram

## O que foi alterado
- Removido do site o fluxo que redirecionava para WhatsApp quando não havia token.
- O token do bot passou a ser definido diretamente em `assets/site/app.js`.
- Removidos os mecanismos de bootstrap do token por query string e `localStorage` desse fluxo.
- `site-bundle.js` foi regenerado para incorporar a alteração no APK.

## Validação
- `node --check assets/site/app.js` passou.
- `node --check scripts/build-static-site-bundle.js` passou.
- `node --check site-bundle.js` passou.
- Não restaram referências ao redirecionamento `wa.me`, `TOKEN_REQUEST_WHATSAPP`, `BOT_TOKEN_BOOTSTRAP` ou aos nomes antigos de cache do token no site/bundle.

## Conhecimento consolidado
O token embutido no APK não é confidencial contra engenharia reversa; deve ser tratado como credencial exposta e rotacionado quando necessário.

## Próximos passos
Gerar e testar um APK real no Android, validando a abertura direta do site e o envio do ZIP ao Telegram.
