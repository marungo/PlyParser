//Author: Mary Ruth Ngo

//mesh.js parses a ply file. Ply file must provide
//vertices, faces and faceVertexUVs. Color is optional.

THREE.PLYLoader = function () {};

//globals
var numBytesPerXYZ = 3 * 4; //3 4-byte floats
var numBytesPerRGB = 3 * 4; //3 4-byte floats
var numBytesPerFaceVertices = 1 + 3 * 4; // 1 1-byte uchar + 3 4-byte ints
var numBytesPerFaceUVs = 1 + 6 * 4;  // 1 1-byte uchar + 6 4-byte floats

THREE.PLYLoader.prototype = {

  constructor: THREE.PLYLoader,

  load: function ( file, callback ) {
    var scope = this;
    var request = new XMLHttpRequest();

    request.addEventListener( 'load', function ( event ) {
      var geometry = scope.parse( event.target.response );
      scope.dispatchEvent( { type: 'load', content: geometry } );
      //if ( callback ) callback( geometry );
    }, false );

    request.open( 'GET', file, true );
    request.responseType = "arraybuffer";
    request.send( null );

  },


  bin2str: function (buf) {
    
    var array_buffer = new Int8Array(buf);
    var str = '';

    for (var i = 0; i < buf.byteLength; i++) {
      str += String.fromCharCode(array_buffer[i]); // implicitly assumes little-endian
    }
    return str;
  },


  isBinary: function( data ){
    
    var header = this.parseHeader( this.bin2str( data ) );
    return header.format === "binary_little_endian";
  },


  parse: function ( data ) {
    
    if (this.isBinary) {
      var geom = this.parseBinary(data);
    } else {
      console.log("not binary_little_endian format :("); 
    }
    return geom;
  },
  

  parseHeader: function ( data ) {
    
    var patternHeader = /ply([\s\S]*)end_header\n/;
    var headerText = "";

    if ( ( result = patternHeader.exec( data ) ) != null ) {
      headerText = result[0];
    }
    
    var header = new Object();
    header.comments = [];
    header.elements = [];
    
    var lines = headerText.split( '\n' );
    var currentElement = undefined;
    var lineType, lineValues;

    function make_ply_element_property( propertValues ) {
      
        var property = Object();
        property.type = propertValues[0];

        if ( property.type === "list" ) {
          
          property.name = propertValues[3];
          property.countType = propertValues[1];
          property.itemType = propertValues[2];

        } else {
          property.name = propertValues[1];
        }

      return property;
    }//end make_ply_element_property
    
    for ( var i = 0; i < lines.length; i ++ ) {

      var line = lines[ i ];
      line = line.trim()
      if ( line === "" ) { continue; }
      lineValues = line.split( /\s+/ );
      lineType = lineValues.shift()
      line = lineValues.join(" ")
      
      switch( lineType ) {

          case "ply": case "end_header":
            break;
          
          case "format":
            header.format = lineValues[0];
            header.version = lineValues[1];
            break;

          case "comment":
            header.comments.push(line);
            break;

          case "element":
            currentElement = Object();
            currentElement.name = lineValues[0];
            currentElement.count = parseInt( lineValues[1] );
            currentElement.properties = [];
            header.elements.push(currentElement);
            break;
            
          case "property":
            currentElement.properties.push ( make_ply_element_property(lineValues) );
            break;

          default:
            console.log("unhandled", lineType, lineValues);
          }
      }
    return header;
  },


  postProcess: function ( geometry ) {
    
    if ( geometry.useColor ) {
      
      for ( var i = 0; i < geometry.faces.length; i ++ ) {
        
        geometry.faces[i].vertexColors = [
          geometry.colors[geometry.faces[i].a],
          geometry.colors[geometry.faces[i].b],
          geometry.colors[geometry.faces[i].c]
        ];
      }
      
      geometry.elementsNeedUpdate = true; 
    }

    var sphere = geometry.computeBoundingSphere();

    return geometry;
  },


  handleElement: function ( geometry, elementName, elements ) {

    if ( elementName === "vertex" ) {

        geometry.vertices.push( 
          new THREE.Vector3( elements[0][0], elements[0][1], elements[0][2] )
        );

        geometry.useColor = true;
        color = new THREE.Color();
        color.setRGB( elements[1][0], elements[1][1], elements[1][2] );
        geometry.colors.push( color );

    } else if ( elementName === "face" ) {

        geometry.faces.push(
          new THREE.Face3( elements[0][0], elements[0][1], elements[0][2] )
        );

        var uvs = new THREE.Vector3();
        uvs[0] = new THREE.Vector2(elements[1][0], elements[1][1]);
        uvs[1] = new THREE.Vector2(elements[1][2], elements[1][3]);
        uvs[2] = new THREE.Vector2(elements[1][4], elements[1][5]);
        geometry.faceVertexUvs[0].push(uvs);

    }
    return geometry;
  },


  binaryRead: function ( dataview, at, type, little_endian ) {

    switch( type ) {
      // corespondences for non-specific length types here match rply:
      case 'int8':    case 'char':   return [ dataview.getInt8( at ), 1 ];
      case 'uint8':   case 'uchar':  return [ dataview.getUint8( at ), 1 ];
      case 'int16':   case 'short':  return [ dataview.getInt16( at, little_endian ), 2 ];
      case 'uint16':  case 'ushort': return [ dataview.getUint16( at, little_endian ), 2 ];
      case 'int32':   case 'int':    return [ dataview.getInt32( at, little_endian ), 4 ];
      case 'uint32':  case 'uint':   return [ dataview.getUint32( at, little_endian ), 4 ];
      case 'float32': case 'float':  return [ dataview.getFloat32( at, little_endian ), 4 ];
      case 'float64': case 'double': return [ dataview.getFloat64( at, little_endian ), 8 ];
      } 
  },

  //function to read a vertex or rbg value
  binaryReadValue: function ( currentElement, dataview, at, little_endian ) {
    
    var value = [0,0,0];
    var numB = 0;

    for (i = 0; i < 3; i++) {
      var b = this.binaryRead(dataview, at + numB, currentElement.properties[i].type, little_endian);
      value[i] = (b[0]);
      numB += b[1];
    }

    var result = [value, numB];
    return result;
  },


  binaryReadFaceVertices: function ( currentElement, dataview, at, little_endian, vertexCount ) {
    var faceVertices = [];
    var numB = 0;

    //expecting uchar
    var ucharResult = this.binaryRead(dataview, at, currentElement.properties[0].countType, little_endian);
    numB += ucharResult[1];

    if (ucharResult[0] === 3) {
      for (i = 0; i < ucharResult[0]; i++) {
        var binaryResult = this.binaryRead(dataview, at + numB, currentElement.properties[0].itemType, little_endian);
        faceVertices.push(binaryResult[0]);
        numB += binaryResult[1];
      }
    } else {
      alert("ucharResult was not 3: Please check compatibility of ply file");
    }

    var result = [faceVertices, numB];
    return result;
  },


  binaryReadTexCoords: function ( currentElement, dataview, at, little_endian ) {

    var texCoords = [];
    var numB = 0;

    //expecting uchar
    var ucharResult = this.binaryRead(dataview, at, currentElement.properties[1].countType, little_endian);
    numB += ucharResult[1];

    if (ucharResult[0] === 6) {
      for (i = 0; i < ucharResult[0]; i++) {
        var binaryResult = this.binaryRead(dataview, at + numB, currentElement.properties[1].itemType , little_endian);
        texCoords.push(binaryResult[0]);
        numB += binaryResult[1];
      }
    } else {
      alert("ucharResult was not 6: Please check compatibility of ply file");
    }

    var result = [texCoords, numB];
    return result;
  },


  parseBinary: function ( data ) {

    var geometry = new THREE.Geometry();
    var header = this.parseHeader( this.bin2str( data ) );
    var little_endian = (header.format === "binary_little_endian");
    
    //create body as DataView object to access the arraybuffer loaded as data
    var body = new DataView( data, 0);
    //counting backwards because finding exact header length was causing problems
    var bodyStart = body.byteLength - header.elements[0].count*numBytesPerXYZ - header.elements[1].count*(numBytesPerFaceVertices + numBytesPerFaceUVs);
    
    //if RGBs are present
    if (header.elements[0].properties.length > 3) {
      bodyStart = bodyStart - header.elements[0].count*numBytesPerRGB;
    }

    //rebuild body with new DataView excluding header
    body = new DataView(data, bodyStart);
    var loc = 0;

    for ( currentElement = 0; currentElement < header.elements.length ; currentElement ++ ) {
      for ( currentElementCount = 0; currentElementCount < header.elements[currentElement].count ; currentElementCount ++ ) {
          if (header.elements[currentElement].name == 'vertex') {//handles vertices and vertex colors

              //vertices
              var vector3 = this.binaryReadValue(header.elements[currentElement], body, loc, little_endian);
              loc += vector3[1];//3 floats worth of bytes: 12

              //if rgbs are present
              var rbg = [ [0,0,0] , 0];
              if (header.elements[currentElement].properties.length > 3) {
                rbg = this.binaryReadValue(header.elements[currentElement], body, loc, little_endian);
                loc += rbg[1];
              }

              var vertexProperties = [vector3[0], rbg[0]];
              this.handleElement (geometry, header.elements[currentElement].name, vertexProperties);

          } else if (header.elements[currentElement].name == 'face') {//handles faces and face UVs

              //face vertices
              if (header.elements[currentElement].properties[0].name == 'vertex_indices') {
                  var faceVertices = this.binaryReadFaceVertices(header.elements[currentElement], body, loc, little_endian, header.elements[0].count);
                  loc += faceVertices[1];//1 uchar + 3 ints worth of bytes: 13
              } else {
                  alert('header did not read vertex_indices');
              }

              //texture coordinates
              if (header.elements[currentElement].properties[1].name == 'texcoord') {
                  var texCoords = this.binaryReadTexCoords(header.elements[currentElement], body, loc, little_endian);
                  loc += texCoords[1];//6 floats + 1 uchar worth of bytes: 25
              } else {
                  alert('header did not read texcoord');
              }

              var element = [faceVertices[0], texCoords[0]];
              this.handleElement(geometry, header.elements[currentElement].name, element);
          }
      }
    }
    return this.postProcess( geometry );
  }
};

