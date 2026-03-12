CREATE PROCEDURE `MECANICA_CRUD_ORDEN_DETALLES`(IN IJSON LONGTEXT, IN IUSER VARCHAR(25))
BEGIN
    DECLARE data_json JSON;
    DECLARE vcrud INT;
    DECLARE p_deordenid INT;
    DECLARE p_ordenid INT;
    DECLARE p_materialid INT;
    DECLARE p_cantidad INT;
    DECLARE p_valor_unitario DECIMAL(10,2);
    DECLARE p_porcentaje_descuento DECIMAL(5,2);
    DECLARE p_marca_aplicada VARCHAR(50);
    DECLARE p_observaciones TEXT;
    -- Variables de lógica de negocio
    DECLARE v_tipo_nombre VARCHAR(50);
    DECLARE v_stock_actual INT;
    DECLARE v_cantidad_anterior INT DEFAULT 0;
    DECLARE v_materialid_anterior INT;
    DECLARE v_nuevo_total DECIMAL(12,2);
    DECLARE v_total_pagos DECIMAL(12,2);
    DECLARE v_descuento_orden DECIMAL(5,2);
    DECLARE v_es_servicio TINYINT DEFAULT 0;
    -- Handler de errores
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 @sqlstate = RETURNED_SQLSTATE,
        @errno = MYSQL_ERRNO, @text = MESSAGE_TEXT;
        SELECT CONCAT('Error [', @errno, ']: ', @text) AS OMENSAJE, 0 AS OSUCCESS;
    END;
    -- Parsear JSON
    SET data_json = IJSON;
    -- Extraer variables del JSON
    SET vcrud                  = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.vcrud"));
    SET p_deordenid            = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.deordenid"));
    SET p_ordenid              = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.ordenid"));
    SET p_materialid           = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.materialid"));
    SET p_cantidad             = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.cantidad"));
    SET p_valor_unitario       = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.valor_unitario"));
    SET p_porcentaje_descuento = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.porcentaje_descuento"));
    SET p_marca_aplicada       = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.marca_aplicada"));
    SET p_observaciones        = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.observaciones"));
    -- =============================================
    -- vcrud = 1 : AGREGAR línea de detalle a una orden
    -- =============================================
    IF vcrud = 1 THEN
        -- Verificar si el material es servicio (no maneja stock)
        SELECT TA.NOMBRE, COALESCE(M.STOCK, 0)
        INTO v_tipo_nombre, v_stock_actual
        FROM MATERIALES M
        INNER JOIN SYS_TIPOS_ARTICULO TA ON M.TIPOARTID = TA.TIPOARTID
        WHERE M.MATERIALID = p_materialid;
        SET v_es_servicio = IF(v_tipo_nombre = 'Servicio', 1, 0);
        -- Validar stock solo si NO es servicio
        IF v_es_servicio = 0 AND v_stock_actual < p_cantidad THEN
            SELECT p_materialid AS MATERIALID, v_stock_actual AS STOCK_DISPONIBLE,
                   'Stock insuficiente para agregar este material' AS OMENSAJE, 0 AS OSUCCESS;
        ELSE
            -- Insertar detalle
            INSERT INTO ORDEN_DETALLES (ORDENID, MATERIALID, CANTIDAD, VALOR_UNITARIO, PORCENTAJE_DESCUENTO, MARCA_APLICADA, OBSERVACIONES)
            VALUES (p_ordenid, p_materialid, p_cantidad, p_valor_unitario, COALESCE(p_porcentaje_descuento, 0.00), p_marca_aplicada, p_observaciones);
            -- Descontar stock y registrar movimiento solo si NO es servicio
            IF v_es_servicio = 0 THEN
                UPDATE MATERIALES SET STOCK = STOCK - p_cantidad WHERE MATERIALID = p_materialid;
                INSERT INTO INVENTARIO_MOVIMIENTOS (MATERIALID, TIPO_MOVIMIENTO, CANTIDAD, MOTIVO, ORDENID)
                VALUES (p_materialid, 'SALIDA', p_cantidad, CONCAT('Usado en orden #', p_ordenid), p_ordenid);
            END IF;
            -- Recalcular TOTAL y SALDO de la orden
            SELECT PORCENTAJE_DESCUENTO INTO v_descuento_orden FROM ORDENES_TRABAJO WHERE ORDENID = p_ordenid;
            SELECT COALESCE(SUM(CANTIDAD * VALOR_UNITARIO * (1 - PORCENTAJE_DESCUENTO/100)), 0)
            INTO v_nuevo_total
            FROM ORDEN_DETALLES WHERE ORDENID = p_ordenid;
            SET v_nuevo_total = v_nuevo_total * (1 - COALESCE(v_descuento_orden, 0)/100);
            SELECT COALESCE(SUM(MONTO), 0) INTO v_total_pagos FROM TRANSACCIONES WHERE ORDENID = p_ordenid;
            UPDATE ORDENES_TRABAJO
            SET TOTAL = v_nuevo_total, SALDO_PENDIENTE = v_nuevo_total - v_total_pagos
            WHERE ORDENID = p_ordenid;
            SELECT LAST_INSERT_ID() AS DEORDENID, 'Detalle agregado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 2 : LEER detalles de una orden
    -- =============================================
    ELSEIF vcrud = 2 THEN
        SELECT D.DEORDENID, D.ORDENID, D.MATERIALID, M.NOMBRE AS MATERIAL,
               TA.NOMBRE AS TIPO_ARTICULO, D.CANTIDAD, D.VALOR_UNITARIO,
               D.PORCENTAJE_DESCUENTO, D.MARCA_APLICADA, D.OBSERVACIONES,
               (D.CANTIDAD * D.VALOR_UNITARIO * (1 - D.PORCENTAJE_DESCUENTO/100)) AS SUBTOTAL
        FROM ORDEN_DETALLES D
        INNER JOIN MATERIALES M ON D.MATERIALID = M.MATERIALID
        INNER JOIN SYS_TIPOS_ARTICULO TA ON M.TIPOARTID = TA.TIPOARTID
        WHERE D.ORDENID = p_ordenid
        ORDER BY D.DEORDENID;
    -- =============================================
    -- vcrud = 3 : LEER un detalle por ID
    -- =============================================
    ELSEIF vcrud = 3 THEN
        SELECT D.DEORDENID, D.ORDENID, D.MATERIALID, M.NOMBRE AS MATERIAL,
               TA.NOMBRE AS TIPO_ARTICULO, D.CANTIDAD, D.VALOR_UNITARIO,
               D.PORCENTAJE_DESCUENTO, D.MARCA_APLICADA, D.OBSERVACIONES,
               (D.CANTIDAD * D.VALOR_UNITARIO * (1 - D.PORCENTAJE_DESCUENTO/100)) AS SUBTOTAL
        FROM ORDEN_DETALLES D
        INNER JOIN MATERIALES M ON D.MATERIALID = M.MATERIALID
        INNER JOIN SYS_TIPOS_ARTICULO TA ON M.TIPOARTID = TA.TIPOARTID
        WHERE D.DEORDENID = p_deordenid;
    -- =============================================
    -- vcrud = 4 : ACTUALIZAR línea de detalle
    -- =============================================
    ELSEIF vcrud = 4 THEN
        -- Obtener datos anteriores del detalle
        SELECT MATERIALID, CANTIDAD INTO v_materialid_anterior, v_cantidad_anterior
        FROM ORDEN_DETALLES WHERE DEORDENID = p_deordenid;
        -- Verificar si el material anterior es servicio
        SELECT TA.NOMBRE INTO v_tipo_nombre
        FROM MATERIALES M
        INNER JOIN SYS_TIPOS_ARTICULO TA ON M.TIPOARTID = TA.TIPOARTID
        WHERE M.MATERIALID = v_materialid_anterior;
        SET v_es_servicio = IF(v_tipo_nombre = 'Servicio', 1, 0);
        -- Ajustar stock si NO es servicio y cambió la cantidad
        IF v_es_servicio = 0 AND p_cantidad IS NOT NULL AND p_cantidad != v_cantidad_anterior THEN
            -- Devolver la cantidad anterior al stock
            UPDATE MATERIALES SET STOCK = STOCK + v_cantidad_anterior WHERE MATERIALID = v_materialid_anterior;
            -- Validar nuevo stock
            SELECT COALESCE(STOCK, 0) INTO v_stock_actual FROM MATERIALES WHERE MATERIALID = COALESCE(p_materialid, v_materialid_anterior);
            IF v_stock_actual < p_cantidad THEN
                -- Revertir la devolución
                UPDATE MATERIALES SET STOCK = STOCK - v_cantidad_anterior WHERE MATERIALID = v_materialid_anterior;
                SELECT p_deordenid AS DEORDENID, v_stock_actual AS STOCK_DISPONIBLE,
                       'Stock insuficiente para la nueva cantidad' AS OMENSAJE, 0 AS OSUCCESS;
            ELSE
                -- Descontar nueva cantidad
                UPDATE MATERIALES SET STOCK = STOCK - p_cantidad WHERE MATERIALID = COALESCE(p_materialid, v_materialid_anterior);
            END IF;
        END IF;
        -- Actualizar el detalle
        UPDATE ORDEN_DETALLES
        SET MATERIALID           = COALESCE(p_materialid, MATERIALID),
            CANTIDAD             = COALESCE(p_cantidad, CANTIDAD),
            VALOR_UNITARIO       = COALESCE(p_valor_unitario, VALOR_UNITARIO),
            PORCENTAJE_DESCUENTO = COALESCE(p_porcentaje_descuento, PORCENTAJE_DESCUENTO),
            MARCA_APLICADA       = COALESCE(p_marca_aplicada, MARCA_APLICADA),
            OBSERVACIONES        = COALESCE(p_observaciones, OBSERVACIONES)
        WHERE DEORDENID = p_deordenid;
        -- Obtener el ORDENID del detalle para recalcular
        SELECT ORDENID INTO p_ordenid FROM ORDEN_DETALLES WHERE DEORDENID = p_deordenid;
        -- Recalcular TOTAL y SALDO de la orden
        SELECT PORCENTAJE_DESCUENTO INTO v_descuento_orden FROM ORDENES_TRABAJO WHERE ORDENID = p_ordenid;
        SELECT COALESCE(SUM(CANTIDAD * VALOR_UNITARIO * (1 - PORCENTAJE_DESCUENTO/100)), 0)
        INTO v_nuevo_total
        FROM ORDEN_DETALLES WHERE ORDENID = p_ordenid;
        SET v_nuevo_total = v_nuevo_total * (1 - COALESCE(v_descuento_orden, 0)/100);
        SELECT COALESCE(SUM(MONTO), 0) INTO v_total_pagos FROM TRANSACCIONES WHERE ORDENID = p_ordenid;
        UPDATE ORDENES_TRABAJO
        SET TOTAL = v_nuevo_total, SALDO_PENDIENTE = v_nuevo_total - v_total_pagos
        WHERE ORDENID = p_ordenid;
        SELECT p_deordenid AS DEORDENID, 'Detalle actualizado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
    -- =============================================
    -- vcrud = 5 : ELIMINAR línea de detalle
    -- =============================================
    ELSEIF vcrud = 5 THEN
        -- Obtener datos del detalle antes de eliminar
        SELECT ORDENID, MATERIALID, CANTIDAD INTO p_ordenid, v_materialid_anterior, v_cantidad_anterior
        FROM ORDEN_DETALLES WHERE DEORDENID = p_deordenid;
        -- Verificar si es servicio
        SELECT TA.NOMBRE INTO v_tipo_nombre
        FROM MATERIALES M
        INNER JOIN SYS_TIPOS_ARTICULO TA ON M.TIPOARTID = TA.TIPOARTID
        WHERE M.MATERIALID = v_materialid_anterior;
        SET v_es_servicio = IF(v_tipo_nombre = 'Servicio', 1, 0);
        -- Eliminar el detalle
        DELETE FROM ORDEN_DETALLES WHERE DEORDENID = p_deordenid;
        IF ROW_COUNT() > 0 THEN
            -- Devolver stock si NO es servicio
            IF v_es_servicio = 0 THEN
                UPDATE MATERIALES SET STOCK = STOCK + v_cantidad_anterior WHERE MATERIALID = v_materialid_anterior;
                INSERT INTO INVENTARIO_MOVIMIENTOS (MATERIALID, TIPO_MOVIMIENTO, CANTIDAD, MOTIVO, ORDENID)
                VALUES (v_materialid_anterior, 'ENTRADA', v_cantidad_anterior, CONCAT('Devuelto de orden #', p_ordenid, ' (detalle eliminado)'), p_ordenid);
            END IF;
            -- Recalcular TOTAL y SALDO de la orden
            SELECT PORCENTAJE_DESCUENTO INTO v_descuento_orden FROM ORDENES_TRABAJO WHERE ORDENID = p_ordenid;
            SELECT COALESCE(SUM(CANTIDAD * VALOR_UNITARIO * (1 - PORCENTAJE_DESCUENTO/100)), 0)
            INTO v_nuevo_total
            FROM ORDEN_DETALLES WHERE ORDENID = p_ordenid;
            SET v_nuevo_total = v_nuevo_total * (1 - COALESCE(v_descuento_orden, 0)/100);
            SELECT COALESCE(SUM(MONTO), 0) INTO v_total_pagos FROM TRANSACCIONES WHERE ORDENID = p_ordenid;
            UPDATE ORDENES_TRABAJO
            SET TOTAL = v_nuevo_total, SALDO_PENDIENTE = v_nuevo_total - v_total_pagos
            WHERE ORDENID = p_ordenid;
            SELECT p_deordenid AS DEORDENID, 'Detalle eliminado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSE
            SELECT p_deordenid AS DEORDENID, 'No se encontró el detalle para eliminar' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud no válido
    -- =============================================
    ELSE
        SELECT 'Valor de vcrud no válido. Use: 1=Agregar, 2=Leer por orden, 3=Leer por ID, 4=Actualizar, 5=Eliminar' AS OMENSAJE, 0 AS OSUCCESS;
    END IF;
END
