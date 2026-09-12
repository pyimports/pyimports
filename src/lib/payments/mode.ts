// Modo de pagamento ativo do site inteiro — usado tanto no server
// (getPaymentProvider) quanto no client (PagamentoClient), por isso fica
// isolado num arquivo sem imports de servidor.
//
// "manual": o pedido só é registrado no site — o link de pagamento (ex: link
// de cartão da Shopee) é enviado à parte pelo WhatsApp, e a confirmação
// também é manual, feita pelo admin no painel do pedido depois que o cliente
// manda nome completo + ID do pedido.
//
// "gateway": usa o provider configurado em getPaymentProvider() (SupraPay/
// PicPay) com Pix embutido no site. Cartão de crédito não é mais vendido —
// SupraPay só processa Pix.
export const PAYMENT_MODE: "manual" | "gateway" = "gateway";
