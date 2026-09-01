# Gerar APK Android

## Passos

1. Instale as dependências com `npm install`.
2. Faça login no EAS, se necessário, com `npx eas-cli@latest login`.
3. Execute `npm run apk`.
4. O perfil `preview` do `eas.json` gera um artefato APK Android.

O script usa `cross-env` para definir `EAS_SKIP_AUTO_FINGERPRINT=1` de forma compatível com Windows, macOS e Linux.


## Bundle do site estático

Antes do build, o site fonte em `assets/site/` precisa estar sincronizado com `site-bundle.js`.

```bash
npm run bundle:site
```

`npm run apk` já executa esse passo automaticamente.

