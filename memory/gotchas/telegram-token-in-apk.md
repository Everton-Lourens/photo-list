# Token do Telegram dentro do APK

## Problema
Um token de bot embutido em JavaScript dentro do APK pode ser recuperado por alguém que extraia ou decompile o aplicativo.

## Causa
O site estático é incorporado ao APK como texto (`STATIC_SITE_HTML`), e o token faz parte desse conteúdo.

## Solução adotada
O token é definido diretamente em `assets/site/app.js` para eliminar o redirecionamento ao WhatsApp e permitir inicialização imediata. O bundle é regenerado para refletir o valor no APK.

## Cuidados
- Não tratar o token embutido como segredo protegido.
- Revogar/rotacionar o token se o APK for distribuído publicamente e o token precisar permanecer confidencial.
- Alterações em `assets/site/` exigem `npm run bundle:site` antes do APK.

## Data
2026-08-26
