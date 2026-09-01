# Token do Telegram embutido no APK

## Decisão
O PhotoList inicia o site estático embutido no APK com um token fixo do bot do Telegram definido em `assets/site/app.js` e incorporado em `site-bundle.js`.

O fluxo não usa mais query string, `localStorage` ou redirecionamento para WhatsApp para obter o token.

## Motivo
O APK precisa abrir o PhotoList diretamente e permitir que o envio do ZIP ao Telegram funcione imediatamente, sem exigir uma etapa externa de obtenção de token.

## Impacto
Qualquer alteração em `assets/site/app.js` exige regenerar `site-bundle.js` antes do build do APK.

## Segurança
O token não fica seguro apenas por estar dentro do APK. O APK distribuído pode ser extraído/decompilado e o valor embutido pode ser recuperado. Se o token for comprometido, ele deve ser revogado/rotacionado no BotFather e substituído no código.

## Data
2026-08-26
