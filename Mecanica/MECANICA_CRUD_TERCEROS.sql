CREATE PROCEDURE `MECANICA_CRUD_TERCEROS`(IN IJSON LONGTEXT, IN IUSER VARCHAR(25))
BEGIN
    DECLARE data_json JSON;
    DECLARE vcrud INT;
    DECLARE p_terid INT;
    DECLARE p_documento VARCHAR(20);
    DECLARE p_nombre VARCHAR(150);
    DECLARE p_telefono VARCHAR(20);
    DECLARE p_email VARCHAR(150);
    DECLARE p_es_cliente TINYINT;
    DECLARE p_es_trabajador TINYINT;
    DECLARE p_es_proveedor TINYINT;
    -- Variables para USUARIOS
    DECLARE p_username VARCHAR(50);
    DECLARE p_password_hash VARCHAR(255);
    DECLARE p_rol VARCHAR(20);
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
    SET vcrud           = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.vcrud"));
    SET p_terid         = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.terid"));
    SET p_documento     = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.documento"));
    SET p_nombre        = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.nombre"));
    SET p_telefono      = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.telefono"));
    SET p_email         = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.email"));
    SET p_es_cliente    = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.es_cliente"));
    SET p_es_trabajador = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.es_trabajador"));
    SET p_es_proveedor  = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.es_proveedor"));
    SET p_username      = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.username"));
    SET p_password_hash = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.password_hash"));
    SET p_rol           = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.rol"));
    -- =============================================
    -- vcrud = 1 : CREAR un nuevo tercero
    -- =============================================
    IF vcrud = 1 THEN
        INSERT INTO TERCEROS (DOCUMENTO, NOMBRE, TELEFONO, EMAIL, ES_CLIENTE, ES_TRABAJADOR, ES_PROVEEDOR)
        VALUES (p_documento, p_nombre, p_telefono, p_email, p_es_cliente, p_es_trabajador, p_es_proveedor);
        SELECT LAST_INSERT_ID() AS TERID, 'Tercero creado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
    -- =============================================
    -- vcrud = 2 : LEER todos los terceros
    -- =============================================
    ELSEIF vcrud = 2 THEN
        SELECT TERID, DOCUMENTO, NOMBRE, TELEFONO, EMAIL, ES_CLIENTE, ES_TRABAJADOR, ES_PROVEEDOR
        FROM TERCEROS
        ORDER BY TERID;
    -- =============================================
    -- vcrud = 3 : LEER un tercero por ID
    -- =============================================
    ELSEIF vcrud = 3 THEN
        SELECT TERID, DOCUMENTO, NOMBRE, TELEFONO, EMAIL, ES_CLIENTE, ES_TRABAJADOR, ES_PROVEEDOR
        FROM TERCEROS
        WHERE TERID = p_terid;
    -- =============================================
    -- vcrud = 4 : ACTUALIZAR un tercero
    -- =============================================
    ELSEIF vcrud = 4 THEN
        UPDATE TERCEROS
        SET DOCUMENTO     = COALESCE(p_documento, DOCUMENTO),
            NOMBRE        = COALESCE(p_nombre, NOMBRE),
            TELEFONO      = COALESCE(p_telefono, TELEFONO),
            EMAIL         = COALESCE(p_email, EMAIL),
            ES_CLIENTE    = COALESCE(p_es_cliente, ES_CLIENTE),
            ES_TRABAJADOR = COALESCE(p_es_trabajador, ES_TRABAJADOR),
            ES_PROVEEDOR  = COALESCE(p_es_proveedor, ES_PROVEEDOR)
        WHERE TERID = p_terid;
        IF ROW_COUNT() > 0 THEN
            SELECT p_terid AS TERID, 'Tercero actualizado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSE
            SELECT p_terid AS TERID, 'No se encontró el tercero para actualizar' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 5 : ELIMINAR un tercero
    -- =============================================
    ELSEIF vcrud = 5 THEN
        -- Validar que no tenga vehículos asociados
        SELECT COUNT(*) INTO v_count FROM VEHICULOS WHERE TERID = p_terid;
        IF v_count > 0 THEN
            SELECT p_terid AS TERID, 'No se puede eliminar: tiene vehículos asociados' AS OMENSAJE, 0 AS OSUCCESS;
        ELSE
            -- Validar que no tenga órdenes asociadas
            SELECT COUNT(*) INTO v_count FROM ORDENES_TRABAJO WHERE CLIENTE_TERID = p_terid OR TRABAJADOR_TERID = p_terid;
            IF v_count > 0 THEN
                SELECT p_terid AS TERID, 'No se puede eliminar: tiene órdenes de trabajo asociadas' AS OMENSAJE, 0 AS OSUCCESS;
            ELSE
                -- Eliminar usuario si existe
                DELETE FROM USUARIOS WHERE TERID = p_terid;
                -- Eliminar tercero
                DELETE FROM TERCEROS WHERE TERID = p_terid;
                IF ROW_COUNT() > 0 THEN
                    SELECT p_terid AS TERID, 'Tercero eliminado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
                ELSE
                    SELECT p_terid AS TERID, 'No se encontró el tercero para eliminar' AS OMENSAJE, 0 AS OSUCCESS;
                END IF;
            END IF;
        END IF;
    -- =============================================
    -- vcrud = 6 : CREAR USUARIO para un tercero
    -- =============================================
    ELSEIF vcrud = 6 THEN
        -- Validar que el tercero exista
        SELECT COUNT(*) INTO v_count FROM TERCEROS WHERE TERID = p_terid;
        IF v_count = 0 THEN
            SELECT p_terid AS TERID, 'El tercero no existe' AS OMENSAJE, 0 AS OSUCCESS;
        ELSE
            -- Validar que no tenga usuario ya
            SELECT COUNT(*) INTO v_count FROM USUARIOS WHERE TERID = p_terid;
            IF v_count > 0 THEN
                SELECT p_terid AS TERID, 'El tercero ya tiene un usuario asignado' AS OMENSAJE, 0 AS OSUCCESS;
            ELSE
                INSERT INTO USUARIOS (TERID, USERNAME, PASSWORD_HASH)
                VALUES (p_terid, p_username, p_password_hash);
                SELECT LAST_INSERT_ID() AS USUID, p_terid AS TERID, 'Usuario creado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
            END IF;
        END IF;
    -- =============================================
    -- vcrud = 7 : LOGIN (validar credenciales)
    -- =============================================
    ELSEIF vcrud = 7 THEN
        SELECT U.USUID, U.TERID, U.USERNAME, T.NOMBRE, T.DOCUMENTO, T.EMAIL,
               T.ES_CLIENTE, T.ES_TRABAJADOR, T.ES_PROVEEDOR
        FROM USUARIOS U
        INNER JOIN TERCEROS T ON U.TERID = T.TERID
        WHERE U.USERNAME = p_username AND U.PASSWORD_HASH = p_password_hash;
        -- Si no encontró filas, el result set viene vacío, la app lo maneja
    -- =============================================
    -- vcrud = 8 : ACTUALIZAR USUARIO
    -- =============================================
    ELSEIF vcrud = 8 THEN
        UPDATE USUARIOS
        SET USERNAME      = COALESCE(p_username, USERNAME),
            PASSWORD_HASH = COALESCE(p_password_hash, PASSWORD_HASH)
        WHERE TERID = p_terid;
        IF ROW_COUNT() > 0 THEN
            SELECT p_terid AS TERID, 'Usuario actualizado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSE
            SELECT p_terid AS TERID, 'No se encontró el usuario para actualizar' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 9 : ELIMINAR USUARIO
    -- =============================================
    ELSEIF vcrud = 9 THEN
        DELETE FROM USUARIOS WHERE TERID = p_terid;
        IF ROW_COUNT() > 0 THEN
            SELECT p_terid AS TERID, 'Usuario eliminado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSE
            SELECT p_terid AS TERID, 'No se encontró el usuario para eliminar' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 10 : LEER TERCEROS POR ROL
    -- =============================================
    ELSEIF vcrud = 10 THEN
        -- p_rol puede ser 'cliente', 'trabajador' o 'proveedor'
        IF p_rol = 'cliente' THEN
            SELECT TERID, DOCUMENTO, NOMBRE, TELEFONO, EMAIL, ES_CLIENTE, ES_TRABAJADOR, ES_PROVEEDOR
            FROM TERCEROS WHERE ES_CLIENTE = 1 ORDER BY NOMBRE;
        ELSEIF p_rol = 'trabajador' THEN
            SELECT TERID, DOCUMENTO, NOMBRE, TELEFONO, EMAIL, ES_CLIENTE, ES_TRABAJADOR, ES_PROVEEDOR
            FROM TERCEROS WHERE ES_TRABAJADOR = 1 ORDER BY NOMBRE;
        ELSEIF p_rol = 'proveedor' THEN
            SELECT TERID, DOCUMENTO, NOMBRE, TELEFONO, EMAIL, ES_CLIENTE, ES_TRABAJADOR, ES_PROVEEDOR
            FROM TERCEROS WHERE ES_PROVEEDOR = 1 ORDER BY NOMBRE;
        ELSE
            SELECT 'Rol no válido. Use: cliente, trabajador o proveedor' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud no válido
    -- =============================================
    ELSE
        SELECT 'Valor de vcrud no válido. Use: 1=Crear, 2=Leer todos, 3=Leer ID, 4=Actualizar, 5=Eliminar, 6=Crear usuario, 7=Login, 8=Actualizar usuario, 9=Eliminar usuario, 10=Leer por rol' AS OMENSAJE, 0 AS OSUCCESS;
    END IF;
END

