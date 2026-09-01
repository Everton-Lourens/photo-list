# Ponte nativa de localização para o WebView

## Decisão
O APK usa uma ponte JavaScript/nativa para `navigator.geolocation` no Android. A página chama a API web normalmente, mas `getCurrentPosition`/`watchPosition` são atendidos pelo `expo-location` e os resultados são devolvidos ao JavaScript da página pelo WebView.

A permissão de localização continua sendo solicitada no nível nativo, e o serviço de localização do Android é verificado antes da obtenção da posição.

## Motivo
No dispositivo alvo, a câmera passou a funcionar, porém o site continuava recebendo falha ao obter a localização dentro do WebView. Apenas `geolocationEnabled` e as permissões Android não garantiram que a API web entregasse uma posição ao site. A ponte elimina essa dependência e usa diretamente o provedor de localização já disponível no aplicativo.

## Data
2026-08-25
