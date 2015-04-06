# PlyParser

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

How to test previewer on its own:

1. Localhost to the PlyParser repo through terminal: cd to the parent directory of the PlyParser directory, and (on a Mac) use this command to start a local web server:
python -m SimpleHTTPServer

2. go to http://localhost:8000 to view your parent directory on Chrome web browser (my professor always
told us to use Chrome. WebGL is also compatible with Safari, but apparently Chrome is the best. 
Definitely don't use IE or Firefox).

3. navigate to mesh.html to render scene

4. WebGL's console can be accessed with the following shortcut:
command+option+J

5. Pro tip: the rendering process takes between 10 and 20 seconds to load. When it's loaded, sometimes you need to move 
the cursor over the canvas to ignite the object into rendering.

6. Pro tip #2: As originally delivered, the code expects to see http://localhost:8000/PlyParser/prnt.ply and http://localhost:8000/PlyParser/prnt.jpg. That's why the HTTP server needs to point to the parent directory of PlyParser. Obviously you can change this convention.

7. Pro tip #3: Dragging rotates the scene. Scrolling zooms.

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
