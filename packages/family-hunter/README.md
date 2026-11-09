# Family Hunter — Análisis de familias

Responsabilidad: hipótesis causales, fingerprints, variantes **confirmadas/probables/inconclusas**, localizaciones multiarchivo y alternativas verificables.

Depende de contratos y de análisis Core; **no** incluye un motor paralelo. Los modos son:
- `REVIEW_ONLY`: solo evidencias;
- `REVIEW_WITH_SOLUTIONS`: predeterminado, lectura y propuestas;
- `REPAIR_COMMITS_AUTHORIZED`: requiere verificaciones externas y un escritor separado; NO está activado por esta estructura.

El planificador de dependencias recorre relaciones suministradas por el llamador
con un presupuesto explícito de archivos y profundidad, sin limitar la profundidad
a cuatro saltos. Admite hasta 300 archivos visitados y 10.000 relaciones de entrada;
indica si la exploración quedó incompleta por profundidad o presupuesto. El grafo
de imports puede vincular los blobs a un commit local aislado, pero los imports son
dependencias estructurales: no prueban llamadas resueltas, causalidad ni identidad
del repositorio remoto. El análisis semántico y los oráculos funcionales requieren
su propia evidencia independiente.

El planificador de afirmaciones de llamadas puede enlazar hasta 256 afirmaciones
con los blobs de hasta 64 archivos de un commit local aislado y recorrer sus
relaciones entre archivos, incluso sin imports explícitos. Verifica todos los
archivos suministrados antes de aplicar el presupuesto de recorrido. Los nombres,
las ubicaciones y el origen de las afirmaciones todavía requieren atestación
independiente del compilador; las llamadas virtuales o externas se rechazan en
esta vía. Un recorrido a nivel de archivos tampoco demuestra que las llamadas
formen una misma ruta de ejecución; ninguna relación concede autorización de
reparación.

Origen documentado: GameHub PR #177 y #194; ideas adicionales #198 y #200. **No arrastrar el PR #197 ni sus módulos de memoria en esta etapa.** Probar familias RED/GREEN y variantes antes de codificar reparaciones.
