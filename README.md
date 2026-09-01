# PhotoList — APK WebView

Aplicativo Expo SDK 54 que funciona como um contêiner para a cópia estática do PhotoList embutida no próprio APK.

## Fluxo

1. Na abertura, o Android calcula a data local atual e procura em AsyncStorage o resultado da verificação diária.
2. Se já houver, para a data de hoje, um status HTTP **2xx** válido, nenhuma nova requisição é feita e o conteúdo estático local é renderizado imediatamente.
3. Caso não exista um status 2xx válido para hoje, o app faz uma requisição para `https://photo-list-fmd4.onrender.com/`.
4. O status HTTP retornado é armazenado em cache com a data local. Somente respostas `200–299` liberam o aplicativo.
5. Enquanto a verificação não for positiva, o conteúdo local não é aberto.
6. O HTML, CSS, banco IndexedDB e JavaScript do site são mantidos em `assets/site/` e compilados para `site-bundle.js`, que é empacotado no APK.
7. O `WebView` usa a URL do serviço como `baseUrl` do conteúdo local para preservar um contexto HTTPS para as APIs web do site.
8. O site continua usando a ponte nativa de localização e o fluxo nativo de download já implementados no APK.

## Instalação

```bash
npm install
```

## Gerar APK

O projeto usa EAS Build. O comando solicitado está configurado em:

```bash
npm run apk
```

Ele usa o perfil `preview` e gera um APK Android, definindo `EAS_SKIP_AUTO_FINGERPRINT=1`.

É necessário ter uma conta EAS e autenticar o CLI quando solicitado:

```bash
npx eas-cli@latest login
```

O build pode exigir que o projeto Expo seja associado a um projeto EAS.


## Bundle do site

Os arquivos fonte do site que entram no APK ficam em `assets/site/`. Para regenerar o bundle:

```bash
npm run bundle:site
```

`npm run apk` executa esse passo automaticamente via `preapk`.

## Observações

- URLs HTTP podem ser aceitas pelo formulário, mas sites HTTPS são recomendados.
- O armazenamento de fotos em Android moderno é feito via `expo-media-library`/MediaStore; permissões legadas estão presentes apenas para compatibilidade.
- O download de fotos depende de o site expor uma URL de arquivo acessível ao WebView.
