CREATE PROCEDURE `MECANICA_CRUD_SISTEMA`(IN IJSON LONGTEXT, IN IUSER VARCHAR(25))
BEGIN
    DECLARE data_json JSON;
    DECLARE vcrud INT;
    DECLARE p_tabla VARCHAR(20);
    DECLARE p_id INT;
    DECLARE p_nombre VARCHAR(50);
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
    SET vcrud    = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.vcrud"));
    SET p_tabla  = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.tabla"));
    SET p_id     = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.id"));
    SET p_nombre = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.nombre"));
    -- =============================================
    -- TABLA: SYS_TIPOS_ARTICULO
    -- =============================================
    IF p_tabla = 'TIPOS_ARTICULO' THEN
        IF vcrud = 1 THEN
            INSERT INTO SYS_TIPOS_ARTICULO (NOMBRE) VALUES (p_nombre);
            SELECT LAST_INSERT_ID() AS TIPOARTID, 'Tipo de artículo creado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSEIF vcrud = 2 THEN
            SELECT TIPOARTID, NOMBRE FROM SYS_TIPOS_ARTICULO ORDER BY TIPOARTID;
        ELSEIF vcrud = 3 THEN
            SELECT TIPOARTID, NOMBRE FROM SYS_TIPOS_ARTICULO WHERE TIPOARTID = p_id;
        ELSEIF vcrud = 4 THEN
            UPDATE SYS_TIPOS_ARTICULO SET NOMBRE = p_nombre WHERE TIPOARTID = p_id;
            IF ROW_COUNT() > 0 THEN
                SELECT p_id AS TIPOARTID, 'Tipo de artículo actualizado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
            ELSE
                SELECT p_id AS TIPOARTID, 'No se encontró el tipo de artículo' AS OMENSAJE, 0 AS OSUCCESS;
            END IF;
        ELSEIF vcrud = 5 THEN
            -- Validar que no esté en uso
            SELECT COUNT(*) INTO v_count FROM MATERIALES WHERE TIPOARTID = p_id;
            IF v_count > 0 THEN
                SELECT p_id AS TIPOARTID, 'No se puede eliminar: hay materiales usando este tipo' AS OMENSAJE, 0 AS OSUCCESS;
            ELSE
                DELETE FROM SYS_TIPOS_ARTICULO WHERE TIPOARTID = p_id;
                IF ROW_COUNT() > 0 THEN
                    SELECT p_id AS TIPOARTID, 'Tipo de artículo eliminado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
                ELSE
                    SELECT p_id AS TIPOARTID, 'No se encontró el tipo de artículo' AS OMENSAJE, 0 AS OSUCCESS;
                END IF;
            END IF;
        ELSE
            SELECT 'Valor de vcrud no válido. Use: 1=Crear, 2=Leer todos, 3=Leer ID, 4=Actualizar, 5=Eliminar' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- TABLA: SYS_ESTADOS_ORDEN
    -- =============================================
    ELSEIF p_tabla = 'ESTADOS_ORDEN' THEN
        IF vcrud = 1 THEN
            INSERT INTO SYS_ESTADOS_ORDEN (NOMBRE) VALUES (p_nombre);
            SELECT LAST_INSERT_ID() AS ESTADOID, 'Estado de orden creado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSEIF vcrud = 2 THEN
            SELECT ESTADOID, NOMBRE FROM SYS_ESTADOS_ORDEN ORDER BY ESTADOID;
        ELSEIF vcrud = 3 THEN
            SELECT ESTADOID, NOMBRE FROM SYS_ESTADOS_ORDEN WHERE ESTADOID = p_id;
        ELSEIF vcrud = 4 THEN
            UPDATE SYS_ESTADOS_ORDEN SET NOMBRE = p_nombre WHERE ESTADOID = p_id;
            IF ROW_COUNT() > 0 THEN
                SELECT p_id AS ESTADOID, 'Estado de orden actualizado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
            ELSE
                SELECT p_id AS ESTADOID, 'No se encontró el estado de orden' AS OMENSAJE, 0 AS OSUCCESS;
            END IF;
        ELSEIF vcrud = 5 THEN
            -- Validar que no esté en uso
            SELECT COUNT(*) INTO v_count FROM ORDENES_TRABAJO WHERE ESTADOID = p_id;
            IF v_count > 0 THEN
                SELECT p_id AS ESTADOID, 'No se puede eliminar: hay órdenes usando este estado' AS OMENSAJE, 0 AS OSUCCESS;
            ELSE
                DELETE FROM SYS_ESTADOS_ORDEN WHERE ESTADOID = p_id;
                IF ROW_COUNT() > 0 THEN
                    SELECT p_id AS ESTADOID, 'Estado de orden eliminado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
                ELSE
                    SELECT p_id AS ESTADOID, 'No se encontró el estado de orden' AS OMENSAJE, 0 AS OSUCCESS;
                END IF;
            END IF;
        ELSE
            SELECT 'Valor de vcrud no válido. Use: 1=Crear, 2=Leer todos, 3=Leer ID, 4=Actualizar, 5=Eliminar' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- Tabla no válida
    -- =============================================
    ELSE
        SELECT 'Tabla no válida. Use: TIPOS_ARTICULO o ESTADOS_ORDEN' AS OMENSAJE, 0 AS OSUCCESS;
    END IF;
END

