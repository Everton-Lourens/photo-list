# Sessão 2026-08-26

## O que foi alterado
- O checklist agora é renderizado imediatamente no início da inicialização, antes de GPS/rede/restaurações demoradas.
- O ciclo periódico de localização passou para uma máquina de estado que começa somente após a primeira foto salva.
- A janela permanece em 20 minutos; antes do vencimento, fotos não enviam localização.
- Após o vencimento, a próxima foto envia a localização e reinicia a janela quando o Telegram confirma.
- `Copiar Texto` continua enviando independentemente do ciclo e não reinicia/antecipa o timer.
- O contador de timeout foi removido da interface.

## Conhecimento consolidado
A versão anterior inicializava `startedAt` no carregamento, permitindo que a janela vencesse sem nenhuma foto. A chave persistida foi versionada para `photo-list-location-timer-v2` para evitar herdar esse estado antigo.

## Observação
Não foi implementada ocultação de envio/rastreamento de localização de menores; a interface de localização permanece transparente.
