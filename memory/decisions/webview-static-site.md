# WebView para site estático

## Decisão
O aplicativo usa `react-native-webview` como navegador embutido sem barra ou opções de navegador. O PhotoList é empacotado no próprio APK como `STATIC_SITE_HTML`, gerado a partir de `assets/site/`.

O servidor `https://photo-list-fmd4.onrender.com/` não é a origem do HTML renderizado. Ele é usado exclusivamente como gate diário de ativação. Depois de uma verificação 2xx válida para o dia local atual, o WebView renderiza o HTML local usando essa URL apenas como `baseUrl`.

## Motivo
O APK precisa continuar carregando a cópia estática mesmo quando não houver necessidade de baixar o site a cada abertura, mas deve poder ser desativado pelo serviço remoto quando a resposta deixar de ser 2xx.

## Data
2026-08-26
