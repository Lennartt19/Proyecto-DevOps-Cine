// src/services/pdfService.js - VERSIÓN CON FORMATO CORREGIDO
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

class PDFService {
    constructor() {
        this.tempDir = path.join(__dirname, '../../temp');
        this.ensureTempDir();
    }

    async ensureTempDir() {
        try {
            await fs.access(this.tempDir);
        } catch {
            await fs.mkdir(this.tempDir, { recursive: true });
        }
    }

    /**
     * 🔧 MÉTODO AUXILIAR: Resetear estilo de texto por defecto
     */
    resetTextStyle(doc) {
        doc.fontSize(12)
           .fillColor('#2d3748')
           .font('Helvetica');
        return doc;
    }

    /**
     * Generar reporte de ventas en PDF
     */
    async generateVentasReportPDF(reportData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Header
                this.addHeader(doc, 'REPORTE DE VENTAS', reportData.periodo);

                // Resumen ejecutivo
                this.addSection(doc, 'RESUMEN EJECUTIVO');
                const resumen = reportData.resumen || {};
                
                this.resetTextStyle(doc) // 🔧 Resetear estilo
                   .text(`Total de Órdenes: ${resumen.totalOrdenes || 0}`, { align: 'left' })
                   .text(`Ingresos Totales: $${(resumen.totalIngresos || 0).toFixed(2)}`)
                   .text(`Subtotal: $${(resumen.totalSubtotal || 0).toFixed(2)}`)
                   .text(`Impuestos: $${(resumen.totalImpuestos || 0).toFixed(2)}`)
                   .text(`Ticket Promedio: $${(resumen.promedioTicket || 0).toFixed(2)}`)
                   .moveDown();

                // Tabla de ventas por día
                this.addSection(doc, 'VENTAS POR DÍA');
                this.addVentasTable(doc, reportData.ventasPorDia || []);

                // Footer
                this.addFooter(doc);

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generar reporte de películas en PDF
     */
    async generatePeliculasReportPDF(reportData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Header
                this.addHeader(doc, 'REPORTE DE PELÍCULAS POPULARES');

                // Estadísticas generales
                this.addSection(doc, 'ESTADÍSTICAS GENERALES');
                const stats = reportData.estadisticas || {};
                
                this.resetTextStyle(doc) // 🔧 Resetear estilo
                   .text(`Total de Películas: ${stats.totalPeliculas || 0}`)
                   .text(`Total Entradas Vendidas: ${stats.totalEntradas || 0}`)
                   .text(`Ingresos Generados: $${(stats.totalIngresos || 0).toFixed(2)}`)
                   .text(`Rating Promedio: ${(stats.ratingPromedio || 0).toFixed(1)}/10`)
                   .text(`Precio Promedio: $${(stats.precioPromedio || 0).toFixed(2)}`)
                   .moveDown();

                // Top películas
                this.addSection(doc, 'TOP PELÍCULAS MÁS POPULARES');
                this.addPeliculasTable(doc, (reportData.peliculas || []).slice(0, 10));

                // Distribución por géneros
                this.addSection(doc, 'DISTRIBUCIÓN POR GÉNEROS');
                this.addGenerosTable(doc, reportData.generos || []);

                this.addFooter(doc);
                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 🔧 CORREGIDO: Generar reporte del bar en PDF
     */
    async generateBarReportPDF(reportData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Header
                this.addHeader(doc, 'REPORTE DEL BAR');

                // Estadísticas del bar
                this.addSection(doc, 'ESTADÍSTICAS DEL BAR');
                const stats = reportData.estadisticas || {};
                
                this.resetTextStyle(doc) // 🔧 Resetear estilo
                   .text(`Total de Productos: ${stats.totalProductos || 0}`)
                   .text(`Total de Ventas: ${stats.totalVentas || 0}`)
                   .text(`Ingresos Totales: $${(stats.totalIngresos || 0).toFixed(2)}`)
                   .text(`Cantidad Vendida: ${stats.cantidadVendida || 0} unidades`)
                   .text(`Precio Promedio: $${(stats.precioPromedio || 0).toFixed(2)}`)
                   .moveDown();

                // Top productos
                this.addSection(doc, 'PRODUCTOS MÁS VENDIDOS');
                this.addBarProductsTable(doc, (reportData.productos || []).slice(0, 10));

                // Análisis por categorías
                this.addSection(doc, 'ANÁLISIS POR CATEGORÍAS');
                this.addCategoriasTable(doc, reportData.categorias || []);

                // Análisis de combos
                this.addSection(doc, 'ANÁLISIS DE COMBOS VS INDIVIDUALES');
                const combos = reportData.analisisCombos || {};
                
                // Verificar espacio en página
                if (doc.y > 650) {
                    doc.addPage();
                }
                
                // 🔧 CORREGIDO: Resetear estilo antes de escribir texto
                this.resetTextStyle(doc)
                   .text(`Productos Combo: ${combos.totalCombos || 0}`, 50, doc.y)
                   .text(`Productos Individuales: ${combos.totalIndividuales || 0}`)
                   .text(`Ventas de Combos: ${combos.ventasCombos || 0}`)
                   .text(`Ventas Individuales: ${combos.ventasIndividuales || 0}`)
                   .text(`Ingresos Combos: $${(combos.ingresosCombos || 0).toFixed(2)}`)
                   .text(`Ingresos Individuales: $${(combos.ingresosIndividuales || 0).toFixed(2)}`);

                this.addFooter(doc);
                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generar reporte de usuarios en PDF
     */
    async generateUsuariosReportPDF(reportData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Header
                this.addHeader(doc, 'REPORTE DE USUARIOS');

                // Estadísticas de usuarios
                this.addSection(doc, 'ESTADÍSTICAS DE USUARIOS');
                const stats = reportData.estadisticas || {};
                
                this.resetTextStyle(doc) // 🔧 Resetear estilo
                   .text(`Total de Usuarios: ${stats.totalUsuarios || 0}`)
                   .text(`Total de Compras: ${stats.totalCompras || 0}`)
                   .text(`Total Gastado: $${(stats.totalGastado || 0).toFixed(2)}`)
                   .text(`Total de Puntos: ${stats.totalPuntos || 0}`)
                   .text(`Total Referidos: ${stats.totalReferidos || 0}`)
                   .text(`Gasto Promedio: $${(stats.promedioGasto || 0).toFixed(2)}`)
                   .text(`Compras Promedio: ${(stats.promedioCompras || 0).toFixed(1)}`)
                   .moveDown();

                // Top usuarios
                this.addSection(doc, 'TOP USUARIOS POR GASTO');
                this.addUsuariosTable(doc, (reportData.usuarios || []).slice(0, 15));

                // Categorías de clientes
                this.addSection(doc, 'DISTRIBUCIÓN POR CATEGORÍAS');
                this.addCategoriasClienteTable(doc, reportData.categorias || []);

                this.addFooter(doc);
                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 🔧 CORREGIDO: Generar reporte combinado (Cine + Bar) en PDF
     */
    async generateReporteCombinado(reportData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Header
                this.addHeader(doc, 'REPORTE COMBINADO (CINE + BAR)');

                // Resumen combinado
                this.addSection(doc, 'RESUMEN EJECUTIVO COMBINADO');
                const resumen = reportData.resumenCombinado || {};
                
                this.resetTextStyle(doc) // 🔧 Resetear estilo
                   .text(`Ingresos Totales: $${(resumen.ingresosTotales || 0).toFixed(2)}`)
                   .text(`Ingresos Películas: $${(resumen.totalIngresosPeliculas || 0).toFixed(2)}`)
                   .text(`Ingresos Bar: $${(resumen.totalIngresosBar || 0).toFixed(2)}`)
                   .text(`Entradas Vendidas: ${resumen.entradasVendidas || 0}`)
                   .text(`Productos Vendidos: ${resumen.productosVendidos || 0}`)
                   .text(`Películas Activas: ${resumen.peliculasActivas || 0}`)
                   .text(`Productos Activos: ${resumen.productosActivos || 0}`)
                   .moveDown();

                // Análisis comparativo
                this.addSection(doc, 'ANÁLISIS COMPARATIVO');
                const porcentajePeliculas = resumen.ingresosTotales > 0 ? 
                    ((resumen.totalIngresosPeliculas / resumen.ingresosTotales) * 100).toFixed(1) : 0;
                const porcentajeBar = resumen.ingresosTotales > 0 ? 
                    ((resumen.totalIngresosBar / resumen.ingresosTotales) * 100).toFixed(1) : 0;

                this.resetTextStyle(doc) // 🔧 Resetear estilo
                   .fontSize(11)
                   .text(`• Películas representan el ${porcentajePeliculas}% de los ingresos`)
                   .text(`• Bar representa el ${porcentajeBar}% de los ingresos`)
                   .text(`• Ratio Entradas/Productos: ${resumen.entradasVendidas}/${resumen.productosVendidos}`)
                   .moveDown();

                // Sección de películas (top 5)
                if (reportData.peliculas && reportData.peliculas.peliculas) {
                    this.addSection(doc, 'TOP 5 PELÍCULAS MÁS POPULARES');
                    this.addPeliculasTable(doc, reportData.peliculas.peliculas.slice(0, 5));
                }

                // Sección del bar (top 5)
                if (reportData.bar && reportData.bar.productos) {
                    this.addSection(doc, 'TOP 5 PRODUCTOS DEL BAR');
                    this.addBarProductsTable(doc, reportData.bar.productos.slice(0, 5));
                }

                // Recomendaciones estratégicas
                this.addSection(doc, 'RECOMENDACIONES ESTRATÉGICAS');
                
                // Verificar espacio en página
                if (doc.y > 650) {
                    doc.addPage();
                }
                
                // 🔧 CORREGIDO: Resetear estilo antes de escribir recomendaciones
                this.resetTextStyle(doc)
                   .fontSize(10)
                   .text(`• ${porcentajePeliculas > porcentajeBar ? 'Enfocar marketing en experiencia cinematográfica' : 'Potenciar ventas del bar con promociones'}`, 50, doc.y)
                   .text(`• ${resumen.entradasVendidas > resumen.productosVendidos ? 'Implementar combos película + snack' : 'Analizar preferencias de consumo'}`)
                   .text(`• Evaluar horarios pico para optimizar oferta del bar`)
                   .text(`• Considerar productos temáticos según géneros populares`);

                this.addFooter(doc);
                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generar reporte ejecutivo completo en PDF
     */
    async generateReporteEjecutivoPDF(reportData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Header principal
                this.addHeader(doc, 'REPORTE EJECUTIVO COMPLETO', null, true);

                // Resumen ejecutivo
                this.addSection(doc, 'RESUMEN EJECUTIVO');
                const resumen = reportData.resumenEjecutivo || {};
                
                this.resetTextStyle(doc) // 🔧 Resetear estilo
                   .text(`Total de Ingresos: $${(resumen.totalIngresos || 0).toFixed(2)}`)
                   .text(`Total de Órdenes: ${resumen.totalOrdenes || 0}`)
                   .text(`Ticket Promedio: $${(resumen.ticketPromedio || 0).toFixed(2)}`)
                   .text(`Películas Activas: ${resumen.peliculasActivas || 0}`)
                   .text(`Productos del Bar: ${resumen.productosBar || 0}`)
                   .text(`Usuarios Activos: ${resumen.usuariosActivos || 0}`)
                   .moveDown();

                // Sección de ventas (resumen)
                if (reportData.ventas && reportData.ventas.resumen) {
                    doc.addPage();
                    this.addSection(doc, 'ANÁLISIS DE VENTAS');
                    const ventasResumen = reportData.ventas.resumen;
                    this.resetTextStyle(doc) // 🔧 Resetear estilo
                       .fontSize(11)
                       .text(`Órdenes Totales: ${ventasResumen.totalOrdenes || 0}`)
                       .text(`Ingresos Totales: $${(ventasResumen.totalIngresos || 0).toFixed(2)}`)
                       .text(`Impuestos: $${(ventasResumen.totalImpuestos || 0).toFixed(2)}`)
                       .moveDown();
                }

                // Top películas (resumen)
                if (reportData.peliculas && reportData.peliculas.peliculas) {
                    this.addSection(doc, 'PELÍCULAS MÁS POPULARES');
                    this.addPeliculasTable(doc, reportData.peliculas.peliculas.slice(0, 5));
                }

                // Productos del bar (resumen)
                if (reportData.bar && reportData.bar.productos) {
                    this.addSection(doc, 'TOP PRODUCTOS DEL BAR');
                    this.addBarProductsTable(doc, reportData.bar.productos.slice(0, 5));
                }

                // Usuarios top (resumen)
                if (reportData.usuarios && reportData.usuarios.usuarios) {
                    this.addSection(doc, 'TOP USUARIOS');
                    this.addUsuariosTable(doc, reportData.usuarios.usuarios.slice(0, 5));
                }

                this.addFooter(doc);
                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    // ==================== MÉTODOS AUXILIARES ====================

    addHeader(doc, title, subtitle = null, isExecutive = false) {
        const pageWidth = doc.page.width;
        
        // Logo y título principal
        doc.fontSize(20)
           .fillColor('#1a365d')
           .font('Helvetica-Bold')
           .text('PARKY FILMS', 50, 50, { align: 'center' });

        doc.fontSize(isExecutive ? 16 : 14)
           .fillColor('#2d3748')
           .font('Helvetica-Bold')
           .text(title, 50, 80, { align: 'center' });

        if (subtitle) {
            doc.fontSize(12)
               .fillColor('#718096')
               .font('Helvetica')
               .text(`Período: ${subtitle.desde} - ${subtitle.hasta}`, 50, 105, { align: 'center' });
        }

        // Fecha de generación
        doc.fontSize(10)
           .fillColor('#a0aec0')
           .font('Helvetica')
           .text(`Generado el: ${new Date().toLocaleDateString('es-ES', {
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
           })}`, 50, isExecutive ? 125 : 120, { align: 'center' });

        // Línea separadora
        doc.moveTo(50, isExecutive ? 145 : 140)
           .lineTo(pageWidth - 50, isExecutive ? 145 : 140)
           .strokeColor('#e2e8f0')
           .stroke();

        doc.moveDown(2);
    }

    addSection(doc, title) {
        // Verificar si estamos cerca del final de la página
        if (doc.y > 700) {
            doc.addPage();
        }
        
        doc.fontSize(14)
           .fillColor('#2d3748')
           .font('Helvetica-Bold')
           .text(title, 50, doc.y, { underline: true })
           .moveDown(0.5);
    }

    addVentasTable(doc, ventas) {
        if (!ventas || ventas.length === 0) {
            this.resetTextStyle(doc).fontSize(10).text('No hay datos de ventas disponibles', { style: 'italic' });
            return;
        }

        const tableTop = doc.y;
        const rowHeight = 20;
        
        // Headers
        doc.fontSize(10)
           .fillColor('#4a5568')
           .font('Helvetica-Bold')
           .text('Fecha', 50, tableTop)
           .text('Órdenes', 120, tableTop)
           .text('Ingresos', 180, tableTop)
           .text('Subtotal', 250, tableTop)
           .text('Impuestos', 320, tableTop)
           .text('Ticket Prom.', 390, tableTop);

        let currentY = tableTop + rowHeight;

        ventas.slice(0, 20).forEach((venta, index) => {
            const y = currentY + (index * rowHeight);
            
            doc.fontSize(9)
               .fillColor('#2d3748')
               .font('Helvetica')
               .text(new Date(venta.fecha).toLocaleDateString('es-ES'), 50, y)
               .text((venta.total_ordenes || 0).toString(), 120, y)
               .text(`$${(parseFloat(venta.ingresos_total) || 0).toFixed(2)}`, 180, y)
               .text(`$${(parseFloat(venta.subtotal_total) || 0).toFixed(2)}`, 250, y)
               .text(`$${(parseFloat(venta.impuestos_total) || 0).toFixed(2)}`, 320, y)
               .text(`$${(parseFloat(venta.ticket_promedio) || 0).toFixed(2)}`, 390, y);
        });

        doc.moveDown(ventas.length * 0.3 + 1);
    }

    addPeliculasTable(doc, peliculas) {
        if (!peliculas || peliculas.length === 0) {
            this.resetTextStyle(doc).fontSize(10).text('No hay datos de películas disponibles', { style: 'italic' });
            return;
        }

        const tableTop = doc.y;
        const rowHeight = 18;
        
        // Headers
        doc.fontSize(10)
           .fillColor('#4a5568')
           .font('Helvetica-Bold')
           .text('Película', 50, tableTop)
           .text('Género', 200, tableTop)
           .text('Rating', 280, tableTop)
           .text('Entradas', 330, tableTop)
           .text('Ingresos', 390, tableTop)
           .text('Popularidad', 450, tableTop);

        let currentY = tableTop + rowHeight;

        peliculas.forEach((pelicula, index) => {
            const y = currentY + (index * rowHeight);
            
            doc.fontSize(8)
               .fillColor('#2d3748')
               .font('Helvetica')
               .text(pelicula.titulo.substring(0, 20) + (pelicula.titulo.length > 20 ? '...' : ''), 50, y)
               .text(pelicula.genero || 'N/A', 200, y)
               .text((parseFloat(pelicula.rating) || 0).toFixed(1), 280, y)
               .text((parseInt(pelicula.total_entradas_vendidas) || 0).toString(), 330, y)
               .text(`${(parseFloat(pelicula.ingresos_generados) || 0).toFixed(0)}`, 390, y)
               .text(pelicula.popularidad || 'N/A', 450, y);
        });

        doc.moveDown(peliculas.length * 0.25 + 1);
    }

    addBarProductsTable(doc, productos) {
        if (!productos || productos.length === 0) {
            this.resetTextStyle(doc).fontSize(10).text('No hay datos de productos disponibles', { style: 'italic' });
            return;
        }

        const tableTop = doc.y;
        const rowHeight = 18;
        
        // Headers
        doc.fontSize(10)
           .fillColor('#4a5568')
           .font('Helvetica-Bold')
           .text('Producto', 50, tableTop)
           .text('Categoría', 180, tableTop)
           .text('Precio', 260, tableTop)
           .text('Vendido', 320, tableTop)
           .text('Cantidad', 380, tableTop)
           .text('Ingresos', 440, tableTop);

        let currentY = tableTop + rowHeight;

        productos.forEach((producto, index) => {
            const y = currentY + (index * rowHeight);
            
            doc.fontSize(8)
               .fillColor('#2d3748')
               .font('Helvetica')
               .text(producto.nombre.substring(0, 18) + (producto.nombre.length > 18 ? '...' : ''), 50, y)
               .text(producto.categoria || 'N/A', 180, y)
               .text(`${(parseFloat(producto.precio) || 0).toFixed(2)}`, 260, y)
               .text((parseInt(producto.veces_vendido) || 0).toString(), 320, y)
               .text((parseInt(producto.cantidad_total_vendida) || 0).toString(), 380, y)
               .text(`${(parseFloat(producto.ingresos_generados) || 0).toFixed(0)}`, 440, y);
        });

        doc.moveDown(productos.length * 0.25 + 1);
    }

    addUsuariosTable(doc, usuarios) {
        if (!usuarios || usuarios.length === 0) {
            this.resetTextStyle(doc).fontSize(10).text('No hay datos de usuarios disponibles', { style: 'italic' });
            return;
        }

        const tableTop = doc.y;
        const rowHeight = 18;
        
        // Headers
        doc.fontSize(10)
           .fillColor('#4a5568')
           .font('Helvetica-Bold')
           .text('Usuario', 50, tableTop)
           .text('Email', 150, tableTop)
           .text('Compras', 260, tableTop)
           .text('Gastado', 320, tableTop)
           .text('Puntos', 380, tableTop)
           .text('Categoría', 430, tableTop);

        let currentY = tableTop + rowHeight;

        usuarios.forEach((usuario, index) => {
            const y = currentY + (index * rowHeight);
            
            doc.fontSize(8)
               .fillColor('#2d3748')
               .font('Helvetica')
               .text(usuario.nombre.substring(0, 15) + (usuario.nombre.length > 15 ? '...' : ''), 50, y)
               .text(usuario.email.substring(0, 18) + (usuario.email.length > 18 ? '...' : ''), 150, y)
               .text((parseInt(usuario.total_compras) || 0).toString(), 260, y)
               .text(`${(parseFloat(usuario.total_gastado) || 0).toFixed(0)}`, 320, y)
               .text((parseInt(usuario.puntos_actuales) || 0).toString(), 380, y)
               .text(usuario.categoria_cliente || 'N/A', 430, y);
        });

        doc.moveDown(usuarios.length * 0.25 + 1);
    }

    addGenerosTable(doc, generos) {
        if (!generos || generos.length === 0) {
            this.resetTextStyle(doc).fontSize(10).text('No hay datos de géneros disponibles', 50, doc.y, { style: 'italic' });
            return;
        }

        // Verificar espacio en página
        if (doc.y > 650) {
            doc.addPage();
        }

        const tableTop = doc.y;
        const rowHeight = 18;
        
        // Headers
        doc.fontSize(10)
           .fillColor('#4a5568')
           .font('Helvetica-Bold')
           .text('Género', 50, tableTop)
           .text('Películas', 150, tableTop)
           .text('Entradas', 220, tableTop)
           .text('Ingresos', 290, tableTop)
           .text('Porcentaje', 360, tableTop);

        let currentY = tableTop + rowHeight;

        generos.forEach((genero, index) => {
            const y = currentY + (index * rowHeight);
            
            // Verificar si necesitamos nueva página
            if (y > 750) {
                doc.addPage();
                currentY = 50;
                return;
            }
            
            doc.fontSize(9)
               .fillColor('#2d3748')
               .font('Helvetica')
               .text(genero.nombre || 'N/A', 50, y)
               .text((genero.cantidad || 0).toString(), 150, y)
               .text((genero.entradas || 0).toString(), 220, y)
               .text(`${(genero.ingresos || 0).toFixed(0)}`, 290, y)
               .text(`${genero.porcentaje || 0}%`, 360, y);
        });

        doc.y = currentY + (generos.length * rowHeight) + 10;
    }

    addCategoriasTable(doc, categorias) {
        if (!categorias || categorias.length === 0) {
            this.resetTextStyle(doc).fontSize(10).text('No hay datos de categorías disponibles', 50, doc.y, { style: 'italic' });
            return;
        }

        // Verificar espacio en página
        if (doc.y > 650) {
            doc.addPage();
        }

        const tableTop = doc.y;
        const rowHeight = 18;
        
        // Headers
        doc.fontSize(10)
           .fillColor('#4a5568')
           .font('Helvetica-Bold')
           .text('Categoría', 50, tableTop)
           .text('Productos', 150, tableTop)
           .text('Ventas', 220, tableTop)
           .text('Ingresos', 290, tableTop)
           .text('% Ventas', 360, tableTop);

        let currentY = tableTop + rowHeight;

        categorias.forEach((categoria, index) => {
            const y = currentY + (index * rowHeight);
            
            // Verificar si necesitamos nueva página
            if (y > 750) {
                doc.addPage();
                currentY = 50;
                return;
            }
            
            doc.fontSize(9)
               .fillColor('#2d3748')
               .font('Helvetica')
               .text(categoria.nombre || 'N/A', 50, y)
               .text((categoria.productos || 0).toString(), 150, y)
               .text((categoria.ventas || 0).toString(), 220, y)
               .text(`${(categoria.ingresos || 0).toFixed(0)}`, 290, y)
               .text(`${categoria.porcentajeVentas || 0}%`, 360, y);
        });

        doc.y = currentY + (categorias.length * rowHeight) + 10;
    }

    addCategoriasClienteTable(doc, categorias) {
        if (!categorias || categorias.length === 0) {
            this.resetTextStyle(doc).fontSize(10).text('No hay datos de categorías de clientes disponibles', 50, doc.y, { style: 'italic' });
            return;
        }

        // Verificar espacio en página
        if (doc.y > 650) {
            doc.addPage();
        }

        const tableTop = doc.y;
        const rowHeight = 18;
        
        // Headers
        doc.fontSize(10)
           .fillColor('#4a5568')
           .font('Helvetica-Bold')
           .text('Categoría', 50, tableTop)
           .text('Usuarios', 150, tableTop)
           .text('Gasto Total', 220, tableTop)
           .text('Compras', 300, tableTop)
           .text('Porcentaje', 370, tableTop)
           .text('Gasto Prom.', 440, tableTop);

        let currentY = tableTop + rowHeight;

        categorias.forEach((categoria, index) => {
            const y = currentY + (index * rowHeight);
            
            // Verificar si necesitamos nueva página
            if (y > 750) {
                doc.addPage();
                currentY = 50;
                return;
            }
            
            doc.fontSize(9)
               .fillColor('#2d3748')
               .font('Helvetica')
               .text(categoria.nombre || 'N/A', 50, y)
               .text((categoria.cantidad || 0).toString(), 150, y)
               .text(`${(categoria.gastoTotal || 0).toFixed(0)}`, 220, y)
               .text((categoria.comprasTotal || 0).toString(), 300, y)
               .text(`${categoria.porcentaje || 0}%`, 370, y)
               .text(`${categoria.gastoPromedio || 0}`, 440, y);
        });

        doc.y = currentY + (categorias.length * rowHeight) + 10;
    }

    addFooter(doc) {
        const pageHeight = doc.page.height;
        
        // 🔧 CORREGIDO: Resetear estilo para el footer
        doc.fontSize(8)
           .fillColor('#a0aec0')
           .font('Helvetica')
           .text('ParkyFilms - Sistema de gestión de cine', 50, pageHeight - 50, {
               align: 'center'
           })
           .text('Este reporte fue generado automáticamente por el sistema', 50, pageHeight - 35, {
               align: 'center'
           });
    }
}

module.exports = new PDFService();