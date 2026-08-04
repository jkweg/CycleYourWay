# Android App Links (`assetlinks.json`)

Plik `assetlinks.json` musi zawierać **prawdziwy** odcisk SHA-256 klucza,
którym podpisujecie AAB/APK (Play App Signing **lub** lokalny upload keystore).

## Jak wziąć fingerprint

### Play App Signing (zalecane)

1. Google Play Console → aplikacja → **Setup → App integrity**
2. Skopiuj **SHA-256 certificate fingerprint** (App signing key)
3. Wklej jako jedyny element tablicy `sha256_cert_fingerprints` (bez spacji, wielkie litery OK)

### Lokalny keystore

```bash
keytool -list -v -keystore path/to/upload.keystore -alias YOUR_ALIAS
```

Szukaj linii `SHA256:` i wklej wartość do `assetlinks.json`.

## Weryfikacja po deploy

- `https://cycleyourway.pl/.well-known/assetlinks.json` musi zwracać JSON (nie HTML)
- Po instalacji APK:  
  `adb shell pm get-app-links com.cycleyourway.app`

Dopóki stoi `REPLACE_WITH_UPLOAD_KEY_SHA256`, weryfikacja App Links **nie przejdzie**.
