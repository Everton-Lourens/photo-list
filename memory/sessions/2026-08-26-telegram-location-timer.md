# Sessão 2026-08-26

## O que foi alterado
- Adicionado temporizador persistente de 20 minutos no site estático do PhotoList.
- Após o vencimento, a próxima foto dispara `sendMessage` ao Telegram com apenas a URL do Google Maps.
- A URL usa endereço reverso do Nominatim quando disponível e cai para coordenadas quando necessário.
- `Copiar Texto` agora envia `finalizado! [URL]` ao Telegram depois da cópia.
- Adicionada indicação visual de contagem regressiva do timer na interface.
- Regenerado `site-bundle.js`.

## Conhecimento consolidado
A janela de 20 minutos é persistida em `localStorage`; o marco só é atualizado quando o envio periódico ao Telegram é confirmado.

## Validação
`node --check assets/site/app.js` e geração do bundle concluídas sem erro.
