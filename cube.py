
#######################################################################################
# Make a cube
#######################################################################################

from mesh           import *
from numpy          import *
from collections    import defaultdict
import pprint; pp = pprint.PrettyPrinter( indent = 4 )

def all_vertices():
    for i in range(2):
        for j in range(2):
            for k in range(2):
                yield i, j, k

def all_faces():
    for i in range(2):
        quad0 = [ (i,0,0), (i,0,1), (i,1,0), (i,1,1) ]
        for rot in range(3):
            quad = [ face_index[ v[rot:]+v[:rot] ] for v in quad0 ]
            yield [quad[0],quad[1],quad[3]] if i == 0 else [quad[3],quad[1],quad[0]]
            yield [quad[0],quad[3],quad[2]] if i == 0 else [quad[2],quad[3],quad[0]]

def all_face_textures():
    for i in range(2):
        uvs = [ [0.,0.], [0.,1.], [1.,0.], [1.,1.] ]
        for rot in range(3):
            yield [uvs[0],uvs[1],uvs[3]] if i == 0 else [uvs[3],uvs[1],uvs[0]]
            yield [uvs[0],uvs[3],uvs[2]] if i == 0 else [uvs[2],uvs[3],uvs[0]]

size = 10.
mesh = Mesh( None )

face_index = defaultdict( lambda: defaultdict( lambda: defaultdict(int) ) )
for face, ijk in enumerate(all_vertices()): face_index[ijk] = face
pp.pprint( face_index )

mesh.vertex_positions = np.array([ np.array(ijk)*size for ijk in all_vertices() ])
print 'mesh.vertex_positions:'
print mesh.vertex_positions
print

mesh.faces            = np.array([ face for face in all_faces() ])
print 'mesh.faces:'
print mesh.faces
print

mesh.face_textures    = np.array([ np.array(uv).flatten() for uv in all_face_textures() ])
print 'mesh.face_textures:'
print mesh.face_textures
print 

mesh.texture_files = [ 'cube.jpg' ]
mesh.vertex_rgb    = None
mesh.vertex_uv     = None
mesh.writeBinaryPLY( 'cube.ply' )
