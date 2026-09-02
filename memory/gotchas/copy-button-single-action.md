# Botão Copiar com ação única

Problema
O botão `Copiar Texto` podia receber vários cliques enquanto a cópia e o envio ao Telegram ainda estavam em andamento, iniciando operações concorrentes.

Causa
A trava visual só era aplicada depois da operação assíncrona e o botão voltava ao estado normal após apenas 2 segundos.

Solução
Ao primeiro clique, `copyServiceMessage()` trava imediatamente com uma flag de estado e `disabled`, muda o rótulo para `Copiado!` e mantém o botão verde e bloqueado por 5 segundos. A trava lógica também impede reentrada programática durante a janela. Depois dos 5 segundos, o botão volta para `Copiar Texto` e fica habilitado.
