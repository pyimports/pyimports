-- =============================================================================
-- 027_fix_inventory_trigger_no_stock.sql
-- BUG CRÍTICO: record_inventory_movement() quebrava a confirmação de
-- QUALQUER pedido pago. Desde que o controle de estoque foi removido do
-- catálogo (track_stock = false em todos os produtos hoje, stock = NULL),
-- o trigger tentava inserir quantity_before = NULL em inventory_movements
-- (coluna NOT NULL) — a inserção falhava, o UPDATE inteiro de orders sofria
-- rollback (mesma transação), e orders.payment_status NUNCA virava
-- 'confirmed', mesmo com o pagamento realmente aprovado pelo gateway.
--
-- Corrige ignorando produtos com track_stock = false: não existe "estoque
-- antes/depois" pra registrar quando o produto não rastreia estoque —
-- simplesmente não decrementa nada nem grava movimentação pra esses itens.
-- =============================================================================

CREATE OR REPLACE FUNCTION record_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  stock_before INTEGER;
  item_track_stock BOOLEAN;
BEGIN
  -- Só age quando status muda para 'payment_confirmed'
  IF NEW.payment_status = 'confirmed' AND (OLD.payment_status IS DISTINCT FROM 'confirmed') THEN
    FOR item IN
      SELECT oi.product_id, oi.quantity, oi.variant_size_id
      FROM order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      IF item.variant_size_id IS NOT NULL THEN
        SELECT stock INTO stock_before FROM product_variant_sizes WHERE id = item.variant_size_id;

        UPDATE product_variant_sizes
        SET stock = GREATEST(0, stock - item.quantity),
            updated_at = NOW()
        WHERE id = item.variant_size_id;

        INSERT INTO inventory_movements (
          product_id, variant_size_id, type, quantity_change,
          quantity_before, quantity_after,
          order_id, created_by
        ) VALUES (
          item.product_id,
          item.variant_size_id,
          'sale',
          -item.quantity,
          stock_before,
          GREATEST(0, stock_before - item.quantity),
          NEW.id,
          'system'
        );
      ELSE
        SELECT stock, track_stock INTO stock_before, item_track_stock
        FROM products WHERE id = item.product_id;

        IF item_track_stock THEN
          UPDATE products
          SET stock = GREATEST(0, stock - item.quantity),
              updated_at = NOW()
          WHERE id = item.product_id;

          INSERT INTO inventory_movements (
            product_id, type, quantity_change,
            quantity_before, quantity_after,
            order_id, created_by
          ) VALUES (
            item.product_id,
            'sale',
            -item.quantity,
            stock_before,
            GREATEST(0, stock_before - item.quantity),
            NEW.id,
            'system'
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Devolve estoque quando pedido é cancelado a partir de 'confirmed'
  IF NEW.payment_status != 'confirmed' AND OLD.payment_status = 'confirmed' AND NEW.status = 'cancelled' THEN
    FOR item IN
      SELECT oi.product_id, oi.quantity, oi.variant_size_id
      FROM order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      IF item.variant_size_id IS NOT NULL THEN
        SELECT stock INTO stock_before FROM product_variant_sizes WHERE id = item.variant_size_id;

        UPDATE product_variant_sizes
        SET stock = stock + item.quantity,
            updated_at = NOW()
        WHERE id = item.variant_size_id;

        INSERT INTO inventory_movements (
          product_id, variant_size_id, type, quantity_change,
          quantity_before, quantity_after,
          order_id, created_by
        ) VALUES (
          item.product_id,
          item.variant_size_id,
          'cancelled_return',
          item.quantity,
          stock_before,
          stock_before + item.quantity,
          NEW.id,
          'system'
        );
      ELSE
        SELECT stock, track_stock INTO stock_before, item_track_stock
        FROM products WHERE id = item.product_id;

        IF item_track_stock THEN
          UPDATE products
          SET stock = stock + item.quantity,
              updated_at = NOW()
          WHERE id = item.product_id;

          INSERT INTO inventory_movements (
            product_id, type, quantity_change,
            quantity_before, quantity_after,
            order_id, created_by
          ) VALUES (
            item.product_id,
            'cancelled_return',
            item.quantity,
            stock_before,
            stock_before + item.quantity,
            NEW.id,
            'system'
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
