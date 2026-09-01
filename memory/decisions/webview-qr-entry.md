# Entrada do site por QR Code — decisão superseded

## Status
Esta decisão foi substituída em 2026-08-26 pelo gate diário com site estático embutido.

## Decisão histórica
O APK anteriormente usava QR Code para escolher a URL do site, persistindo o endereço no AsyncStorage e abrindo a página no WebView.

## Motivo da substituição
O APK atual é específico do PhotoList e precisa carregar uma cópia estática embutida, usando `https://photo-list-fmd4.onrender.com/` somente como verificação diária de ativação.

## Data da substituição
2026-08-26
