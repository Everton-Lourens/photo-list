# Mensagens de localização no Telegram

## Problema
A renderização do checklist não pode gerar mensagens de localização. O envio precisa ocorrer apenas por ações reais do operador.

## Solução
Usar `https://api.telegram.org/bot<TOKEN>/sendMessage` com `application/x-www-form-urlencoded`, mantendo o mesmo `chat_id` e token do fluxo do ZIP.

Ações que disparam localização:
- salvar foto capturada pela câmera;
- salvar print/imagem selecionado da galeria;
- marcar manualmente um item concluído quando não existe foto armazenada.

O texto enviado contém horário, endereço, coordenadas GPS e link do Google Maps correspondente à localização atual. A identidade do dispositivo continua sendo adicionada por `withTelegramDeviceIdentity()`.

## Cuidados
- `renderChecklist()` não deve chamar nenhuma rotina de envio ao Telegram.
- Não usar timer periódico para decidir quando enviar localização.
- Desmarcar um checkbox manualmente não envia nova localização.
- O botão `Copiar Texto` é um fluxo independente e deve continuar enviando sua mensagem com localização como já fazia.
- O token do bot está embutido no APK e não deve ser tratado como segredo protegido.
