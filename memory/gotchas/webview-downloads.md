# Downloads do site dentro do WebView

## Problema
No Chrome, arquivos gerados pelo site podem ser baixados normalmente, mas o mesmo fluxo pode não chegar ao Android quando o site roda dentro do `react-native-webview`. O caso crítico é o download criado por JavaScript com `<a download>`, `blob:`, `data:` ou arquivos produzidos via `fetch()` + `Blob`.

## Causa
Uma URL `blob:` pertence ao contexto da página/WebView e não é uma URL de rede que `expo-file-system` consiga baixar diretamente. O antigo fluxo encaminhava a URL para `File.downloadFileAsync`, portanto funcionava para links HTTP/HTTPS comuns, mas falhava para blobs gerados no navegador embutido.

## Solução consolidada
A WebView intercepta cliques de download, busca o conteúdo dentro do próprio contexto web usando `fetch()` com `credentials: 'include'`, converte o `Blob` para base64 e envia os dados ao Expo em blocos. O lado nativo reconstrói os bytes e salva em `Paths.document/Downloads`. Para imagens, também salva uma cópia na Media Library para que a foto fique disponível no armazenamento de mídia do aparelho.

Links HTTP/HTTPS que não puderem ser convertidos dentro da WebView continuam com fallback para o download nativo por URL.

## Validação
A alteração exige um APK novo e teste no Android real, especialmente no fluxo: tirar foto no site → gerar download automático → arquivo aparecer no armazenamento local e, para imagens, na galeria.
