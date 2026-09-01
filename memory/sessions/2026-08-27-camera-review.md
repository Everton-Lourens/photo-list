# Sessão 2026-08-27 — revisão da câmera

## O que foi alterado
- Adicionada prévia da foto após o disparo, com `Cancelar` e `Salvar` transparentes.
- `Salvar` passou a ser o ponto que persiste a foto e avança o checklist.
- `Cancelar` mantém a câmera ativa e permite nova captura.
- Adicionado botão de duas setas no canto inferior direito para expandir/reduzir a câmera.
- Ao salvar uma captura feita em modo expandido, a expansão é encerrada.
- Endereço passou a ficar visível ao vivo sobre a câmera.
- O overlay da foto remove o segmento `Região Nordeste` do endereço.
- `site-bundle.js` foi regenerado a partir de `assets/site/`.

## Conhecimento consolidado
A câmera continua sendo uma única implementação; a diferença entre modo normal e ampliado é somente visual/CSS. A captura pendente não é salva no IndexedDB nem baixada até o usuário confirmar `Salvar`.

## Próximos passos
Testar no APK em aparelho Android: endereço ao vivo com GPS real, cancelamento/repetição da captura, salvamento, modo expandido/reduzido e retorno correto ao próximo item do checklist.
