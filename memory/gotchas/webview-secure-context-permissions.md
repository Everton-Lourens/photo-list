# Câmera e localização no WebView Android

## Problema
Sites estáticos podem funcionar no navegador comum, mas falhar dentro do APK ao usar `navigator.mediaDevices.getUserMedia()` ou geolocalização. No WebView Android, geolocalização precisa estar habilitada e as APIs de câmera/localização dependem de contexto seguro (`https://` ou `localhost`).

## Causa
`react-native-webview` mantém geolocalização desativada por padrão no Android. Além disso, a permissão nativa concedida não garante, sozinha, que uma chamada `navigator.geolocation` dentro do WebView produza uma posição no dispositivo alvo.

## Solução
- Manter `geolocationEnabled` no `WebView`.
- Preparar as permissões nativas de câmera e localização no Android.
- Para geolocalização web, interceptar `navigator.geolocation` com uma ponte injetada antes do conteúdo e atender `getCurrentPosition`/`watchPosition` usando `expo-location`.
- Verificar se os serviços de localização estão ativos e tentar habilitar o provedor de rede no Android quando necessário.
- Para endereços remotos informados como `http://`, promover automaticamente para `https://`; `localhost`/loopback não é alterado.
- Manter `mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"` para compatibilidade em plataformas onde a propriedade é suportada.

## Impacto
A câmera continua usando o fluxo do WebView que já foi corrigido. A localização deixa de depender exclusivamente do mecanismo de geolocalização interno do WebView e passa a usar o mesmo serviço nativo de localização do aplicativo. O site continua recebendo um objeto compatível com `GeolocationPosition`.

Um servidor remoto sem HTTPS continua inadequado para outras Web APIs que exigem contexto seguro.
