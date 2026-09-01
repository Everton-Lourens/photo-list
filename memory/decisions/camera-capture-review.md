# Fluxo de revisão da câmera

## Decisão
A captura da câmera não é persistida imediatamente. O clique no disparo cria uma captura pendente e exibe a foto sobre a câmera com os botões transparentes `Cancelar` e `Salvar`.

`Salvar` persiste a foto, inicia/avança o ciclo de localização, baixa a imagem e segue para a próxima etapa. `Cancelar` descarta apenas a captura pendente e mantém a câmera ativa para outra foto.

A expansão da câmera é opcional e feita por um botão com duas setas no canto inferior direito. A expansão usa uma classe CSS de tela cheia do próprio WebView, sem depender da Fullscreen API do navegador. Ao salvar, o modo expandido é encerrado.

## Motivo
O operador precisa verificar visualmente a imagem e o endereço antes de confirmar o salvamento, reduzindo o risco de registrar uma foto incorreta. A solução preserva a câmera existente e adiciona o modo ampliado sem criar uma segunda implementação de captura.

## Data
2026-08-27
