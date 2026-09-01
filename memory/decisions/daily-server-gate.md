# Gate diário de ativação do APK

## Decisão
O APK libera o PhotoList local somente depois de uma verificação diária contra `https://photo-list-fmd4.onrender.com/`.

A verificação usa o status da resposta HTTP:
- qualquer `2xx` (`200`, `202`, `204` etc.) é considerado válido;
- qualquer outro status não libera o aplicativo;
- falhas de rede também não liberam.

O resultado é persistido no AsyncStorage por data local (`YYYY-MM-DD`). Um status 2xx válido encontrado para a data atual elimina novas requisições daquele dia. Um status inválido não impede nova tentativa na mesma data.

## Conteúdo
O site é embutido no APK. `assets/site/` contém os arquivos fonte estáticos e `site-bundle.js` é o artefato compilado consumido pelo WebView.

## Data
2026-08-26
