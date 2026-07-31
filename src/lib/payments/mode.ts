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
// Cartão via Zendry ficou bloqueado esperando o 3DS ser implementado — nesse
// meio tempo, todos os pagamentos passaram a usar o modo "manual". Com o
// 3DS implementado (ver PagamentoClient.tsx + card-payment.ts) o modo volta
// a ser "gateway": Pix + Cartão automáticos, embutidos no site.
export const PAYMENT_MODE: "manual" | "gateway" = "gateway";
