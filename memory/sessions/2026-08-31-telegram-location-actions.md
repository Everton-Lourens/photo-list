# Sessão 2026-08-31 — localização por ação

## O que foi alterado
- Removido o envio de localização disparado por `renderChecklist()`.
- Removido o timer persistente de 20 minutos usado para envio periódico de localização.
- Adicionado envio contextual após salvar foto da câmera.
- Adicionado envio contextual após salvar imagem da galeria.
- Adicionado envio contextual ao marcar manualmente um item como concluído sem foto.
- Mensagens de ação incluem horário, endereço, latitude/longitude e link do Google Maps.
- Mantido o comportamento existente de `Copiar Texto` sem alterações.
- Regenerado `site-bundle.js`.

## Conhecimento consolidado
Localização no Telegram é um efeito de ações explícitas do checklist, não de renderização da interface. `renderChecklist()` deve permanecer sem efeitos de rede.

## Validação
- `node --check assets/site/app.js` passou.
- `node --check site-bundle.js` passou.
- `node --check App.js` passou.
- Bundle regenerado com `node scripts/build-static-site-bundle.js`.

## Próximos passos
Validar no APK real os três gatilhos de envio e confirmar que múltiplos re-renders não geram mensagens adicionais.
