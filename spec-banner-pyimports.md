# Sistema de Banner — padrão PYimports

## Layout e dimensões
- **Contido** dentro do container de largura máxima da página (não é full-bleed/edge-to-edge) — fica com uma margem lateral igual às outras seções do site.
- Cantos arredondados (`rounded-2xl`) + borda sutil, igual aos cards de produto do site.
- Proporção **desktop: 3:1** — imagem recomendada **1800×600px**.
- Proporção **mobile: 16:9** — imagem recomendada **1280×720px**.
- `object-fit: cover` com ponto focal (posição X/Y) e zoom configuráveis por imagem, pra controlar o enquadramento quando a imagem é cortada em telas diferentes.

## Comportamento (carrossel)
- Autoplay a cada 5 segundos, só quando há mais de 1 banner ativo.
- Pausa o autoplay ao passar o mouse em cima (desktop).
- No mobile: arrasta o dedo (swipe) pra esquerda/direita pra trocar manualmente — sem depender de mouse, então a pausa por hover não pode "travar" o autoplay depois de um toque (bug já corrigido: touch sintetiza mouseenter sem mouseleave em alguns navegadores).
- Setas de navegação (esquerda/direita) e bolinhas indicadoras — só aparecem quando há mais de 1 banner.

## Texto sobreposto (opcional)
- Campos "Título" e "Subtítulo" no admin, opcionais.
- Só quando preenchidos, um overlay escuro (gradiente preto) aparece sobre a imagem pra garantir legibilidade do texto.
- Se a arte já vem com todo o texto "assado" na própria imagem (caso mais comum), os campos ficam em branco e a imagem aparece sem nenhum escurecimento.

## Link (clicável)
- O banner inteiro é clicável quando tem um destino configurado: produto específico, categoria, ou URL externa.
- Quando aponta pra um produto com desconto por quantidade, mostra automaticamente uma faixa com os preços por quantidade (1 caixa, 2 caixas...) calculados a partir do próprio produto — o admin não digita esses valores manualmente.

## Upload no admin
- Duas imagens por banner: desktop (obrigatória) e mobile (opcional — se não enviar, usa a desktop com o enquadramento mobile aplicado).
- Preview no admin é o **mesmo componente** usado no site publicado — o que se vê no admin é idêntico ao que vai pro ar.
