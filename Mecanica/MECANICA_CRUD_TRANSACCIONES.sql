CREATE PROCEDURE `MECANICA_CRUD_TRANSACCIONES`(IN IJSON LONGTEXT, IN IUSER VARCHAR(25))
BEGIN
    DECLARE data_json JSON;
    DECLARE vcrud INT;
    DECLARE p_transaccionid INT;
    DECLARE p_ordenid INT;
    DECLARE p_monto DECIMAL(12,2);
    DECLARE p_metodo_pago VARCHAR(20);
    DECLARE p_origen VARCHAR(10);
    DECLARE p_referencia VARCHAR(100);
    -- Variables de lógica de negocio
    DECLARE v_total_orden DECIMAL(12,2);
    DECLARE v_total_pagos DECIMAL(12,2);
    DECLARE v_saldo_actual DECIMAL(12,2);
    DECLARE v_ordenid_tx INT;
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
    SET vcrud            = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.vcrud"));
    SET p_transaccionid  = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.transaccionid"));
    SET p_ordenid        = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.ordenid"));
    SET p_monto          = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.monto"));
    SET p_metodo_pago    = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.metodo_pago"));
    SET p_origen         = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.origen"));
    SET p_referencia     = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.referencia"));
    -- =============================================
    -- vcrud = 1 : REGISTRAR PAGO
    -- =============================================
    IF vcrud = 1 THEN
        -- Obtener total de la orden y pagos existentes
        SELECT TOTAL INTO v_total_orden FROM ORDENES_TRABAJO WHERE ORDENID = p_ordenid;
        SELECT COALESCE(SUM(MONTO), 0) INTO v_total_pagos FROM TRANSACCIONES WHERE ORDENID = p_ordenid;
        SET v_saldo_actual = v_total_orden - v_total_pagos;
        -- Validar que el monto no exceda el saldo pendiente
        IF p_monto > v_saldo_actual THEN
            SELECT p_ordenid AS ORDENID, v_saldo_actual AS SALDO_PENDIENTE,
                   'El monto del pago excede el saldo pendiente' AS OMENSAJE, 0 AS OSUCCESS;
        ELSEIF p_monto <= 0 THEN
            SELECT 'El monto debe ser mayor a 0' AS OMENSAJE, 0 AS OSUCCESS;
        ELSE
            INSERT INTO TRANSACCIONES (ORDENID, MONTO, METODO_PAGO, ORIGEN, REFERENCIA)
            VALUES (p_ordenid, p_monto, p_metodo_pago, p_origen, p_referencia);
            -- Recalcular saldo pendiente
            SET v_saldo_actual = v_saldo_actual - p_monto;
            UPDATE ORDENES_TRABAJO
            SET SALDO_PENDIENTE = v_saldo_actual
            WHERE ORDENID = p_ordenid;
            SELECT LAST_INSERT_ID() AS TRANSACCIONID, p_ordenid AS ORDENID,
                   v_saldo_actual AS SALDO_PENDIENTE,
                   'Pago registrado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 2 : LEER pagos de una orden
    -- =============================================
    ELSEIF vcrud = 2 THEN
        SELECT T.TRANSACCIONID, T.ORDENID, T.MONTO, T.METODO_PAGO, T.ORIGEN,
               T.FECHA, T.REFERENCIA
        FROM TRANSACCIONES T
        WHERE T.ORDENID = p_ordenid
        ORDER BY T.FECHA DESC;
    -- =============================================
    -- vcrud = 3 : LEER un pago por ID
    -- =============================================
    ELSEIF vcrud = 3 THEN
        SELECT T.TRANSACCIONID, T.ORDENID, T.MONTO, T.METODO_PAGO, T.ORIGEN,
               T.FECHA, T.REFERENCIA
        FROM TRANSACCIONES T
        WHERE T.TRANSACCIONID = p_transaccionid;
    -- =============================================
    -- vcrud = 4 : ACTUALIZAR un pago
    -- =============================================
    ELSEIF vcrud = 4 THEN
        -- Obtener el ordenid de la transacción
        SELECT ORDENID INTO v_ordenid_tx FROM TRANSACCIONES WHERE TRANSACCIONID = p_transaccionid;
        UPDATE TRANSACCIONES
        SET MONTO       = COALESCE(p_monto, MONTO),
            METODO_PAGO = COALESCE(p_metodo_pago, METODO_PAGO),
            ORIGEN      = COALESCE(p_origen, ORIGEN),
            REFERENCIA  = COALESCE(p_referencia, REFERENCIA)
        WHERE TRANSACCIONID = p_transaccionid;
        IF ROW_COUNT() > 0 THEN
            -- Recalcular saldo pendiente de la orden
            SELECT TOTAL INTO v_total_orden FROM ORDENES_TRABAJO WHERE ORDENID = v_ordenid_tx;
            SELECT COALESCE(SUM(MONTO), 0) INTO v_total_pagos FROM TRANSACCIONES WHERE ORDENID = v_ordenid_tx;
            UPDATE ORDENES_TRABAJO
            SET SALDO_PENDIENTE = v_total_orden - v_total_pagos
            WHERE ORDENID = v_ordenid_tx;
            SELECT p_transaccionid AS TRANSACCIONID, 'Pago actualizado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSE
            SELECT p_transaccionid AS TRANSACCIONID, 'No se encontró el pago para actualizar' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 5 : ANULAR / ELIMINAR un pago
    -- =============================================
    ELSEIF vcrud = 5 THEN
        -- Obtener el ordenid antes de eliminar
        SELECT ORDENID INTO v_ordenid_tx FROM TRANSACCIONES WHERE TRANSACCIONID = p_transaccionid;
        DELETE FROM TRANSACCIONES WHERE TRANSACCIONID = p_transaccionid;
        IF ROW_COUNT() > 0 THEN
            -- Recalcular saldo pendiente de la orden
            SELECT TOTAL INTO v_total_orden FROM ORDENES_TRABAJO WHERE ORDENID = v_ordenid_tx;
            SELECT COALESCE(SUM(MONTO), 0) INTO v_total_pagos FROM TRANSACCIONES WHERE ORDENID = v_ordenid_tx;
            UPDATE ORDENES_TRABAJO
            SET SALDO_PENDIENTE = v_total_orden - v_total_pagos
            WHERE ORDENID = v_ordenid_tx;
            SELECT p_transaccionid AS TRANSACCIONID, v_ordenid_tx AS ORDENID,
                   (v_total_orden - v_total_pagos) AS SALDO_PENDIENTE,
                   'Pago anulado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSE
            SELECT p_transaccionid AS TRANSACCIONID, 'No se encontró el pago para anular' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud no válido
    -- =============================================
    ELSE
        SELECT 'Valor de vcrud no válido. Use: 1=Registrar pago, 2=Ver pagos de orden, 3=Ver pago ID, 4=Actualizar, 5=Anular' AS OMENSAJE, 0 AS OSUCCESS;
    END IF;
END

