-- 1
INSERT INTO `sys_estados_orden` VALUES (1,'EN ESPERA'),(2,'MANTENIMIENTO'),(3,'TERMINADO');

INSERT INTO `sys_tipos_articulo` VALUES (1,'SERVICIO'),(2,'PRODUCTO');

INSERT INTO `terceros` VALUES (1,'000000000','Administrador Principal','3000000000','admin@taller.com',0,0,0,1),(4,'10354','Daniel Mendoza','3005465656','daniel@prueba.com',1,0,0,0),(5,'138282','JOSE RAMON','3124556578','JOSE@prueba.com',0,1,0,0);


-- 2
INSERT INTO `usuarios` VALUES (1,1,'admin','123'),(2,4,'terid4','123'),(3,5,'terid5','123');

INSERT INTO `vehiculos` VALUES (1,4,'XTZ35P','PULSAR','NS',2026,'NEGRO');

INSERT INTO `materiales` VALUES (1,1,'MANTENIMIENTO GENERAL','Revision, mantenimiento, cambios de repuesto.',800000.00,0),(2,2,'ACEITE DISCOVERT','ACEITE',40000.00,28);


-- 3
INSERT INTO `ordenes_trabajo` VALUES (1,4,5,1,1,3550,'2026-03-11 20:59:30','2026-03-11 21:28:50','2026-03-14 14:00:00',NULL,'MANTENIMIENTO',0.00,120000.00,0.00),(2,4,5,1,1,3500,'2026-03-11 21:06:52','2026-03-11 21:29:59','2026-03-16 09:04:00',NULL,'todo',0.00,120000.00,80000.00);


-- 4
INSERT INTO `orden_detalles` VALUES (1,2,2,1,40000.00,0.00,NULL,NULL),(2,1,2,2,40000.00,0.00,NULL,NULL),(3,2,2,1,40000.00,0.00,NULL,NULL),(4,2,2,1,40000.00,0.00,NULL,NULL),(5,1,2,1,40000.00,0.00,NULL,NULL);

INSERT INTO `transacciones` VALUES (1,2,40000.00,'App_Pasarela','App','2026-03-11 21:06:52','PAGO-SIM-1773281212959'),(2,1,80000.00,'Efectivo','Fisico','2026-03-11 21:16:45','null'),(3,1,40000.00,'Efectivo','Fisico','2026-03-11 21:28:50','null');


-- 5
INSERT INTO `inventario_movimientos` VALUES (1,2,'SALIDA',1,'2026-03-11 21:06:52','Usado en orden #2',2),(2,2,'SALIDA',2,'2026-03-11 21:11:55','Usado en orden #1',1),(3,2,'SALIDA',1,'2026-03-11 21:13:22','Usado en orden #2',2),(4,2,'SALIDA',1,'2026-03-11 21:16:12','Usado en orden #2',2),(5,2,'SALIDA',1,'2026-03-11 21:28:39','Usado en orden #1',1);
