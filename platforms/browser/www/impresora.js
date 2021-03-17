
var macImpresora = '';  //CC:78:AB:70:D6:33
var directorioArchivoConfiguracion = 'file:///storage/emulated/0/Download';
var archivoConfiguracion = 'zebra.config';

/********************* Configuración ***********************/
function configurarMacImpresora(){

    //intentamos abrir el archivo
    window.resolveLocalFileSystemURL(directorioArchivoConfiguracion + '/' + archivoConfiguracion, archivoMacImpresoraEncontrado, archivoMacImpresoraNoEncontrado);
    //alert(rutaMacImpresora);

}

//Encontrado
function archivoMacImpresoraEncontrado(fileEntry) {

    fileEntry.file( function (file) {
        var reader = new FileReader();

        reader.onloadend = function() {
            var text = this.result;
            macImpresora = text.split('\n').shift();

        };
        reader.readAsText(file); // reader.readAsText(file, 'UTF-8');
    }, function(e){alert(e);});
}



//no encontró el archivo de configuración
function archivoMacImpresoraNoEncontrado(e){
    //alert("archivo zebra.config no encontrado en Downloads:" + e);
}

function actualizarMacImpresora(mac){
    window.resolveLocalFileSystemURL(directorioArchivoConfiguracion, function (dir) {
        dir.getFile(archivoConfiguracion, { create: true }, function (file) {
            file.createWriter(function (fileWriter) {
                fileWriter.onwriteend = function() {

                    navigator.vibrate(500);

                    configurarMacImpresora();
                    alert('impresora actualizada');
                    actualizarIframe();
                };

                fileWriter.onerror = function (e) {
                    console.log("Failed file write: " + e.toString());
                };

                fileWriter.write(mac);

            }, function (err) {
                // failed
                alert(err);
            });
        });
    });
}


/*********************** Imprimir *************************/
function imprimirArchivo(fileEntry, id_venta, correoelectronico, motivo) {
    if (!motivo)
        motivo = '';

    fileEntry.file(function (file) {
        var reader = new FileReader();

        reader.onloadend = function() {
            var contenidoZpl = this.result;


            cordova.plugins.zbtprinter.print(macImpresora, contenidoZpl,
                function (success) {
                    registrarImpresion(id_venta, correoelectronico, motivo, UUID, macImpresora);
                }, function (fail) {
                    var r = confirm("Ocurrió un error al imprimir: \n\n" + fail + "\n\nDesea reintentar?");
                    if (r == true) {
                         imprimirArchivo(fileEntry);
                    }
                    //sendMessage('galaxyweb:reintentarImpresion("' + fail + '");');
                }
            );


        };

        reader.readAsText(file);

    }, archivoImpresionNoEncontrado);
}

function registrarImpresion(id_venta, correoelectronico, motivo, deviceID, impresora){

    var registro = { Id_Venta: id_venta, Autoriza: correoelectronico, Motivo: motivo, DeviceId: deviceID, Impresora: impresora };
    var json = JSON.stringify(registro);

    try {
        $.ajax({
            type: 'POST',
            data: { '': json },
            url: urlGalaxyWeb + '/api/impresion?token=' + deviceID,
            success: function(data, textStatus, jqXHR) {
                console.log(data);
                if (motivo != '') {
                    alert('impresión de venta ' + id_venta + '\n\nregistrada a:\n\n' + correoelectronico + '\n\n\n' + motivo);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert('error al insertar venta: ' + jqXHR.statusText);
            }
        });
    }
    catch (err) {
        alert(err);
    }

}


function archivoImpresionNoEncontrado(e){
    alert(e);
}
