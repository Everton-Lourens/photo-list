# Envio de localização ao Telegram por ação

## Status
A regra anterior de envio periódico por timer de 20 minutos foi substituída em 2026-08-31.

## Decisão
A localização no Telegram só é enviada quando ocorre uma ação explícita relacionada ao checklist:

- Foto capturada pela câmera e salva: envia uma mensagem como `Foto frente do roteador tirada`.
- Print/imagem importado da galeria e salvo: envia uma mensagem como `Print do comodato tirado`.
- Item marcado manualmente pelo número do checkbox, sem foto armazenada: envia uma mensagem como `Foto da ONU confirmada porém não enviada`.

Cada mensagem inclui:
- horário no formato `HH:mm`;
- endereço reversamente geocodificado, quando disponível;
- latitude e longitude;
- link do Google Maps para as coordenadas.

A renderização do checklist nunca envia localização. Renderizar, selecionar item, avançar etapa ou re-renderizar após salvar não são eventos de Telegram.

O botão `Copiar Texto` permanece com seu comportamento existente, inclusive a cópia da mensagem e o envio de sua própria mensagem com localização.

## Motivo
Evitar repetição da mesma localização causada por `renderChecklist()` e tornar o envio previsível: uma localização por ação relevante do operador, em vez de envios automáticos durante renderizações ou por timer.

## Data
2026-08-31
