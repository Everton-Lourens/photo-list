# Identidade do dispositivo no Telegram

## Decisão
Cada instalação do PhotoList recebe uma identidade determinística formada por uma fruta fictícia e pelos 6 últimos caracteres do identificador nativo. No Android, a base é `expo-application` com `Application.getAndroidId()`. No iOS, usa-se `Application.getIosIdForVendorAsync()`; caso não exista um identificador nativo, o app cria e persiste um fallback no `AsyncStorage`.

O app entrega a identidade ao WebView antes do carregamento da página. Toda mensagem enviada ao Telegram recebe o prefixo `Dispositivo: <fruta> • <sufixo>`. O caption do ZIP também inclui a identidade.

## Motivo
A fruta facilita a identificação humana no grupo do Telegram, enquanto o sufixo curto evita ambiguidade entre aparelhos que eventualmente recebam a mesma fruta. A identidade é derivada do identificador do dispositivo, portanto não depende de uma conta de usuário nem de armazenamento local do WebView para permanecer estável no Android.

## Limite conhecido
`ANDROID_ID` é estável para a combinação de chave de assinatura, usuário e aparelho em versões modernas do Android, mas pode mudar após restauração de fábrica ou troca da chave de assinatura. Assim, a fruta é um rótulo operacional, não uma identidade imutável para sempre.

## Data
2026-08-27
