# Atualização de localização preserva a posição anterior

## Regra
As ações `Limpar tudo`, marcar um item manualmente pelo número, capturar uma foto pela câmera e selecionar uma imagem pela galeria devem tentar atualizar a localização no momento da ação.

## Comportamento
A nova localização só substitui `state.location` depois que a obtenção do GPS e a resolução do endereço forem concluídas com sucesso. Em caso de falha, a localização anterior permanece intacta e pode ser usada imediatamente, incluindo a latitude/longitude anterior. Se não existir localização anterior, a ação prossegue normalmente mesmo sem localização.

Não deve existir confirmação ou bloqueio da ação apenas porque a atualização da localização falhou.

## Implementação
`refreshLocationSnapshot()` concentra a atualização e, no erro, retorna a localização anterior quando disponível; caso contrário, retorna `null`. Os fluxos de câmera e galeria aceitam `null` e continuam sem perguntar ao operador. `sendLocationNotification()` envia usando a localização retornada pela atualização; se nenhuma posição estiver disponível, o erro de envio é tratado pelo chamador sem desfazer a ação principal.

## Data
2026-09-02
