CREATE PROCEDURE `MECANICA_CRUD_INVENTARIO`(IN IJSON LONGTEXT, IN IUSER VARCHAR(25))
BEGIN
    DECLARE data_json JSON;
    DECLARE vcrud INT;
    DECLARE p_movid INT;
    DECLARE p_materialid INT;
    DECLARE p_tipo_movimiento VARCHAR(10);
    DECLARE p_cantidad INT;
    DECLARE p_motivo VARCHAR(255);
    DECLARE p_ordenid INT;
    -- Variables de lógica de negocio
    DECLARE v_tipo_nombre VARCHAR(50);
    DECLARE v_stock_actual INT;
    DECLARE v_es_servicio TINYINT DEFAULT 0;
    DECLARE v_tipo_anterior VARCHAR(10);
    DECLARE v_cantidad_anterior INT;
    DECLARE v_materialid_anterior INT;
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
    SET vcrud              = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.vcrud"));
    SET p_movid            = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.movid"));
    SET p_materialid       = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.materialid"));
    SET p_tipo_movimiento  = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.tipo_movimiento"));
    SET p_cantidad         = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.cantidad"));
    SET p_motivo           = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.motivo"));
    SET p_ordenid          = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.ordenid"));
    -- =============================================
    -- vcrud = 1 : REGISTRAR movimiento de inventario
    -- =============================================
    IF vcrud = 1 THEN
        -- Verificar si es servicio
        SELECT TA.NOMBRE, COALESCE(M.STOCK, 0)
        INTO v_tipo_nombre, v_stock_actual
        FROM MATERIALES M
        INNER JOIN SYS_TIPOS_ARTICULO TA ON M.TIPOARTID = TA.TIPOARTID
        WHERE M.MATERIALID = p_materialid;
        SET v_es_servicio = IF(v_tipo_nombre = 'Servicio', 1, 0);
        IF v_es_servicio = 1 THEN
            SELECT p_materialid AS MATERIALID, 'Los servicios no manejan inventario' AS OMENSAJE, 0 AS OSUCCESS;
        ELSE
            -- Validar stock suficiente para SALIDA
            IF p_tipo_movimiento = 'SALIDA' AND v_stock_actual < p_cantidad THEN
                SELECT p_materialid AS MATERIALID, v_stock_actual AS STOCK_DISPONIBLE,
                       'Stock insuficiente para registrar la salida' AS OMENSAJE, 0 AS OSUCCESS;
            ELSE
                -- Registrar movimiento
                INSERT INTO INVENTARIO_MOVIMIENTOS (MATERIALID, TIPO_MOVIMIENTO, CANTIDAD, MOTIVO, ORDENID)
                VALUES (p_materialid, p_tipo_movimiento, p_cantidad, p_motivo, p_ordenid);
                -- Actualizar stock según tipo
                IF p_tipo_movimiento = 'ENTRADA' THEN
                    UPDATE MATERIALES SET STOCK = STOCK + p_cantidad WHERE MATERIALID = p_materialid;
                ELSEIF p_tipo_movimiento = 'SALIDA' THEN
                    UPDATE MATERIALES SET STOCK = STOCK - p_cantidad WHERE MATERIALID = p_materialid;
                ELSEIF p_tipo_movimiento = 'AJUSTE' THEN
                    UPDATE MATERIALES SET STOCK = p_cantidad WHERE MATERIALID = p_materialid;
                END IF;
                SELECT LAST_INSERT_ID() AS MOVID, p_materialid AS MATERIALID,
                       'Movimiento registrado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
            END IF;
        END IF;
    -- =============================================
    -- vcrud = 2 : VER movimientos por MATERIAL
    -- =============================================
    ELSEIF vcrud = 2 THEN
        SELECT IM.MOVID, IM.MATERIALID, M.NOMBRE AS MATERIAL,
               IM.TIPO_MOVIMIENTO, IM.CANTIDAD, IM.FECHA_MOVIMIENTO,
               IM.MOTIVO, IM.ORDENID
        FROM INVENTARIO_MOVIMIENTOS IM
        INNER JOIN MATERIALES M ON IM.MATERIALID = M.MATERIALID
        WHERE IM.MATERIALID = p_materialid
        ORDER BY IM.FECHA_MOVIMIENTO DESC;
    -- =============================================
    -- vcrud = 3 : VER movimiento por ID
    -- =============================================
    ELSEIF vcrud = 3 THEN
        SELECT IM.MOVID, IM.MATERIALID, M.NOMBRE AS MATERIAL,
               IM.TIPO_MOVIMIENTO, IM.CANTIDAD, IM.FECHA_MOVIMIENTO,
               IM.MOTIVO, IM.ORDENID
        FROM INVENTARIO_MOVIMIENTOS IM
        INNER JOIN MATERIALES M ON IM.MATERIALID = M.MATERIALID
        WHERE IM.MOVID = p_movid;
    -- =============================================
    -- vcrud = 4 : ACTUALIZAR movimiento
    -- =============================================
    ELSEIF vcrud = 4 THEN
        -- Obtener datos anteriores
        SELECT MATERIALID, TIPO_MOVIMIENTO, CANTIDAD
        INTO v_materialid_anterior, v_tipo_anterior, v_cantidad_anterior
        FROM INVENTARIO_MOVIMIENTOS WHERE MOVID = p_movid;
        -- Verificar si es servicio
        SELECT TA.NOMBRE INTO v_tipo_nombre
        FROM MATERIALES M
        INNER JOIN SYS_TIPOS_ARTICULO TA ON M.TIPOARTID = TA.TIPOARTID
        WHERE M.MATERIALID = v_materialid_anterior;
        SET v_es_servicio = IF(v_tipo_nombre = 'Servicio', 1, 0);
        IF v_es_servicio = 0 THEN
            -- Revertir el movimiento anterior
            IF v_tipo_anterior = 'ENTRADA' THEN
                UPDATE MATERIALES SET STOCK = STOCK - v_cantidad_anterior WHERE MATERIALID = v_materialid_anterior;
            ELSEIF v_tipo_anterior = 'SALIDA' THEN
                UPDATE MATERIALES SET STOCK = STOCK + v_cantidad_anterior WHERE MATERIALID = v_materialid_anterior;
            END IF;
            -- Aplicar nuevo movimiento
            SET p_tipo_movimiento = COALESCE(p_tipo_movimiento, v_tipo_anterior);
            SET p_cantidad = COALESCE(p_cantidad, v_cantidad_anterior);
            IF p_tipo_movimiento = 'ENTRADA' THEN
                UPDATE MATERIALES SET STOCK = STOCK + p_cantidad WHERE MATERIALID = COALESCE(p_materialid, v_materialid_anterior);
            ELSEIF p_tipo_movimiento = 'SALIDA' THEN
                SELECT COALESCE(STOCK, 0) INTO v_stock_actual FROM MATERIALES WHERE MATERIALID = COALESCE(p_materialid, v_materialid_anterior);
                IF v_stock_actual < p_cantidad THEN
                    -- Revertir la reversión anterior
                    IF v_tipo_anterior = 'ENTRADA' THEN
                        UPDATE MATERIALES SET STOCK = STOCK + v_cantidad_anterior WHERE MATERIALID = v_materialid_anterior;
                    ELSEIF v_tipo_anterior = 'SALIDA' THEN
                        UPDATE MATERIALES SET STOCK = STOCK - v_cantidad_anterior WHERE MATERIALID = v_materialid_anterior;
                    END IF;
                    SELECT p_movid AS MOVID, v_stock_actual AS STOCK_DISPONIBLE,
                           'Stock insuficiente para la nueva salida' AS OMENSAJE, 0 AS OSUCCESS;
                ELSE
                    UPDATE MATERIALES SET STOCK = STOCK - p_cantidad WHERE MATERIALID = COALESCE(p_materialid, v_materialid_anterior);
                END IF;
            ELSEIF p_tipo_movimiento = 'AJUSTE' THEN
                UPDATE MATERIALES SET STOCK = p_cantidad WHERE MATERIALID = COALESCE(p_materialid, v_materialid_anterior);
            END IF;
        END IF;
        -- Actualizar registro del movimiento
        UPDATE INVENTARIO_MOVIMIENTOS
        SET MATERIALID      = COALESCE(p_materialid, MATERIALID),
            TIPO_MOVIMIENTO = COALESCE(p_tipo_movimiento, TIPO_MOVIMIENTO),
            CANTIDAD        = COALESCE(p_cantidad, CANTIDAD),
            MOTIVO          = COALESCE(p_motivo, MOTIVO),
            ORDENID         = COALESCE(p_ordenid, ORDENID)
        WHERE MOVID = p_movid;
        IF ROW_COUNT() > 0 THEN
            SELECT p_movid AS MOVID, 'Movimiento actualizado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSE
            SELECT p_movid AS MOVID, 'No se encontró el movimiento para actualizar' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 5 : ELIMINAR movimiento (revertir stock)
    -- =============================================
    ELSEIF vcrud = 5 THEN
        -- Obtener datos del movimiento antes de eliminar
        SELECT MATERIALID, TIPO_MOVIMIENTO, CANTIDAD
        INTO v_materialid_anterior, v_tipo_anterior, v_cantidad_anterior
        FROM INVENTARIO_MOVIMIENTOS WHERE MOVID = p_movid;
        -- Verificar si es servicio
        SELECT TA.NOMBRE INTO v_tipo_nombre
        FROM MATERIALES M
        INNER JOIN SYS_TIPOS_ARTICULO TA ON M.TIPOARTID = TA.TIPOARTID
        WHERE M.MATERIALID = v_materialid_anterior;
        SET v_es_servicio = IF(v_tipo_nombre = 'Servicio', 1, 0);
        DELETE FROM INVENTARIO_MOVIMIENTOS WHERE MOVID = p_movid;
        IF ROW_COUNT() > 0 THEN
            -- Revertir efecto en stock solo si NO es servicio
            IF v_es_servicio = 0 THEN
                IF v_tipo_anterior = 'ENTRADA' THEN
                    -- Se había sumado stock, ahora se resta
                    UPDATE MATERIALES SET STOCK = STOCK - v_cantidad_anterior WHERE MATERIALID = v_materialid_anterior;
                ELSEIF v_tipo_anterior = 'SALIDA' THEN
                    -- Se había restado stock, ahora se devuelve
                    UPDATE MATERIALES SET STOCK = STOCK + v_cantidad_anterior WHERE MATERIALID = v_materialid_anterior;
                END IF;
                -- Para AJUSTE, no se puede revertir automáticamente (no se conoce el stock anterior)
            END IF;
            SELECT p_movid AS MOVID, 'Movimiento eliminado y stock revertido exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSE
            SELECT p_movid AS MOVID, 'No se encontró el movimiento para eliminar' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 6 : VER movimientos por ORDEN
    -- =============================================
    ELSEIF vcrud = 6 THEN
        SELECT IM.MOVID, IM.MATERIALID, M.NOMBRE AS MATERIAL,
               IM.TIPO_MOVIMIENTO, IM.CANTIDAD, IM.FECHA_MOVIMIENTO,
               IM.MOTIVO, IM.ORDENID
        FROM INVENTARIO_MOVIMIENTOS IM
        INNER JOIN MATERIALES M ON IM.MATERIALID = M.MATERIALID
        WHERE IM.ORDENID = p_ordenid
        ORDER BY IM.FECHA_MOVIMIENTO DESC;
    -- =============================================
    -- vcrud no válido
    -- =============================================
    ELSE
        SELECT 'Valor de vcrud no válido. Use: 1=Registrar, 2=Ver por material, 3=Ver por ID, 4=Actualizar, 5=Eliminar, 6=Ver por orden' AS OMENSAJE, 0 AS OSUCCESS;
    END IF;
END
