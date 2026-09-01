# Conteúdo local com base HTTPS no WebView

## Problema
Um site estático empacotado diretamente no APK não pode depender de `file://` se precisa das Web APIs e do comportamento de origem HTTPS usados pelo PhotoList.

## Solução
O WebView recebe `STATIC_SITE_HTML` localmente e usa `https://photo-list-fmd4.onrender.com/` como `baseUrl`. A URL serve como base/origem da página sem que o conteúdo HTML seja baixado do servidor.

## Cuidados
- O conteúdo renderizado deve continuar vindo de `STATIC_SITE_HTML`; não trocar o `source` para a URL remota.
- Alterações em `assets/site/` exigem regenerar `site-bundle.js`.
- O site ainda depende das chamadas externas já existentes, como Nominatim e Telegram, conforme o código do projeto.
- O site embutido agora usa um token fixo definido em `assets/site/app.js`; ele é incorporado ao APK e não deve ser considerado secreto.

## Data
2026-08-26
