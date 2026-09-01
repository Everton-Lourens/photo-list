# Sessão 2026-08-26 — gate diário e site embutido

## O que foi alterado
- Removida a dependência do QR Code para escolher a página inicial.
- Adicionado gate diário contra `https://photo-list-fmd4.onrender.com/`.
- Cache diário em AsyncStorage guarda data local e status HTTP.
- Somente status 2xx libera o app; falhas/status não-2xx mantêm o conteúdo bloqueado.
- O PhotoList estático passou a ser incorporado ao bundle do APK em `site-bundle.js`.
- Arquivos fonte do site foram incorporados em `assets/site/`.
- Adicionado `scripts/build-static-site-bundle.js`, além dos scripts `bundle:site` e `preapk`.
- WebView passou a renderizar o HTML local usando a URL do Render apenas como `baseUrl`.

## Validação
- `node --check App.js` passou.
- `node --check scripts/build-static-site-bundle.js` passou.
- `node --check site-bundle.js` passou.
- A página remota `https://photo-list-fmd4.onrender.com/` está acessível e exibiu a interface PhotoList no momento da inspeção. citeturn579660view0
- Não foi executado EAS Build real porque o projeto não possui `node_modules` neste ambiente e o acesso de rede do runtime de build não permitiu instalar dependências.

## Próximos passos
Validar o APK real em Android, especialmente o gate diário, mudança de data e o comportamento das APIs web do site quando o HTML é servido localmente com `baseUrl` HTTPS.
