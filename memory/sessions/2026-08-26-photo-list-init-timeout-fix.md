# Sessão 2026-08-26

## O que foi alterado

- O checklist agora possui os 17 itens no HTML inicial, antes do `app.js`; o JavaScript continua fazendo a hidratação normal de estado e eventos.
- O timer persistente foi versionado de `photo-list-location-timer-v2` para `photo-list-location-timer-v3`.
- A restauração do timer agora exige `armedByPhoto: true`.
- O estado v2 legado é removido na inicialização para impedir regressão do ciclo antes da primeira foto.
- A lógica de `Copiar Texto` e envio da localização correta não foi alterada.

## Conhecimento consolidado

O bug de regressão vinha da persistência de um `startedAt` antigo: o boot lia esse marco e tratava a janela como já iniciada. A nova versão só restaura um ciclo explicitamente armado por uma foto.

## Validação

- Bundle estático regenerado depois das alterações.
- `node --check` executado nos arquivos JavaScript do site e no `App.js`.
- Verificações estáticas confirmam 17 itens no HTML inicial, chave v3 e ausência da leitura do estado v2.
- Ainda é necessária validação funcional em APK/dispositivo Android.
