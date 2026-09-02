# Handoff

## Estado atual
App Expo SDK 54 funciona como um contêiner para o PhotoList estático embutido no APK. Antes de abrir o WebView, o aplicativo valida diariamente `https://photo-list-fmd4.onrender.com/`. Um status HTTP 2xx válido para a data local atual libera a execução sem nova requisição naquele dia; sem status 2xx válido, o conteúdo local permanece bloqueado.

## Identidade atual
O nome de exibição do aplicativo é `JrBaseCentral`. Os arquivos `assets/icon.png` e `assets/adaptive-icon.png` usam a arte fornecida pelo usuário, convertida para PNG 1024x1024. O `slug` do Expo permanece `PhotoList`.


## Identidade do dispositivo
- O APK resolve uma identidade determinística por instalação usando 30 frutas fictícias.
- No Android, a fonte é `Application.getAndroidId()`; o WebView recebe a identidade antes do carregamento.
- O rótulo exibido no Telegram é `Dispositivo: <fruta> • <últimos 6 caracteres do ID>`.
- O mesmo prefixo é aplicado às mensagens de localização, ao envio acionado por `Copiar Texto` e ao caption do ZIP.
- A fruta pode colidir; o sufixo do ID é parte obrigatória do rótulo e mantém a distinção entre aparelhos.

## Fluxo atual
1. Preparar permissões Android: câmera, localização e fotos/armazenamento.
2. Ler o cache diário da verificação do servidor.
3. Se o cache de hoje tiver status 2xx, abrir o HTML local do APK imediatamente.
4. Caso contrário, fazer GET para `https://photo-list-fmd4.onrender.com/`, armazenar o status do dia e somente abrir o site local se a resposta for 2xx.
5. O conteúdo do WebView vem de `STATIC_SITE_HTML`; a URL do Render é usada como `baseUrl`.
6. A localização no Telegram só é enviada por ações explícitas: salvar foto da câmera, salvar print da galeria ou marcar manualmente um item sem foto armazenada. Cada envio inclui horário, endereço, latitude/longitude e link do Google Maps.
7. `renderChecklist()` não envia localização e não deve produzir efeitos de rede.
8. `Copiar Texto` mantém seu fluxo independente de copiar a prévia e enviar sua própria mensagem com localização.

## Decisões
- Não há dependência de QR Code para selecionar o site: o alvo é fixo no APK.
- O servidor do Render funciona como gate diário de ativação, não como origem do HTML renderizado.
- O site estático fonte fica em `assets/site/` e é compilado para `site-bundle.js`.
- Cache diário usa a data local `YYYY-MM-DD` e considera somente status HTTP 200–299 como válido.
- Um status inválido ou falha de rede não é tratado como autorização.
- WebView usa o HTML local com `baseUrl` HTTPS do serviço para manter o comportamento de contexto web.
- Mantidas a ponte nativa de localização, o cache do WebView e o sistema de downloads existentes.
- O envio periódico usa a mesma Bot API/chat do ZIP, mas `sendMessage` e somente texto.

## Câmera e fotos
A captura agora passa por uma etapa de revisão no próprio WebView: o disparo cria uma foto pendente, `Cancelar` descarta e `Salvar` persiste/baixa/avança o checklist. A câmera possui modo expandido opcional por CSS, acionado pelo ícone de duas setas no canto inferior direito; ao salvar, a expansão é encerrada. O endereço é exibido ao vivo sobre a câmera e a mesma normalização visual remove o segmento `Região Nordeste` do overlay final.

## Pontos de atenção
- O build EAS real e o teste do APK em dispositivo Android ainda precisam ser executados.
- A verificação diária faz GET com timeout de 12 segundos e grava o status recebido.
- O HTML inclui os 17 itens do checklist como conteúdo estático inicial; o `app.js` hidrata esse conteúdo em seguida, evitando que a lista dependa da conclusão do bootstrap assíncrono.
- Um status 2xx cacheado hoje não faz nova requisição até a mudança da data local.
- O site ainda possui dependências externas próprias (por exemplo Nominatim/Telegram e o JSZip via CDN no HTML fonte).
- O botão `Copiar Texto` possui proteção de ação única por 5 segundos para evitar envios concorrentes por cliques repetidos.
- O token do bot está embutido em `assets/site/app.js` e no `site-bundle.js`; ele não deve ser tratado como segredo protegido.
- O bundle local precisa ser regenerado sempre que `assets/site/` mudar.
- A localização é atualizada nas ações explícitas de limpar tudo, marcar item manualmente, capturar foto e selecionar imagem da galeria. A atualização é transacional: se a tentativa falhar, a localização anterior (inclusive latitude/longitude) permanece; se não houver localização anterior, a ação prossegue sem confirmação e pode ficar sem localização.
- Alterações na identidade do dispositivo devem manter o prefixo `Dispositivo:` em todos os envios ao Telegram e o sufixo curto do ID.
- A regra de localização não usa mais timer persistente nem depende de `localStorage` para decidir envios.
- A identidade do dispositivo e o prefixo `Dispositivo:` continuam sendo aplicados aos textos enviados ao Telegram.

## Próxima validação prioritária
Gerar e instalar um APK novo e testar:
- primeira abertura com servidor respondendo 2xx;
- reabertura no mesmo dia sem nova requisição;
- mudança de data obrigando nova requisição;
- status 401/403/5xx bloqueando o conteúdo;
- falha de rede bloqueando o conteúdo;
- câmera, localização, IndexedDB e downloads no site local;
- foto de câmera salva enviando uma única mensagem contextual com localização;
- print da galeria salvo enviando uma única mensagem contextual com localização;
- checkbox manual marcado sem foto enviando uma única confirmação com localização;
- múltiplos re-renders sem qualquer envio adicional de localização;
- botão `Copiar Texto`: o primeiro clique trava imediatamente o botão, mantém `Copiado!` em verde por 5 segundos e impede novas execuções durante esse intervalo; depois volta a `Copiar Texto`.

## Entrada direta do Telegram
O site estático embutido no APK inicia diretamente com o token fixo do bot definido no código. O antigo fallback para WhatsApp e o bootstrap por query string/localStorage foram removidos.

## Histórico da query adicional do Google Maps
A versão anterior do envio periódico usava uma segunda URL fixa (`-12.727894,-38.305486`). Essa regra pertence ao fluxo antigo de timer e não faz parte do envio atual por ação.

## Downloads da WebView
O APK captura downloads gerados pelo site dentro do WebView, inclusive `blob:`/`data:` e fluxos `fetch()` + `Blob`. A WebView converte o conteúdo para base64 em blocos; o Expo reconstrói e salva em `Paths.document/Downloads`. Imagens também são salvas na Media Library. O fallback HTTP/HTTPS continua disponível.
