CREATE PROCEDURE `MECANICA_CRUD_ORDENES_TRABAJOS`(IN IJSON LONGTEXT, IN IUSER VARCHAR(25))
BEGIN
    DECLARE data_json JSON;
    DECLARE vcrud INT;
    DECLARE p_ordenid INT;
    DECLARE p_cliente_terid INT;
    DECLARE p_trabajador_terid INT;
    DECLARE p_vehiculoid INT;
    DECLARE p_estadoid INT;
    DECLARE p_kilometraje_ingreso INT;
    DECLARE p_fecha_agendada DATETIME;
    DECLARE p_fecha_entrega_estimada DATETIME;
    DECLARE p_observaciones TEXT;
    DECLARE p_porcentaje_descuento DECIMAL(5,2);
    DECLARE v_count INT DEFAULT 0;
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
    SET vcrud                    = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.vcrud"));
    SET p_ordenid                = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.ordenid"));
    SET p_cliente_terid          = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.cliente_terid"));
    SET p_trabajador_terid       = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.trabajador_terid"));
    IF p_trabajador_terid = '0' OR p_trabajador_terid = '' THEN
        SET p_trabajador_terid = NULL;
    END IF;
    SET p_vehiculoid             = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.vehiculoid"));
    SET p_estadoid               = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.estadoid"));
    SET p_kilometraje_ingreso    = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.kilometraje_ingreso"));
    SET p_fecha_agendada         = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.fecha_agendada"));
    SET p_fecha_entrega_estimada = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.fecha_entrega_estimada"));
    SET p_observaciones          = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.observaciones"));
    SET p_porcentaje_descuento   = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.porcentaje_descuento"));
    -- =============================================
    -- vcrud = 1 : CREAR una nueva orden de trabajo
    -- =============================================
    IF vcrud = 1 THEN
        INSERT INTO ORDENES_TRABAJO (
            CLIENTE_TERID, TRABAJADOR_TERID, VEHICULOID, ESTADOID,
            KILOMETRAJE_INGRESO, FECHA_AGENDADA, FECHA_ENTREGA_ESTIMADA,
            OBSERVACIONES, PORCENTAJE_DESCUENTO
        )
        VALUES (
            p_cliente_terid, p_trabajador_terid, p_vehiculoid, p_estadoid,
            p_kilometraje_ingreso, p_fecha_agendada, p_fecha_entrega_estimada,
            p_observaciones, COALESCE(p_porcentaje_descuento, 0.00)
        );
        SELECT LAST_INSERT_ID() AS ORDENID, 'Orden de trabajo creada exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
    -- =============================================
    -- vcrud = 2 : LEER todas las órdenes de trabajo
    -- =============================================
    ELSEIF vcrud = 2 THEN
        SELECT
            O.ORDENID, O.CLIENTE_TERID, TC.NOMBRE AS CLIENTE,
            O.TRABAJADOR_TERID, TW.NOMBRE AS TRABAJADOR,
            O.VEHICULOID, V.PLACA, V.MARCA, V.MODELO,
            O.ESTADOID, E.NOMBRE AS ESTADO,
            O.KILOMETRAJE_INGRESO, O.FECHA_CREACION, O.FECHA_ACTUALIZACION,
            O.FECHA_AGENDADA, O.FECHA_ENTREGA_ESTIMADA,
            O.OBSERVACIONES, O.PORCENTAJE_DESCUENTO, O.TOTAL, O.SALDO_PENDIENTE
        FROM ORDENES_TRABAJO O
        INNER JOIN TERCEROS TC          ON O.CLIENTE_TERID    = TC.TERID
        LEFT  JOIN TERCEROS TW          ON O.TRABAJADOR_TERID = TW.TERID
        INNER JOIN VEHICULOS V          ON O.VEHICULOID       = V.VEHICULOID
        INNER JOIN SYS_ESTADOS_ORDEN E  ON O.ESTADOID         = E.ESTADOID
        ORDER BY O.ORDENID DESC;
    -- =============================================
    -- vcrud = 3 : LEER una orden de trabajo por ID
    -- =============================================
    ELSEIF vcrud = 3 THEN
        SELECT
            O.ORDENID, O.CLIENTE_TERID, TC.NOMBRE AS CLIENTE,
            O.TRABAJADOR_TERID, TW.NOMBRE AS TRABAJADOR,
            O.VEHICULOID, V.PLACA, V.MARCA, V.MODELO,
            O.ESTADOID, E.NOMBRE AS ESTADO,
            O.KILOMETRAJE_INGRESO, O.FECHA_CREACION, O.FECHA_ACTUALIZACION,
            O.FECHA_AGENDADA, O.FECHA_ENTREGA_ESTIMADA,
            O.OBSERVACIONES, O.PORCENTAJE_DESCUENTO, O.TOTAL, O.SALDO_PENDIENTE
        FROM ORDENES_TRABAJO O
        INNER JOIN TERCEROS TC          ON O.CLIENTE_TERID    = TC.TERID
        LEFT  JOIN TERCEROS TW          ON O.TRABAJADOR_TERID = TW.TERID
        INNER JOIN VEHICULOS V          ON O.VEHICULOID       = V.VEHICULOID
        INNER JOIN SYS_ESTADOS_ORDEN E  ON O.ESTADOID         = E.ESTADOID
        WHERE O.ORDENID = p_ordenid;
    -- =============================================
    -- vcrud = 4 : ACTUALIZAR una orden de trabajo
    -- =============================================
    ELSEIF vcrud = 4 THEN
        SELECT COUNT(*) INTO v_count FROM ORDENES_TRABAJO WHERE ORDENID = p_ordenid;
        IF v_count = 0 THEN
            SELECT p_ordenid AS ORDENID, 'No se encontró la orden de trabajo para actualizar' AS OMENSAJE, 0 AS OSUCCESS;
        ELSE
            UPDATE ORDENES_TRABAJO
            SET CLIENTE_TERID          = COALESCE(p_cliente_terid, CLIENTE_TERID),
                TRABAJADOR_TERID       = COALESCE(p_trabajador_terid, TRABAJADOR_TERID),
                VEHICULOID             = COALESCE(p_vehiculoid, VEHICULOID),
                ESTADOID               = COALESCE(p_estadoid, ESTADOID),
                KILOMETRAJE_INGRESO    = COALESCE(p_kilometraje_ingreso, KILOMETRAJE_INGRESO),
                FECHA_AGENDADA         = COALESCE(p_fecha_agendada, FECHA_AGENDADA),
                FECHA_ENTREGA_ESTIMADA = COALESCE(p_fecha_entrega_estimada, FECHA_ENTREGA_ESTIMADA),
                OBSERVACIONES          = COALESCE(p_observaciones, OBSERVACIONES),
                PORCENTAJE_DESCUENTO   = COALESCE(p_porcentaje_descuento, PORCENTAJE_DESCUENTO)
            WHERE ORDENID = p_ordenid;
            -- Siempre recalcular TOTAL y SALDO
            UPDATE ORDENES_TRABAJO
            SET TOTAL = (
                SELECT COALESCE(SUM(D.CANTIDAD * D.VALOR_UNITARIO * (1 - D.PORCENTAJE_DESCUENTO/100)), 0)
                FROM ORDEN_DETALLES D WHERE D.ORDENID = p_ordenid
            ) * (1 - COALESCE(PORCENTAJE_DESCUENTO, 0)/100),
            SALDO_PENDIENTE = TOTAL - (
                SELECT COALESCE(SUM(T.MONTO), 0)
                FROM TRANSACCIONES T WHERE T.ORDENID = p_ordenid
            )
            WHERE ORDENID = p_ordenid;
            SELECT p_ordenid AS ORDENID, 'Orden de trabajo actualizada exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 5 : ELIMINAR una orden de trabajo
    -- =============================================
    ELSEIF vcrud = 5 THEN
        -- Validar que no tenga pagos registrados
        SELECT COUNT(*) INTO v_count FROM TRANSACCIONES WHERE ORDENID = p_ordenid;
        IF v_count > 0 THEN
            SELECT p_ordenid AS ORDENID, 'No se puede eliminar: tiene transacciones/pagos registrados' AS OMENSAJE, 0 AS OSUCCESS;
        ELSE
            -- Eliminar movimientos de inventario asociados a esta orden
            DELETE FROM INVENTARIO_MOVIMIENTOS WHERE ORDENID = p_ordenid;
            -- Los detalles se eliminan en cascada (ON DELETE CASCADE)
            DELETE FROM ORDENES_TRABAJO WHERE ORDENID = p_ordenid;
            IF ROW_COUNT() > 0 THEN
                SELECT p_ordenid AS ORDENID, 'Orden de trabajo eliminada exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
            ELSE
                SELECT p_ordenid AS ORDENID, 'No se encontró la orden de trabajo para eliminar' AS OMENSAJE, 0 AS OSUCCESS;
            END IF;
        END IF;
    -- =============================================
    -- vcrud = 6 : CAMBIAR ESTADO de una orden
    -- =============================================
    ELSEIF vcrud = 6 THEN
        UPDATE ORDENES_TRABAJO
        SET ESTADOID = p_estadoid
        WHERE ORDENID = p_ordenid;
        IF ROW_COUNT() > 0 THEN
            SELECT p_ordenid AS ORDENID, p_estadoid AS ESTADOID, 'Estado actualizado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSE
            SELECT p_ordenid AS ORDENID, 'No se encontró la orden para cambiar estado' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 7 : LEER órdenes por CLIENTE
    -- =============================================
    ELSEIF vcrud = 7 THEN
        SELECT
            O.ORDENID, O.CLIENTE_TERID, TC.NOMBRE AS CLIENTE,
            O.TRABAJADOR_TERID, TW.NOMBRE AS TRABAJADOR,
            O.VEHICULOID, V.PLACA, V.MARCA, V.MODELO,
            O.ESTADOID, E.NOMBRE AS ESTADO,
            O.KILOMETRAJE_INGRESO, O.FECHA_CREACION,
            O.FECHA_AGENDADA, O.FECHA_ENTREGA_ESTIMADA,
            O.TOTAL, O.SALDO_PENDIENTE
        FROM ORDENES_TRABAJO O
        INNER JOIN TERCEROS TC          ON O.CLIENTE_TERID    = TC.TERID
        LEFT  JOIN TERCEROS TW          ON O.TRABAJADOR_TERID = TW.TERID
        INNER JOIN VEHICULOS V          ON O.VEHICULOID       = V.VEHICULOID
        INNER JOIN SYS_ESTADOS_ORDEN E  ON O.ESTADOID         = E.ESTADOID
        WHERE O.CLIENTE_TERID = p_cliente_terid
        ORDER BY O.ORDENID DESC;
    -- =============================================
    -- vcrud = 8 : LEER órdenes por TRABAJADOR
    -- =============================================
    ELSEIF vcrud = 8 THEN
        SELECT
            O.ORDENID, O.CLIENTE_TERID, TC.NOMBRE AS CLIENTE,
            O.TRABAJADOR_TERID, TW.NOMBRE AS TRABAJADOR,
            O.VEHICULOID, V.PLACA, V.MARCA, V.MODELO,
            O.ESTADOID, E.NOMBRE AS ESTADO,
            O.KILOMETRAJE_INGRESO, O.FECHA_CREACION,
            O.FECHA_AGENDADA, O.FECHA_ENTREGA_ESTIMADA,
            O.TOTAL, O.SALDO_PENDIENTE
        FROM ORDENES_TRABAJO O
        INNER JOIN TERCEROS TC          ON O.CLIENTE_TERID    = TC.TERID
        LEFT  JOIN TERCEROS TW          ON O.TRABAJADOR_TERID = TW.TERID
        INNER JOIN VEHICULOS V          ON O.VEHICULOID       = V.VEHICULOID
        INNER JOIN SYS_ESTADOS_ORDEN E  ON O.ESTADOID         = E.ESTADOID
        WHERE O.TRABAJADOR_TERID = p_trabajador_terid
        ORDER BY O.ORDENID DESC;
    -- =============================================
    -- vcrud = 9 : LEER órdenes por ESTADO
    -- =============================================
    ELSEIF vcrud = 9 THEN
        SELECT
            O.ORDENID, O.CLIENTE_TERID, TC.NOMBRE AS CLIENTE,
            O.TRABAJADOR_TERID, TW.NOMBRE AS TRABAJADOR,
            O.VEHICULOID, V.PLACA, V.MARCA, V.MODELO,
            O.ESTADOID, E.NOMBRE AS ESTADO,
            O.KILOMETRAJE_INGRESO, O.FECHA_CREACION,
            O.FECHA_AGENDADA, O.FECHA_ENTREGA_ESTIMADA,
            O.TOTAL, O.SALDO_PENDIENTE
        FROM ORDENES_TRABAJO O
        INNER JOIN TERCEROS TC          ON O.CLIENTE_TERID    = TC.TERID
        LEFT  JOIN TERCEROS TW          ON O.TRABAJADOR_TERID = TW.TERID
        INNER JOIN VEHICULOS V          ON O.VEHICULOID       = V.VEHICULOID
        INNER JOIN SYS_ESTADOS_ORDEN E  ON O.ESTADOID         = E.ESTADOID
        WHERE O.ESTADOID = p_estadoid
        ORDER BY O.ORDENID DESC;
    -- =============================================
    -- vcrud no válido
    -- =============================================
    ELSE
        SELECT 'Valor de vcrud no válido. Use: 1=Crear, 2=Leer todos, 3=Leer ID, 4=Actualizar, 5=Eliminar, 6=Cambiar estado, 7=Por cliente, 8=Por trabajador, 9=Por estado' AS OMENSAJE, 0 AS OSUCCESS;
    END IF;
END