THREE.EventDispatcher.prototype.apply( THREE.PLYLoader.prototype );

function buildAxis() {
  var axis = new THREE.Object3D();

  //origin
  var geom = new THREE.SphereGeometry(.2);
  var mat = new THREE.MeshBasicMaterial();
  var mesh = new THREE.Mesh(geom, mat);

  var axisGeom = new THREE.BoxGeometry(.2, 5, .2);
  //x axis is bright pink
  var xMat = new THREE.MeshBasicMaterial({color: 0xFF69B4});
  //y axis is bright blue
  var yMat = new THREE.MeshBasicMaterial({color: 0x4169E1});
  //z axis it bright green
  var zMat = new THREE.MeshBasicMaterial({color: 0x32CD32});


  var xAxis = new THREE.Mesh(axisGeom, xMat);
  xAxis.rotation.z = -Math.PI/2;
  xAxis.position.x = 2.5;

  var yAxis = new THREE.Mesh(axisGeom, yMat);
  yAxis.position.y = 2.5;

  var zAxis = new THREE.Mesh(axisGeom, zMat);
  zAxis.rotation.x = Math.PI/2;
  zAxis.position.z = 2.5;
  
  axis.add(mesh);
  axis.add(xAxis);
  axis.add(yAxis);
  axis.add(zAxis);

  scene.add(axis);
  return axis;
}

