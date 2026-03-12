CREATE PROCEDURE `MECANICA_CRUD_MATERIAL`(IN IJSON LONGTEXT, IN IUSER VARCHAR(25))
BEGIN
    DECLARE data_json JSON;
    DECLARE vcrud INT;
    DECLARE p_materialid INT;
    DECLARE p_tipoartid INT;
    DECLARE p_nombre VARCHAR(150);
    DECLARE p_descripcion TEXT;
    DECLARE p_precio DECIMAL(10,2);
    DECLARE p_stock INT;
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
    SET vcrud         = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.vcrud"));
    SET p_materialid  = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.materialid"));
    SET p_tipoartid   = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.tipoartid"));
    SET p_nombre      = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.nombre"));
    SET p_descripcion = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.descripcion"));
    SET p_precio      = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.precio"));
    SET p_stock       = JSON_UNQUOTE(JSON_EXTRACT(data_json, "$.stock"));
    -- =============================================
    -- vcrud = 1 : CREAR un nuevo material
    -- =============================================
    IF vcrud = 1 THEN
        INSERT INTO MATERIALES (TIPOARTID, NOMBRE, DESCRIPCION, PRECIO, STOCK)
        VALUES (p_tipoartid, p_nombre, p_descripcion, p_precio, p_stock);
        SELECT LAST_INSERT_ID() AS MATERIALID, 'Material creado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
    -- =============================================
    -- vcrud = 2 : LEER todos los materiales
    -- =============================================
    ELSEIF vcrud = 2 THEN
        SELECT M.MATERIALID, M.TIPOARTID, TA.NOMBRE AS TIPO_ARTICULO, M.NOMBRE, M.DESCRIPCION, M.PRECIO, M.STOCK
        FROM MATERIALES M
        INNER JOIN SYS_TIPOS_ARTICULO TA ON M.TIPOARTID = TA.TIPOARTID
        ORDER BY M.MATERIALID;
    -- =============================================
    -- vcrud = 3 : LEER un material por ID
    -- =============================================
    ELSEIF vcrud = 3 THEN
        SELECT M.MATERIALID, M.TIPOARTID, TA.NOMBRE AS TIPO_ARTICULO, M.NOMBRE, M.DESCRIPCION, M.PRECIO, M.STOCK
        FROM MATERIALES M
        INNER JOIN SYS_TIPOS_ARTICULO TA ON M.TIPOARTID = TA.TIPOARTID
        WHERE M.MATERIALID = p_materialid;
    -- =============================================
    -- vcrud = 4 : ACTUALIZAR un material
    -- =============================================
    ELSEIF vcrud = 4 THEN
        UPDATE MATERIALES
        SET TIPOARTID    = COALESCE(p_tipoartid, TIPOARTID),
            NOMBRE       = COALESCE(p_nombre, NOMBRE),
            DESCRIPCION  = COALESCE(p_descripcion, DESCRIPCION),
            PRECIO       = COALESCE(p_precio, PRECIO),
            STOCK        = COALESCE(p_stock, STOCK)
        WHERE MATERIALID = p_materialid;
        IF ROW_COUNT() > 0 THEN
            SELECT p_materialid AS MATERIALID, 'Material actualizado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
        ELSE
            SELECT p_materialid AS MATERIALID, 'No se encontró el material para actualizar' AS OMENSAJE, 0 AS OSUCCESS;
        END IF;
    -- =============================================
    -- vcrud = 5 : ELIMINAR un material
    -- =============================================
    ELSEIF vcrud = 5 THEN
        -- Validar que no esté en detalles de órdenes
        SELECT COUNT(*) INTO v_count FROM ORDEN_DETALLES WHERE MATERIALID = p_materialid;
        IF v_count > 0 THEN
            SELECT p_materialid AS MATERIALID, 'No se puede eliminar: está asociado a órdenes de trabajo' AS OMENSAJE, 0 AS OSUCCESS;
        ELSE
            -- Eliminar movimientos de inventario asociados
            DELETE FROM INVENTARIO_MOVIMIENTOS WHERE MATERIALID = p_materialid;
            -- Eliminar material
            DELETE FROM MATERIALES WHERE MATERIALID = p_materialid;
            IF ROW_COUNT() > 0 THEN
                SELECT p_materialid AS MATERIALID, 'Material eliminado exitosamente' AS OMENSAJE, 1 AS OSUCCESS;
            ELSE
                SELECT p_materialid AS MATERIALID, 'No se encontró el material para eliminar' AS OMENSAJE, 0 AS OSUCCESS;
            END IF;
        END IF;
    -- =============================================
    -- vcrud = 6 : LEER materiales por TIPO
    -- =============================================
    ELSEIF vcrud = 6 THEN
        SELECT M.MATERIALID, M.TIPOARTID, TA.NOMBRE AS TIPO_ARTICULO, M.NOMBRE, M.DESCRIPCION, M.PRECIO, M.STOCK
        FROM MATERIALES M
        INNER JOIN SYS_TIPOS_ARTICULO TA ON M.TIPOARTID = TA.TIPOARTID
        WHERE M.TIPOARTID = p_tipoartid
        ORDER BY M.MATERIALID;
    -- =============================================
    -- vcrud no válido
    -- =============================================
    ELSE
        SELECT 'Valor de vcrud no válido. Use: 1=Crear, 2=Leer todos, 3=Leer ID, 4=Actualizar, 5=Eliminar, 6=Leer por tipo' AS OMENSAJE, 0 AS OSUCCESS;
    END IF;
END
