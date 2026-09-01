# Cache do gate diário e erros do WebView

## Regra atual
O cache de autorização diária e o cache interno do WebView têm funções diferentes.

- O gate diário só considera válido um status HTTP 2xx salvo para a data local atual.
- Se não houver um status 2xx válido no dia, o app executa uma nova requisição ao servidor de ativação.
- Falha de rede ou status HTTP não-2xx não libera o conteúdo.
- Depois de liberar o dia, o site exibido vem do bundle local do APK.

## WebView
Erros de renderização do HTML local não alteram o cache de autorização. O WebView continua com `LOAD_CACHE_ELSE_NETWORK` no Android, mas o documento principal é o bundle local.

## Motivo
Separar a autorização remota do conteúdo local evita que o aplicativo precise baixar o site inteiro diariamente, mantendo a possibilidade de revogar o acesso pelo servidor.
