CREATE PROCEDURE `MECANICA_CRUD_VEHICULO`(IN IJSON LONGTEXT, IN IUSER VARCHAR(25))
BEGIN
    DECLARE data_json JSON;
    DECLARE vcrud INT;
    DECLARE p_vehiculoid INT;
    DECLARE p_terid INT;
    DECLARE p_placa VARCHAR(10);
    DECLARE p_marca VARCHAR(50);
    DECLARE p_modelo VARCHAR(50);
    DECLARE p_anio INT;
    DECLARE p_color VARCHAR(30);
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
    SET vcrud        = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.vcrud"));
    SET p_vehiculoid = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.vehiculoid"));
    SET p_terid      = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.terid"));
    SET p_placa      = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.placa"));
    SET p_marca      = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.marca"));
    SET p_modelo     = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.modelo"));
    SET p_anio       = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.anio"));
    SET p_color      = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.color"));
    -- =============================================
    -- vcrud = 1 : CREAR un nuevo vehículo
    -- =============================================
    IF vcrud = 1 THEN
        INSERT INTO VEHICULOS (TERID, PLACA, MARCA, MODELO, ANIO, COLOR)
        VALUES (p_terid, p_placa, p_marca, p_modelo, p_anio, p_color);
        SELECT LAST_INSERT_ID() AS VEHICULOID, 'Vehículo creado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
    -- =============================================
    -- vcrud = 2 : LEER todos los vehículos
    -- =============================================
    ELSEIF vcrud = 2 THEN
        SELECT V.VEHICULOID, V.TERID, T.NOMBRE AS PROPIETARIO, V.PLACA, V.MARCA, V.MODELO, V.ANIO, V.COLOR
        FROM VEHICULOS V
        INNER JOIN TERCEROS T ON V.TERID = T.TERID
        ORDER BY V.VEHICULOID;
    -- =============================================
    -- vcrud = 3 : LEER un vehículo por ID
    -- =============================================
    ELSEIF vcrud = 3 THEN
        SELECT V.VEHICULOID, V.TERID, T.NOMBRE AS PROPIETARIO, V.PLACA, V.MARCA, V.MODELO, V.ANIO, V.COLOR
        FROM VEHICULOS V
        INNER JOIN TERCEROS T ON V.TERID = T.TERID
        WHERE V.VEHICULOID = p_vehiculoid;
    -- =============================================
    -- vcrud = 4 : ACTUALIZAR un vehículo
    -- =============================================
    ELSEIF vcrud = 4 THEN
        UPDATE VEHICULOS
        SET TERID  = COALESCE(p_terid, TERID),
            PLACA  = COALESCE(p_placa, PLACA),
            MARCA  = COALESCE(p_marca, MARCA),
            MODELO = COALESCE(p_modelo, MODELO),
            ANIO   = COALESCE(p_anio, ANIO),
            COLOR  = COALESCE(p_color, COLOR)
        WHERE VEHICULOID = p_vehiculoid;
        IF ROW_COUNT() > 0 THEN
            SELECT p_vehiculoid AS VEHICULOID, 'Vehículo actualizado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSE
            SELECT p_vehiculoid AS VEHICULOID, 'No se encontró el vehículo para actualizar' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 5 : ELIMINAR un vehículo
    -- =============================================
    ELSEIF vcrud = 5 THEN
        -- Validar que no tenga órdenes de trabajo asociadas
        SELECT COUNT(*) INTO v_count FROM ORDENES_TRABAJO WHERE VEHICULOID = p_vehiculoid;
        IF v_count > 0 THEN
            SELECT p_vehiculoid AS VEHICULOID, 'No se puede eliminar: tiene órdenes de trabajo asociadas' AS OMENSAJE, 0 AS OSUCCESS;
        ELSE
            DELETE FROM VEHICULOS WHERE VEHICULOID = p_vehiculoid;
            IF ROW_COUNT() > 0 THEN
                SELECT p_vehiculoid AS VEHICULOID, 'Vehículo eliminado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
            ELSE
                SELECT p_vehiculoid AS VEHICULOID, 'No se encontró el vehículo para eliminar' AS OMENSAJE, 0 AS OSUCCESS;
            END IF;
        END IF;
    -- =============================================
    -- vcrud = 6 : LEER vehículos por DUEÑO (TERID)
    -- =============================================
    ELSEIF vcrud = 6 THEN
        SELECT V.VEHICULOID, V.TERID, T.NOMBRE AS PROPIETARIO, V.PLACA, V.MARCA, V.MODELO, V.ANIO, V.COLOR
        FROM VEHICULOS V
        INNER JOIN TERCEROS T ON V.TERID = T.TERID
        WHERE V.TERID = p_terid
        ORDER BY V.VEHICULOID;
    -- =============================================
    -- vcrud no válido
    -- =============================================
    ELSE
        SELECT 'Valor de vcrud no válido. Use: 1=Crear, 2=Leer todos, 3=Leer ID, 4=Actualizar, 5=Eliminar, 6=Leer por dueño' AS OMENSAJE, 0 AS OSUCCESS;
    END IF;
END
