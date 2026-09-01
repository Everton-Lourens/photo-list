# Permissões do APK

## Regra
No Android, as permissões de câmera, localização e biblioteca de mídia devem ser preparadas antes de qualquer conteúdo funcional do aplicativo. O WebView só é exibido depois dessa etapa inicial e após a validação diária do servidor.

## Aplicação
Na inicialização do Android:
1. solicitar/verificar câmera;
2. solicitar/verificar localização em primeiro plano;
3. solicitar/verificar fotos/armazenamento via Media Library;
4. executar o gate diário contra o servidor;
5. somente após uma resposta HTTP 2xx válida, abrir o site estático embutido no WebView.

A permissão de localização continua sendo usada pela ponte nativa que atende `navigator.geolocation` no WebView.

A permissão da biblioteca de mídia também é solicitada no salvamento de fotos para manter a verificação de acesso no fluxo de uso.
