# Endereço ao vivo e overlay da câmera

## Problema
O endereço aparecia apenas no arquivo final. Além disso, a saída de geocodificação pode incluir o segmento `Região Nordeste`, que não deve aparecer na foto.

## Solução
O mesmo endereço usado no overlay persistido é exibido ao vivo sobre a câmera enquanto o stream está ativo. A função `sanitizePhotoAddress()` remove segmentos de endereço exatamente iguais a `Região Nordeste` antes de exibir o texto no overlay, sem alterar o endereço bruto usado pelo estado de localização.

O overlay persistido continua sendo gerado por `drawPhotoOverlay()`, portanto captura ao vivo e foto salva usam a mesma normalização visual do endereço.

## Data
2026-08-27
