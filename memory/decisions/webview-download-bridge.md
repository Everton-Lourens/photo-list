# Ponte nativa para downloads da WebView

## Decisão
Downloads disparados pelo site devem ser capturados dentro do `react-native-webview` e transferidos ao lado Expo quando o conteúdo for gerado no contexto da página (`blob:`, `data:`, `fetch()`/`Blob` ou `<a download>`). O arquivo é persistido em `Paths.document/Downloads`; imagens também são registradas na Media Library.

## Motivo
`File.downloadFileAsync` trabalha com arquivos de rede e não consegue resolver diretamente um `blob:` pertencente ao JavaScript da WebView. A captura web + transferência binária mantém o conteúdo que o Chrome já consegue gerar e evita depender de uma URL HTTP pública.

## Data
2026-08-26
