
var macImpresora = '';  //CC:78:AB:70:D6:33
var directorioArchivoConfiguracion = 'file:///storage/emulated/0/Download';
var archivoConfiguracion = 'zebra.config';
var arrBoletos=[];
var _count=0;
var contenidoZplRecibido="";
var cortarBoletoRecibido;
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
function imprimirArchivo(fileEntry, id_venta, correoelectronico, motivo,cortarBoleto) {
    cortarBoletoRecibido=cortarBoleto
    if (!motivo)
        motivo = '';

    fileEntry.file(function (file) {
        var reader = new FileReader();
        reader.onloadend = function() {
            // var contenidoZpl = this.result;
            contenidoZplRecibido=this.result;
            // contenidoZplRecibido = contenidoZpl.split('^XZ')
            arrBoletos=contenidoZplRecibido.split('^XZ');
            let i=0
            _count=0
                navigator.vibrate(500);
                ImprimirBoleto(id_venta,correoelectronico,motivo)   
        };
        reader.readAsText(file);
    }, archivoImpresionNoEncontrado);
}


function ImprimirBoleto(id_venta,correoelectronico,motivo){
    var boletoSeleccionado;
    if(cortarBoletoRecibido=="false"){
        imprimirSinCortarBoleto(id_venta,correoelectronico,motivo,contenidoZplRecibido)
        return
    }
    cordova.plugins.zbtprinter.print(macImpresora, arrBoletos[_count]+ '^XZ',
        function (success) {

            if(cortarBoletoRecibido=="true"){
                var vId=  VisualId(arrBoletos[_count])
                if(vId.trim().length>0){
                    registrarImpresion(id_venta, correoelectronico, motivo, UUID, macImpresora,vId);
                }
            }
             if(cortarBoletoRecibido=="false"){
                recorrerBoletos(id_venta,correoelectronico,motivo,UUID,macImpresora)
                return false;
             }
             
            //alert("IdVenta:"+id_venta + " correoelectronico:" +correoelectronico + " motivo:"+motivo + " UUID:"+UUID + " macImpresora:"+macImpresora )
            _count++;
            if(arrBoletos.length-1>=_count){
          
                ImprimirBoleto(id_venta,correoelectronico,motivo)
            }else{
                _count=0
                alert("Terminó la impresión de boletos")
                return false
            }
            
        }, function (fail) {
            if(arrBoletos.length-1 <_count){
                alert("Terminó venta con problemas \n\n de impresión, valide impresora")
                return false
            }
            var r = confirm("Ocurrió un error al imprimir: \n\n" + fail + "\n\nDesea reintentar?");
            if (r == true) {
                ImprimirBoleto(id_venta,correoelectronico,motivo)
            }else{
                _count++;
                if(arrBoletos.length-1 <_count){
                    alert("Terminó venta con problemas \n\n de impresión, valide impresora")
                    return false
                }
                ImprimirBoleto(id_venta,correoelectronico,motivo)
            }
        }
    );
}
function imprimirSinCortarBoleto(id_venta,correoelectronico,motivo,_boletoSeleccionado){
    cordova.plugins.zbtprinter.print(macImpresora, _boletoSeleccionado,
        function (success) {
                recorrerBoletos(id_venta,correoelectronico,motivo,UUID,macImpresora)
                return false;
        }, function (fail) {
            var r = confirm("Ocurrió un error al imprimir: \n\n" + fail + "\n\nDesea reintentar?");
            if (r == true) {
                ImprimirBoleto(id_venta,correoelectronico,motivo)
            }
        }
    );
}
function recorrerBoletos(id_venta,correoelectronico,motivo,UUID,macImpresora){
    arrBoletos.forEach(function(boleto){
        var vId=  VisualId(boleto)
        if(vId.trim().length>0){
            registrarImpresion(id_venta, correoelectronico, motivo, UUID, macImpresora,vId);
        }
      });
}
function registrarImpresion(id_venta, correoelectronico, motivo, deviceID, impresora,vId){
    var registro = { Id_Venta: id_venta, Autoriza: correoelectronico, Motivo: motivo, DeviceId: deviceID, Impresora: impresora,VisualID:vId};
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
function VisualId(boleto){
    var listaBoletos =[];
    var nuevoVisualID;
    listaBoletos=boleto.split("\n");
    if(listaBoletos.length<4)
        return ''
    for (var i = 0; i < 4; i++){
        if(listaBoletos[i].search("//")>-1){
            nuevoVisualID=listaBoletos[i];
        }
      };
    var respuesta = nuevoVisualID.replace("//","")
    return respuesta.replace("//","")
}

function archivoImpresionNoEncontrado(e){
    alert(e);
}
