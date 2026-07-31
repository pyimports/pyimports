// Modo de pagamento ativo do site inteiro — usado tanto no server
// (getPaymentProvider) quanto no client (PagamentoClient), por isso fica
// isolado num arquivo sem imports de servidor.
//
// "manual": o pedido só é registrado no site — o link de pagamento (ex: link
// de cartão da Shopee) é enviado à parte pelo WhatsApp, e a confirmação
// também é manual, feita pelo admin no painel do pedido depois que o cliente
// manda nome completo + ID do pedido.
//
// "gateway": usa o provider configurado em getPaymentProvider() (Zendry/
// PicPay) com Pix/Cartão embutidos no site.
//
// Trocado pra "manual" a pedido do dono da loja: cartão via Zendry ficou
// bloqueado esperando o 3DS, e a decisão foi processar TODOS os pagamentos
// (não só cartão) por fora enquanto isso não resolve.
export const PAYMENT_MODE: "manual" | "gateway" = "manual";
