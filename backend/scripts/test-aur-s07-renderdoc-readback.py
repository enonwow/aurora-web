import importlib.util, pathlib, struct, unittest
path=pathlib.Path(__file__).parent/'lib'/'aur-s07-renderdoc-readback.py'
spec=importlib.util.spec_from_file_location('readback',path)
r=importlib.util.module_from_spec(spec); spec.loader.exec_module(r)

class ReadbackTests(unittest.TestCase):
    def test_particle_floats(self):
        self.assertEqual(r.decode_attribute(struct.pack('<3f',3,5,-2),'Float',4,3),[3,5,-2])
    def test_normalized_color(self):
        self.assertEqual(r.decode_attribute(bytes([255,128,0,255]),'UNorm',1,4),[1,128/255,0,1])
    def test_bgra_order(self):
        self.assertEqual(r.decode_attribute(bytes([0,128,255,255]),'UNorm',1,4,True),[1,128/255,0,1])
    def test_signed_normalization(self):
        self.assertEqual(r.decode_attribute(struct.pack('<2b',-128,127),'SNorm',1,2),[-1,1])
    def test_no_silent_format_guess(self):
        with self.assertRaises(ValueError): r.decode_attribute(b'1234','Typeless',1,4)
    def test_incomplete_data_rejected(self):
        with self.assertRaises(struct.error): r.decode_attribute(b'123','Float',4,1)

unittest.main()
