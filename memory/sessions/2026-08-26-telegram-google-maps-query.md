# Sessão 2026-08-26 — Query adicional do Google Maps

## O que foi alterado
- O envio periódico de localização ao Telegram passou a enviar, abaixo da URL baseada no endereço atual, uma segunda URL do Google Maps para `-12.727894,-38.305486`.
- O `site-bundle.js` foi regenerado a partir de `assets/site/`.

## Conhecimento consolidado
- A segunda query fixa pertence apenas ao fluxo `sendCurrentLocationToTelegram()`, sem alterar o envio geral de textos ao Telegram.
